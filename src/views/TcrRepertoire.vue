<template>
  <div class="tcr-page">
    <main class="container">
      <div class="page-header">
        <div>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">Home</el-breadcrumb-item>
            <el-breadcrumb-item>TCR Repertoire</el-breadcrumb-item>
          </el-breadcrumb>
          <h1>TCR Repertoire Visualization</h1>
          <p>Single-cell TCR clonotype, chain pairing, V/J gene usage, and CDR3 feature overview.</p>
        </div>
        <el-tag effect="plain">{{ data.title }}</el-tag>
      </div>

      <section class="stat-grid">
        <div class="stat-card"><span>Cells</span><strong>{{ formatInt(data.summary.cells) }}</strong></div>
        <div class="stat-card"><span>Clones</span><strong>{{ formatInt(data.summary.clones) }}</strong></div>
        <div class="stat-card"><span>Expanded Clones</span><strong>{{ formatInt(data.summary.expandedClones) }}</strong></div>
        <div class="stat-card"><span>TRA/TRB Paired Cells</span><strong>{{ formatInt(data.summary.pairedCells) }}</strong></div>
        <div class="stat-card"><span>TRA Contigs</span><strong>{{ formatInt(data.summary.traContigs) }}</strong></div>
        <div class="stat-card"><span>TRB Contigs</span><strong>{{ formatInt(data.summary.trbContigs) }}</strong></div>
      </section>

      <section class="section-card">
        <div class="section-title">Clonal Expansion</div>
        <div class="three-grid">
          <div class="chart-panel">
            <div class="panel-heading"><h3>Clone Size Distribution</h3></div>
            <div ref="cloneSizeRef" class="chart" />
          </div>
          <div class="chart-panel">
            <div class="panel-heading"><h3>Top Expanded Clones</h3></div>
            <div ref="topCloneRef" class="chart" />
          </div>
          <div class="chart-panel">
            <div class="panel-heading"><h3>Chain Pairing</h3></div>
            <div ref="chainRef" class="chart" />
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-header">
          <div class="section-title">Gene Usage and CDR3 Features</div>
          <el-radio-group v-model="selectedLocus" size="small">
            <el-radio-button label="TRB">TRB</el-radio-button>
            <el-radio-button label="TRA">TRA</el-radio-button>
            <el-radio-button label="all">All</el-radio-button>
          </el-radio-group>
        </div>
        <div class="two-grid">
          <div class="chart-panel">
            <div class="panel-heading"><h3>Top V Gene Usage</h3></div>
            <div ref="vUsageRef" class="chart" />
          </div>
          <div class="chart-panel">
            <div class="panel-heading"><h3>Top J Gene Usage</h3></div>
            <div ref="jUsageRef" class="chart" />
          </div>
        </div>
        <div class="two-grid lower-grid">
          <div class="chart-panel">
            <div class="panel-heading"><h3>{{ selectedLocusLabel }} CDR3 Length Distribution</h3></div>
            <div ref="cdr3Ref" class="chart" />
          </div>
          <div class="chart-panel">
            <div class="panel-heading"><h3>{{ selectedLocusLabel }} V-J Pairing Heatmap</h3></div>
            <div ref="vjRef" class="chart" />
          </div>
        </div>
      </section>

      <section class="section-card table-section">
        <div class="section-header">
          <div class="section-title">Clonotype Details</div>
          <el-input v-model="cloneSearch" size="small" clearable placeholder="Search clone, CDR3, V/J gene" class="search-box" />
        </div>
        <el-table :data="pagedCloneRows" size="small" height="360" stripe>
          <el-table-column prop="cloneId" label="Clone" width="90" />
          <el-table-column prop="cells" label="Cells" width="80" align="right" sortable />
          <el-table-column prop="contigs" label="Contigs" width="90" align="right" />
          <el-table-column prop="loci" label="Loci" width="90" />
          <el-table-column prop="trbCdr3" label="TRB CDR3" min-width="170" show-overflow-tooltip />
          <el-table-column prop="trbV" label="TRB V" width="120" show-overflow-tooltip />
          <el-table-column prop="trbJ" label="TRB J" width="120" show-overflow-tooltip />
          <el-table-column prop="traCdr3" label="TRA CDR3" min-width="170" show-overflow-tooltip />
          <el-table-column prop="traV" label="TRA V" width="120" show-overflow-tooltip />
          <el-table-column prop="traJ" label="TRA J" width="120" show-overflow-tooltip />
        </el-table>
        <el-pagination v-model:current-page="clonePage" size="small" layout="prev, pager, next" :page-size="pageSize" :total="filteredCloneRows.length" class="pagination" />
      </section>

      <section class="section-card table-section">
        <div class="section-header">
          <div class="section-title">Contig Table</div>
          <el-input v-model="contigSearch" size="small" clearable placeholder="Search cell, clone, CDR3, V/J gene" class="search-box" />
        </div>
        <el-table :data="pagedContigRows" size="small" height="420" stripe>
          <el-table-column prop="cellId" label="Cell ID" width="180" show-overflow-tooltip />
          <el-table-column prop="cloneId" label="Clone" width="90" />
          <el-table-column prop="locus" label="Locus" width="80" />
          <el-table-column prop="vCall" label="V Gene" width="130" show-overflow-tooltip />
          <el-table-column prop="jCall" label="J Gene" width="130" show-overflow-tooltip />
          <el-table-column prop="cdr3" label="CDR3 AA" min-width="190" show-overflow-tooltip />
          <el-table-column prop="junctionLength" label="CDR3 nt Length" width="130" align="right" />
        </el-table>
        <el-pagination v-model:current-page="contigPage" size="small" layout="prev, pager, next" :page-size="pageSize" :total="filteredContigRows.length" class="pagination" />
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import data from '@/data/tcr/U41_PBMC_10x_TCR_repertoire.json'

