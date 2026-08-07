<template>
  <div class="res-page">
    <main class="container-fluid">
      <!-- 顶部操作：面包屑与导出 -->
      <div class="action-bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">{{ t('home') }}</el-breadcrumb-item>
          <el-breadcrumb-item>{{ t('dbTitle') }}</el-breadcrumb-item>
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
            <!-- 增加 15px Padding -->
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

          <!-- 紧凑行排版：所有临床维度 -->
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
              <el-form-item :label="t('fOmics')">
                <el-select v-model="filterForm.omics" multiple collapse-tags :placeholder="t('all')">
                  <el-option v-for="t in omicsOptions" :key="t" :label="t" :value="t" />
                </el-select>
              </el-form-item>
              <el-form-item :label="t('fSex')">
                <el-radio-group v-model="filterForm.sex">
                  <el-radio-button label="">{{ t('all') }}</el-radio-button>
                  <el-radio-button label="Male">{{ t('male') }}</el-radio-button>
                  <el-radio-button label="Female">{{ t('female') }}</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item :label="t('fAge')">
                <el-slider v-model="filterForm.ageRange" range :min="0" :max="100" />
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
              <!-- 核心固定列：ID -->
              <el-table-column fixed prop="subSampleId" label="ID" width="110">
                <template #default="scope">
                  <span class="id-text">{{ formatSubId(scope.row.subSampleId) }}</span>
                </template>
              </el-table-column>

              <el-table-column fixed prop="stage" :label="t('stage')" width="110" sortable="custom">
                <template #default="scope">
                  <el-tag :type="getStageTag(scope.row.stage)" size="small">
                    {{ t(scope.row.stage) || scope.row.stage }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column fixed prop="omicsType" :label="t('omicsType')" width="200" sortable="custom">
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

    <!-- 详情抽屉 -->
    <el-drawer v-model="drawerVisible" :title="t('detail') + ' - ' + formatSubId(currentDetail.subSampleId)" size="40%">
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
import { useRoute } from 'vue-router'
import { fetchSamples } from '@/api/nodule'
import * as XLSX from 'xlsx'
// 1. 引入你的全局状态
import { currentLang } from '@/store/lang.js'

// --- 2. 补全 62 个指标的 i18n 字典 ---
const i18n = {
  zh: {
    home: '首页', dbTitle: '样本数据库', dlCurrent: '下载结果', dlAll: '全库下载',
    configPanel: '临床维度控制面板', configSub: '(勾选以增加表格显示列)',
    resetDefault: '恢复默认', selectAll: '全选', clearAll: '清空', selected: '已选中',
    filterTitle: '数据过滤器', fOmics: '组学类型', fSex: '性别', fAge: '年龄范围', fID: '快速检索',
    all: '全部', male: '男', female: '女', searchHint: '搜索 ID...', resetFilter: '重置',
    stage: '病理分期', omicsType: '组学类型', action: '操作', detail: '详情',
    Healthy: '正常肺部', Solid: '实性结节', GGO: '磨玻璃结节', Malignant: '恶性演变',
    // 62个临床指标翻译
    individualId: '个体 ID', sampleId: '总样本 ID', sex: '性别', birthYear: '出生年份', age: '年龄', bmi: 'BMI', race: '种族', ethnicity: '民族',
    smokingStatus: '吸烟状态', secondHandSmoke: '二手烟暴露', smokingYears: '烟龄(年)', dailySmokingAmount: '日吸烟量', quitSmokingYears: '戒烟时长', alcoholFreq: '饮酒频率', occExposure: '职业暴露史',
    famHistoryCancer: '家族肺癌史', relativeCancerHistory: '亲属癌症史', pastMedicalHistory: '既往病史', primarySymptoms: '主诉症状',
    cyfra21_1: 'CYFRA21-1', cea: 'CEA', nse: 'NSE', crp: 'C反应蛋白', pct: '降钙素原', esr: '血沉', tbTest: '结核检查',
    malignancyPotential: '恶性潜能', noduleCount: '结节数量', noduleCountCat: '数量分类', majorDiameter: '结节大径', minorDiameter: '结节小径', noduleSizeCat: '大小分类', noduleDensityCat: '密度分类', densityUniformity: '密度均匀性', solidRatio: '实性占比', morphology: '结节形态', location: '位置', spiculation: '毛刺特征', clarity: '清晰度', vdtDays: '倍增时间',
    deviceModel: '设备型号', sliceThickness: '扫描层厚', windowInfo: '窗宽窗位', isEnhanced: '增强扫描', checkType: '检查类型', acquisition: '获取方式',
    collectionTime: '采集时间', diagnosisTime: '确诊时间', tissue: '采集组织', tissueType: '组织类型',
    invasionDepth: '浸润深度', lymphMeta: '淋巴转移', vascularInvasion: '脉管侵犯', ihcResults: '免疫组化', geneResults: '基因检测',
    surgery: '手术治疗', chemo: '化疗方案', radio: '放疗方案', targetImmuno: '靶向/免疫', efficacy: '疗效评估', followupTime: '随访时间', noduleChange: '结节变化', survivalStatus: '生存状态', survivalMonths: '生存月数',
    // 分组标题
    gBase: '基础背景', gLife: '生活习惯', gHistory: '家族病史', gLab: '实验室检查', gNodule: '结节特征', gDevice: '影像参数', gPathology: '病理与预后'
  },
  en: {
    home: 'Home', dbTitle: 'Samples DB', dlCurrent: 'Export', dlAll: 'Download All',
    configPanel: 'Dimension Control Panel', configSub: '(Toggle columns)',
    resetDefault: 'Default', selectAll: 'All', clearAll: 'Clear', selected: 'Selected',
    filterTitle: 'Filters', fOmics: 'Omics', fSex: 'Sex', fAge: 'Age', fID: 'Search ID',
    all: 'All', male: 'Male', female: 'Female', searchHint: 'Search ID...', resetFilter: 'Reset',
    stage: 'Stage', omicsType: 'Omics Type', action: 'Action', detail: 'Detail',
    Healthy: 'Healthy', Solid: 'Solid', GGO: 'GGO', Malignant: 'Malignant',
    individualId: 'Indiv ID', sampleId: 'Sample ID', sex: 'Sex', birthYear: 'Birth Year', age: 'Age', bmi: 'BMI', race: 'Race', ethnicity: 'Ethnicity',
    smokingStatus: 'Smoking', secondHandSmoke: '2nd Smoke', smokingYears: 'Smoke Yrs', dailySmokingAmount: 'Daily Amt', quitSmokingYears: 'Quit Yrs', alcoholFreq: 'Alcohol', occExposure: 'Occupation',
    famHistoryCancer: 'Family Hist', relativeCancerHistory: 'Relative Hist', pastMedicalHistory: 'Med History', primarySymptoms: 'Symptoms',
    cyfra21_1: 'CYFRA21-1', cea: 'CEA', nse: 'NSE', crp: 'CRP', pct: 'PCT', esr: 'ESR', tbTest: 'TB Check',
    malignancyPotential: 'Malignancy', noduleCount: 'Nodule Count', noduleCountCat: 'Count Cat', majorDiameter: 'Major Diam', minorDiameter: 'Minor Diam', noduleSizeCat: 'Size Cat', noduleDensityCat: 'Density Cat', densityUniformity: 'Uniformity', solidRatio: 'Solid Ratio', morphology: 'Morphology', location: 'Location', spiculation: 'Spiculation', clarity: 'Clarity', vdtDays: 'VDT',
    deviceModel: 'Device', sliceThickness: 'Thickness', windowInfo: 'Window', isEnhanced: 'Enhanced', checkType: 'Check Type', acquisition: 'Acquisition',
    collectionTime: 'Collect Time', diagnosisTime: 'Diag Time', tissue: 'Tissue', tissueType: 'Tissue Type',
    invasionDepth: 'Invasion', lymphMeta: 'Lymph Meta', vascularInvasion: 'Vasc Invasion', ihcResults: 'IHC', geneResults: 'Genetic',
    surgery: 'Surgery', chemo: 'Chemo', radio: 'Radio', targetImmuno: 'Targeted', efficacy: 'Efficacy', followupTime: 'Follow-up', noduleChange: 'Change', survivalStatus: 'Survival', survivalMonths: 'Months',
    gBase: 'Background', gLife: 'Lifestyle', gHistory: 'History', gLab: 'Lab Results', gNodule: 'Nodule', gDevice: 'Imaging', gPathology: 'Prognosis'
  }
}

// 核心翻译函数：依赖 currentLang.value
const t = (key) => i18n[currentLang.value][key] || key

// --- 3. 维度分组定义 ---
const columnGroups = [
  { titleKey: 'gBase', columns: ['individualId', 'sampleId', 'sex', 'birthYear', 'age', 'bmi', 'race', 'ethnicity'] },
  { titleKey: 'gLife', columns: ['smokingStatus', 'secondHandSmoke', 'smokingYears', 'dailySmokingAmount', 'quitSmokingYears', 'alcoholFreq', 'occExposure'] },
  { titleKey: 'gHistory', columns: ['famHistoryCancer', 'relativeCancerHistory', 'pastMedicalHistory', 'primarySymptoms'] },
  { titleKey: 'gLab', columns: ['cyfra21_1', 'cea', 'nse', 'crp', 'pct', 'esr', 'tbTest'] },
  { titleKey: 'gNodule', columns: ['malignancyPotential', 'noduleCount', 'noduleCountCat', 'majorDiameter', 'minorDiameter', 'noduleSizeCat', 'noduleDensityCat', 'densityUniformity', 'solidRatio', 'morphology', 'location', 'spiculation', 'clarity', 'vdtDays'] },
  { titleKey: 'gDevice', columns: ['deviceModel', 'sliceThickness', 'windowInfo', 'isEnhanced', 'checkType', 'acquisition'] },
  { titleKey: 'gPathology', columns: ['collectionTime', 'diagnosisTime', 'tissue', 'tissueType', 'invasionDepth', 'lymphMeta', 'vascularInvasion', 'ihcResults', 'geneResults', 'surgery', 'chemo', 'radio', 'targetImmuno', 'efficacy', 'followupTime', 'noduleChange', 'survivalStatus', 'survivalMonths'] }
]

// 核心响应式：翻译后的分组
const translatedGroups = computed(() => {
  return columnGroups.map(g => ({
    title: t(g.titleKey),
    columns: g.columns.map(prop => ({ prop, label: t(prop) }))
  }))
})

const defaultCols = ['individualId', 'age', 'sex', 'majorDiameter', 'geneResults', 'cyfra21_1']
const visibleColumns = ref([...defaultCols])
const allFlatColumns = computed(() => translatedGroups.value.flatMap(g => g.columns))
const activeColumns = computed(() => allFlatColumns.value.filter(col => visibleColumns.value.includes(col.prop)))

// --- 4. 业务逻辑 ---
const route = useRoute(); const loading = ref(true); const rawData = ref([]); const activeCollapse = ref(['config']);
const drawerVisible = ref(false); const currentDetail = ref({}); const filterText = ref('');
const filterForm = ref({ omics: [], sex: '', ageRange: [0, 100] });
const omicsOptions = ["Transcriptome", "scRNA_seq", "Spatial_Transcriptome", "Genomics", "Immunomics", "Proteomics", "Metabolome", "Radiomics", "GM_seq"];
const currentPage = ref(1); const pageSize = ref(20); const sortProp = ref(''); const sortOrder = ref('');

const filteredData = computed(() => {
  return rawData.value.filter(item => {
    const matchID = !filterText.value || item.individualId?.toLowerCase().includes(filterText.value.toLowerCase());
    const matchOmics = filterForm.value.omics.length === 0 || filterForm.value.omics.includes(item.omicsType);
    const matchSex = !filterForm.value.sex || item.sex === filterForm.value.sex;
    const matchAge = item.age >= filterForm.value.ageRange[0] && item.age <= filterForm.value.ageRange[1];
    return matchID && matchOmics && matchSex && matchAge;
  });
})

const sortedData = computed(() => {
  const data = [...filteredData.value]
  if (!sortProp.value) return data
  return data.sort((a, b) => {
    let aV = a[sortProp.value], bV = b[sortProp.value]
    const mod = sortOrder.value === 'ascending' ? 1 : -1
    if (isNumeric(aV) && isNumeric(bV)) return (parseFloat(aV) - parseFloat(bV)) * mod
    return String(aV).localeCompare(String(bV)) * mod
  })
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedData.value.slice(start, start + pageSize.value)
})

// --- 5. 功能函数 ---
const selectAll = () => { visibleColumns.value = allFlatColumns.value.map(c => c.prop) }
const resetToDefault = () => { visibleColumns.value = [...defaultCols] }
const formatSubId = (id) => id ? id.split('_').slice(0, 2).join('_') : '--'
const isNumeric = (v) => !isNaN(parseFloat(v)) && isFinite(v) && typeof v !== 'boolean'
const formatNumber = (v) => parseFloat(v) % 1 === 0 ? v : parseFloat(v).toFixed(2)
const formatCellValue = (v) => (v === null || v === undefined || v === '') ? '--' : (isNumeric(v) ? formatNumber(v) : v)
const getStageTag = (s) => ({'Healthy':'info','Solid':'success','GGO':'warning','Malignant':'danger'}[s] || '')
const getOmicsColor = (t) => ({'Transcriptome':'#3498db','scRNA_seq':'#9b59b6','Radiomics':'#e67e22','Spatial_Transcriptome':'#1abc9c'}[t] || '#42b983')
const handleSortChange = ({ prop, order }) => { sortProp.value = prop; sortOrder.value = order; }
const resetFilters = () => { filterForm.value = { omics: [], sex: '', ageRange: [0, 100] }; filterText.value = ''; }
const showDetail = (row) => { currentDetail.value = row; drawerVisible.value = true; }

const exportData = (type) => {
  const data = type === 'current' ? filteredData.value : rawData.value
  const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, `LungNod_Data_${type}.xlsx`)
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await fetchSamples(route.query.stage)
    rawData.value = res || []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.res-page { background-color: #f8fafc; min-height: 100vh; padding: 0 20px 40px; }
.container-fluid { max-width: 1750px; margin: 0 auto; }
.action-bar { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; }

/* 配置面板样式 */
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
.card-title { font-weight: bold; font-size: 14px; }
.result-panel { flex: 1; min-width: 0; }
.table-container { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.id-text { font-family: 'Monaco', monospace; font-weight: bold; color: #42b983; }
.num-font { font-family: 'Inter', sans-serif; font-weight: 600; color: #475569; }
.pagination-area { margin-top: 15px; display: flex; justify-content: flex-end; }
.w-100 { width: 100%; }

.drawer-group { margin-bottom: 25px; padding: 0 20px; }
.drawer-title { font-size: 14px; font-weight: bold; color: #42b983; margin-bottom: 10px; padding-left: 10px; border-left: 4px solid #42b983; }

:deep(.table-header-custom) { background-color: #f9fafb !important; color: #475569; font-weight: 800 !important; font-size: 12px; }
</style>