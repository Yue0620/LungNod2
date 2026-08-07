<template>
  <section class="section-block">
    <div class="section-title">{{ t('singleCellBasic') }}</div>

    <div class="single-cell-card">
      <div v-if="loading" class="loading-wrapper">
        <el-skeleton :rows="6" animated />
      </div>

      <el-empty v-else-if="!dataset" :description="t('empty')" :image-size="72" />

      <template v-else>
        <div class="stat-grid">
          <div class="stat-item">
            <span>{{ t('cells') }}</span>
            <strong>{{ formatInt(dataset.summary.cells) }}</strong>
          </div>
          <div class="stat-item">
            <span>{{ t('genes') }}</span>
            <strong>{{ formatInt(dataset.summary.genes) }}</strong>
          </div>
          <div class="stat-item">
            <span>{{ t('samples') }}</span>
            <strong>{{ dataset.summary.samples.length }}</strong>
          </div>
          <div class="stat-item">
            <span>{{ t('labels') }}</span>
            <strong>{{ dataset.summary.labels.length }}</strong>
          </div>
        </div>

        <div class="summary-row">
          <el-tag v-for="item in topLabels" :key="item.label" size="small" effect="plain">
            {{ item.label }}: {{ item.count }}
          </el-tag>
        </div>

        <div class="control-panel">
          <div class="panel-title">{{ t('controls') }}</div>
          <div class="control-grid">
            <div class="control-item">
              <span>{{ t('projection') }}</span>
              <el-radio-group v-model="projection" size="small">
                <el-radio-button v-for="item in projectionOptions" :key="item.key" :label="item.key">{{ item.label }}</el-radio-button>
              </el-radio-group>
            </div>
            <div class="control-item">
              <span>{{ t('groupBy') }}</span>
              <el-select v-model="colorBy" size="small" class="control-select" filterable>
                <el-option v-for="field in dataset.colorFields" :key="field.key" :label="field.label" :value="field.key" />
              </el-select>
            </div>
            <div class="control-item gene-control">
              <span>{{ t('geneExpression') }}</span>
              <el-select
                v-model="selectedGeneId"
                size="small"
                class="gene-select"
                filterable
                remote
                clearable
                reserve-keyword
                :remote-method="searchGenes"
                :loading="expressionIndexLoading || geneExpressionLoading"
                :placeholder="t('searchGene')"
              >
                <el-option v-for="gene in displayGeneOptions" :key="gene.geneId" :label="gene.label" :value="gene.geneId" />
              </el-select>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="plot-panel">
            <div class="panel-heading">
              <div class="chart-title">{{ t('cellGroupPlot') }}</div>
              <div class="download-actions">
                <el-button size="small" text @click="downloadChart(groupChart, chartFileName('cell_group_plot'), 'png')">PNG</el-button>
                <el-button size="small" text @click="downloadChart(groupChart, chartFileName('cell_group_plot'), 'svg')">SVG</el-button>
              </div>
            </div>
            <div ref="groupChartRef" class="single-cell-chart" />
          </div>
          <div class="plot-panel">
            <div class="panel-heading">
              <div class="chart-title">{{ selectedGene ? `${selectedGene.gene} ${t('geneExpressionPlot')}` : t('geneExpressionPlot') }}</div>
              <div v-if="selectedGeneId" class="download-actions">
                <el-button size="small" text @click="downloadChart(geneChart, chartFileName('gene_expression_plot'), 'png')">PNG</el-button>
                <el-button size="small" text @click="downloadChart(geneChart, chartFileName('gene_expression_plot'), 'svg')">SVG</el-button>
              </div>
            </div>
            <el-empty v-if="!selectedGeneId" class="gene-empty" :description="t('selectGeneForPlot')" :image-size="56" />
            <div v-else ref="geneChartRef" class="single-cell-chart" />
          </div>
        </div>

        <div v-if="selectedGene && expressionValues" class="expression-box-panel">
          <div class="box-header">
            <div>
              <div class="chart-title">{{ selectedGene.gene }} {{ t('expressionByGroup') }}</div>
              <div class="box-subtitle box-subtitle-left">{{ t('expressionScale') }}</div>
            </div>
            <div class="download-actions">
              <el-button size="small" text @click="downloadChart(boxChart, chartFileName('expression_boxplot'), 'png')">PNG</el-button>
              <el-button size="small" text @click="downloadChart(boxChart, chartFileName('expression_boxplot'), 'svg')">SVG</el-button>
            </div>
          </div>
          <div ref="boxChartRef" class="expression-box-chart" />
        </div>

        <div v-if="hasCellComposition" class="result-panel">
          <div class="result-header">
            <div>
              <div class="chart-title">Cell Composition by Sample</div>
              <div class="result-subtitle">Fraction of each cell type within every sample.</div>
            </div>
          </div>
          <div class="composition-layout">
            <div class="chart-download-panel composition-chart-panel">
              <div class="panel-heading panel-heading-tight">
                <div class="chart-title chart-title-small">Composition chart</div>
                <div class="download-actions">
                  <el-button size="small" text @click="downloadChart(compositionChart, chartFileName('cell_composition'), 'png')">PNG</el-button>
                  <el-button size="small" text @click="downloadChart(compositionChart, chartFileName('cell_composition'), 'svg')">SVG</el-button>
                </div>
              </div>
              <div ref="compositionChartRef" class="composition-chart" />
            </div>
            <div class="composition-table-panel">
              <div class="panel-heading panel-heading-tight">
                <div class="chart-title chart-title-small">Composition table</div>
                <div class="download-actions">
                  <el-button size="small" text @click="downloadTableSvg(compositionPageRows, compositionTableColumns, tableFileName('cell_composition_page'))">SVG</el-button>
                  <el-button size="small" text @click="downloadTableText(compositionRows, compositionTableColumns, tableFileName('cell_composition'))">TXT</el-button>
                </div>
              </div>
              <el-table :data="compositionPageRows" size="small" height="330" class="result-table compact-table">
                <el-table-column prop="sample" label="Sample" width="92" />
                <el-table-column prop="cellType" label="Cell Type" min-width="130" show-overflow-tooltip />
                <el-table-column prop="count" label="Cells" width="78" align="right" />
                <el-table-column label="Fraction" width="88" align="right">
                  <template #default="scope">{{ formatPercent(scope.row.fraction) }}</template>
                </el-table-column>
              </el-table>
              <el-pagination
                v-model:current-page="compositionPage"
                size="small"
                layout="prev, pager, next"
                :page-size="compositionPageSize"
                :total="compositionRows.length"
                class="table-pagination"
              />
            </div>
          </div>
        </div>

        <div v-if="hasCellChat" class="result-panel">
          <div class="result-header">
            <div>
              <div class="chart-title">CellChat Communication</div>
              <div class="result-subtitle">Overall communication inferred by SingleR pruned cell type.</div>
            </div>
            <div class="result-metrics">
              <span>{{ dataset.cellChat.summary.groups }} groups</span>
              <span>{{ dataset.cellChat.summary.pathways }} pathways</span>
              <span>{{ dataset.cellChat.summary.ligandReceptorInteractions }} LR pairs</span>
            </div>
          </div>
          <div class="cellchat-layout">
            <div class="chart-download-panel pathway-chart">
              <div class="panel-heading panel-heading-tight">
                <div class="chart-title chart-title-small">Pathways</div>
                <div class="download-actions">
                  <el-button size="small" text @click="downloadChart(pathwayChart, chartFileName('cellchat_pathways'), 'png')">PNG</el-button>
                  <el-button size="small" text @click="downloadChart(pathwayChart, chartFileName('cellchat_pathways'), 'svg')">SVG</el-button>
                </div>
              </div>
              <div ref="pathwayChartRef" class="communication-chart" />
            </div>
            <div class="chart-download-panel communication-heatmap">
              <div class="panel-heading panel-heading-tight">
                <div class="chart-title chart-title-small">Weight matrix</div>
                <div class="download-actions">
                  <el-button size="small" text @click="downloadChart(communicationChart, chartFileName('cellchat_weight_matrix'), 'png')">PNG</el-button>
                  <el-button size="small" text @click="downloadChart(communicationChart, chartFileName('cellchat_weight_matrix'), 'svg')">SVG</el-button>
                </div>
              </div>
              <div ref="communicationChartRef" class="communication-chart" />
            </div>
            <div class="cellchat-table-panel">
              <div class="panel-heading panel-heading-tight">
                <div class="chart-title chart-title-small">LR table</div>
                <div class="download-actions">
                  <el-button size="small" text @click="downloadTableSvg(cellChatPageRows, cellChatTableColumns, tableFileName('cellchat_lr_page'))">SVG</el-button>
                  <el-button size="small" text @click="downloadTableText(cellChatRows, cellChatTableColumns, tableFileName('cellchat_lr'))">TXT</el-button>
                </div>
              </div>
              <el-table :data="cellChatPageRows" size="small" height="390" class="result-table compact-table cellchat-table" :fit="false">
                <el-table-column prop="source" label="Source" width="118" show-overflow-tooltip />
                <el-table-column prop="target" label="Target" width="118" show-overflow-tooltip />
                <el-table-column prop="interaction" label="Ligand-Receptor" width="190" show-overflow-tooltip />
                <el-table-column prop="pathway" label="Pathway" width="92" show-overflow-tooltip />
                <el-table-column label="Prob." width="82" align="right">
                  <template #default="scope">{{ formatScientific(scope.row.prob) }}</template>
                </el-table-column>
                <el-table-column label="P" width="76" align="right">
                  <template #default="scope">{{ formatScientific(scope.row.pval) }}</template>
                </el-table-column>
              </el-table>
              <el-pagination
                v-model:current-page="cellChatPage"
                size="small"
                layout="prev, pager, next"
                :page-size="cellChatPageSize"
                :total="cellChatRows.length"
                class="table-pagination"
              />
            </div>
          </div>
        </div>

        <div class="qc-row">
          <div>{{ t('qc') }}: nCount {{ formatNumber(dataset.summary.qcMedian.nCount_RNA) }}</div>
          <div>nFeature {{ formatNumber(dataset.summary.qcMedian.nFeature_RNA) }}</div>
          <div>mt {{ formatNumber(dataset.summary.qcMedian.percent_mt) }}%</div>
          <div>ribo {{ formatNumber(dataset.summary.qcMedian.percent_ribo) }}%</div>
          <div>{{ t('filter') }}: nFeature >= {{ dataset.parameters.min_features }}, percent.mt <= {{ dataset.parameters.max_percent_mt }}</div>
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
    singleCellBasic: '单细胞基础可视化',
    empty: '当前数据集没有可用的单细胞可视化结果',
    cells: '细胞数',
    genes: '基因数',
    samples: '样本数',
    labels: '细胞类型',
    qc: 'QC 中位数',
    filter: '过滤',
    controls: 'Controls',
    projection: '降维图',
    groupBy: '细胞分组',
    geneExpression: '基因表达',
    searchGene: '搜索基因名或 Gene ID',
    expressionByGroup: '在细胞群中的表达',
    expressionScale: '表达值为 log1p(raw count)，0 表示该细胞未检测到表达。',
    cellGroupPlot: 'Cell Group 分布图',
    geneExpressionPlot: 'Gene Expression 分布图',
    selectGeneForPlot: '请选择一个基因以显示表达分布图。',
    sample: '样本',
    label: '细胞类型',
    cluster: 'Cluster',
    nCount: 'nCount_RNA',
    nFeature: 'nFeature_RNA',
    percentMt: 'percent.mt'
  },
  en: {
    singleCellBasic: 'Single-cell Basic Visualization',
    empty: 'No single-cell visualization result is available for this dataset',
    cells: 'Cells',
    genes: 'Genes',
    samples: 'Samples',
    labels: 'Cell Types',
    qc: 'QC median',
    filter: 'Filter',
    controls: 'Controls',
    projection: 'Projection',
    groupBy: 'Cell Group',
    geneExpression: 'Gene Expression',
    searchGene: 'Search gene symbol or Gene ID',
    expressionByGroup: 'expression across cell groups',
    expressionScale: 'Expression is log1p(raw count); 0 means expression was not detected in that cell.',
    cellGroupPlot: 'Cell Group Plot',
    geneExpressionPlot: 'Gene Expression Plot',
    selectGeneForPlot: 'Select a gene to show expression distribution.',
    sample: 'Sample',
    label: 'Cell Type',
    cluster: 'Cluster',
    nCount: 'nCount_RNA',
    nFeature: 'nFeature_RNA',
    percentMt: 'percent.mt'
  }
}

