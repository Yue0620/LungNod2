<template>
  <div class="res-page">
    <main class="container-fluid">
      <div class="action-bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">{{ t('home') }}</el-breadcrumb-item>
          <el-breadcrumb-item :to="{ path: '/data-search' }">{{ t('dataSearch') }}</el-breadcrumb-item>
          <el-breadcrumb-item>{{ route.params.projectId }} / {{ route.params.datasetId }}</el-breadcrumb-item>
        </el-breadcrumb>
        <div class="top-btns">
          <el-button size="small" @click="goBack">{{ t('back') }}</el-button>
        </div>
      </div>

      <section class="section-block">
        <div class="section-title">{{ t('dataInfo') }}</div>
        <div v-if="rowData" class="dataset-info-card">
          <div v-for="group in metaGroups" :key="group.title" class="meta-group">
            <div class="meta-group-title">{{ group.title }}</div>
            <el-descriptions :column="4" border size="small">
              <el-descriptions-item v-for="col in filterExisting(group.columns)" :key="col.prop" :label="col.label">
                {{ rowData[col.prop] ?? '--' }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

      </section>

      <template v-if="rowData">
        <SingleCellVisualization
          v-if="isTranscriptome10x"
          :project-id="String(route.params.projectId || '')"
          :dataset-id="String(route.params.datasetId || '')"
        />
        <BasicVisualization
          v-else
          :project-id="String(route.params.projectId || '')"
          :dataset-id="String(route.params.datasetId || '')"
        />
      </template>

      <section v-if="rowData && !isTranscriptome10x" class="section-block">
        <div class="section-title">{{ t('visualization') }}</div>

        <div v-if="loading" class="loading-wrapper">
          <el-skeleton :rows="6" animated />
        </div>

        <div v-else>
          <el-tabs v-model="activeTab" class="detail-tabs">
          <el-tab-pane :label="'ESTIMATE (' + estimateData.length + ')'" name="estimate">
            <div class="tab-toolbar">
              <span></span>
              <el-button size="small" type="primary" @click="downloadSVG('estimate')">SVG</el-button>
              <el-button size="small" type="primary" @click="downloadPNG('estimate')">PNG</el-button>
              <el-button size="small" type="primary" icon="Download" @click="downloadCSV('estimate')">{{ t('download') }}</el-button>
            </div>
            <p class="algo-desc">ESTIMATE algorithm infers tumor purity and infiltration levels of stromal / immune cells using gene expression signatures.</p>
            <div class="chart-scroll">
              <div ref="estimateChartRef" class="heatmap-chart" />
            </div>
          </el-tab-pane>

          <el-tab-pane :label="'MCP-counter (' + mcpData.length + ')'" name="mcp">
            <div class="tab-toolbar">
              <span></span>
              <el-button size="small" type="primary" @click="downloadSVG('mcp')">SVG</el-button>
              <el-button size="small" type="primary" @click="downloadPNG('mcp')">PNG</el-button>
              <el-button size="small" type="primary" icon="Download" @click="downloadCSV('mcp')">{{ t('download') }}</el-button>
            </div>
            <p class="algo-desc">MCP-counter quantifies the absolute abundance of 10 immune and stromal cell populations in heterogeneous tissues from transcriptomic data.</p>
            <div class="chart-scroll">
              <div ref="mcpChartRef" class="heatmap-chart" />
            </div>
          </el-tab-pane>

          <el-tab-pane :label="'xCell (' + xcellData.length + ')'" name="xcell">
            <div class="tab-toolbar">
              <span></span>
              <el-button size="small" type="primary" @click="downloadSVG('xcell')">SVG</el-button>
              <el-button size="small" type="primary" @click="downloadPNG('xcell')">PNG</el-button>
              <el-button size="small" type="primary" icon="Download" @click="downloadCSV('xcell')">{{ t('download') }}</el-button>
            </div>
            <p class="algo-desc">xCell performs cell type enrichment analysis based on gene expression data, providing scores for 37 immune and stromal cell types.</p>
            <div class="chart-scroll">
              <div ref="xcellChartRef" class="heatmap-chart" />
            </div>
          </el-tab-pane>

          <el-tab-pane :label="'EPIC (' + epicData.length + ')'" name="epic">
            <div class="tab-toolbar">
              <span></span>
              <el-button size="small" type="primary" @click="downloadSVG('epic')">SVG</el-button>
              <el-button size="small" type="primary" @click="downloadPNG('epic')">PNG</el-button>
              <el-button size="small" type="primary" icon="Download" @click="downloadCSV('epic')">{{ t('download') }}</el-button>
            </div>
            <p class="algo-desc">EPIC infers the proportion of immune and stromal cells in bulk tumor samples using gene expression data and a curated set of reference profiles.</p>
            <div class="chart-scroll">
              <div ref="epicChartRef" class="heatmap-chart" />
            </div>
          </el-tab-pane>

          <el-tab-pane :label="'quantiseq (' + quantiseqData.length + ')'" name="quantiseq">
            <div class="tab-toolbar">
              <span></span>
              <el-button size="small" type="primary" @click="downloadSVG('quantiseq')">SVG</el-button>
              <el-button size="small" type="primary" @click="downloadPNG('quantiseq')">PNG</el-button>
              <el-button size="small" type="primary" icon="Download" @click="downloadCSV('quantiseq')">{{ t('download') }}</el-button>
            </div>
            <p class="algo-desc">quantiseq estimates the fraction of immune cell types from bulk RNA-seq data using a constrained least squares regression approach.</p>
            <div class="chart-scroll">
              <div ref="quantiseqChartRef" class="heatmap-chart" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </section>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { currentLang } from '@/store/lang.js'
import { fetchDataDetail } from '@/api/nodule'
import BasicVisualization from '@/components/BasicVisualization.vue'
import SingleCellVisualization from '@/components/SingleCellVisualization.vue'

const i18n = {
  zh: {
    home: '首页', dataSearch: '数据检索', back: '返回', download: '下载 CSV',
    myProjectId: '项目ID', myDatasetId: '数据集ID', projectId: 'Project ID',
    datasetId: '数据集编号', bioProjectId: 'BioProject ID', datasetName: '数据集名称',
    disease: '疾病', tissue: '组织', omicsType: '组学类型', species: '物种',
    sampleNumber: '样本数', strategy: '测序策略',     dataFormat: '数据格式',
    gBasic: '基础信息', gDataset: '数据集信息', gSequence: '测序信息', gBiodata: '生物数据',
    dataInfo: '数据信息', visualization: '免疫可视化'
  },
  en: {
    home: 'Home', dataSearch: 'Data Search', back: 'Back', download: 'Download CSV',
    myProjectId: 'Project ID', myDatasetId: 'Dataset ID', projectId: 'Project ID',
    datasetId: 'Dataset Code', bioProjectId: 'BioProject ID', datasetName: 'Dataset Name',
    disease: 'Disease', tissue: 'Tissue', omicsType: 'Omics Type', species: 'Species',
    sampleNumber: 'Samples', strategy: 'Strategy', dataFormat: 'Format',
    gBasic: 'Basic Info', gDataset: 'Dataset', gSequence: 'Sequencing', gBiodata: 'Biodata',
    dataInfo: 'Data Information', visualization: 'Immune Visualization'
  }
}

const t = (key) => i18n[currentLang.value][key] || key

const columnGroups = [
  { title: 'Dataset Name', columns: [{ prop: 'datasetName', label: t('datasetName') }] },
  { title: t('gBasic'), columns: ['myProjectId', 'myDatasetId', 'projectId', 'datasetId', 'bioProjectId'].map(prop => ({ prop, label: t(prop) })) },
  { title: t('gDataset'), columns: ['species', 'sampleNumber'].map(prop => ({ prop, label: t(prop) })) },
  { title: t('gSequence'), columns: ['strategy', 'omicsType', 'dataFormat'].map(prop => ({ prop, label: t(prop) })) },
  { title: t('gBiodata'), columns: ['disease', 'tissue'].map(prop => ({ prop, label: t(prop) })) }
]

const metaGroups = ref(columnGroups)

function filterExisting(cols) {
  return cols.filter(c => rowData.value && c.prop in rowData.value)
}

const route = useRoute()
const router = useRouter()
const activeTab = ref('estimate')
const loading = ref(true)
const rowData = ref(null)
const isTranscriptome10x = computed(() => String(rowData.value?.omicsType || '').toLowerCase() === 'transcriptome_10x')
const estimateData = ref([])
const mcpData = ref([])
const xcellData = ref([])
const epicData = ref([])
const quantiseqData = ref([])
const mcpColumns = ref([])
const xcellColumns = ref([])
const epicColumns = ref([])
const quantiseqColumns = ref([])

const estimateRaw = ref('')
const mcpRaw = ref('')
const xcellRaw = ref('')
const epicRaw = ref('')
const quantiseqRaw = ref('')

const estimateChartRef = ref(null)
const mcpChartRef = ref(null)
const xcellChartRef = ref(null)
const epicChartRef = ref(null)
const quantiseqChartRef = ref(null)

let estimateChart = null
let mcpChart = null
let xcellChart = null
let epicChart = null
let quantiseqChart = null

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim())
    if (vals.length === headers.length) {
      const obj = {}
      headers.forEach((h, idx) => { obj[h] = vals[idx] })
      rows.push(obj)
    }
  }
  return { headers, rows }
}

