import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const rawDir = path.join(root, 'src/rawdata')
const outDir = path.join(root, 'src/data/basic')
const labelPath = path.join(rawDir, 'label.txt')

const MIN_ABS_LOG2FC = 1
const MAX_HEATMAP_GENES = 50
const MAX_VOLCANO_POINTS = 3000

function cleanToken(value) {
  return String(value || '').trim().replace(/^"|"$/g, '')
}

function geneLabel(rawId) {
  const id = cleanToken(rawId)
  const idx = id.lastIndexOf('_')
  return idx > 0 ? id.slice(idx + 1) : id
}

function mean(vals) {
  if (!vals.length) return 0
  return vals.reduce((sum, v) => sum + v, 0) / vals.length
}

function variance(vals, avg) {
  if (vals.length < 2) return 0
  return vals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / (vals.length - 1)
}

function gammaln(xx) {
  const cof = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.001208650973866179,
    -0.000005395239384953
  ]
  let x = xx - 1
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < cof.length; j++) {
    x += 1
    ser += cof[j] / x
  }
  return -tmp + Math.log(2.5066282746310005 * ser)
}

function betacf(a, b, x) {
  const maxIt = 100
  const eps = 3e-7
  const fpMin = 1e-30
  let qab = a + b
  let qap = a + 1
  let qam = a - 1
  let c = 1
  let d = 1 - qab * x / qap
  if (Math.abs(d) < fpMin) d = fpMin
  d = 1 / d
  let h = d
  for (let m = 1; m <= maxIt; m++) {
    const m2 = 2 * m
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < fpMin) d = fpMin
    c = 1 + aa / c
    if (Math.abs(c) < fpMin) c = fpMin
    d = 1 / d
    h *= d * c
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < fpMin) d = fpMin
    c = 1 + aa / c
    if (Math.abs(c) < fpMin) c = fpMin
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < eps) break
  }
  return h
}

function betai(a, b, x) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a
  return 1 - bt * betacf(b, a, 1 - x) / b
}

function welchPValue(meanA, varA, nA, meanB, varB, nB) {
  const se2 = varA / nA + varB / nB
  if (se2 <= 0) return meanA === meanB ? 1 : 0
  const t = Math.abs((meanA - meanB) / Math.sqrt(se2))
  const numerator = se2 * se2
  const denominator = Math.pow(varA / nA, 2) / Math.max(nA - 1, 1) + Math.pow(varB / nB, 2) / Math.max(nB - 1, 1)
  const df = denominator > 0 ? numerator / denominator : nA + nB - 2
  const x = df / (df + t * t)
  const p = betai(df / 2, 0.5, x)
  return Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 1
}

function adjustBH(results) {
  const sorted = [...results].sort((a, b) => a.pValue - b.pValue)
  let prev = 1
  for (let i = sorted.length - 1; i >= 0; i--) {
    const rank = i + 1
    const adj = Math.min(prev, sorted[i].pValue * sorted.length / rank)
    sorted[i].adjPValue = Math.min(1, adj)
    prev = sorted[i].adjPValue
  }
}

function readLabels() {
  const text = fs.readFileSync(labelPath, 'utf8').trim()
  const rows = text.split(/\r?\n/).slice(1)
  const labels = new Map()
  for (const row of rows) {
    const [project, dataset, sample, label] = row.split('\t').map(cleanToken)
    if (!project || !dataset || !sample || !label) continue
    labels.set(`${project}_${dataset}_${sample}`, label)
  }
  return labels
}

function compactNumber(value, digits = 6) {
  if (!Number.isFinite(value)) return 0
  return Number(value.toFixed(digits))
}

function evenlySample(rows, limit) {
  if (rows.length <= limit) return rows
  if (limit <= 0) return []
  if (limit === 1) return [rows[0]]
  const sampled = []
  const step = (rows.length - 1) / (limit - 1)
  for (let i = 0; i < limit; i++) sampled.push(rows[Math.round(i * step)])
  return sampled
}

