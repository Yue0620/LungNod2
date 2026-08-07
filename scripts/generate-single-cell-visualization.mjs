import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root = process.cwd()
const sourceRoot = process.env.SINGLE_CELL_ANALYSIS_RESULTS || path.resolve(root, 'external/LDP00003_LDD00003_Transcriptome_10x/analysis_results')
const outDir = path.join(root, 'src/data/single-cell')
const datasetKey = 'LDP00003_LDD00003'

const cellFeaturePath = path.join(sourceRoot, 'cell_feature_matrix.tsv.gz')
const parameterPath = path.join(sourceRoot, 'pipeline_parameters.tsv')
const sampleQcPath = path.join(sourceRoot, 'sample_qc_summary.tsv')
const clusterAnnotationPath = path.join(sourceRoot, 'singleR_cluster_annotation.tsv')
const compositionLongPath = path.join(sourceRoot, 'cell_composition_by_sample_long.tsv')
const compositionFractionPath = path.join(sourceRoot, 'cell_composition_by_sample_fraction.tsv')
const cellchatRoot = path.join(sourceRoot, 'cellchat_communication')
const cellchatLrPath = path.join(cellchatRoot, 'cellchat_ligand_receptor_interactions.tsv')
const cellchatPathwaySummaryPath = path.join(cellchatRoot, 'cellchat_pathway_summary.tsv')
const cellchatPathwayInteractionPath = path.join(cellchatRoot, 'cellchat_pathway_interactions.tsv')
const cellchatWeightMatrixPath = path.join(cellchatRoot, 'cellchat_network_weight_matrix.tsv')
const cellchatCountMatrixPath = path.join(cellchatRoot, 'cellchat_network_count_matrix.tsv')

const clusterFields = ['RNA_snn_res.0.2', 'RNA_snn_res.0.4', 'RNA_snn_res.0.6', 'RNA_snn_res.0.8', 'RNA_snn_res.1', 'RNA_snn_res.1.2']
const coordinatePairs = [
  { key: 'umap', label: 'UMAP', fields: ['umap_1', 'umap_2'], indices: [0, 1] },
  { key: 'tsne', label: 't-SNE', fields: ['tsne_1', 'tsne_2'], indices: [2, 3] },
  { key: 'monocle2_ddrtree', label: 'Monocle2 DDRTree', fields: ['monocle2_ddrtree_1', 'monocle2_ddrtree_2'], indices: [4, 5] }
]
const categoricalFields = [
  'sample',
  'SingleR_pruned_label',
  'SingleR_label',
  'SingleR_cluster_pruned_label',
  'SingleR_cluster_label',
  ...clusterFields,
  'monocle2_principal_node',
  'monocle2_state',
  'monocle2_root_node',
  'monocle2_root_mode'
]
const continuousFields = [
  'nCount_RNA',
  'nFeature_RNA',
  'percent.mt',
  'percent.ribo',
  'percent.hb',
  'SingleR_delta_next',
  'SingleR_score_max',
  'monocle2_ddrtree_1',
  'monocle2_ddrtree_2',
  'monocle2_pseudotime',
  'monocle2_pseudotime_reverse'
]
const metaFields = [...categoricalFields, ...continuousFields]
const colorFields = [
  { key: 'SingleR_pruned_label', label: 'SingleR pruned label', type: 'categorical' },
  { key: 'SingleR_label', label: 'SingleR label', type: 'categorical' },
  { key: 'SingleR_cluster_pruned_label', label: 'SingleR cluster pruned label', type: 'categorical' },
  { key: 'SingleR_cluster_label', label: 'SingleR cluster label', type: 'categorical' },
  { key: 'sample', label: 'Sample', type: 'categorical' },
  ...clusterFields.map(key => ({ key, label: key.replace('RNA_snn_res.', 'Cluster res.'), type: 'categorical' })),
  { key: 'monocle2_principal_node', label: 'Monocle2 principal node', type: 'categorical' },
  { key: 'monocle2_state', label: 'Monocle2 state', type: 'categorical' },
  { key: 'monocle2_root_node', label: 'Monocle2 root node', type: 'categorical' },
  { key: 'monocle2_root_mode', label: 'Monocle2 root mode', type: 'categorical' },
  { key: 'nCount_RNA', label: 'nCount_RNA', type: 'continuous' },
  { key: 'nFeature_RNA', label: 'nFeature_RNA', type: 'continuous' },
  { key: 'percent.mt', label: 'percent.mt', type: 'continuous' },
  { key: 'percent.ribo', label: 'percent.ribo', type: 'continuous' },
  { key: 'percent.hb', label: 'percent.hb', type: 'continuous' },
  { key: 'SingleR_delta_next', label: 'SingleR delta next', type: 'continuous' },
  { key: 'SingleR_score_max', label: 'SingleR score max', type: 'continuous' },
  { key: 'monocle2_ddrtree_1', label: 'Monocle2 DDRTree 1', type: 'continuous' },
  { key: 'monocle2_ddrtree_2', label: 'Monocle2 DDRTree 2', type: 'continuous' },
  { key: 'monocle2_pseudotime', label: 'Monocle2 pseudotime', type: 'continuous' },
  { key: 'monocle2_pseudotime_reverse', label: 'Monocle2 pseudotime reverse', type: 'continuous' }
]
const continuousFieldSet = new Set(continuousFields)