function goBack() {
  router.push({ name: 'DataSearch' })
}

function downloadCSV(type) {
  let content, filename
  const prefix = `${route.params.projectId}_${route.params.datasetId}`
  if (type === 'estimate') {
    content = estimateRaw.value
    filename = `${prefix}_Transcriptome_ImmuneScore.csv`
  } else if (type === 'mcp') {
    content = mcpRaw.value
    filename = `${prefix}_Transcriptome_MCPcounter.csv`
  } else if (type === 'xcell') {
    content = xcellRaw.value
    filename = `${prefix}_Transcriptome_xcell.csv`
  } else if (type === 'epic') {
    content = epicRaw.value
    filename = `${prefix}_Transcriptome_epic.csv`
  } else {
    content = quantiseqRaw.value
    filename = `${prefix}_Transcriptome_quantiseq.csv`
  }
  if (!content) return
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function svgFileName(type) {
  const prefix = `${route.params.projectId}_${route.params.datasetId}`
  if (type === 'estimate') return `${prefix}_Transcriptome_ImmuneScore.svg`
  if (type === 'mcp') return `${prefix}_Transcriptome_MCPcounter.svg`
  if (type === 'xcell') return `${prefix}_Transcriptome_xCell.svg`
  if (type === 'epic') return `${prefix}_Transcriptome_epic.svg`
  return `${prefix}_Transcriptome_quantiseq.svg`
}

function pngFileName(type) {
  const prefix = `${route.params.projectId}_${route.params.datasetId}`
  if (type === 'estimate') return `${prefix}_Transcriptome_ImmuneScore.png`
  if (type === 'mcp') return `${prefix}_Transcriptome_MCPcounter.png`
  if (type === 'xcell') return `${prefix}_Transcriptome_xCell.png`
  if (type === 'epic') return `${prefix}_Transcriptome_epic.png`
  return `${prefix}_Transcriptome_quantiseq.png`
}

function getChart(type) {
  if (type === 'estimate') return estimateChart
  if (type === 'mcp') return mcpChart
  if (type === 'xcell') return xcellChart
  if (type === 'epic') return epicChart
  return quantiseqChart
}

function downloadSVG(type) {
  const chart = getChart(type)
  if (!chart) return
  const url = chart.getDataURL({ type: 'svg', backgroundColor: '#fff' })
  const a = document.createElement('a')
  a.href = url
  a.download = svgFileName(type)
  a.click()
}

function downloadPNG(type) {
  const chart = getChart(type)
  if (!chart) return
  const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
  const a = document.createElement('a')
  a.href = url
  a.download = pngFileName(type)
  a.click()
}

const LABEL_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b'
]