const selectedLocus = ref('TRB')
const cloneSearch = ref('')
const contigSearch = ref('')
const clonePage = ref(1)
const contigPage = ref(1)
const pageSize = 12

const cloneSizeRef = ref(null)
const topCloneRef = ref(null)
const chainRef = ref(null)
const vUsageRef = ref(null)
const jUsageRef = ref(null)
const cdr3Ref = ref(null)
const vjRef = ref(null)
let charts = []

const themeColor = '#42b983'
const chainColors = { TRA: '#42b983', TRB: '#f59e0b', all: '#42b983' }
const vjHeatmapColors = ['#2166ac', '#f7fbff', '#fddbc7', '#b2182b']
const greenPalette = ['#42b983', '#16875d', '#86efac', '#f59e0b', '#8b5cf6', '#14b8a6']
const selectedLocusLabel = computed(() => selectedLocus.value === 'all' ? 'All' : selectedLocus.value)

const filteredCloneRows = computed(() => {
  const q = cloneSearch.value.trim().toLowerCase()
  if (!q) return data.cloneTable
  return data.cloneTable.filter(row => [row.cloneId, row.trbCdr3, row.traCdr3, row.trbV, row.trbJ, row.traV, row.traJ].some(value => String(value || '').toLowerCase().includes(q)))
})
const filteredContigRows = computed(() => {
  const q = contigSearch.value.trim().toLowerCase()
  if (!q) return data.contigTable
  return data.contigTable.filter(row => [row.cellId, row.cloneId, row.locus, row.vCall, row.jCall, row.cdr3].some(value => String(value || '').toLowerCase().includes(q)))
})
const pagedCloneRows = computed(() => slicePage(filteredCloneRows.value, clonePage.value))
const pagedContigRows = computed(() => slicePage(filteredContigRows.value, contigPage.value))

function slicePage(rows, page) {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}

function formatInt(value) {
  return Number(value || 0).toLocaleString()
}

