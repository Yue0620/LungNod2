<template>
  <div class="res-page">
    <main class="container-fluid">
      <!-- 顶部操作 -->
      <div class="action-bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>样本数据库</el-breadcrumb-item>
        </el-breadcrumb>
        <div class="top-btns">
          <el-button-group>
            <el-button type="success" size="small" icon="Download" @click="exportData('current')">下载当前结果</el-button>
            <el-button type="warning" size="small" icon="Document" @click="exportData('all')">下载全库数据</el-button>
          </el-button-group>
        </div>
      </div>

      <!-- 动态列选择区 (增强版) -->
      <el-collapse v-model="activeCollapse" class="column-config-compact">
        <el-collapse-item name="config">
          <!-- 自定义标题，解决贴边问题 -->
          <template #title>
            <div class="collapse-title">临床维度控制面板 <small>(勾选以增加表格显示列)</small></div>
          </template>

          <!-- 快捷操作栏 -->
          <div class="config-toolbar">
            <el-button size="small" @click="visibleColumns = [...defaultCols]" plain>恢复默认显示</el-button>
            <el-button size="small" @click="selectAll" plain>全选所有维度</el-button>
            <el-button size="small" @click="visibleColumns = []" plain>清空所有勾选</el-button>
            <span class="column-count">已选中: <b>{{ visibleColumns.length }}</b> / {{ allFlatColumns.length }}</span>
          </div>

          <div class="compact-rows">
            <div v-for="group in columnGroups" :key="group.title" class="compact-row">
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
        <!-- 左侧筛选 (260px) -->
        <aside class="filter-panel">
          <el-card shadow="never" class="filter-card">
            <template #header><span class="card-title">数据过滤器</span></template>
            <el-form :model="filterForm" label-position="top" size="small">
              <el-form-item label="组学类型">
                <el-select v-model="filterForm.omics" multiple collapse-tags placeholder="全部">
                  <el-option v-for="t in omicsOptions" :key="t" :label="t" :value="t" />
                </el-select>
              </el-form-item>
              <el-form-item label="性别">
                <el-radio-group v-model="filterForm.sex">
                  <el-radio-button label="">全部</el-radio-button>
                  <el-radio-button label="Male">男</el-radio-button>
                  <el-radio-button label="Female">女</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="年龄范围">
                <el-slider v-model="filterForm.ageRange" range :min="0" :max="100" />
              </el-form-item>
              <el-form-item label="快速检索">
                <el-input v-model="filterText" placeholder="搜索 ID..." clearable prefix-icon="Search" />
              </el-form-item>
              <el-button type="primary" @click="resetFilters" plain class="w-100">重置所有条件</el-button>
            </el-form>
          </el-card>
        </aside>

        <!-- 右侧结果 -->
        <section class="result-panel">
          <div class="table-container">
            <el-table
                :data="pagedData" border stripe v-loading="loading"
                height="650" style="width: 100%"
                @sort-change="handleSortChange"
                header-cell-class-name="table-header-custom"
            >
              <!-- 固定核心列 (强制格式化 ID) -->
              <el-table-column fixed prop="subSampleId" label="ID" width="110">
                <template #default="scope">
                  <span class="id-text">{{ formatSubId(scope.row.subSampleId) }}</span>
                </template>
              </el-table-column>

              <el-table-column fixed prop="stage" label="分期" width="100" sortable="custom">
                <template #default="scope">
                  <el-tag :type="getStageTag(scope.row.stage)" size="small">{{ scope.row.stage }}</el-tag>
                </template>
              </el-table-column>

              <el-table-column fixed prop="omicsType" label="组学类型" width="220" sortable="custom">
                <template #default="scope">
                  <el-tag :color="getOmicsColor(scope.row.omicsType)" effect="dark" borderless style="color:white; font-size: 11px">
                    {{ scope.row.omicsType }}
                  </el-tag>
                </template>
              </el-table-column>

              <!-- 动态生成的 62+ 临床列 -->
              <el-table-column
                  v-for="col in activeColumns" :key="col.prop"
                  :prop="col.prop" :label="col.label"
                  :width="col.width || 140" sortable="custom"
                  show-overflow-tooltip
              >
                <template #default="scope">
                  <span v-if="isNumeric(scope.row[col.prop])" class="num-font">
                    {{ formatNumber(scope.row[col.prop]) }}
                  </span>
                  <span v-else>{{ scope.row[col.prop] || '--' }}</span>
                </template>
              </el-table-column>

              <el-table-column fixed="right" label="操作" width="80" align="center">
                <template #default="scope">
                  <el-button link type="primary" @click="showDetail(scope.row)">详情</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-area">
              <el-pagination
                  v-model:current-page="currentPage"
                  v-model:page-size="pageSize"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next"
                  :total="filteredData.length"
                  background
              />
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 详情抽屉 -->
    <el-drawer v-model="drawerVisible" :title="'样本详情 - ' + formatSubId(currentDetail.subSampleId)" size="40%">
      <el-scrollbar>
        <div v-for="group in columnGroups" :key="group.title" class="drawer-group">
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