function calcBoxplotStats(vals) {
  if (vals.length === 0) return [0, 0, 0, 0, 0]
  const s = [...vals].sort((a, b) => a - b)
  const n = s.length
  return [
    s[0],
    n > 1 ? s[Math.round(n * 0.25)] : s[0],
    n > 1 ? s[Math.round(n * 0.5)] : s[0],
    n > 1 ? s[Math.round(n * 0.75)] : s[0],
    s[n - 1]
  ]
}

function buildHeatmapOption(rows, fieldNames, sampleKey, title, layout) {
  const sortedRows = [...rows].sort((a, b) => {
    const la = labelMap[a[sampleKey]] || a[sampleKey] || ''
    const lb = labelMap[b[sampleKey]] || b[sampleKey] || ''
    return la.localeCompare(lb)
  })
  const sampleIds = sortedRows.map(r => r[sampleKey])
  const samples = sampleIds.map(id => labelMap[id] || id)
  const uniqueLabels = [...new Set(samples)]
  const labelColorMap = {}
  uniqueLabels.forEach((l, i) => { labelColorMap[l] = LABEL_COLORS[i % LABEL_COLORS.length] })

  const nRows = sortedRows.length
  const nCols = fieldNames.length
  const allVals = []
  const heatData = []
  sortedRows.forEach((r, ri) => {
    fieldNames.forEach((f, ci) => {
      const v = parseFloat(r[f])
      if (!isNaN(v)) {
        allVals.push(v)
        heatData.push([ci, ri, v])
      }
    })
  })
  if (allVals.length === 0) return null
  const valMin = Math.min(...allVals)
  const valMax = Math.max(...allVals)

  const xLabelInterval = nCols > 50 ? 2 : 0

  const boxplotSeries = []
  let boxYMin = Infinity, boxYMax = -Infinity
  uniqueLabels.forEach((label, gi) => {
    const stats = fieldNames.map(f => {
      const vals = sortedRows.map((r, ri) => samples[ri] === label ? parseFloat(r[f]) : NaN).filter(v => !isNaN(v))
      const st = vals.length > 0 ? calcBoxplotStats(vals) : [0, 0, 0, 0, 0]
      boxYMin = Math.min(boxYMin, st[0])
      boxYMax = Math.max(boxYMax, st[4])
      return st
    })
    boxplotSeries.push({
      name: label,
      type: 'boxplot',
      xAxisIndex: 2,
      yAxisIndex: 2,
      data: stats,
      boxWidth: [10, 34],
      itemStyle: { color: labelColorMap[label], borderColor: '#333', borderWidth: 1.5, opacity: 0.7 },
      emphasis: { itemStyle: { borderWidth: 2 } }
    })
  })
  if (boxYMin === Infinity) { boxYMin = valMin; boxYMax = valMax }

  const vmWidth = Math.min(160, Math.round(layout.heatWidth * 0.4))

  return {
    title: {
      text: title,
      subtext: `Project ID: ${rowData.value?.projectId || ''}  Tissue: ${rowData.value?.tissue || ''}`,
      left: 'center',
      top: 5,
      textStyle: { fontSize: 13, fontWeight: 'bold' },
      subtextStyle: { fontSize: 10, color: '#666' }
    },
    tooltip: {
      position: function (point, p, dom, r, size) {
        const h = size.contentSize[1]
        return point[1] - h - 15 > 0 ? [point[0] + 10, point[1] - h - 15] : [point[0] + 10, point[1] + 15]
      },
      formatter: function (params) {
        if (params.componentType !== 'series') return
        if (params.seriesType === 'boxplot') {
          const d = params.data
          return `${params.seriesName}<br/>${params.name}<br/>Min: ${d[0].toFixed(3)}<br/>Q1: ${d[1].toFixed(3)}<br/>Median: ${d[2].toFixed(3)}<br/>Q3: ${d[3].toFixed(3)}<br/>Max: ${d[4].toFixed(3)}`
        }
        if (params.seriesIndex !== 1) return
        const sid = sampleIds[params.value[1]]
        const label = samples[params.value[1]]
        const field = fieldNames[params.value[0]]
        return `${label} (${sid})<br/>${field}: ${params.value[2].toFixed(3)}`
      }
    },
    grid: [
      { left: layout.stripLeft, top: 50, bottom: 170, width: layout.stripWidth },
      { left: layout.heatLeft, top: 50, bottom: 170, width: layout.heatWidth },
      { left: layout.boxLeft, top: 50, bottom: 170, width: layout.boxWidth }
    ],
    xAxis: [
      { type: 'category', data: [''], gridIndex: 0, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { show: false }, splitLine: { show: false } },
      { type: 'category', data: fieldNames, gridIndex: 1, axisLabel: { rotate: 45, fontSize: 10, interval: xLabelInterval, margin: 8, formatter: function (value) { const i = value.lastIndexOf(' '); return i > 0 ? value.slice(0, i) + '\n' + value.slice(i + 1) : value } } },
      { type: 'category', data: fieldNames, gridIndex: 2, axisLabel: { rotate: 45, fontSize: 9, interval: xLabelInterval, margin: 6, formatter: function (value) { const i = value.lastIndexOf(' '); return i > 0 ? value.slice(0, i) + '\n' + value.slice(i + 1) : value } } }
    ],
    yAxis: [
      { type: 'category', data: sampleIds, gridIndex: 0, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { show: false }, splitLine: { show: false } },
      { type: 'category', data: sampleIds, gridIndex: 1, axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false }, splitLine: { show: false } },
      { type: 'value', gridIndex: 2, min: Math.floor(boxYMin), max: Math.ceil(boxYMax), axisLabel: { fontSize: 9 }, splitLine: { lineStyle: { type: 'dashed', color: '#e0e0e0' } } }
    ],
    visualMap: [
      { show: false, seriesIndex: 0, dimension: 2, pieces: uniqueLabels.map((l, i) => ({ value: i, color: labelColorMap[l] })) },
      { seriesIndex: 1, min: valMin, max: valMax, orient: 'horizontal', left: layout.heatLeft, bottom: 18, width: vmWidth, inRange: { color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#fee090', '#fdae61', '#f46d43', '#d73027'] } }
    ],
    legend: {
      orient: 'horizontal', left: layout.heatLeft + vmWidth + 15, bottom: 20, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 },
      data: uniqueLabels.map(l => ({ name: l, itemStyle: { color: labelColorMap[l] } }))
    },
    series: [
      { type: 'heatmap', xAxisIndex: 0, yAxisIndex: 0, data: samples.map((label, ri) => [0, ri, uniqueLabels.indexOf(label)]), emphasis: { itemStyle: { shadowBlur: 0 } }, label: { show: false } },
      { type: 'heatmap', xAxisIndex: 1, yAxisIndex: 1, data: heatData, label: { show: nCols <= 8 && nRows <= 30, fontSize: 9, formatter: function (p) { return p.value[2].toFixed(3) } }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } } },
      ...boxplotSeries
    ]
  }
}