function selectVolcanoPoints(results) {
  const significant = results
    .filter(r => r.adjPValue < 0.05 && Math.abs(r.log2FoldChange) >= MIN_ABS_LOG2FC)
    .sort((a, b) => a.adjPValue - b.adjPValue || Math.abs(b.log2FoldChange) - Math.abs(a.log2FoldChange))
  const background = results
    .filter(r => !(r.adjPValue < 0.05 && Math.abs(r.log2FoldChange) >= MIN_ABS_LOG2FC))

  const selected = [...significant]
  const seen = new Set(selected.map(row => row.geneId))
  const backgroundLimit = Math.max(0, MAX_VOLCANO_POINTS - selected.length)
  if (backgroundLimit === 0) return selected

  const bins = [
    row => row.log2FoldChange < -2,
    row => row.log2FoldChange >= -2 && row.log2FoldChange < -1,
    row => row.log2FoldChange >= -1 && row.log2FoldChange < 0,
    row => row.log2FoldChange >= 0 && row.log2FoldChange < 1,
    row => row.log2FoldChange >= 1 && row.log2FoldChange < 2,
    row => row.log2FoldChange >= 2
  ]
  const perBin = Math.max(1, Math.floor(backgroundLimit / bins.length))
  for (const inBin of bins) {
    const rows = background
      .filter(row => inBin(row))
      .sort((a, b) => a.adjPValue - b.adjPValue)
    for (const row of evenlySample(rows, perBin)) {
      if (!seen.has(row.geneId) && selected.length < significant.length + backgroundLimit) {
        selected.push(row)
        seen.add(row.geneId)
      }
    }
  }

  if (selected.length < significant.length + backgroundLimit) {
    const remainder = background
      .filter(row => !seen.has(row.geneId))
      .sort((a, b) => a.adjPValue - b.adjPValue)
    for (const row of evenlySample(remainder, significant.length + backgroundLimit - selected.length)) selected.push(row)
  }

  return selected
}