function compactName(value, max = 18) {
  const text = String(value || 'Unknown')
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`
}

function locusFromGene(value) {
  const text = String(value || '')
  if (text.startsWith('TRA')) return 'TRA'
  if (text.startsWith('TRB')) return 'TRB'
  return 'Other'
}

function initChart(el) {
  const chart = echarts.init(el)
  charts.push(chart)
  return chart
}

function baseGrid(left = 54, right = 32, top = 34, bottom = 58) {
  return { left, right, top, bottom, containLabel: true }
}

function valueAxis(name) {
  return {
    type: 'value',
    name,
    nameLocation: 'middle',
    nameGap: 30,
    splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
  }
}

function categoryAxis(name, values, options = {}) {
  return {
    type: 'category',
    data: values,
    name,
    nameLocation: 'middle',
    nameGap: options.nameGap || 34,
    axisLabel: options.axisLabel || {}
  }
}

function renderAll() {
  charts.forEach(chart => chart.dispose())
  charts = []
  renderCloneSize()
  renderTopClone()
  renderChain()
  renderUsage()
  renderCdr3()
  renderVj()
}

function renderCloneSize() {
  const chart = initChart(cloneSizeRef.value)
  chart.setOption({
    animation: false,
    tooltip: { trigger: 'axis' },
    grid: baseGrid(),
    xAxis: categoryAxis('Clone size (cells)', data.cloneSizeBins.map(item => item.label)),
    yAxis: valueAxis('Clones'),
    series: [{ type: 'bar', data: data.cloneSizeBins.map(item => item.count), itemStyle: { color: themeColor } }]
  })
}

function renderTopClone() {
  const top = data.topClones.slice(0, 15).reverse()
  const chart = initChart(topCloneRef.value)
  chart.setOption({
    animation: false,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: baseGrid(72, 42, 24, 58),
    xAxis: valueAxis('Cells'),
    yAxis: { type: 'category', data: top.map(row => `Clone ${row.cloneId}`), axisLabel: { fontSize: 10 } },
    series: [{ type: 'bar', data: top.map(row => row.cells), itemStyle: { color: themeColor } }]
  })
}

function renderChain() {
  const chart = initChart(chainRef.value)
  chart.setOption({
    animation: false,
    color: greenPalette,
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 } },
    series: [{
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '45%'],
      data: data.chainComposition.map(item => ({ name: item.label, value: item.count })),
      label: { formatter: '{b}\n{d}%', fontSize: 10 }
    }]
  })
}

function renderUsage() {
  renderGeneUsage(vUsageRef.value, data.vUsage[selectedLocus.value] || [], 'Contigs')
  renderGeneUsage(jUsageRef.value, data.jUsage[selectedLocus.value] || [], 'Contigs')
}

function renderGeneUsage(el, rows, xName) {
  const top = rows.slice(0, 15).reverse()
  const isAll = selectedLocus.value === 'all'
  const barColor = chainColors[selectedLocus.value] || themeColor
  const series = isAll
    ? ['TRA', 'TRB'].map(locus => ({
        name: locus,
        type: 'bar',
        stack: 'usage',
        data: top.map(row => locusFromGene(row.label) === locus ? row.count : 0),
        itemStyle: { color: chainColors[locus] }
      }))
    : [{ name: selectedLocus.value, type: 'bar', data: top.map(row => row.count), itemStyle: { color: barColor } }]
  const chart = initChart(el)
  chart.setOption({
    animation: false,
    color: [chainColors.TRA, chainColors.TRB],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params) {
        const point = params.find(item => Number(item.value) > 0) || params[0]
        return `${point.axisValue}<br/>${point.marker}${point.seriesName}: ${formatInt(point.value)}`
      }
    },
    legend: { show: isAll, top: 0, right: 6, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 } },
    grid: baseGrid(98, 42, isAll ? 42 : 24, 58),
    xAxis: valueAxis(xName),
    yAxis: { type: 'category', data: top.map(row => row.label), axisLabel: { fontSize: 10, formatter: value => compactName(value, 15) } },
    series
  })
}

function renderCdr3() {
  const chart = initChart(cdr3Ref.value)
  const current = data.cdr3Length[selectedLocus.value] || []
  const isAll = selectedLocus.value === 'all'
  const labels = current.map(item => item.label)
  chart.setOption({
    animation: false,
    color: [chainColors.TRA, chainColors.TRB],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { show: isAll, top: 0, right: 6, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 } },
    grid: baseGrid(54, 32, isAll ? 42 : 28, 62),
    xAxis: categoryAxis('CDR3 length (nt)', labels, { axisLabel: { interval: 1 }, nameGap: 38 }),
    yAxis: valueAxis('Contigs'),
    series: isAll
      ? [
          { name: 'TRA', type: 'bar', data: current.map(item => item.TRA), itemStyle: { color: chainColors.TRA } },
          { name: 'TRB', type: 'bar', data: current.map(item => item.TRB), itemStyle: { color: chainColors.TRB } }
        ]
      : [{ name: selectedLocus.value, type: 'bar', data: current.map(item => item.count), itemStyle: { color: chainColors[selectedLocus.value] || themeColor } }]
  })
}

function renderVj() {
  const chart = initChart(vjRef.value)
  const current = data.vjPairing[selectedLocus.value] || data.vjPairing.TRB
  const maxValue = Math.max(1, ...current.data.map(item => item[2]))
  chart.setOption({
    animation: false,
    tooltip: {
      formatter(params) {
        const [jIndex, vIndex, count] = params.value
        return `V: ${current.vGenes[vIndex]}<br/>J: ${current.jGenes[jIndex]}<br/>Contigs: ${count}`
      }
    },
    grid: { left: 104, right: 64, top: 24, bottom: 104 },
    xAxis: categoryAxis('J gene', current.jGenes, { nameGap: 54, axisLabel: { rotate: 45, fontSize: 9, formatter: value => compactName(value, 13) } }),
    yAxis: { type: 'category', name: 'V gene', nameLocation: 'middle', nameGap: 78, data: current.vGenes, axisLabel: { fontSize: 9, formatter: value => compactName(value, 14) } },
    visualMap: { min: 0, max: maxValue, right: 4, top: 32, itemWidth: 12, itemHeight: 150, inRange: { color: vjHeatmapColors } },
    series: [{ type: 'heatmap', data: current.data }]
  })
}

watch(selectedLocus, () => nextTick(() => {
  charts.forEach(chart => chart.dispose())
  charts = []
  renderAll()
}))
watch(cloneSearch, () => { clonePage.value = 1 })
watch(contigSearch, () => { contigPage.value = 1 })

onMounted(() => nextTick(renderAll))
onBeforeUnmount(() => charts.forEach(chart => chart.dispose()))
</script>

<style scoped>
.tcr-page { background: #f8fafc; min-height: calc(100vh - 80px); padding: 18px 0 34px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 14px; }
.page-header h1 { margin: 10px 0 4px; color: #1e293b; font-size: 24px; letter-spacing: 0; }
.page-header p { color: #64748b; font-size: 13px; }
.page-header :deep(.el-tag) { --el-tag-text-color: #16875d; --el-tag-border-color: #9fe0c4; --el-tag-bg-color: #f2fbf7; margin-top: 24px; }
.stat-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
.stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04); }
.stat-card span { display: block; color: #64748b; font-size: 11px; line-height: 1.3; }
.stat-card strong { display: block; color: #1e293b; font-size: 20px; line-height: 1.35; }
.section-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04); }
.section-title { color: #1e293b; font-size: 15px; font-weight: 800; padding-left: 10px; border-left: 4px solid #42b983; }
.section-header { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 10px; }
.section-header :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { background-color: #42b983; border-color: #42b983; box-shadow: -1px 0 0 0 #42b983; color: #fff; }
.section-header :deep(.el-radio-button__inner:hover) { color: #16875d; }
.three-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
.two-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.lower-grid { margin-top: 10px; }
.chart-panel { min-width: 0; border-top: 1px solid #e2e8f0; padding-top: 8px; }
.panel-heading { min-height: 22px; display: flex; align-items: center; justify-content: space-between; }
.panel-heading h3 { color: #1e293b; font-size: 13px; font-weight: 800; margin: 0; }
.chart { width: 100%; height: 340px; }
.table-section { padding-bottom: 10px; }
.search-box { width: 320px; }
.search-box :deep(.el-input__wrapper.is-focus), .search-box :deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1px #42b983 inset; }
.pagination { justify-content: flex-end; margin-top: 8px; }
:deep(.el-table th.el-table__cell) { color: #475569; background: #f8fafc; }
@media (max-width: 1300px) {
  .stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .three-grid { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .page-header, .section-header { flex-direction: column; align-items: stretch; }
  .stat-grid, .two-grid { grid-template-columns: 1fr; }
  .search-box { width: 100%; }
}
</style>