function renderHeatmap(refName, data, fields, sampleKey, title) {
  nextTick(() => {
    const el = refName.value
    if (!el) return

    const n = data.length
    const nCols = fields.length
    let cellH
    if (n <= 30) cellH = 20
    else if (n <= 80) cellH = 14
    else if (n <= 140) cellH = 11
    else cellH = 8
    const maxH = 550
    el.style.height = Math.min(maxH, n * cellH + 110) + 'px'

    const isWide = title === 'xCell' || title === 'EPIC' || title === 'quantiseq'
    const containerWidth = el.parentElement?.clientWidth || 1200
    const gapPx = 80
    const stripLeft = 5
    const stripWidth = 20
    const heatLeft = 30
    const legendRight = 140
    const minBoxW = 100
    const heatPct = 0.30
    let totalWidth
    if (isWide) {
      const desiredBoxW = Math.round(nCols * 70 + 100)
      totalWidth = Math.max(600, Math.round(containerWidth * 0.92), Math.round((gapPx + desiredBoxW + legendRight) / (1 - heatPct)))
      el.style.width = totalWidth + 'px'
    } else {
      totalWidth = containerWidth
      el.style.width = '100%'
    }
    const heatWidth = Math.round(totalWidth * heatPct)
    const boxWidth = Math.max(minBoxW, totalWidth - heatLeft - heatWidth - gapPx - legendRight)
    const boxLeft = heatLeft + heatWidth + gapPx
    const layout = { stripLeft, stripWidth, heatLeft, heatWidth, boxLeft, boxWidth, legendRight }

    let chart
    if (refName === estimateChartRef) {
      if (!estimateChart) estimateChart = echarts.init(el, null, { renderer: 'svg' })
      chart = estimateChart
    } else if (refName === mcpChartRef) {
      if (!mcpChart) mcpChart = echarts.init(el, null, { renderer: 'svg' })
      chart = mcpChart
    } else if (refName === xcellChartRef) {
      if (!xcellChart) xcellChart = echarts.init(el, null, { renderer: 'svg' })
      chart = xcellChart
    } else if (refName === epicChartRef) {
      if (!epicChart) epicChart = echarts.init(el, null, { renderer: 'svg' })
      chart = epicChart
    } else if (refName === quantiseqChartRef) {
      if (!quantiseqChart) quantiseqChart = echarts.init(el, null, { renderer: 'svg' })
      chart = quantiseqChart
    }

    const option = buildHeatmapOption(data, fields, sampleKey, title, layout)
    if (option) {
      chart.setOption(option, true)
    }
    chart.resize()
  })
}