const t = (key) => i18n[currentLang.value]?.[key] || key
const modules = import.meta.glob('@/data/single-cell/*_single_cell.json', { import: 'default' })

const loading = ref(false)
const dataset = ref(null)
const expressionIndex = ref(null)
const expressionIndexLoading = ref(false)
const geneExpressionLoading = ref(false)
const geneOptions = ref([])
const selectedGeneId = ref('')
const expressionValues = ref(null)
const projection = ref('umap')
const colorBy = ref('SingleR_pruned_label')
const groupChartRef = ref(null)
const geneChartRef = ref(null)
const boxChartRef = ref(null)
const compositionChartRef = ref(null)
const pathwayChartRef = ref(null)
const communicationChartRef = ref(null)
const compositionPage = ref(1)
const cellChatPage = ref(1)
const compositionPageSize = 12
const cellChatPageSize = 12
let groupChart = null
let geneChart = null
let boxChart = null
let compositionChart = null
let pathwayChart = null
let communicationChart = null
let loadToken = 0
let expressionToken = 0
let skipGeneWatch = false

const datasetKey = computed(() => `${props.projectId}_${props.datasetId}`)
const coordinateOffset = computed(() => dataset.value?.coordinateFields?.length || 4)
const metaIndex = computed(() => {
  const fields = dataset.value?.metaFields || []
  return Object.fromEntries(fields.map((field, index) => [field, index + coordinateOffset.value]))
})
const projectionOptions = computed(() => dataset.value?.coordinatePairs?.length ? dataset.value.coordinatePairs : [
  { key: 'umap', label: 'UMAP', indices: [0, 1] },
  { key: 'tsne', label: 't-SNE', indices: [2, 3] }
])
const currentProjection = computed(() => projectionOptions.value.find(item => item.key === projection.value) || projectionOptions.value[0])
const geneMap = computed(() => new Map((expressionIndex.value?.genes || []).map(gene => [gene.geneId, gene])))
const selectedGene = computed(() => selectedGeneId.value ? geneMap.value.get(selectedGeneId.value) : null)
const selectedColorField = computed(() => dataset.value?.colorFields?.find(field => field.key === colorBy.value))
const isContinuousColor = computed(() => selectedColorField.value?.type === 'continuous')
const topLabels = computed(() => (dataset.value?.summary.labels || []).slice(0, 10))
const hasCellComposition = computed(() => Boolean(dataset.value?.cellComposition?.long?.length))
const hasCellChat = computed(() => Boolean(dataset.value?.cellChat?.interactions?.length))
const compositionRows = computed(() => dataset.value?.cellComposition?.long || [])
const cellChatRows = computed(() => dataset.value?.cellChat?.interactions || [])
const compositionPageRows = computed(() => pageSlice(compositionRows.value, compositionPage.value, compositionPageSize))
const cellChatPageRows = computed(() => pageSlice(cellChatRows.value, cellChatPage.value, cellChatPageSize))
const displayGeneOptions = computed(() => {
  const seen = new Set()
  const selected = selectedGene.value ? [selectedGene.value] : []
  return [...selected, ...geneOptions.value]
    .filter(gene => {
      if (!gene || seen.has(gene.geneId)) return false
      seen.add(gene.geneId)
      return true
    })
    .map(gene => ({ ...gene, label: gene.gene === gene.geneId ? gene.gene : `${gene.gene} (${gene.geneId})` }))
})

