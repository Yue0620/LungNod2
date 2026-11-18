<template>
  <section class="section-block">
    <div class="section-title">{{ t('basicVisualization') }}</div>

    <div class="basic-card">
      <div v-if="analysisLoading" class="loading-wrapper">
        <el-skeleton :rows="6" animated />
      </div>

      <el-empty v-else-if="!analysis" :description="t('empty')" :image-size="72" />

      <template v-else>
        <div class="basic-toolbar">
          <div class="label-summary">
            <el-tag v-for="item in analysis.labels" :key="item.label" size="small" effect="plain">
              {{ item.label }}: {{ item.count }}
            </el-tag>
          </div>
          <el-select v-model="selectedComparisonId" size="small" class="comparison-select" filterable>
            <el-option
              v-for="comparison in analysis.comparisons"
              :key="comparison.id"
              :label="`${comparison.groupA} vs ${comparison.groupB}`"
              :value="comparison.id"
            />
          </el-select>
        </div>

        <div v-if="selectedComparison" class="comparison-stats">
          <div class="stat-item">
            <span>{{ t('totalGenes') }}</span>
            <strong>{{ selectedComparison.totalGenes }}</strong>
          </div>
          <div class="stat-item">
            <span>{{ t('significantGenes') }}</span>
            <strong>{{ selectedComparison.significantGenes }}</strong>
          </div>
          <div class="stat-item up">
            <span>{{ selectedComparison.groupA }}</span>
            <strong>{{ selectedComparison.upGenes }}</strong>
          </div>
          <div class="stat-item down">
            <span>{{ selectedComparison.groupB }}</span>
            <strong>{{ selectedComparison.downGenes }}</strong>
          </div>
        </div>

        <div class="visualization-stack">
          <div class="chart-panel">
            <div class="chart-title">{{ t('volcano') }}</div>
            <div ref="volcanoRef" class="basic-chart volcano-chart" />
            <div class="top-genes-panel">
              <div class="chart-title compact-title">{{ t('topGenes') }}</div>
              <table class="top-genes-table">
                <thead>
                  <tr>
                    <th>{{ t('gene') }}</th>
                    <th>{{ t('log2fc') }}</th>
                    <th>FDR</th>
                    <th>{{ t('pValue') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="gene in pagedTopGenes" :key="gene.gene">
                    <td :title="gene.gene">{{ gene.gene }}</td>
                    <td :class="gene.log2FoldChange >= 0 ? 'fc-up' : 'fc-down'">{{ formatFixed(gene.log2FoldChange, 3) }}</td>
                    <td>{{ formatSci(gene.adjPValue) }}</td>
                    <td>{{ formatSci(gene.pValue) }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="top-genes-footer">
                <div class="top-genes-note">
                  <span class="note-red">{{ t('red') }}</span> {{ selectedComparison.groupA }} up;
                  <span class="note-blue">{{ t('blue') }}</span> {{ selectedComparison.groupB }} up
                </div>
                <el-pagination
                  v-model:current-page="topGenePage"
                  small
                  background
                  layout="prev, pager, next"
                  :page-size="topGenePageSize"
                  :total="selectedComparison.topGenes.length"
                />
              </div>
            </div>
          </div>
          <div class="chart-panel">
            <div class="chart-title">{{ t('heatmap') }}</div>
            <div class="heatmap-legends">
              <div class="label-legend">
                <span v-for="label in heatmapView.uniqueLabels" :key="label" class="legend-item">
                  <i :style="{ backgroundColor: labelColor(label) }"></i>{{ compactName(label, 24) }}
                </span>
              </div>
              <div class="z-legend"><span>-2</span><i></i><span>2</span></div>
            </div>
            <div class="heatmap-scroll">
              <div class="sample-strip" :style="heatmapGridStyle">
                <div></div>
                <div
                  v-for="sample in heatmapView.samples"
                  :key="sample.sample"
                  class="sample-color-cell"
                  :style="{ backgroundColor: labelColor(sample.label) }"
                  :title="`${sample.sample}: ${sample.label}`"
                ></div>
              </div>
              <div class="sample-name-row" :style="heatmapGridStyle">
                <div></div>
                <div v-for="sample in heatmapView.samples" :key="sample.sample" class="sample-name" :title="sample.sample">
                  <span>{{ sample.sample }}</span>
                </div>
              </div>
              <div v-for="row in heatmapView.rows" :key="row.gene" class="heatmap-row" :style="heatmapGridStyle">
                <div class="gene-label" :title="row.gene">{{ row.gene }}</div>
                <div
                  v-for="cell in row.values"
                  :key="`${row.gene}-${cell.sample}`"
                  class="heat-cell"
                  :style="{ backgroundColor: zColor(cell.value) }"
                  :title="`${row.gene}\n${cell.sample}\nZ-score: ${cell.value}`"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="expression-panel">
          <div class="expression-header">
            <div>
              <div class="chart-title">{{ t('geneExpression') }}</div>
              <div class="expression-subtitle">{{ t('geneExpressionHint') }}</div>
            </div>
            <el-select
              v-model="selectedGeneIds"
              multiple
              filterable
              remote
              clearable
              reserve-keyword
              collapse-tags
              collapse-tags-tooltip
              :remote-method="searchGenes"
              :loading="expressionIndexLoading || expressionLoading"
              :placeholder="t('searchGenes')"
              class="gene-select"
            >
              <el-option
                v-for="gene in displayGeneOptions"
                :key="gene.geneId"
                :label="gene.label"
                :value="gene.geneId"
              />
            </el-select>
          </div>
          <el-empty v-if="!selectedGeneIds.length" :description="t('selectGenes')" :image-size="64" />
          <div v-else class="expression-scroll">
            <div ref="expressionChartRef" class="expression-chart" />
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { currentLang } from '@/store/lang.js'

const props = defineProps({
  projectId: { type: String, required: true },
  datasetId: { type: String, required: true }
})

const i18n = {
  zh: {
    basicVisualization: '基础可视化',
    empty: '当前数据集没有可用的多组别差异分析结果',
    totalGenes: '检测基因',
    significantGenes: '差异基因',
    volcano: '火山图',
    heatmap: 'Top 差异基因热图',
    upIn: '上调于',
    downIn: '上调于',
    adjP: '校正 P 值',
    pValue: 'P 值',
    topGenes: 'Top Differential Genes',
    gene: 'Gene',
    log2fc: 'log2FC',
    red: '红色',
    blue: '蓝色',
    geneExpression: '基因表达箱式图',
    geneExpressionHint: '搜索并选择多个基因，查看所有样本中 log2(expression + 1) 的分布。',
    searchGenes: '搜索基因名或 Gene ID',
    selectGenes: '请选择基因'
  },
  en: {
    basicVisualization: 'Basic Visualization',
    empty: 'No multi-label differential analysis result is available for this dataset',
    totalGenes: 'Tested Genes',
    significantGenes: 'DE Genes',
    volcano: 'Volcano Plot',
    heatmap: 'Top DE Gene Heatmap',
    upIn: 'Up in',
    downIn: 'Up in',
    adjP: 'Adjusted P',
    pValue: 'P value',
    topGenes: 'Top Differential Genes',
    gene: 'Gene',
    log2fc: 'log2FC',
    red: 'Red',
    blue: 'Blue',
    geneExpression: 'Gene Expression Boxplot',
    geneExpressionHint: 'Search and select multiple genes to view log2(expression + 1) distribution across all samples.',
    searchGenes: 'Search gene symbol or Gene ID',
    selectGenes: 'Select genes to show expression boxplots'
  }
}

const t = (key) => i18n[currentLang.value]?.[key] || key
const publicAssetUrl = (value) => `${import.meta.env.BASE_URL}${String(value || '').replace(/^\/+/, '')}`

const basicModules = import.meta.glob('@/data/basic/*_basic.json', { import: 'default' })
const analysisLoading = ref(false)
const analysis = ref(null)
const selectedComparisonId = ref('')
const topGenePage = ref(1)
const topGenePageSize = 10
const volcanoRef = ref(null)
const expressionChartRef = ref(null)
const expressionIndexLoading = ref(false)
const expressionLoading = ref(false)
const expressionIndex = ref(null)
const geneOptions = ref([])
const selectedGeneIds = ref([])
const expressionRows = ref([])
let volcanoChart = null
let expressionChart = null
let loadToken = 0

const labelColors = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b', '#64748b', '#db2777'
]

const datasetKey = computed(() => `${props.projectId}_${props.datasetId}`)
const selectedComparison = computed(() => {
  if (!analysis.value) return null
  return analysis.value.comparisons.find(item => item.id === selectedComparisonId.value) || analysis.value.comparisons[0] || null
})
const geneMap = computed(() => new Map((expressionIndex.value?.genes || []).map(gene => [gene.geneId, gene])))
const selectedGeneItems = computed(() => selectedGeneIds.value.map(id => geneMap.value.get(id)).filter(Boolean))
const displayGeneOptions = computed(() => {
  const seen = new Set()
  return [...selectedGeneItems.value, ...geneOptions.value]
    .filter(gene => {
      if (!gene || seen.has(gene.geneId)) return false
      seen.add(gene.geneId)
      return true
    })
    .map(gene => ({ ...gene, label: gene.gene === gene.geneId ? gene.gene : `${gene.gene} (${gene.geneId})` }))
})
const pagedTopGenes = computed(() => {
  const rows = selectedComparison.value?.topGenes || []
  const start = (topGenePage.value - 1) * topGenePageSize
  return rows.slice(start, start + topGenePageSize)
})
const heatmapCellWidth = computed(() => {
  const count = heatmapView.value.samples.length
  if (count <= 16) return 30
  if (count <= 28) return 22
  if (count <= 60) return 16
  return 12
})
const heatmapGridStyle = computed(() => ({
  gridTemplateColumns: `92px repeat(${heatmapView.value.samples.length}, ${heatmapCellWidth.value}px)`
}))
const heatmapView = computed(() => {
  const comparison = selectedComparison.value
  if (!comparison) return { samples: [], uniqueLabels: [], rows: [] }

  const samples = comparison.heatmapSamples
  const valueMap = new Map(comparison.heatmapValues.map(([sampleIndex, geneIndex, value]) => [`${geneIndex}-${sampleIndex}`, value]))
  const rows = comparison.heatmapGenes.map((gene, geneIndex) => ({
    gene,
    values: samples.map((sample, sampleIndex) => ({
      sample: sample.sample,
      value: valueMap.get(`${geneIndex}-${sampleIndex}`) ?? 0
    }))
  }))

  return {
    samples,
    uniqueLabels: [...new Set(samples.map(item => item.label))],
    rows
  }
})

function compactName(name, max = 34) {
  if (!name || name.length <= max) return name
  return `${name.slice(0, max - 1)}...`
}

function formatFixed(value, digits = 3) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(digits) : '--'
}

function formatSci(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  if (num === 0) return '<1e-300'
  return num.toExponential(2)
}

function labelColor(label) {
  const labels = heatmapView.value.uniqueLabels
  const index = Math.max(0, labels.indexOf(label))
  return labelColors[index % labelColors.length]
}

function mixColor(from, to, ratio) {
  const clamp = Math.max(0, Math.min(1, ratio))
  return from.map((value, index) => Math.round(value + (to[index] - value) * clamp))
}

function zColor(value) {
  const z = Math.max(-2, Math.min(2, Number(value) || 0))
  const blue = [37, 99, 235]
  const white = [248, 250, 252]
  const red = [220, 38, 38]
  const rgb = z < 0 ? mixColor(white, blue, Math.abs(z) / 2) : mixColor(white, red, z / 2)
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

function quantile(sorted, q) {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] === undefined ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base])
}