function clean(value) {
  const text = String(value ?? '').trim()
  return text || 'Unknown'
}

function compactNumber(value, digits = 4) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Number(num.toFixed(digits))
}

function readTsv(filePath) {
  if (!fs.existsSync(filePath)) return []
  const text = fs.readFileSync(filePath, 'utf8').trim()
  if (!text) return []
  const lines = text.split(/\r?\n/)
  const headers = lines[0].split('\t')
  return lines.slice(1).filter(Boolean).map(line => {
    const cols = line.split('\t')
    const row = {}
    headers.forEach((header, index) => { row[header] = cols[index] ?? '' })
    return row
  })
}

function countValues(rows, index) {
  const counts = new Map()
  for (const row of rows) counts.set(row[index], (counts.get(row[index]) || 0) + 1)
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function median(values) {
  const nums = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!nums.length) return 0
  const mid = Math.floor(nums.length / 2)
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}

function asNumber(value, digits = 6) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return compactNumber(num, digits)
}

function readMatrix(filePath) {
  const rows = readTsv(filePath)
  if (!rows.length) return { groups: [], values: [] }
  const groups = Object.keys(rows[0]).filter(key => key !== 'source')
  const values = []
  rows.forEach(row => {
    groups.forEach(target => {
      values.push({ source: row.source, target, value: asNumber(row[target], 8) })
    })
  })
  return { groups, values }
}

fs.mkdirSync(outDir, { recursive: true })