function formatInt(value) {
  return Number(value || 0).toLocaleString()
}

function formatNumber(value, digits = 2) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(digits) : '--'
}

function formatPercent(value) {
  const num = Number(value)
  return Number.isFinite(num) ? `${(num * 100).toFixed(2)}%` : '--'
}

function formatScientific(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toExponential(2) : '--'
}

function pageSlice(rows, page, size) {
  const start = (page - 1) * size
  return rows.slice(start, start + size)
}

const compositionTableColumns = [
  { label: 'Sample', width: 92, value: row => row.sample },
  { label: 'Cell Type', width: 150, value: row => row.cellType },
  { label: 'Cells', width: 78, align: 'right', value: row => row.count },
  { label: 'Fraction', width: 88, align: 'right', value: row => formatPercent(row.fraction) }
]

const cellChatTableColumns = [
  { label: 'Source', width: 118, value: row => row.source },
  { label: 'Target', width: 118, value: row => row.target },
  { label: 'Ligand-Receptor', width: 190, value: row => row.interaction },
  { label: 'Pathway', width: 92, value: row => row.pathway },
  { label: 'Prob.', width: 82, align: 'right', value: row => formatScientific(row.prob) },
  { label: 'P', width: 76, align: 'right', value: row => formatScientific(row.pval) }
]

function safeFileName(value) {
  return String(value || 'download').replace(/[^a-zA-Z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '') || 'download'
}

function chartFileName(name) {
  const gene = selectedGene.value?.gene ? `_${selectedGene.value.gene}` : ''
  return safeFileName(`${datasetKey.value}_${name}${gene}`)
}

function tableFileName(name) {
  return safeFileName(`${datasetKey.value}_${name}`)
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function downloadChart(chart, filename, type) {
  if (!chart) return
  const cleanName = safeFileName(filename)
  if (type === 'svg') {
    const svgUrl = chart.getDataURL({ type: 'svg', backgroundColor: '#fff' })
    if (svgUrl.startsWith('data:image/svg+xml')) {
      downloadDataUrl(svgUrl, `${cleanName}.svg`)
      return
    }
    const pngUrl = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${chart.getWidth()}" height="${chart.getHeight()}" viewBox="0 0 ${chart.getWidth()} ${chart.getHeight()}"><image href="${pngUrl}" width="${chart.getWidth()}" height="${chart.getHeight()}"/></svg>`
    downloadBlob(svg, `${cleanName}.svg`, 'image/svg+xml;charset=utf-8')
    return
  }
  downloadDataUrl(chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' }), `${cleanName}.png`)
}

function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]))
}

function escapeTsv(value) {
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
}