function analyzeFile(filePath, labels) {
  const fileName = path.basename(filePath)
  const [project, dataset] = fileName.replace('_Transcriptome_Bulk.txt', '').split('_')
  const datasetKey = `${project}_${dataset}`
  const text = fs.readFileSync(filePath, 'utf8').trim()
  const lines = text.split(/\r?\n/)
  const samples = lines[0].split('\t').slice(1).map(cleanToken)
  const sampleLabels = samples.map(sample => labels.get(`${project}_${dataset}_${sample}`) || '')
  const labelNames = [...new Set(sampleLabels.filter(Boolean))].sort((a, b) => a.localeCompare(b))
  if (labelNames.length < 2) return null

  const groupIndexes = new Map()
  for (const label of labelNames) groupIndexes.set(label, [])
  sampleLabels.forEach((label, index) => {
    if (groupIndexes.has(label)) groupIndexes.get(label).push(index)
  })

  const pairKeys = []
  for (let i = 0; i < labelNames.length; i++) {
    for (let j = i + 1; j < labelNames.length; j++) {
      pairKeys.push([labelNames[i], labelNames[j]])
    }
  }

  const comparisons = new Map()
  for (const [groupA, groupB] of pairKeys) {
    comparisons.set(`${groupA}__vs__${groupB}`, {
      groupA,
      groupB,
      rows: [],
      heatmapSource: new Map()
    })
  }

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const cols = lines[lineIndex].split('\t')
    if (cols.length < samples.length + 1) continue
    const rawGeneId = cleanToken(cols[0])
    const values = cols.slice(1).map(v => Math.log2((Number(v) || 0) + 1))
    const gene = geneLabel(rawGeneId)

    const statsByLabel = new Map()
    for (const label of labelNames) {
      const vals = groupIndexes.get(label).map(i => values[i]).filter(Number.isFinite)
      const avg = mean(vals)
      statsByLabel.set(label, { vals, mean: avg, variance: variance(vals, avg), n: vals.length })
    }

    for (const [groupA, groupB] of pairKeys) {
      const comp = comparisons.get(`${groupA}__vs__${groupB}`)
      const a = statsByLabel.get(groupA)
      const b = statsByLabel.get(groupB)
      if (!a || !b || a.n < 2 || b.n < 2) continue
      const log2FoldChange = a.mean - b.mean
      const pValue = welchPValue(a.mean, a.variance, a.n, b.mean, b.variance, b.n)
      comp.rows.push({ gene, geneId: rawGeneId, log2FoldChange, pValue })
      comp.heatmapSource.set(gene, values)
    }
  }

  const serializedComparisons = []
  for (const [index, [key, comp]] of [...comparisons.entries()].entries()) {
    adjustBH(comp.rows)
    const ranked = [...comp.rows].sort((a, b) => {
      const sigA = a.adjPValue < 0.05 && Math.abs(a.log2FoldChange) >= MIN_ABS_LOG2FC ? 1 : 0
      const sigB = b.adjPValue < 0.05 && Math.abs(b.log2FoldChange) >= MIN_ABS_LOG2FC ? 1 : 0
      return sigB - sigA || a.adjPValue - b.adjPValue || Math.abs(b.log2FoldChange) - Math.abs(a.log2FoldChange)
    })
    const heatmapGenes = ranked.slice(0, MAX_HEATMAP_GENES)
    const pairSampleIndexes = [...groupIndexes.get(comp.groupA), ...groupIndexes.get(comp.groupB)]
    const pairSamples = pairSampleIndexes.map(i => ({ sample: samples[i], label: sampleLabels[i] }))
    const heatmapValues = []

    heatmapGenes.forEach((row, geneIndex) => {
      const values = pairSampleIndexes.map(i => comp.heatmapSource.get(row.gene)?.[i] ?? 0)
      const avg = mean(values)
      const sd = Math.sqrt(variance(values, avg)) || 1
      values.forEach((value, sampleIndex) => {
        heatmapValues.push([sampleIndex, geneIndex, compactNumber((value - avg) / sd, 4)])
      })
    })

    const volcanoPoints = selectVolcanoPoints(comp.rows).map(row => {
      const direction = row.adjPValue < 0.05 && row.log2FoldChange >= MIN_ABS_LOG2FC ? 1 : row.adjPValue < 0.05 && row.log2FoldChange <= -MIN_ABS_LOG2FC ? -1 : 0
      return [
        compactNumber(row.log2FoldChange, 5),
        compactNumber(-Math.log10(Math.max(row.adjPValue, 1e-300)), 5),
        row.gene,
        compactNumber(row.adjPValue, 6),
        compactNumber(row.pValue, 6),
        direction
      ]
    })
    const topGenes = heatmapGenes.map(row => ({
      gene: row.gene,
      log2FoldChange: compactNumber(row.log2FoldChange, 4),
      adjPValue: Number(row.adjPValue.toPrecision(6)),
      pValue: Number(row.pValue.toPrecision(6))
    }))

    serializedComparisons.push({
      id: `c${index + 1}`,
      groupA: comp.groupA,
      groupB: comp.groupB,
      groupASamples: groupIndexes.get(comp.groupA).length,
      groupBSamples: groupIndexes.get(comp.groupB).length,
      totalGenes: comp.rows.length,
      shownVolcanoGenes: volcanoPoints.length,
      significantGenes: comp.rows.filter(r => r.adjPValue < 0.05 && Math.abs(r.log2FoldChange) >= MIN_ABS_LOG2FC).length,
      upGenes: comp.rows.filter(r => r.adjPValue < 0.05 && r.log2FoldChange >= MIN_ABS_LOG2FC).length,
      downGenes: comp.rows.filter(r => r.adjPValue < 0.05 && r.log2FoldChange <= -MIN_ABS_LOG2FC).length,
      volcanoPoints,
      topGenes,
      heatmapGenes: heatmapGenes.map(row => row.gene),
      heatmapSamples: pairSamples,
      heatmapValues
    })
  }

  return {
    datasetKey,
    project,
    dataset,
    sampleCount: samples.length,
    labels: labelNames.map(label => ({ label, count: groupIndexes.get(label).length })),
    thresholds: { absLog2FoldChange: MIN_ABS_LOG2FC, adjustedPValue: 0.05 },
    comparisons: serializedComparisons
  }
}

fs.mkdirSync(outDir, { recursive: true })
const labels = readLabels()
const rawFiles = fs.readdirSync(rawDir)
  .filter(name => name.endsWith('_Transcriptome_Bulk.txt'))
  .sort()

const index = []
for (const fileName of rawFiles) {
  const result = analyzeFile(path.join(rawDir, fileName), labels)
  if (!result) continue
  const outName = `${result.datasetKey}_basic.json`
  fs.writeFileSync(path.join(outDir, outName), JSON.stringify(result), 'utf8')
  index.push({ datasetKey: result.datasetKey, file: outName, labels: result.labels.length, comparisons: result.comparisons.length })
  console.log(`${result.datasetKey}: ${result.labels.length} labels, ${result.comparisons.length} comparisons`)
}
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8')