const featureText = zlib.gunzipSync(fs.readFileSync(cellFeaturePath)).toString('utf8').trim()
const lines = featureText.split(/\r?\n/)
const headers = lines[0].split('\t')
const columnIndex = Object.fromEntries(headers.map((header, index) => [header, index]))
const coordinateFields = coordinatePairs.flatMap(pair => pair.fields)
const required = ['cell', ...coordinateFields, ...metaFields]
const missing = required.filter(field => columnIndex[field] === undefined)
if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}`)

const cells = []
const qc = {
  nCount_RNA: [],
  nFeature_RNA: [],
  'percent.mt': [],
  'percent.ribo': [],
  'percent.hb': []
}

for (let i = 1; i < lines.length; i++) {
  const line = lines[i]
  if (!line) continue
  const cols = line.split('\t')
  const row = [
    ...coordinateFields.map(field => compactNumber(cols[columnIndex[field]])),
    ...metaFields.map(field => {
      if (continuousFieldSet.has(field)) return compactNumber(cols[columnIndex[field]], field === 'nCount_RNA' || field === 'nFeature_RNA' ? 0 : 4)
      return clean(cols[columnIndex[field]])
    })
  ]
  cells.push(row)
  const metaOffset = coordinateFields.length
  qc.nCount_RNA.push(Number(row[metaFields.indexOf('nCount_RNA') + metaOffset]))
  qc.nFeature_RNA.push(Number(row[metaFields.indexOf('nFeature_RNA') + metaOffset]))
  qc['percent.mt'].push(Number(row[metaFields.indexOf('percent.mt') + metaOffset]))
  qc['percent.ribo'].push(Number(row[metaFields.indexOf('percent.ribo') + metaOffset]))
  qc['percent.hb'].push(Number(row[metaFields.indexOf('percent.hb') + metaOffset]))
}

const metaOffset = coordinateFields.length
const sampleIndex = metaFields.indexOf('sample') + metaOffset
const prunedLabelIndex = metaFields.indexOf('SingleR_pruned_label') + metaOffset
const cluster08Index = metaFields.indexOf('RNA_snn_res.0.8') + metaOffset
const parameters = Object.fromEntries(readTsv(parameterPath).map(row => [row.parameter, row.value]))
const sampleQc = readTsv(sampleQcPath).map(row => ({
  sample: row.sample,
  cells: Number(row.cells),
  median_nCount_RNA: compactNumber(row.median_nCount_RNA, 2),
  median_nFeature_RNA: compactNumber(row.median_nFeature_RNA, 2),
  median_percent_mt: compactNumber(row.median_percent_mt, 3),
  median_percent_ribo: compactNumber(row.median_percent_ribo, 3),
  median_percent_hb: compactNumber(row.median_percent_hb, 3)
}))
const clusterAnnotation = readTsv(clusterAnnotationPath).map(row => ({
  cluster: row.cluster,
  label: row.SingleR_cluster_label,
  prunedLabel: row.SingleR_cluster_pruned_label,
  deltaNext: compactNumber(row.SingleR_cluster_delta_next, 4)
}))

const compositionLong = readTsv(compositionLongPath).map(row => ({
  sample: row.sample,
  cellType: row.cell_type,
  count: Number(row.N || 0),
  fraction: asNumber(row.fraction, 8)
}))
const compositionWide = readTsv(compositionFractionPath)
const compositionSamples = compositionWide.map(row => row.sample)
const compositionCellTypes = compositionWide.length ? Object.keys(compositionWide[0]).filter(key => key !== 'sample') : []
const cellchatWeight = readMatrix(cellchatWeightMatrixPath)
const cellchatCount = readMatrix(cellchatCountMatrixPath)
const countMap = new Map(cellchatCount.values.map(item => [`${item.source}\t${item.target}`, item.value]))
const cellchatEdges = cellchatWeight.values
  .map(item => ({ ...item, count: countMap.get(`${item.source}\t${item.target}`) || 0 }))
  .filter(item => item.value > 0 || item.count > 0)
  .sort((a, b) => b.value - a.value)
const cellchatPathways = readTsv(cellchatPathwaySummaryPath)
  .map(row => ({ pathway: row.pathway, totalProbability: asNumber(row.total_probability, 8) }))
  .sort((a, b) => b.totalProbability - a.totalProbability)
const cellchatPathwayInteractions = readTsv(cellchatPathwayInteractionPath)
  .map(row => ({ source: row.source, target: row.target, pathway: row.pathway_name, prob: asNumber(row.prob, 8), pval: asNumber(row.pval, 8) }))
  .sort((a, b) => b.prob - a.prob)
const cellchatInteractions = readTsv(cellchatLrPath)
  .map(row => ({
    source: row.source,
    target: row.target,
    ligand: row.ligand,
    receptor: row.receptor,
    prob: asNumber(row.prob, 10),
    pval: asNumber(row.pval, 10),
    interaction: row.interaction_name_2 || row.interaction_name,
    pathway: row.pathway_name,
    annotation: row.annotation
  }))
  .sort((a, b) => b.prob - a.prob)

const payload = {
  datasetKey,
  source: {
    analysisResults: 'external/LDP00003_LDD00003_Transcriptome_10x/analysis_results',
    cellFeatureMatrix: 'cell_feature_matrix.tsv.gz'
  },
  summary: {
    cellsBeforeQc: Number(parameters.cells_before_qc || 0),
    cellsAfterQc: Number(parameters.cells_after_qc || cells.length),
    cells: cells.length,
    genes: 25667,
    nonZeroExpressionItems: 69759254,
    samples: countValues(cells, sampleIndex),
    labels: countValues(cells, prunedLabelIndex),
    clustersRes08: countValues(cells, cluster08Index),
    qcMedian: {
      nCount_RNA: compactNumber(median(qc.nCount_RNA), 2),
      nFeature_RNA: compactNumber(median(qc.nFeature_RNA), 2),
      percent_mt: compactNumber(median(qc['percent.mt']), 3),
      percent_ribo: compactNumber(median(qc['percent.ribo']), 3),
      percent_hb: compactNumber(median(qc['percent.hb']), 3)
    }
  },
  parameters,
  sampleQc,
  clusterAnnotation,
  cellComposition: {
    samples: compositionSamples,
    cellTypes: compositionCellTypes,
    long: compositionLong,
    fractions: compositionWide.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, key === 'sample' ? value : asNumber(value, 8)])))
  },
  cellChat: {
    groups: cellchatWeight.groups,
    edges: cellchatEdges,
    pathways: cellchatPathways,
    pathwayInteractions: cellchatPathwayInteractions,
    interactions: cellchatInteractions,
    summary: {
      groups: cellchatWeight.groups.length,
      edges: cellchatEdges.length,
      ligandReceptorInteractions: cellchatInteractions.length,
      pathwayInteractions: cellchatPathwayInteractions.length,
      pathways: cellchatPathways.length
    }
  },
  metaFields,
  colorFields,
  coordinateFields,
  coordinatePairs,
  cells
}

const outPath = path.join(outDir, `${datasetKey}_single_cell.json`)
fs.writeFileSync(outPath, JSON.stringify(payload), 'utf8')
console.log(`${datasetKey}: ${cells.length} cells, ${payload.summary.samples.length} samples, ${payload.summary.labels.length} labels`)
console.log(outPath)