const csvModules = import.meta.glob('@/data/**/*.csv', { query: '?raw', import: 'default', eager: true })
const labelModules = import.meta.glob('@/data/Immlabel.txt', { query: '?raw', import: 'default', eager: true })

let labelMap = {}

function buildLabelMap() {
  const raw = Object.values(labelModules)[0]
  if (!raw) return
  const { projectId, datasetId } = route.params
  const lines = raw.trim().split('\n')
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t')
    if (parts.length >= 4) {
      const [proj, ds, sample, label] = parts
      if (proj === projectId && ds === datasetId) {
        labelMap[sample] = label
      }
    }
  }
}

let dataLoaded = false

function loadData() {
  const { projectId, datasetId } = route.params
  if (!projectId || !datasetId) {
    loading.value = false
    return
  }

  buildLabelMap()

  const prefix = `${projectId}_${datasetId}`

  for (const [filePath, raw] of Object.entries(csvModules)) {
    const fileName = filePath.split('/').pop()
    if (!fileName.startsWith(prefix)) continue

    const { headers, rows } = parseCSV(raw)
    if (fileName.includes('ImmuneScore') || fileName.includes('Estimate')) {
      estimateData.value = rows
      estimateRaw.value = raw
    } else if (fileName.includes('MCPcounter')) {
      mcpData.value = rows
      mcpRaw.value = raw
      mcpColumns.value = headers.filter(h => h !== 'sample' && h !== 'Description')
    } else if (fileName.includes('xcell') || fileName.includes('xCell')) {
      xcellData.value = rows
      xcellRaw.value = raw
      xcellColumns.value = headers.filter(h => {
        const lower = h.toLowerCase()
        return h !== 'sample' && h !== 'Description' && !lower.includes('immune score') && !lower.includes('stroma score') && !lower.includes('microenvironment score')
      })
    } else if (fileName.includes('epic')) {
      epicData.value = rows
      epicRaw.value = raw
      epicColumns.value = headers.filter(h => h !== 'sample')
    } else if (fileName.includes('quantiseq')) {
      quantiseqData.value = rows
      quantiseqRaw.value = raw
      quantiseqColumns.value = headers.filter(h => h !== 'sample')
    }
  }

  loading.value = false
  dataLoaded = true

  nextTick(() => {
    renderHeatmap(estimateChartRef, estimateData.value, ['StromalScore', 'ImmuneScore', 'ESTIMATEScore'], 'Description', 'ESTIMATE')
  })
}