function boxStats(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return [0, 0, 0, 0, 0]
  return [sorted[0], quantile(sorted, 0.25), quantile(sorted, 0.5), quantile(sorted, 0.75), sorted[sorted.length - 1]]
}

function searchGenes(query) {
  const genes = expressionIndex.value?.genes || []
  const q = String(query || '').trim().toLowerCase()
  if (!q) {
    geneOptions.value = genes.slice(0, 40)
    return
  }
  geneOptions.value = genes
    .filter(gene => gene.gene.toLowerCase().includes(q) || gene.geneId.toLowerCase().includes(q))
    .slice(0, 80)
}

async function loadExpressionIndex(value) {
  expressionIndex.value = null
  geneOptions.value = []
  selectedGeneIds.value = []
  expressionRows.value = []
  expressionChart?.clear()
  expressionIndexLoading.value = true
  try {
    const response = await fetch(publicAssetUrl(`basic-expression/${value}_expression.json`))
    if (!response.ok) return
    expressionIndex.value = await response.json()
    searchGenes('')
  } finally {
    expressionIndexLoading.value = false
  }
}

async function fetchExpressionRow(gene) {
  const end = gene.offset + gene.length - 1
  const response = await fetch(publicAssetUrl(expressionIndex.value.matrixFile), { headers: { Range: `bytes=${gene.offset}-${end}` } })
  const text = await response.text()
  const line = response.status === 206 ? text.trim() : text.split('\n').find(row => row.includes(`\t${gene.geneId}\t`) || row.startsWith(`${gene.gene}\t${gene.geneId}\t`))
  if (!line) return null
  const parts = line.trim().split('\t')
  return { gene: parts[0], geneId: parts[1], values: parts.slice(2).map(Number) }
}

