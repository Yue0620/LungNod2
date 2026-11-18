<template>
  <div class="res-page">
    <main class="container-fluid">
      <!-- 顶部操作：面包屑与导出 -->
      <div class="action-bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">{{ t('home') }}</el-breadcrumb-item>
          <el-breadcrumb-item>{{ t('dataSearch') }}</el-breadcrumb-item>
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
              <el-form-item :label="t('fProject')">
                <el-select v-model="filterForm.projectId" :placeholder="t('all')" clearable @change="loadData">
                  <el-option v-for="proj in projectOptions" :key="proj" :label="proj" :value="proj" />
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
              <el-form-item :label="t('fID')">
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
              <el-table-column fixed prop="myProjectId" label="Project ID" width="120">
                <template #default="scope">
                  <span class="id-text">{{ scope.row.myProjectId }}</span>
                </template>
              </el-table-column>

              <el-table-column fixed prop="datasetName" :label="t('datasetName')" width="150" sortable="custom" show-overflow-tooltip>
                <template #default="scope">
                  <span class="dataset-name-cell">{{ scope.row.datasetName || '--' }}</span>
                </template>
              </el-table-column>

              <el-table-column prop="omicsType" :label="t('omicsType')" width="150" sortable="custom">
                <template #default="scope">
                  <el-tag :color="getOmicsColor(scope.row.omicsType)" effect="dark" borderless style="color:white; font-size: 11px">
                    {{ scope.row.omicsType }}
                  </el-tag>
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


  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { fetchLungData, fetchAllProjects } from '@/api/nodule'
import * as XLSX from 'xlsx'
import { currentLang } from '@/store/lang.js'


const i18n = {
  zh: {
    home: '首页', dataSearch: '数据检索', dlCurrent: '下载结果', dlAll: '全库下载',
    configPanel: '数据字段控制面板', configSub: '(勾选以增加表格显示列)',
    resetDefault: '恢复默认', selectAll: '全选', clearAll: '清空', selected: '已选中',
    filterTitle: '数据过滤器', fProject: '项目', fOmics: '组学类型', fDisease: '疾病', fTissue: '组织', fID: '快速检索',
    all: '全部', searchHint: '搜索 ID/名称/疾病/组织...', resetFilter: '重置',
    datasetName: '数据集名称', omicsType: '组学类型', action: '操作', detail: '详情',
    // 列字段翻译
    myProjectId: '项目ID', myDatasetId: '数据集ID', datasetId: '数据集编号', bioProjectId: 'BioProject ID',
    projectId: 'Project ID', species: '物种', strategy: '测序策略', sampleNumber: '样本数',
    disease: '疾病', tissue: '组织', dataFormat: '数据格式',
    gBasic: '基础信息', gDataset: '数据集信息', gSequence: '测序信息', gBiodata: '生物数据'
  },
  en: {
    home: 'Home', dataSearch: 'Data Search', dlCurrent: 'Export', dlAll: 'Download All',
    configPanel: 'Field Control Panel', configSub: '(Toggle columns)',
    resetDefault: 'Default', selectAll: 'All', clearAll: 'Clear', selected: 'Selected',
    filterTitle: 'Filters', fProject: 'Project', fOmics: 'Omics', fDisease: 'Disease', fTissue: 'Tissue', fID: 'Search ID',
    all: 'All', searchHint: 'Search ID/Name/Disease/Tissue...', resetFilter: 'Reset',
    datasetName: 'Dataset Name', omicsType: 'Omics Type', action: 'Action', detail: 'Detail',
    myProjectId: 'Project ID', myDatasetId: 'Dataset ID', datasetId: 'Dataset Code', bioProjectId: 'BioProject ID',
    projectId: 'Project ID', species: 'Species', strategy: 'Strategy', sampleNumber: 'Samples',
    disease: 'Disease', tissue: 'Tissue', dataFormat: 'Format',
    gBasic: 'Basic Info', gDataset: 'Dataset', gSequence: 'Sequencing', gBiodata: 'Biodata'
  }
}

const t = (key) => i18n[currentLang.value][key] || key
const router = useRouter()