function renderCurrentTab() {
  if (!dataLoaded) return
  nextTick(() => {
    if (activeTab.value === 'estimate') {
      renderHeatmap(estimateChartRef, estimateData.value, ['StromalScore', 'ImmuneScore', 'ESTIMATEScore'], 'Description', 'ESTIMATE')
    } else if (activeTab.value === 'mcp') {
      renderHeatmap(mcpChartRef, mcpData.value, mcpColumns.value, 'sample', 'MCP-counter')
    } else if (activeTab.value === 'xcell') {
      renderHeatmap(xcellChartRef, xcellData.value, xcellColumns.value, 'sample', 'xCell')
    } else if (activeTab.value === 'epic') {
      renderHeatmap(epicChartRef, epicData.value, epicColumns.value, 'sample', 'EPIC')
    } else if (activeTab.value === 'quantiseq') {
      renderHeatmap(quantiseqChartRef, quantiseqData.value, quantiseqColumns.value, 'sample', 'quantiseq')
    }
  })
}

watch(activeTab, renderCurrentTab)

onMounted(async () => {
  try {
    const res = await fetchDataDetail(route.params.projectId, route.params.datasetId)
    if (res) {
      rowData.value = res
    }
  } catch (e) {
    console.warn('API fetch failed', e)
  }

  loadData()
})
</script>

<style scoped>
.res-page { background-color: #f8fafc; min-height: 100vh; padding: 0 20px 40px; }
.container-fluid { max-width: 1750px; margin: 0 auto; }
.action-bar { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; }
.top-btns { display: flex; gap: 10px; }
.section-block { margin-bottom: 28px; }
.section-title { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 12px; padding-left: 12px; border-left: 4px solid #42b983; }
.dataset-info-card { background: #fff; border-radius: 10px; padding: 12px 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.meta-group { margin-bottom: 10px; }
.meta-group:last-child { margin-bottom: 0; }
.meta-group-title { font-size: 11px; font-weight: 700; color: #42b983; margin-bottom: 4px; padding-left: 8px; border-left: 3px solid #42b983; text-transform: uppercase; letter-spacing: 0.5px; }
.detail-tabs { background: #fff; border-radius: 10px; padding: 10px 15px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.loading-wrapper { background: #fff; border-radius: 10px; padding: 30px; }
.tab-toolbar { display: flex; justify-content: flex-end; align-items: center; gap: 2px; margin-bottom: 12px; }
.chart-scroll { overflow-x: auto; }
.heatmap-chart { min-height: 350px; margin: 0 auto; }
.algo-desc { font-size: 12px; color: #555; margin: 8px 0 12px; line-height: 1.5; }
</style>