async function loadSelectedExpressionRows() {
  if (!expressionIndex.value || selectedGeneIds.value.length === 0) {
    expressionRows.value = []
    renderExpressionBoxplot()
    return
  }
  expressionLoading.value = true
  try {
    const rows = []
    for (const id of selectedGeneIds.value) {
      const gene = geneMap.value.get(id)
      if (!gene) continue
      const row = await fetchExpressionRow(gene)
      if (row) rows.push(row)
    }
    expressionRows.value = rows
  } finally {
    expressionLoading.value = false
  }
  renderExpressionBoxplot()
}

function renderExpressionBoxplot() {
  const el = expressionChartRef.value
  if (!el) return
  if (!expressionIndex.value || expressionRows.value.length === 0) {
    expressionChart?.clear()
    return
  }
  if (!expressionChart) expressionChart = echarts.init(el, null, { renderer: 'svg' })

  const labels = expressionIndex.value.labels
  const samples = expressionIndex.value.samples
  const genes = expressionRows.value.map(row => row.gene)
  const width = Math.max(720, genes.length * Math.max(140, labels.length * 28) + 120)
  el.style.width = width + 'px'
  el.style.height = '360px'

  const series = labels.map((label, labelIndex) => {
    const color = labelColors[labelIndex % labelColors.length]
    return {
      name: label,
      type: 'boxplot',
      data: expressionRows.value.map(row => boxStats(row.values.filter((value, sampleIndex) => samples[sampleIndex]?.label === label))),
      boxWidth: ['18%', '55%'],
      itemStyle: { color, borderColor: color, opacity: 0.72 }
    }
  })

  expressionChart.setOption({
    animation: false,
    legend: { type: 'scroll', top: 4, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 } },
    tooltip: {
      trigger: 'item',
      formatter(params) {
        const d = params.data
        return `${params.seriesName}<br/>${params.name}<br/>Min: ${formatFixed(d[0])}<br/>Q1: ${formatFixed(d[1])}<br/>Median: ${formatFixed(d[2])}<br/>Q3: ${formatFixed(d[3])}<br/>Max: ${formatFixed(d[4])}`
      }
    },
    grid: { left: 60, right: 24, top: 48, bottom: 70 },
    xAxis: { type: 'category', data: genes, axisLabel: { rotate: genes.length > 4 ? 35 : 0, fontSize: 11 } },
    yAxis: { type: 'value', name: 'log2(expression + 1)', nameLocation: 'middle', nameRotate: 90, nameGap: 42, splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } } },
    series
  }, true)
  expressionChart.resize()
}
function renderVolcano() {
  const comparison = selectedComparison.value
  const el = volcanoRef.value
  if (!comparison || !el) return
  if (!volcanoChart) volcanoChart = echarts.init(el, null, { renderer: 'svg' })

  const up = []
  const down = []
  const neutral = []
  for (const point of comparison.volcanoPoints) {
    if (point[5] === 1) up.push(point)
    else if (point[5] === -1) down.push(point)
    else neutral.push(point)
  }
  const maxAbsLog2FC = Math.max(...comparison.volcanoPoints.map(point => Math.abs(Number(point[0]) || 0)))
  const xLimit = Math.max(2, Math.ceil(maxAbsLog2FC))

  volcanoChart.setOption({
    animation: false,
    grid: { left: 58, right: 20, top: 48, bottom: 76 },
    tooltip: {
      trigger: 'item',
      formatter(params) {
        const d = params.data
        return `${d[2]}<br/>log2FC: ${d[0]}<br/>-log10(FDR): ${d[1]}<br/>${t('adjP')}: ${d[3]}<br/>${t('pValue')}: ${d[4]}`
      }
    },
    legend: { top: 4, left: 'center', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 10 }, selected: { NS: false }, data: [t('downIn') + ' ' + compactName(comparison.groupB, 12), 'NS', t('upIn') + ' ' + compactName(comparison.groupA, 12)] },
    xAxis: {
      type: 'value',
      name: `log2FC\n(${comparison.groupA} / ${comparison.groupB})`,
      nameLocation: 'middle',
      min: -xLimit,
      max: xLimit,
      nameGap: 44,
      nameTextStyle: { lineHeight: 18 },
      splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
    },
    yAxis: {
      type: 'value',
      name: '-log10(FDR)',
      nameLocation: 'middle',
      nameRotate: 90,
      nameGap: 42,
      splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
    },
    series: [
      {
        name: t('downIn') + ' ' + compactName(comparison.groupB, 12),
        type: 'scatter',
        data: down,
        symbolSize: 5,
        itemStyle: { color: '#2563eb', opacity: 0.75 }
      },
      {
        name: 'NS',
        type: 'scatter',
        data: neutral,
        symbolSize: 4,
        itemStyle: { color: '#94a3b8', opacity: 0.42 }
      },
      {
        name: t('upIn') + ' ' + compactName(comparison.groupA, 12),
        type: 'scatter',
        data: up,
        symbolSize: 5,
        itemStyle: { color: '#dc2626', opacity: 0.75 }
      },
      {
        name: 'threshold',
        type: 'line',
        data: [],
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: false },
          lineStyle: { color: '#64748b', type: 'dashed', width: 1 },
          data: [{ xAxis: -1 }, { xAxis: 1 }, { yAxis: -Math.log10(0.05) }]
        }
      }
    ]
  }, true)
  volcanoChart.resize()
}