const columnGroups = [
  { titleKey: 'gBasic', columns: ['myProjectId', 'myDatasetId', 'projectId', 'datasetId', 'bioProjectId'] },
  { titleKey: 'gDataset', columns: ['species', 'sampleNumber'] },
  { titleKey: 'gSequence', columns: ['strategy', 'omicsType', 'dataFormat'] },
  { titleKey: 'gBiodata', columns: ['disease', 'tissue'] }
]

const translatedGroups = computed(() => {
  return columnGroups.map(g => ({
    title: t(g.titleKey),
    columns: g.columns.map(prop => ({ prop, label: t(prop) }))
  }))
})

const defaultCols = ['myProjectId', 'datasetName', 'species', 'sampleNumber', 'disease', 'tissue']
const visibleColumns = ref([...defaultCols])
const allFlatColumns = computed(() => translatedGroups.value.flatMap(g => g.columns))
const activeColumns = computed(() => allFlatColumns.value.filter(col => visibleColumns.value.includes(col.prop)))

// 业务逻辑
const loading = ref(true)
const rawData = ref([])
const activeCollapse = ref(['config'])

const filterText = ref('')
const filterForm = ref({ projectId: '', omicsType: [], disease: '', tissue: '' })

const projectOptions = ref([])
const omicsOptions = ['Transcriptome', 'scRNA_seq', 'Spatial_Transcriptome', 'Genomics', 'Immunomics', 'Proteomics', 'Metabolome', 'Radiomics', 'GM_seq']
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
      (item.myProjectId && item.myProjectId.toLowerCase().includes(filterText.value.toLowerCase())) ||
      (item.datasetName && item.datasetName.toLowerCase().includes(filterText.value.toLowerCase())) ||
      (item.disease && item.disease.toLowerCase().includes(filterText.value.toLowerCase())) ||
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
const getOmicsColor = (t) => ({'Transcriptome':'#3498db','Transcriptome_10x':'#7c3aed','scRNA_seq':'#9b59b6','TCR':'#f59e0b','scTCR':'#f59e0b','Radiomics':'#e67e22','Spatial_Transcriptome':'#1abc9c'}[t] || '#42b983')
const handleSortChange = ({ prop, order }) => { sortProp.value = prop; sortOrder.value = order; }
const resetFilters = () => { filterForm.value = { projectId: '', omicsType: [], disease: '', tissue: '' }; filterText.value = ''; currentPage.value = 1; loadData() }
const showDetail = (row) => {
  router.push({
    name: 'DataDetail',
    params: { projectId: row.myProjectId, datasetId: row.myDatasetId }
  })
}

const exportData = (type) => {
  const data = type === 'current' ? filteredData.value : rawData.value
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Data")
  XLSX.writeFile(wb, `LungNod_Data_${type}.xlsx`)
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterForm.value.projectId) params.projectId = filterForm.value.projectId
    if (filterForm.value.disease) params.disease = filterForm.value.disease
    if (filterForm.value.tissue) params.tissue = filterForm.value.tissue
    if (filterForm.value.omicsType.length > 0) params.omicsType = filterForm.value.omicsType[0]
    
    const res = await fetchLungData(params)
    rawData.value = res || []
    try { sessionStorage.setItem('allDatasets', JSON.stringify(res)) } catch {}
    
    // 更新过滤器选项：从数据中动态提取
    diseaseOptions.value = [...new Set(rawData.value.map(d => d.disease).filter(Boolean))].sort()
    dynamicOmicsOptions.value = [...new Set(rawData.value.map(d => d.omicsType).filter(Boolean))].sort()
    tissueOptions.value = [...new Set(rawData.value.map(d => d.tissue).filter(Boolean))].sort()
    
    currentPage.value = 1
  } finally {
    loading.value = false
  }
}

const loadProjects = async () => {
  try {
    const res = await fetchAllProjects()
    projectOptions.value = res || []
  } catch (e) {
    console.error('Failed to load projects:', e)
  }
}

onMounted(async () => {
  await loadProjects()
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
.dataset-name-cell { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