const route = useRoute()
const loading = ref(true)
const rawData = ref([])
const activeCollapse = ref(['config'])
const drawerVisible = ref(false)
const currentDetail = ref({})
const filterText = ref('')

// --- 全量临床维度字段 (严格对应 MySQL 结构) ---
const columnGroups = [
  {
    title: "背景特征",
    columns: [
      { prop: 'individualId', label: '个体 ID' }, { prop: 'sex', label: '性别' }, { prop: 'age', label: '年龄' },
      { prop: 'bmi', label: 'BMI' }, { prop: 'race', label: '种族' }, { prop: 'ethnicity', label: '民族' }, { prop: 'birthYear', label: '出生年份' }
    ]
  },
  {
    title: "生活与暴露",
    columns: [
      { prop: 'smokingStatus', label: '吸烟状态' }, { prop: 'secondHandSmoke', label: '二手烟' }, { prop: 'smokingYears', label: '烟龄' },
      { prop: 'dailySmokingAmount', label: '日吸烟量' }, { prop: 'quitSmokingYears', label: '戒烟时长' }, { prop: 'alcoholFreq', label: '饮酒频率' }, { prop: 'occExposure', label: '职业暴露' }
    ]
  },
  {
    title: "病史与表现",
    columns: [
      { prop: 'famHistoryCancer', label: '家族癌史' }, { prop: 'relativeCancerHistory', label: '亲属癌史' }, { prop: 'pastMedicalHistory', label: '既往病史' }, { prop: 'primarySymptoms', label: '主诉症状' }
    ]
  },
  {
    title: "临床检验",
    columns: [
      { prop: 'cyfra21_1', label: 'CYFRA21-1' }, { prop: 'cea', label: 'CEA' }, { prop: 'nse', label: 'NSE' },
      { prop: 'crp', label: 'CRP' }, { prop: 'pct', label: 'PCT' }, { prop: 'esr', label: '血沉' }, { prop: 'tbTest', label: '结核' }
    ]
  },
  {
    title: "结节形态",
    columns: [
      { prop: 'majorDiameter', label: '大径(mm)' }, { prop: 'minorDiameter', label: '小径(mm)' }, { prop: 'noduleCount', label: '结节数' },
      { prop: 'morphology', label: '形态' }, { prop: 'location', label: '位置' }, { prop: 'spiculation', label: '毛刺' }, { prop: 'clarity', label: '清晰度' }
    ]
  },
  {
    title: "病理/基因/预后",
    columns: [
      { prop: 'tissueType', label: '组织类型' }, { prop: 'invasionDepth', label: '浸润深度' }, { prop: 'geneResults', label: '基因检测' },
      { prop: 'survivalStatus', label: '生存状态' }, { prop: 'survivalMonths', label: '存活月数' }, { prop: 'diagnosisTime', label: '确诊日期' }
    ]
  }
]

// 预设显示的列
const defaultCols = ['individualId', 'age', 'sex', 'majorDiameter', 'geneResults', 'cyfra21_1']
const visibleColumns = ref([...defaultCols])
const allFlatColumns = computed(() => columnGroups.flatMap(g => g.columns))
const activeColumns = computed(() => allFlatColumns.value.filter(col => visibleColumns.value.includes(col.prop)))

