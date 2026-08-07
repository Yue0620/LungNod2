<template>
  <div class="res-page">
    <main class="container-fluid">
      <!-- 顶部操作：面包屑与导出 -->
      <div class="action-bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">{{ t('home') }}</el-breadcrumb-item>
          <el-breadcrumb-item>{{ t('sampleSearch') }}</el-breadcrumb-item>
        </el-breadcrumb>
        <div class="top-btns">
          <el-button-group>
            <el-button type="success" size="small" icon="Download" @click="exportData('current')">{{ t('dlCurrent') }}</el-button>
            <el-button type="warning" size="small" icon="Document" @click="exportData('all')">{{ t('dlAll') }}</el-button>
          </el-button-group>
        </div>
      </div>

      <!-- 动态列选择区 (默认展开) -->
      <el-collapse v-model="activeCollapse" class="column-config-compact">
        <el-collapse-item name="config">
          <template #title>
            <div class="collapse-title" style="padding-left: 15px;">
              {{ t('configPanel') }} <small>{{ t('configSub') }}</small>
            </div>
          </template>

          <!-- 快捷操作栏 -->
          <div class="config-toolbar">
            <el-button size="small" @click="resetToDefault" plain>{{ t('resetDefault') }}</el-button>
            <el-button size="small" @click="selectAll" plain>{{ t('selectAll') }}</el-button>
            <el-button size="small" @click="visibleColumns = []" plain>{{ t('clearAll') }}</el-button>
            <span class="column-count">{{ t('selected') }}: <b>{{ visibleColumns.length }}</b> / {{ allFlatColumns.length }}</span>
          </div>

          <!-- 紧凑行排版 -->
          <div class="compact-rows">
            <div v-for="group in translatedGroups" :key="group.title" class="compact-row">
              <span class="row-label">{{ group.title }}:</span>
              <el-checkbox-group v-model="visibleColumns" class="row-checkboxes">
                <el-checkbox v-for="col in group.columns" :key="col.prop" :label="col.prop">
                  {{ col.label }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>

      <div class="layout-wrapper">
        <!-- 左侧过滤器 (20%) -->
        <aside class="filter-panel">
          <el-card shadow="never" class="filter-card">
            <template #header><span class="card-title">{{ t('filterTitle') }}</span></template>
            <el-form :model="filterForm" label-position="top" size="small">
              <el-form-item :label="t('fStage')">
                <el-select v-model="filterForm.stage" :placeholder="t('all')" clearable @change="loadData">
                  <el-option label="Healthy" value="Healthy" />
                  <el-option label="Solid" value="Solid" />
                  <el-option label="GGO" value="GGO" />
                  <el-option label="Maligant" value="Maligant" />
                </el-select>
              </el-form-item>
              <el-form-item :label="t('fOmics')">
                <el-select v-model="filterForm.omicsType" multiple collapse-tags :placeholder="t('all')" @change="loadData">
                  <el-option v-for="t in dynamicOmicsOptions" :key="t" :label="t" :value="t" />
                </el-select>
              </el-form-item>
              <el-form-item :label="t('fDisease')">
                <el-select v-model="filterForm.disease" :placeholder="t('all')" clearable filterable @change="loadData">
                  <el-option v-for="d in diseaseOptions" :key="d" :label="d" :value="d" />
                </el-select>
              </el-form-item>
              <el-form-item :label="t('fTissue')">
                <el-select v-model="filterForm.tissue" :placeholder="t('all')" clearable @change="loadData">
                  <el-option v-for="tis in tissueOptions" :key="tis" :label="tis" :value="tis" />
                </el-select>
              </el-form-item>
              <el-form-item :label="t('fKeyword')">
                <el-input v-model="filterText" :placeholder="t('searchHint')" clearable prefix-icon="Search" />
              </el-form-item>
              <el-button type="primary" @click="resetFilters" plain class="w-100">{{ t('resetFilter') }}</el-button>
            </el-form>
          </el-card>
        </aside>

        <!-- 右侧结果区 (80%) -->
        <section class="result-panel">
          <div class="table-container">
            <el-table
                :data="pagedData" border stripe v-loading="loading"
                height="650" style="width: 100%"
                @sort-change="handleSortChange"
                header-cell-class-name="table-header-custom"
            >
              <!-- 核心固定列 -->
              <el-table-column fixed prop="individualId" label="Individual ID" width="130" sortable="custom">
                <template #default="scope">
                  <span class="id-text">{{ scope.row.individualId }}</span>
                </template>
              </el-table-column>

              <el-table-column fixed prop="subSampleId" label="Sample ID" width="130" sortable="custom">
                <template #default="scope">
                  <span class="id-text">{{ scope.row.subSampleId }}</span>
                </template>
              </el-table-column>

              <el-table-column fixed prop="cancerType" :label="t('denseType')" width="140" sortable="custom">
                <template #default="scope">
                  <span>{{ scope.row.cancerType || '--' }}</span>
                </template>
              </el-table-column>

              <!-- 动态生成的全量列 -->
              <el-table-column
                  v-for="col in activeColumns" :key="col.prop"
                  :prop="col.prop" :label="col.label"
                  :width="140" sortable="custom"
                  show-overflow-tooltip
              >
                <template #default="scope">
                  <span v-if="isNumeric(scope.row[col.prop])" class="num-font">
                    {{ formatNumber(scope.row[col.prop]) }}
                  </span>
                  <span v-else>{{ scope.row[col.prop] || '--' }}</span>
                </template>
              </el-table-column>

              <el-table-column fixed="right" :label="t('action')" width="80" align="center">
                <template #default="scope">
                  <el-button link type="primary" @click="showDetail(scope.row)">{{ t('detail') }}</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-area">
              <el-pagination
                  v-model:current-page="currentPage" v-model:page-size="pageSize"
                  :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next"
                  :total="filteredData.length" background
              />
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 详情抽屉 -->
    <el-drawer v-model="drawerVisible" :title="t('detail') + ' - ' + (currentDetail.subSampleId || '')" size="40%">
      <el-scrollbar>
        <div v-for="group in translatedGroups" :key="group.title" class="drawer-group">
          <div class="drawer-title">{{ group.title }}</div>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item v-for="col in group.columns" :key="col.prop" :label="col.label">
              {{ formatCellValue(currentDetail[col.prop]) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-scrollbar>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { fetchNodeSamples } from '@/api/nodule'
import * as XLSX from 'xlsx'
import { currentLang } from '@/store/lang.js'

const i18n = {
  zh: {
    home: '首页', sampleSearch: '样本检索', dlCurrent: '下载结果', dlAll: '全库下载',
    configPanel: '数据字段控制面板', configSub: '(勾选以增加表格显示列)',
    resetDefault: '恢复默认', selectAll: '全选', clearAll: '清空', selected: '已选中',
    filterTitle: '数据过滤器', fStage: '病理阶段', fOmics: '组学类型', fDisease: '疾病类型', fTissue: '组织', fKeyword: '搜索关键词',
    all: '全部', searchHint: '搜索疾病类型和组织...', resetFilter: '重置',
    stage: '病理阶段', omicsType: '组学类型', action: '操作', detail: '详情',
    // 列字段翻译
    subSampleId: '样本ID', individualId: '个体ID', cancerType: '癌症类型', prjectid: '项目ID', sampleId: '样本编号',
    denseType: '疾病类型',
    cea: 'CEA', nse: 'NSE', crp: 'CRP', pct: 'PCT', esr: 'ESR', tbTest: 'TB检测',
    malignancyPotential: '恶性潜能', noduleCount: '结节数', noduleCountCat: '结节数分类',
    majorDiameter: '长径', minorDiameter: '短径', noduleSizeCat: '结节大小分类', 
    noduleDensityCat: '结节密度分类', densityUniformity: '密度均匀性', solidRatio: '实性比例',
    morphology: '形态', location: '位置', spiculation: '棘刺', clarity: '清晰度', vdtDays: 'VDT天数',
    deviceModel: '扫描设备', sliceThickness: '层厚', windowInfo: '窗位信息', isEnhanced: '增强否',
    checkType: '检查类型', acquisition: '采集方式', collectionTime: '采集时间', diagnosisTime: '诊断时间',
    tissue: '组织', invasionDepth: '浸润深度', lymphMeta: '淋巴转移', 
    vascularInvasion: '血管侵犯', ihcResults: '免疫组化结果', geneResults: '基因检测结果',
    surgery: '手术', chemo: '化疗', radio: '放疗', targetImmuno: '靶向免疫治疗', 
    efficacy: '疗效', followupTime: '随访时间', noduleChange: '结节变化', 
    survivalStatus: '生存状态', survivalMonths: '生存月数', dataFormat: '数据格式',
    source: '数据来源', others: '其他',
    // 分组翻译
    gBasic: '基础信息', gClinical: '临床指标', gNodule: '结节特征', gImaging: '影像信息',
    gPathology: '病理信息', gTreatment: '治疗信息', gFollowup: '随访信息', gOther: '其他'
  },
  en: {
    home: 'Home', sampleSearch: 'Sample Search', dlCurrent: 'Export', dlAll: 'Download All',
    configPanel: 'Field Control Panel', configSub: '(Toggle columns)',
    resetDefault: 'Default', selectAll: 'All', clearAll: 'Clear', selected: 'Selected',
    filterTitle: 'Filters', fStage: 'Stage', fOmics: 'Omics', fDisease: 'Disease Type', fTissue: 'Tissue', fKeyword: 'Search Keyword',
    all: 'All', searchHint: 'Search Disease Type & Tissue...', resetFilter: 'Reset',
    stage: 'Stage', omicsType: 'Omics Type', action: 'Action', detail: 'Detail',
    subSampleId: 'Sample ID', individualId: 'Individual ID', cancerType: 'Cancer Type', prjectid: 'Project ID', sampleId: 'Sample Code',
    denseType: 'Disease Type',
    cea: 'CEA', nse: 'NSE', crp: 'CRP', pct: 'PCT', esr: 'ESR', tbTest: 'TB Test',
    malignancyPotential: 'Malignancy Potential', noduleCount: 'Nodule Count', noduleCountCat: 'Nodule Count Cat',
    majorDiameter: 'Major Diameter', minorDiameter: 'Minor Diameter', noduleSizeCat: 'Size Category', 
    noduleDensityCat: 'Density Category', densityUniformity: 'Density Uniformity', solidRatio: 'Solid Ratio',
    morphology: 'Morphology', location: 'Location', spiculation: 'Spiculation', clarity: 'Clarity', vdtDays: 'VDT Days',
    deviceModel: 'Device Model', sliceThickness: 'Slice Thickness', windowInfo: 'Window Info', isEnhanced: 'Enhanced',
    checkType: 'Check Type', acquisition: 'Acquisition', collectionTime: 'Collection Time', diagnosisTime: 'Diagnosis Time',
    tissue: 'Tissue',  invasionDepth: 'Invasion Depth', lymphMeta: 'Lymph Metastasis', 
    vascularInvasion: 'Vascular Invasion', ihcResults: 'IHC Results', geneResults: 'Gene Results',
    surgery: 'Surgery', chemo: 'Chemotherapy', radio: 'Radiotherapy', targetImmuno: 'Targeted Immunotherapy', 
    efficacy: 'Efficacy', followupTime: 'Followup Time', noduleChange: 'Nodule Change', 
    survivalStatus: 'Survival Status', survivalMonths: 'Survival Months', dataFormat: 'Data Format',
    source: 'Data Source', others: 'Others',
    // 分组翻译
    gBasic: 'Basic Info', gClinical: 'Clinical Markers', gNodule: 'Nodule Features', gImaging: 'Imaging Info',
    gPathology: 'Pathology Info', gTreatment: 'Treatment', gFollowup: 'Followup', gOther: 'Other'
  }
}

const t = (key) => i18n[currentLang.value][key] || key

const columnGroups = [
  { titleKey: 'gBasic', columns: ['prjectid', 'sampleId', 'stage', 'omicsType', 'dataFormat', 'source'] },
  { titleKey: 'gClinical', columns: ['cea', 'nse', 'crp', 'pct', 'esr', 'tbTest', 'malignancyPotential'] },
  { titleKey: 'gNodule', columns: ['noduleCount', 'noduleCountCat', 'majorDiameter', 'minorDiameter', 'noduleSizeCat', 'noduleDensityCat', 'densityUniformity', 'solidRatio', 'morphology', 'location', 'spiculation', 'clarity', 'vdtDays'] },
  { titleKey: 'gImaging', columns: ['deviceModel', 'sliceThickness', 'windowInfo', 'isEnhanced', 'checkType', 'acquisition', 'collectionTime', 'diagnosisTime'] },
  { titleKey: 'gPathology', columns: ['tissue', 'invasionDepth', 'lymphMeta', 'vascularInvasion', 'ihcResults', 'geneResults'] },
  { titleKey: 'gTreatment', columns: ['surgery', 'chemo', 'radio', 'targetImmuno', 'efficacy'] },
  { titleKey: 'gFollowup', columns: ['followupTime', 'noduleChange', 'survivalStatus', 'survivalMonths'] },
  { titleKey: 'gOther', columns: ['others'] }
]

const translatedGroups = computed(() => {
  return columnGroups.map(g => ({
    title: t(g.titleKey),
    columns: g.columns.map(prop => ({ prop, label: t(prop) }))
  }))
})

const defaultCols = ['prjectid', 'sampleId', 'stage', 'omicsType', 'dataFormat', 'source']
const fixedColumnProps = ['individualId', 'subSampleId', 'cancerType']  // 固定列不应重复显示
const visibleColumns = ref([...defaultCols])
const allFlatColumns = computed(() => translatedGroups.value.flatMap(g => g.columns))
const activeColumns = computed(() => allFlatColumns.value.filter(col => visibleColumns.value.includes(col.prop) && !fixedColumnProps.includes(col.prop)))

// 业务逻辑
const loading = ref(true)
const rawData = ref([])
const activeCollapse = ref(['config'])
const drawerVisible = ref(false)
const currentDetail = ref({})
const filterText = ref('')
const filterForm = ref({ stage: '', omicsType: [], disease: '', tissue: '' })

const dynamicOmicsOptions = ref([])
const diseaseOptions = ref([])
const tissueOptions = ref([])

const currentPage = ref(1)
const pageSize = ref(20)
const sortProp = ref('')
const sortOrder = ref('')

const filteredData = computed(() => {
  return rawData.value.filter(item => {
    const matchSearch = !filterText.value || 
      (item.cancerType && item.cancerType.toLowerCase().includes(filterText.value.toLowerCase())) ||
      (item.tissue && item.tissue.toLowerCase().includes(filterText.value.toLowerCase()))
    return matchSearch
  })
})

const sortedData = computed(() => {
  const data = [...filteredData.value]
  if (!sortProp.value) return data
  return data.sort((a, b) => {
    let aV = a[sortProp.value], bV = b[sortProp.value]
    const mod = sortOrder.value === 'ascending' ? 1 : -1
    if (isNumeric(aV) && isNumeric(bV)) return (parseFloat(aV) - parseFloat(bV)) * mod
    return String(aV || '').localeCompare(String(bV || '')) * mod
  })
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedData.value.slice(start, start + pageSize.value)
})

// 功能函数
const selectAll = () => { visibleColumns.value = allFlatColumns.value.map(c => c.prop) }
const resetToDefault = () => { visibleColumns.value = [...defaultCols] }
const isNumeric = (v) => !isNaN(parseFloat(v)) && isFinite(v) && typeof v !== 'boolean'
const formatNumber = (v) => parseFloat(v) % 1 === 0 ? v : parseFloat(v).toFixed(2)
const formatCellValue = (v) => (v === null || v === undefined || v === '') ? '--' : (isNumeric(v) ? formatNumber(v) : v)
const getStageColor = (s) => ({'Healthy':'#52c41a','Solid':'#faad14','GGO':'#ff7a45','Maligant':'#f5222d'}[s] || '#1890ff')
const getOmicsColor = (t) => ({'Transcriptome':'#3498db','scRNA_seq':'#9b59b6','Radiomics':'#e67e22','Spatial_Transcriptome':'#1abc9c'}[t] || '#42b983')
const handleSortChange = ({ prop, order }) => { sortProp.value = prop; sortOrder.value = order; }
const resetFilters = () => { filterForm.value = { stage: '', omicsType: [], disease: '', tissue: '' }; filterText.value = ''; currentPage.value = 1; loadData() }
const showDetail = (row) => { currentDetail.value = row; drawerVisible.value = true; }

const exportData = (type) => {
  const data = type === 'current' ? filteredData.value : rawData.value
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Data")
  XLSX.writeFile(wb, `LungNod_Samples_${type}.xlsx`)
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterForm.value.stage) params.stage = filterForm.value.stage
    if (filterForm.value.disease) params.disease = filterForm.value.disease
    if (filterForm.value.tissue) params.tissue = filterForm.value.tissue
    if (filterForm.value.omicsType.length > 0) params.omicsType = filterForm.value.omicsType[0]
    
    const res = await fetchNodeSamples(params)
    rawData.value = res || []
    
    // 更新过滤器选项：从数据中动态提取
    diseaseOptions.value = [...new Set(rawData.value.map(d => d.cancerType).filter(Boolean))].sort()
    dynamicOmicsOptions.value = [...new Set(rawData.value.map(d => d.omicsType).filter(Boolean))].sort()
    tissueOptions.value = [...new Set(rawData.value.map(d => d.tissue).filter(Boolean))].sort()
    
    currentPage.value = 1
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.res-page { background-color: #f8fafc; min-height: 100vh; padding: 0 20px 40px; }
.container-fluid { max-width: 1750px; margin: 0 auto; }
.action-bar { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; }
.top-btns { display: flex; gap: 10px; }

.column-config-compact { margin-bottom: 20px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; overflow: hidden; }
.collapse-title { font-weight: bold; color: #2c3e50; font-size: 14px; }
.collapse-title small { font-weight: normal; color: #94a3b8; margin-left: 10px; }

.config-toolbar { padding: 10px 20px; background: #fcfcfd; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 12px; }
.column-count { margin-left: auto; font-size: 11px; color: #94a3b8; }
.column-count b { color: #42b983; }

.compact-rows { padding: 12px 20px; }
.compact-row { display: flex; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px dashed #f1f5f9; padding-bottom: 6px; }
.compact-row:last-child { margin-bottom: 0; border-bottom: none; }
.row-label { width: 100px; font-weight: bold; font-size: 11px; color: #64748b; flex-shrink: 0; padding-top: 5px; }
.row-checkboxes { display: flex; flex-wrap: wrap; gap: 4px; }

:deep(.el-checkbox) { margin-right: 12px; height: 24px; }
:deep(.el-checkbox__label) { font-size: 11px; padding-left: 4px; }

.layout-wrapper { display: flex; gap: 20px; align-items: flex-start; }
.filter-panel { flex: 0 0 260px; position: sticky; top: 100px; }
.filter-card { background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
.card-title { font-weight: bold; font-size: 14px; }

.result-panel { flex: 1; min-width: 0; }
.table-container { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }

.id-text { font-family: 'Monaco', monospace; font-weight: bold; color: #42b983; }
.num-font { font-family: 'Inter', sans-serif; font-weight: 600; color: #475569; }
.pagination-area { margin-top: 15px; display: flex; justify-content: flex-end; }
.w-100 { width: 100%; }

.drawer-group { margin-bottom: 25px; padding: 0 20px; }
.drawer-title { font-size: 14px; font-weight: bold; color: #42b983; margin-bottom: 10px; padding-left: 10px; border-left: 4px solid #42b983; }

:deep(.table-header-custom) { background-color: #f9fafb !important; color: #475569; font-weight: 800 !important; font-size: 12px; }
:deep(.el-form-item) { margin-bottom: 16px; }
:deep(.el-select) { width: 100%; }
:deep(.el-collapse-item__content) { padding: 0 !important; }
</style>
