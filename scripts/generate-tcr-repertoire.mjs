import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourceRoot = path.join(root, 'src/bcrdata')
const outDir = path.join(root, 'src/data/tcr')
const datasetKey = 'U41_PBMC_10x_TCR'
const clonePath = path.join(sourceRoot, 'U41_clonal-assignment_clone-pass.tsv')
const metaPath = path.join(sourceRoot, 'U41_PBMC_10x_TCR_meta-pass.tsv')
const scqcPath = path.join(sourceRoot, 'U41_PBMC_10x_TCR_scqc_scqc-pass.tsv')

function readTsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').trim()
  const lines = text.split(/\r?\n/)
  const headers = lines[0].split('\t')
  return lines.slice(1).filter(Boolean).map(line => {
    const cols = line.split('\t')
    const row = {}
    headers.forEach((header, index) => { row[header] = cols[index] ?? '' })
    return row
  })
}

function cleanGene(value) {
  return String(value || 'Unknown').split(',')[0].trim() || 'Unknown'
}

function countBy(rows, key) {
  const counts = new Map()
  rows.forEach(row => {
    const value = typeof key === 'function' ? key(row) : row[key]
    const label = String(value || 'Unknown')
    counts.set(label, (counts.get(label) || 0) + 1)
  })
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function topCounts(rows, key, limit = 20) {
  return countBy(rows, key).slice(0, limit)
}

function sizeBin(size) {
  if (size === 1) return '1'
  if (size === 2) return '2'
  if (size <= 5) return '3-5'
  if (size <= 10) return '6-10'
  if (size <= 20) return '11-20'
  return '>20'
}

function cloneRepresentative(rows, locus) {
  const found = rows.find(row => row.locus === locus)
  if (!found) return null
  return {
    v: cleanGene(found.v_call),
    j: cleanGene(found.j_call),
    cdr3: found.junction_aa || '',
    length: Number(found.junction_length || 0)
  }
}

fs.mkdirSync(outDir, { recursive: true })

const cloneRowsRaw = readTsv(clonePath)
const metaRows = readTsv(metaPath)
const scqcRows = readTsv(scqcPath)
const cloneGroups = new Map()
const cellLoci = new Map()

cloneRowsRaw.forEach(row => {
  const cloneId = row.clone_id || 'Unknown'
  if (!cloneGroups.has(cloneId)) cloneGroups.set(cloneId, [])
  cloneGroups.get(cloneId).push(row)
  const cellId = row.cell_id || 'Unknown'
  if (!cellLoci.has(cellId)) cellLoci.set(cellId, new Set())
  cellLoci.get(cellId).add(row.locus || 'Unknown')
})

const cloneRows = [...cloneGroups.entries()].map(([cloneId, rows]) => {
  const cells = new Set(rows.map(row => row.cell_id).filter(Boolean))
  const tra = cloneRepresentative(rows, 'TRA')
  const trb = cloneRepresentative(rows, 'TRB')
  return {
    cloneId,
    cells: cells.size,
    contigs: rows.length,
    loci: [...new Set(rows.map(row => row.locus).filter(Boolean))].join('+'),
    traV: tra?.v || '',
    traJ: tra?.j || '',
    traCdr3: tra?.cdr3 || '',
    trbV: trb?.v || '',
    trbJ: trb?.j || '',
    trbCdr3: trb?.cdr3 || ''
  }
}).sort((a, b) => b.cells - a.cells || Number(a.cloneId) - Number(b.cloneId))

const cloneSizeBins = ['1', '2', '3-5', '6-10', '11-20', '>20'].map(label => ({ label, count: 0 }))
const binMap = new Map(cloneSizeBins.map(item => [item.label, item]))
cloneRows.forEach(row => { binMap.get(sizeBin(row.cells)).count++ })

const chainCompositionMap = new Map()
cellLoci.forEach(loci => {
  const hasTra = loci.has('TRA')
  const hasTrb = loci.has('TRB')
  const label = hasTra && hasTrb ? 'TRA+TRB' : hasTra ? 'TRA only' : hasTrb ? 'TRB only' : 'Other'
  chainCompositionMap.set(label, (chainCompositionMap.get(label) || 0) + 1)
})
const chainComposition = [...chainCompositionMap.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)

function lengthCounts(rows) {
  return countBy(rows, row => Number(row.junction_length || 0)).sort((a, b) => Number(a.label) - Number(b.label))
}

function mergeLengthCounts(traRows, trbRows) {
  const lengths = [...new Set([...traRows, ...trbRows].map(item => item.label))].sort((a, b) => Number(a) - Number(b))
  const traMap = new Map(traRows.map(item => [item.label, item.count]))
  const trbMap = new Map(trbRows.map(item => [item.label, item.count]))
  return lengths.map(label => ({ label, TRA: traMap.get(label) || 0, TRB: trbMap.get(label) || 0 }))
}

function buildVjPairing(rows, vRows, jRows) {
  const topVGenes = vRows.slice(0, 12).map(item => item.label)
  const topJGenes = jRows.slice(0, 12).map(item => item.label)
  const counts = new Map()
  rows.forEach(row => {
    const v = cleanGene(row.v_call)
    const j = cleanGene(row.j_call)
    if (!topVGenes.includes(v) || !topJGenes.includes(j)) return
    const key = `${v}\t${j}`
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  const heatmap = []
  topVGenes.forEach((v, vIndex) => {
    topJGenes.forEach((j, jIndex) => {
      heatmap.push([jIndex, vIndex, counts.get(`${v}\t${j}`) || 0])
    })
  })
  return { vGenes: topVGenes, jGenes: topJGenes, data: heatmap }
}

const traRows = cloneRowsRaw.filter(row => row.locus === 'TRA')
const trbRows = cloneRowsRaw.filter(row => row.locus === 'TRB')
const cdr3Length = {
  all: mergeLengthCounts(lengthCounts(traRows), lengthCounts(trbRows)),
  TRA: lengthCounts(traRows),
  TRB: lengthCounts(trbRows)
}
const vUsage = {
  all: topCounts(cloneRowsRaw, row => cleanGene(row.v_call), 20),
  TRA: topCounts(traRows, row => cleanGene(row.v_call), 20),
  TRB: topCounts(trbRows, row => cleanGene(row.v_call), 20)
}
const jUsage = {
  all: topCounts(cloneRowsRaw, row => cleanGene(row.j_call), 20),
  TRA: topCounts(traRows, row => cleanGene(row.j_call), 20),
  TRB: topCounts(trbRows, row => cleanGene(row.j_call), 20)
}
const vjPairing = {
  all: buildVjPairing(cloneRowsRaw, vUsage.all, jUsage.all),
  TRA: buildVjPairing(traRows, vUsage.TRA, jUsage.TRA),
  TRB: buildVjPairing(trbRows, vUsage.TRB, jUsage.TRB)
}

const contigTable = cloneRowsRaw.map(row => ({
  sequenceId: row.sequence_id,
  cellId: row.cell_id,
  cloneId: row.clone_id,
  locus: row.locus,
  vCall: cleanGene(row.v_call),
  jCall: cleanGene(row.j_call),
  cdr3: row.junction_aa || '',
  junctionLength: Number(row.junction_length || 0)
}))

const payload = {
  datasetKey,
  title: 'U41 PBMC 10x TCR',
  sourceFiles: [path.basename(clonePath), path.basename(metaPath), path.basename(scqcPath)],
  summary: {
    sample: datasetKey,
    metaContigs: metaRows.length,
    scqcContigs: scqcRows.length,
    cloneContigs: cloneRowsRaw.length,
    cells: cellLoci.size,
    clones: cloneRows.length,
    expandedClones: cloneRows.filter(row => row.cells > 1).length,
    singletonClones: cloneRows.filter(row => row.cells === 1).length,
    traContigs: cloneRowsRaw.filter(row => row.locus === 'TRA').length,
    trbContigs: cloneRowsRaw.filter(row => row.locus === 'TRB').length,
    pairedCells: chainCompositionMap.get('TRA+TRB') || 0
  },
  cloneSizeBins,
  chainComposition,
  cdr3Length,
  vUsage,
  jUsage,
  vjPairing,
  topClones: cloneRows.slice(0, 30),
  cloneTable: cloneRows,
  contigTable
}

const outPath = path.join(outDir, `${datasetKey}_repertoire.json`)
fs.writeFileSync(outPath, JSON.stringify(payload), 'utf8')
console.log(`${datasetKey}: ${payload.summary.cells} cells, ${payload.summary.clones} clones, ${payload.summary.cloneContigs} clone-pass contigs`)
console.log(outPath)