// 分页/筛选/排序
const filterForm = ref({ omics: [], sex: '', ageRange: [0, 100] })
const omicsOptions = ["Transcriptome", "scRNA_seq", "Spatial_Transcriptome", "Genomics", "Immunomics", "Proteomics", "Metabolome", "Radiomics", "GM_seq"]
const currentPage = ref(1)
const pageSize = ref(20)
const sortProp = ref('')
const sortOrder = ref('')

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

// --- 逻辑函数 ---
const selectAll = () => { visibleColumns.value = allFlatColumns.value.map(c => c.prop) }
const formatSubId = (id) => id ? id.split('_').slice(0, 2).join('_') : '--'
const isNumeric = (v) => !isNaN(parseFloat(v)) && isFinite(v) && typeof v !== 'boolean'
const formatNumber = (v) => parseFloat(v) % 1 === 0 ? v : parseFloat(v).toFixed(2)
const formatCellValue = (v) => (v === null || v === undefined || v === '') ? '--' : (isNumeric(v) ? formatNumber(v) : v)
const getStageTag = (s) => ({'Healthy':'info','Solid':'success','GGO':'warning','Malignant':'danger'}[s] || '')
const getOmicsColor = (t) => ({'Transcriptome':'#3498db','scRNA_seq':'#9b59b6','Radiomics':'#e67e22','Spatial_Transcriptome':'#1abc9c'}[t] || '#42b983')
const exportData = (type) => {
  const data = type === 'current' ? filteredData.value : rawData.value
  const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1"); XLSX.writeFile(wb, `LungNod_Data_${type}.xlsx`)
}
const handleSortChange = ({ prop, order }) => { sortProp.value = prop; sortOrder.value = order; }
const resetFilters = () => { filterForm.value = { omics: [], sex: '', ageRange: [0, 100] }; filterText.value = ''; }
const showDetail = (row) => { currentDetail.value = row; drawerVisible.value = true; }

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
.collapse-title { padding-left: 15px; font-weight: bold; color: #2c3e50; font-size: 14px; }
.collapse-title small { font-weight: normal; color: #94a3b8; margin-left: 10px; }

.config-toolbar { padding: 10px 20px; background: #fcfcfd; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 12px; }
.column-count { margin-left: auto; font-size: 12px; color: #94a3b8; }
.column-count b { color: #42b983; }

.compact-rows { padding: 10px 20px; }
.compact-row { display: flex; align-items: flex-start; margin-bottom: 6px; border-bottom: 1px dashed #f1f5f9; padding-bottom: 4px; }
.compact-row:last-child { border-bottom: none; }
.row-label { width: 100px; font-weight: bold; font-size: 11px; color: #64748b; flex-shrink: 0; padding-top: 5px; }
.row-checkboxes { display: flex; flex-wrap: wrap; gap: 2px; }

:deep(.el-checkbox) { margin-right: 12px; height: 24px; }
:deep(.el-checkbox__label) { font-size: 11px; padding-left: 4px; }

/* 布局 */
.layout-wrapper { display: flex; gap: 20px; align-items: flex-start; }
.filter-panel { flex: 0 0 260px; position: sticky; top: 20px; }
.card-title { font-weight: bold; font-size: 14px; }
.result-panel { flex: 1; min-width: 0; }
.table-container { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.id-text { font-family: 'Monaco', monospace; font-weight: bold; color: #409EFF; }
.num-font { font-family: 'Inter', sans-serif; font-weight: 600; color: #475569; }
.pagination-area { margin-top: 15px; display: flex; justify-content: flex-end; }
.w-100 { width: 100%; }

/* 抽屉 */
.drawer-group { margin-bottom: 25px; padding: 0 20px; }
.drawer-title { font-size: 14px; font-weight: bold; color: #42b983; margin-bottom: 10px; padding-left: 10px; border-left: 4px solid #42b983; }

:deep(.table-header-custom) { background-color: #f9fafb !important; color: #475569; font-weight: 800 !important; font-size: 12px; }
</style>