function downloadTableText(rows, columns, filename) {
  const header = columns.map(column => escapeTsv(column.label)).join('\t')
  const body = rows.map(row => columns.map(column => escapeTsv(column.value(row))).join('\t')).join('\n')
  downloadBlob(`${header}\n${body}`, `${safeFileName(filename)}.txt`, 'text/plain;charset=utf-8')
}

function downloadTableSvg(rows, columns, filename) {
  const rowHeight = 24
  const headerHeight = 28
  const padding = 10
  const width = columns.reduce((sum, column) => sum + column.width, 0) + padding * 2
  const height = headerHeight + rows.length * rowHeight + padding * 2
  let x = padding
  const headerCells = columns.map(column => {
    const textX = column.align === 'right' ? x + column.width - 8 : x + 8
    const anchor = column.align === 'right' ? 'end' : 'start'
    const cell = `<text x="${textX}" y="${padding + 19}" text-anchor="${anchor}" font-size="11" font-weight="700" fill="#475569">${escapeXml(column.label)}</text>`
    x += column.width
    return cell
  }).join('')
  const bodyRows = rows.map((row, rowIndex) => {
    let cellX = padding
    const y = padding + headerHeight + rowIndex * rowHeight
    const bg = rowIndex % 2 ? '#ffffff' : '#f8fafc'
    const cells = columns.map(column => {
      const textX = column.align === 'right' ? cellX + column.width - 8 : cellX + 8
      const anchor = column.align === 'right' ? 'end' : 'start'
      const value = escapeXml(column.value(row))
      cellX += column.width
      return `<text x="${textX}" y="${y + 16}" text-anchor="${anchor}" font-size="10" fill="#334155">${value}</text>`
    }).join('')
    return `<rect x="${padding}" y="${y}" width="${width - padding * 2}" height="${rowHeight}" fill="${bg}"/>${cells}<line x1="${padding}" y1="${y + rowHeight}" x2="${width - padding}" y2="${y + rowHeight}" stroke="#e2e8f0"/>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/><rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${headerHeight}" fill="#f1f5f9"/>${headerCells}<line x1="${padding}" y1="${padding + headerHeight}" x2="${width - padding}" y2="${padding + headerHeight}" stroke="#cbd5e1"/>${bodyRows}</svg>`
  downloadBlob(svg, `${safeFileName(filename)}.svg`, 'image/svg+xml;charset=utf-8')
}

function compactName(value, max = 24) {
  const text = String(value || 'Unknown')
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`
}

function colorFor(index) {
  const fixed = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
    '#16a085', '#c0392b', '#64748b', '#db2777', '#0f766e', '#7c3aed', '#ca8a04', '#0891b2'
  ]
  if (index < fixed.length) return fixed[index]
  return `hsl(${(index * 47) % 360}, 68%, 48%)`
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

function compactValue(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 'NA'
  if (Math.abs(num) >= 1000) return num.toExponential(2)
  if (Math.abs(num) >= 10) return num.toFixed(1)
  return num.toFixed(2)
}

async function loadDataset(value) {
  const token = ++loadToken
  dataset.value = null
  selectedGeneId.value = ''
  expressionValues.value = null
  boxChart?.clear()
  geneChart?.clear()
  groupChart?.clear()
  compositionChart?.clear()
  pathwayChart?.clear()
  communicationChart?.clear()
  const entry = Object.entries(modules).find(([filePath]) => filePath.endsWith(`/${value}_single_cell.json`))
  if (!entry) return
  loading.value = true
  try {
    const loaded = await entry[1]()
    if (token !== loadToken) return
    dataset.value = loaded
    projection.value = loaded.coordinatePairs?.[0]?.key || 'umap'
    colorBy.value = loaded.colorFields?.[0]?.key || 'SingleR_pruned_label'
    await loadExpressionIndex(value)
    if (token !== loadToken) return
    loading.value = false
    await nextTick()
    renderGroupChart()
    renderCompositionChart()
    renderCellChatCharts()

    const defaultGene = defaultExpressionGene()
    if (defaultGene) {
      skipGeneWatch = true
      selectedGeneId.value = defaultGene.geneId
      await nextTick()
      skipGeneWatch = false
      await loadGeneExpression()
    }
  } finally {
    if (token === loadToken) loading.value = false
  }
}

async function loadExpressionIndex(value) {
  expressionIndex.value = null
  geneOptions.value = []
  expressionIndexLoading.value = true
  try {
    const response = await fetch(`/single-cell-expression/${value}_expression_index.json`)
    if (!response.ok) return
    expressionIndex.value = await response.json()
    searchGenes('')
  } finally {
    expressionIndexLoading.value = false
  }
}

function defaultExpressionGene() {
  const genes = expressionIndex.value?.genes || []
  if (!genes.length) return null
  return genes.find(gene => gene.gene.toUpperCase() === 'EPCAM') || [...genes].sort((a, b) => b.nnz - a.nnz)[0]
}

function searchGenes(query) {
  const genes = expressionIndex.value?.genes || []
  const q = String(query || '').trim().toLowerCase()
  if (!q) {
    geneOptions.value = [...genes].sort((a, b) => b.nnz - a.nnz).slice(0, 50)
    return
  }
  geneOptions.value = genes
    .filter(gene => gene.gene.toLowerCase().includes(q) || gene.geneId.toLowerCase().includes(q))
    .slice(0, 80)
}

async function loadGeneExpression() {
  const token = ++expressionToken
  expressionValues.value = null
  boxChart?.clear()
  geneChart?.clear()
  const gene = selectedGene.value
  if (!gene || !expressionIndex.value || !dataset.value) {
    await nextTick()
    renderGroupChart()
    renderGeneChart()
    return
  }
  geneExpressionLoading.value = true
  try {
    const end = gene.offset + gene.length - 1
    const response = await fetch(expressionIndex.value.matrixFile, { headers: { Range: `bytes=${gene.offset}-${end}` } })
    if (response.status !== 206) throw new Error(`Range request failed with status ${response.status}`)
    const buffer = await response.arrayBuffer()
    if (token !== expressionToken) return
    const view = new DataView(buffer)
    const values = new Float32Array(expressionIndex.value.cellCount)
    for (let offset = 0; offset < buffer.byteLength; offset += expressionIndex.value.recordSize) {
      const cellIndex = view.getUint32(offset, true)
      const count = expressionIndex.value.valueBytes === 2 ? view.getUint16(offset + 4, true) : view.getUint32(offset + 4, true)
      values[cellIndex] = Math.log1p(count)
    }
    expressionValues.value = values
  } finally {
    geneExpressionLoading.value = false
  }
  await nextTick()
  renderGeneChart()
  renderExpressionBoxplot()
}

function projectionIndexes() {
  return currentProjection.value?.indices || [0, 1]
}

function projectionAxisNames() {
  const current = currentProjection.value
  if (current?.key === 'tsne') return ['t-SNE 1', 't-SNE 2']
  if (current?.key === 'monocle2_ddrtree') return ['DDRTree 1', 'DDRTree 2']
  return [`${current?.label || 'UMAP'} 1`, `${current?.label || 'UMAP'} 2`]
}

function projectionLabel() {
  return currentProjection.value?.label || 'UMAP'
}

function buildCategoricalSeries() {
  const data = dataset.value
  if (!data) return []
  const fieldIndex = metaIndex.value[colorBy.value]
  const [xIndex, yIndex] = projectionIndexes()
  const groups = new Map()

  data.cells.forEach((cell, index) => {
    const label = String(cell[fieldIndex] ?? 'Unknown')
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push([cell[xIndex], cell[yIndex], index])
  })

  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([name, values], index) => ({
      name,
      type: 'scatter',
      data: values,
      symbolSize: 4,
      progressive: 5000,
      progressiveThreshold: 8000,
      itemStyle: { color: colorFor(index), opacity: 0.72 },
      emphasis: { focus: 'series', itemStyle: { opacity: 1 } }
    }))
}

function continuousExtent() {
  const data = dataset.value
  const fieldIndex = metaIndex.value[colorBy.value]
  if (!data || fieldIndex === undefined) return { min: 0, max: 1 }
  let min = Infinity
  let max = -Infinity
  data.cells.forEach(cell => {
    const value = Number(cell[fieldIndex])
    if (!Number.isFinite(value)) return
    min = Math.min(min, value)
    max = Math.max(max, value)
  })
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 }
  if (min === max) return { min, max: min + 1 }
  return { min, max }
}

function buildContinuousSeries() {
  const data = dataset.value
  if (!data) return []
  const fieldIndex = metaIndex.value[colorBy.value]
  const [xIndex, yIndex] = projectionIndexes()
  return [{
    name: selectedColorField.value?.label || colorBy.value,
    type: 'scatter',
    data: data.cells.map((cell, index) => [cell[xIndex], cell[yIndex], index, Number(cell[fieldIndex] ?? 0)]),
    symbolSize: 4,
    progressive: 5000,
    progressiveThreshold: 8000,
    itemStyle: { opacity: 0.78 },
    emphasis: { itemStyle: { opacity: 1 } }
  }]
}

function buildGroupSeries() {
  return isContinuousColor.value ? buildContinuousSeries() : buildCategoricalSeries()
}

function buildExpressionSeries() {
  const data = dataset.value
  const values = expressionValues.value
  if (!data || !values) return []
  const [xIndex, yIndex] = projectionIndexes()
  return [{
    name: selectedGene.value?.gene || t('geneExpression'),
    type: 'scatter',
    data: data.cells.map((cell, index) => [cell[xIndex], cell[yIndex], index, values[index]]),
    symbolSize: 4,
    progressive: 5000,
    progressiveThreshold: 8000,
    itemStyle: { opacity: 0.78 },
    emphasis: { itemStyle: { opacity: 1 } }
  }]
}

function expressionMax() {
  const values = expressionValues.value
  if (!values) return 0
  let max = 0
  for (const value of values) if (value > max) max = value
  return max
}

function renderGroupChart() {
  const el = groupChartRef.value
  if (!el || !dataset.value) return
  if (!groupChart) groupChart = echarts.init(el)

  const [xName, yName] = projectionAxisNames()
  const field = selectedColorField.value?.label || colorBy.value
  const series = buildGroupSeries()
  const extent = continuousExtent()

  groupChart.setOption({
    animation: false,
    color: isContinuousColor.value ? undefined : series.map((_, index) => colorFor(index)),
    title: {
      text: `${projectionLabel()} colored by ${field}`,
      left: 8,
      top: 2,
      textStyle: { fontSize: 13, fontWeight: 700, color: '#1e293b' }
    },
    grid: { left: 58, right: isContinuousColor.value ? 78 : 160, top: 44, bottom: 46 },
    legend: isContinuousColor.value ? { show: false } : {
      type: 'scroll',
      orient: 'vertical',
      right: 8,
      top: 44,
      bottom: 26,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 10 },
      formatter: value => compactName(value, 18)
    },
    visualMap: isContinuousColor.value ? {
      min: extent.min,
      max: extent.max,
      dimension: 3,
      right: 8,
      top: 60,
      itemWidth: 12,
      itemHeight: 170,
      text: ['High', 'Low'],
      textStyle: { fontSize: 10, color: '#64748b' },
      inRange: { color: ['#f0fdf4', '#86efac', '#42b983', '#047857'] }
    } : undefined,
    tooltip: {
      trigger: 'item',
      formatter(params) {
        return cellTooltip(params, xName, yName, null, isContinuousColor.value ? params.value[3] : null)
      }
    },
    xAxis: axisOption(xName, false),
    yAxis: axisOption(yName, true),
    series
  }, true)
  groupChart.resize()
}

function renderGeneChart() {
  const el = geneChartRef.value
  if (!el || !dataset.value || !selectedGene.value || !expressionValues.value) return
  if (!geneChart) geneChart = echarts.init(el)

  const [xName, yName] = projectionAxisNames()
  const maxExpression = expressionMax()

  geneChart.setOption({
    animation: false,
    title: {
      text: `${selectedGene.value.gene} expression on ${projectionLabel()}`,
      left: 8,
      top: 2,
      textStyle: { fontSize: 13, fontWeight: 700, color: '#1e293b' }
    },
    grid: { left: 58, right: 78, top: 44, bottom: 46 },
    legend: { show: false },
    visualMap: {
      min: 0,
      max: Math.max(1, maxExpression),
      dimension: 3,
      right: 8,
      top: 60,
      itemWidth: 12,
      itemHeight: 170,
      text: ['High', '0'],
      textStyle: { fontSize: 10, color: '#64748b' },
      inRange: { color: ['#f0fdf4', '#86efac', '#42b983', '#047857'] }
    },
    tooltip: {
      trigger: 'item',
      formatter(params) {
        return cellTooltip(params, xName, yName, params.value[3])
      }
    },
    xAxis: axisOption(xName, false),
    yAxis: axisOption(yName, true),
    series: buildExpressionSeries()
  }, true)
  geneChart.resize()
}

function axisOption(name, vertical) {
  return {
    type: 'value',
    name,
    nameLocation: 'middle',
    nameRotate: vertical ? 90 : 0,
    nameGap: vertical ? 38 : 28,
    splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
  }
}

function cellTooltip(params, xName, yName, expressionValue = null, colorValue = null) {
  const cell = dataset.value.cells[params.value[2]]
  const sample = cell[metaIndex.value.sample]
  const label = cell[metaIndex.value.SingleR_pruned_label]
  const cluster = cell[metaIndex.value['RNA_snn_res.0.8']]
  const nCount = cell[metaIndex.value.nCount_RNA]
  const nFeature = cell[metaIndex.value.nFeature_RNA]
  const mt = cell[metaIndex.value['percent.mt']]
  const expressionLine = expressionValue === null ? '' : `<br/>${selectedGene.value.gene}: ${formatNumber(expressionValue, 3)}`
  const colorLine = colorValue === null ? '' : `<br/>${selectedColorField.value?.label || colorBy.value}: ${formatNumber(colorValue, 3)}`
  return `${params.seriesName}<br/>${t('sample')}: ${sample}<br/>${t('label')}: ${label}<br/>${t('cluster')} 0.8: ${cluster}${colorLine}${expressionLine}<br/>${xName}: ${formatNumber(params.value[0], 3)}<br/>${yName}: ${formatNumber(params.value[1], 3)}<br/>${t('nCount')}: ${nCount}<br/>${t('nFeature')}: ${nFeature}<br/>${t('percentMt')}: ${mt}%`
}

function rowFromExpressionGroup(name, vals) {
  const detected = vals.filter(value => value > 0).length
  const stats = boxStats(vals)
  return {
    name,
    count: vals.length,
    detected,
    detectedPercent: vals.length ? detected / vals.length * 100 : 0,
    stats
  }
}

function buildBoxplotRows(values) {
  const groupIndex = metaIndex.value[colorBy.value]
  if (groupIndex === undefined) return []

  if (!isContinuousColor.value) {
    const groups = new Map()
    dataset.value.cells.forEach((cell, index) => {
      const group = String(cell[groupIndex] ?? 'Unknown')
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group).push(values[index])
    })
    return [...groups.entries()]
      .map(([name, vals]) => rowFromExpressionGroup(name, vals))
      .sort((a, b) => b.detectedPercent - a.detectedPercent || b.stats[3] - a.stats[3] || b.count - a.count || a.name.localeCompare(b.name))
  }

  const numericValues = dataset.value.cells
    .map(cell => Number(cell[groupIndex]))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  if (!numericValues.length) return [rowFromExpressionGroup('NA', Array.from(values))]

  const breaks = [0, 1, 2, 3, 4, 5, 6].map(index => quantile(numericValues, index / 6))
  const bins = breaks.slice(0, -1).map((min, index) => ({
    min,
    max: breaks[index + 1],
    name: `${compactValue(min)}-${compactValue(breaks[index + 1])}`,
    values: []
  }))

  dataset.value.cells.forEach((cell, index) => {
    const value = Number(cell[groupIndex])
    if (!Number.isFinite(value)) return
    const binIndex = bins.findIndex((bin, i) => value <= bin.max || i === bins.length - 1)
    bins[Math.max(0, binIndex)].values.push(values[index])
  })

  return bins
    .filter(bin => bin.values.length)
    .map(bin => rowFromExpressionGroup(bin.name, bin.values))
}

function renderExpressionBoxplot() {
  const el = boxChartRef.value
  const values = expressionValues.value
  if (!dataset.value || !selectedGene.value || !values) return
  if (!el) {
    nextTick(renderExpressionBoxplot)
    return
  }
  if (!boxChart) boxChart = echarts.init(el, null, { renderer: 'svg' })

  const rows = buildBoxplotRows(values)

  const maxValue = Math.max(1, ...rows.map(row => row.stats[4]))
  const width = Math.max(780, rows.length * 46 + 150)
  el.style.width = width + 'px'
  el.style.height = '320px'

  boxChart.setOption({
    animation: false,
    title: {
      text: `${selectedGene.value.gene} by ${selectedColorField.value?.label || colorBy.value}`,
      left: 8,
      top: 0,
      textStyle: { fontSize: 12, fontWeight: 700, color: '#1e293b' }
    },
    tooltip: {
      trigger: 'item',
      formatter(params) {
        const d = params.data
        return `${rows[d[0]].name}<br/>Cells: ${d[7]}<br/>Detected: ${formatNumber(d[8], 1)}%<br/>Min: ${formatNumber(d[1], 3)}<br/>Q1: ${formatNumber(d[2], 3)}<br/>Median: ${formatNumber(d[3], 3)}<br/>Q3: ${formatNumber(d[4], 3)}<br/>Max: ${formatNumber(d[5], 3)}`
      }
    },
    grid: { left: 54, right: 38, top: 38, bottom: 76 },
    xAxis: {
      type: 'category',
      data: rows.map(row => row.name),
      axisLabel: { rotate: 38, fontSize: 9, margin: 10, formatter: value => compactName(value, 13) },
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: 'value',
      name: 'log1p(count)',
      min: 0,
      max: Math.ceil(maxValue * 10) / 10,
      nameLocation: 'middle',
      nameRotate: 90,
      nameGap: 42,
      splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
    },
    series: [{
      name: selectedGene.value.gene,
      type: 'custom',
      encode: { x: 0, y: [1, 2, 3, 4, 5] },
      data: rows.map((row, index) => [index, ...row.stats, row.detected, row.count, row.detectedPercent]),
      renderItem(params, api) {
        const categoryIndex = api.value(0)
        const low = api.value(1)
        const q1 = api.value(2)
        const median = api.value(3)
        const q3 = api.value(4)
        const high = api.value(5)
        const center = api.coord([categoryIndex, 0])[0]
        const lowY = api.coord([categoryIndex, low])[1]
        const q1Y = api.coord([categoryIndex, q1])[1]
        const medianY = api.coord([categoryIndex, median])[1]
        const q3Y = api.coord([categoryIndex, q3])[1]
        const highY = api.coord([categoryIndex, high])[1]
        const bandWidth = Math.max(10, api.size([1, 0])[0] * 0.34)
        const half = bandWidth / 2
        const boxY = Math.min(q1Y, q3Y)
        const boxHeight = Math.max(2, Math.abs(q1Y - q3Y))
        const detectedPercent = api.value(8)
        const stroke = '#42b983'
        const fill = 'rgba(66, 185, 131, 0.28)'
        const dotY = api.coord([categoryIndex, Math.min(maxValue, detectedPercent / 100 * maxValue)])[1]
        return {
          type: 'group',
          children: [
            { type: 'line', shape: { x1: center, y1: highY, x2: center, y2: lowY }, style: { stroke, lineWidth: 1.2 } },
            { type: 'line', shape: { x1: center - half * 0.62, y1: highY, x2: center + half * 0.62, y2: highY }, style: { stroke, lineWidth: 1.2 } },
            { type: 'line', shape: { x1: center - half * 0.62, y1: lowY, x2: center + half * 0.62, y2: lowY }, style: { stroke, lineWidth: 1.2 } },
            { type: 'rect', shape: { x: center - half, y: boxY, width: bandWidth, height: boxHeight }, style: { fill, stroke, lineWidth: 1.3 } },
            { type: 'line', shape: { x1: center - half, y1: medianY, x2: center + half, y2: medianY }, style: { stroke: '#dc2626', lineWidth: 1.6 } },
            { type: 'circle', shape: { cx: center, cy: dotY, r: 2.4 }, style: { fill: '#0f766e', opacity: 0.78 } }
          ]
        }
      }
    }]
  }, true)
  boxChart.resize()
}

function renderCompositionChart() {
  const el = compositionChartRef.value
  const composition = dataset.value?.cellComposition
  if (!el || !composition?.samples?.length) return
  if (!compositionChart) compositionChart = echarts.init(el)

  const samples = composition.samples
  const cellTypes = composition.cellTypes || []
  const rows = new Map((composition.fractions || []).map(row => [row.sample, row]))
  const series = cellTypes.map((cellType, index) => ({
    name: cellType,
    type: 'bar',
    stack: 'fraction',
    barMaxWidth: 34,
    itemStyle: { color: colorFor(index) },
    emphasis: { focus: 'series' },
    data: samples.map(sample => rows.get(sample)?.[cellType] || 0)
  }))

  compositionChart.setOption({
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: value => formatPercent(value)
    },
    legend: {
      type: 'scroll',
      top: 0,
      left: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 10 },
      formatter: value => compactName(value, 18)
    },
    grid: { left: 54, right: 18, top: 70, bottom: 64 },
    xAxis: {
      type: 'category',
      data: samples,
      axisLabel: { rotate: 35, fontSize: 10, margin: 12 }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      name: 'Fraction',
      nameLocation: 'middle',
      nameGap: 38,
      axisLabel: { formatter: value => `${Math.round(value * 100)}%` },
      splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
    },
    series
  }, true)
  compositionChart.resize()
}

function renderCellChatCharts() {
  renderPathwayChart()
  renderCommunicationHeatmap()
}

function renderPathwayChart() {
  const el = pathwayChartRef.value
  const pathways = dataset.value?.cellChat?.pathways || []
  if (!el || !pathways.length) return
  if (!pathwayChart) pathwayChart = echarts.init(el)

  const top = pathways.slice(0, 15).reverse()
  pathwayChart.setOption({
    animation: false,
    title: {
      text: 'Top signaling pathways',
      left: 8,
      top: 2,
      textStyle: { fontSize: 13, fontWeight: 700, color: '#1e293b' }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: value => formatNumber(value, 3)
    },
    grid: { left: 92, right: 24, top: 42, bottom: 28 },
    xAxis: {
      type: 'value',
      name: 'Total probability',
      nameLocation: 'middle',
      nameGap: 24,
      splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
    },
    yAxis: {
      type: 'category',
      data: top.map(row => row.pathway),
      axisLabel: { fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: top.map(row => row.totalProbability),
      itemStyle: { color: '#42b983' }
    }]
  }, true)
  pathwayChart.resize()
}

function renderCommunicationHeatmap() {
  const el = communicationChartRef.value
  const cellChat = dataset.value?.cellChat
  if (!el || !cellChat?.groups?.length) return
  if (!communicationChart) communicationChart = echarts.init(el)

  const groups = cellChat.groups
  const maxValue = Math.max(1, ...(cellChat.edges || []).map(edge => edge.value))
  const data = (cellChat.edges || [])
    .map(edge => [groups.indexOf(edge.target), groups.indexOf(edge.source), edge.value, edge.count])
    .filter(item => item[0] >= 0 && item[1] >= 0)

  communicationChart.setOption({
    animation: false,
    title: {
      text: 'Communication weight matrix',
      left: 8,
      top: 2,
      textStyle: { fontSize: 13, fontWeight: 700, color: '#1e293b' }
    },
    tooltip: {
      formatter(params) {
        const [targetIndex, sourceIndex, weight, count] = params.value
        return `Source: ${groups[sourceIndex]}<br/>Target: ${groups[targetIndex]}<br/>Weight: ${formatNumber(weight, 4)}<br/>Count: ${count}`
      }
    },
    grid: { left: 118, right: 72, top: 42, bottom: 112 },
    xAxis: { type: 'category', data: groups, axisLabel: { rotate: 45, fontSize: 9, formatter: value => compactName(value, 14) } },
    yAxis: { type: 'category', data: groups, axisLabel: { fontSize: 9, formatter: value => compactName(value, 16) } },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: 'vertical',
      right: 8,
      top: 56,
      itemWidth: 12,
      itemHeight: 150,
      textStyle: { fontSize: 10, color: '#64748b' },
      inRange: { color: ['#f8fafc', '#d1fae5', '#42b983', '#047857'] }
    },
    series: [{
      type: 'heatmap',
      data,
      emphasis: { itemStyle: { borderColor: '#0f172a', borderWidth: 1 } }
    }]
  }, true)
  communicationChart.resize()
}
watch(datasetKey, loadDataset, { immediate: true })
watch(selectedGeneId, () => {
  if (!skipGeneWatch) loadGeneExpression()
})
watch([projection, currentLang], () => nextTick(() => {
  renderGroupChart()
  renderGeneChart()
}))
watch(colorBy, () => nextTick(() => {
  renderGroupChart()
  renderExpressionBoxplot()
}))

onBeforeUnmount(() => {
  groupChart?.dispose()
  geneChart?.dispose()
  boxChart?.dispose()
  compositionChart?.dispose()
  pathwayChart?.dispose()
  communicationChart?.dispose()
})
</script>

<style scoped>
.section-block { margin-bottom: 28px; }
.section-title { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 12px; padding-left: 12px; border-left: 4px solid #42b983; }
.single-cell-card { background: #fff; border-radius: 10px; padding: 10px 15px 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.loading-wrapper { padding: 20px; }
.stat-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 8px; }
.stat-item { min-width: 0; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; background: #f8fafc; }
.stat-item span { display: block; color: #64748b; font-size: 11px; }
.stat-item strong { display: block; color: #1e293b; font-size: 18px; line-height: 1.3; }
.summary-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 8px; }
.summary-row :deep(.el-tag) { --el-tag-text-color: #16875d; --el-tag-border-color: #9fe0c4; --el-tag-bg-color: #f2fbf7; }
.control-panel { border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; background: #f8fafc; padding: 10px 12px; margin: 8px -3px 10px; }
.control-panel :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { background-color: #42b983; border-color: #42b983; box-shadow: -1px 0 0 0 #42b983; color: #fff; }
.control-panel :deep(.el-radio-button__inner:hover) { color: #16875d; }
.control-panel :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner:hover) { color: #fff; }
.control-panel :deep(.el-select__wrapper.is-focused),
.control-panel :deep(.el-select__wrapper:hover) { box-shadow: 0 0 0 1px #42b983 inset; }
.panel-title { color: #1e293b; font-size: 12px; font-weight: 700; margin-bottom: 8px; }
.control-grid { display: grid; grid-template-columns: minmax(180px, 0.7fr) minmax(240px, 1fr) minmax(320px, 1.4fr); gap: 10px; align-items: end; }
.control-item { min-width: 0; }
.control-item > span { display: block; color: #64748b; font-size: 10px; margin-bottom: 4px; }
.control-select, .gene-select { width: 100%; }
.charts-grid { display: grid; grid-template-columns: minmax(0, 48%) minmax(0, 48%); justify-content: space-between; gap: 8px; align-items: start; padding-top: 2px; }
.plot-panel { min-width: 0; border-top: 1px solid #e2e8f0; padding-top: 10px; }
.single-cell-chart { width: 100%; height: 560px; }
.gene-empty { height: 560px; display: flex; align-items: center; justify-content: center; }
.expression-box-panel { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
.box-header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 6px; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 24px; }
.panel-heading-tight { margin-bottom: 4px; }
.chart-title { color: #1e293b; font-size: 13px; font-weight: 700; }
.chart-title-small { font-size: 11px; color: #475569; }
.download-actions { display: flex; gap: 4px; align-items: center; flex: 0 0 auto; }
.download-actions :deep(.el-button) { height: 22px; min-width: 34px; padding: 0 7px; border: 1px solid #9fe0c4; border-radius: 4px; background: #fff; color: #16875d; font-size: 10px; font-weight: 600; }
.download-actions :deep(.el-button:hover),
.download-actions :deep(.el-button:focus) { border-color: #42b983; background: #f2fbf7; color: #047857; }
.download-actions :deep(.el-button:active) { border-color: #16875d; background: #e1f6ec; color: #047857; }
.box-subtitle { color: #64748b; font-size: 10px; line-height: 1.35; text-align: right; }
.box-subtitle-left { margin-top: 3px; text-align: left; }
.expression-box-chart { width: 100%; min-width: 760px; height: 320px; }
.expression-box-panel { overflow-x: auto; }
.result-panel { margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
.result-header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 8px; }
.result-subtitle { margin-top: 3px; color: #64748b; font-size: 10px; line-height: 1.35; }
.result-metrics { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; color: #475569; font-size: 10px; }
.result-metrics span { border: 1px solid #b7ead6; color: #16875d; background: #f2fbf7; border-radius: 4px; padding: 2px 6px; }
.composition-layout { display: flex; flex-wrap: nowrap; gap: 10px; align-items: stretch; margin-top: 4px; }
.chart-download-panel { min-width: 0; }
.composition-chart-panel { flex: 1 1 auto; min-width: 0; }
.composition-chart { width: 100%; height: 356px; }
.composition-table-panel { flex: 0 0 420px; min-width: 360px; max-width: 460px; }
.cellchat-layout { display: flex; flex-wrap: nowrap; gap: 10px; align-items: stretch; margin-top: 4px; }
.communication-chart { width: 100%; height: 402px; }
.pathway-chart { flex: 1 1 29%; min-width: 0; }
.communication-heatmap { flex: 1 1 34%; min-width: 0; }
.cellchat-table-panel { flex: 0 0 560px; min-width: 480px; max-width: 620px; }
.result-table { width: 100%; margin-top: 8px; font-size: 11px; }
.composition-table-panel .result-table { margin-top: 0; }
.compact-table :deep(.el-table__cell) { padding: 5px 0; }
.cellchat-table { max-width: 100%; overflow-x: auto; }
.cellchat-table-panel .result-table { margin-top: 0; }
.table-pagination { justify-content: flex-end; margin-top: 8px; }
.qc-row { display: flex; flex-wrap: wrap; gap: 8px 16px; border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px; color: #64748b; font-size: 10px; line-height: 1.35; }
@media (max-width: 1100px) {
  .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .control-grid { grid-template-columns: 1fr; }
  .charts-grid { grid-template-columns: 1fr; }
  .single-cell-chart, .gene-empty { height: 520px; }
  .communication-chart { height: 390px; }
  .box-header { flex-direction: column; }
  .box-subtitle { text-align: left; }
}
</style>