function renderCharts() {
  nextTick(() => renderVolcano())
}

watch(datasetKey, async value => {
  loadExpressionIndex(value)
  const token = ++loadToken
  selectedComparisonId.value = ''
  analysis.value = null
  const entry = Object.entries(basicModules).find(([filePath]) => filePath.endsWith(`/${value}_basic.json`))
  if (!entry) return
  analysisLoading.value = true
  try {
    const loaded = await entry[1]()
    if (token !== loadToken) return
    analysis.value = loaded
    selectedComparisonId.value = loaded?.comparisons?.[0]?.id || ''
  } finally {
    if (token === loadToken) analysisLoading.value = false
  }
}, { immediate: true })

watch(selectedComparison, () => { topGenePage.value = 1 })
watch(selectedGeneIds, loadSelectedExpressionRows)
watch([selectedComparison, currentLang], renderCharts, { flush: 'post' })

onBeforeUnmount(() => {
  volcanoChart?.dispose()
  expressionChart?.dispose()
})
</script>

<style scoped>
.section-block { margin-bottom: 28px; }
.section-title { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 12px; padding-left: 12px; border-left: 4px solid #42b983; }
.basic-card { background: #fff; border-radius: 10px; padding: 10px 15px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.loading-wrapper { padding: 20px; }
.basic-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
.label-summary { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
.comparison-select { flex: 0 0 360px; max-width: 45%; }
.comparison-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 8px; }
.stat-item { min-width: 0; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; background: #f8fafc; }
.stat-item span { display: block; color: #64748b; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stat-item strong { display: block; color: #1e293b; font-size: 18px; line-height: 1.3; }
.stat-item.up strong { color: #dc2626; }
.stat-item.down strong { color: #2563eb; }
.visualization-stack { display: grid; grid-template-columns: minmax(380px, 0.9fr) minmax(520px, 1.1fr); gap: 14px; align-items: start; margin-top: 4px; }
.chart-panel { min-width: 0; border-top: 1px solid #e2e8f0; padding-top: 12px; }
.chart-title { color: #1e293b; font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.basic-chart { width: 100%; height: 340px; }
.top-genes-panel { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
.compact-title { margin-bottom: 6px; }
.top-genes-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
.top-genes-table th { color: #64748b; font-weight: 700; text-align: center; border-bottom: 1px solid #e2e8f0; padding: 5px 6px; }
.top-genes-table td { color: #334155; border-bottom: 1px solid #edf2f7; padding: 5px 6px; text-align: center; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top-genes-table th:nth-child(1), .top-genes-table td:nth-child(1) { width: 26%; }
.top-genes-table th:nth-child(2), .top-genes-table td:nth-child(2) { width: 18%; }
.top-genes-table th:nth-child(3), .top-genes-table td:nth-child(3) { width: 20%; }
.top-genes-table th:nth-child(4), .top-genes-table td:nth-child(4) { width: 20%; }
.top-genes-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 7px; }
.top-genes-note { color: #64748b; font-size: 9px; line-height: 1.25; min-width: 0; }
.note-red { color: #dc2626; font-weight: 700; }
.note-blue { color: #2563eb; font-weight: 700; }
.fc-up { color: #dc2626 !important; font-weight: 700; }
.fc-down { color: #2563eb !important; font-weight: 700; }
.heatmap-legends { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.label-legend { display: flex; flex-wrap: wrap; gap: 6px 10px; min-width: 0; }
.legend-item { display: inline-flex; align-items: center; gap: 4px; color: #475569; font-size: 10px; }
.legend-item i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.z-legend { display: inline-flex; align-items: center; gap: 5px; color: #64748b; font-size: 10px; flex: 0 0 auto; }
.z-legend i { width: 76px; height: 10px; border-radius: 2px; background: linear-gradient(90deg, #2563eb, #f8fafc, #dc2626); border: 1px solid #e2e8f0; }
.heatmap-scroll { overflow-x: auto; padding: 0 4px 4px; }
.sample-strip,
.sample-name-row,
.heatmap-row { display: grid; column-gap: 1px; width: max-content; margin-left: auto; margin-right: auto; }
.sample-strip { margin-bottom: 2px; }
.sample-color-cell { height: 10px; border-radius: 1px; }
.sample-name-row { height: 68px; align-items: start; }
.sample-name { position: relative; height: 68px; overflow: visible; }
.sample-name span { position: absolute; top: 2px; left: 8px; transform: rotate(60deg); transform-origin: left top; color: #64748b; font-size: 10px; white-space: nowrap; }
.heatmap-row { margin-bottom: 1px; }
.gene-label { height: 12px; line-height: 12px; padding-right: 6px; color: #334155; font-size: 10px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.heat-cell { width: 100%; height: 12px; border-radius: 1px; }
.expression-panel { margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
.expression-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 10px; }
.expression-subtitle { color: #64748b; font-size: 10px; line-height: 1.35; }
.gene-select { flex: 0 0 420px; max-width: 50%; }
.expression-scroll { overflow-x: auto; padding-bottom: 2px; }
.expression-chart { width: 100%; min-width: 720px; height: 360px; }
@media (max-width: 1100px) {
  .visualization-stack { grid-template-columns: 1fr; }
  .basic-toolbar { flex-direction: column; }
  .comparison-select { flex: none; max-width: 100%; width: 100%; }
  .comparison-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .expression-header { flex-direction: column; }
  .gene-select { flex: none; max-width: 100%; width: 100%; }
}
</style>