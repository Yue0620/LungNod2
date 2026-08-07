import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import readline from 'node:readline'

const root = process.cwd()
const sourceRoot = process.env.SINGLE_CELL_EXPRESSION_SPARSE || path.resolve(root, 'external/LDP00003_LDD00003_Transcriptome_10x/analysis_results/expression_sparse')
const datasetKey = 'LDP00003_LDD00003'
const publicDir = path.join(root, 'public/single-cell-expression')
const srcIndexDir = path.join(root, 'src/data/single-cell-expression')

const matrixPath = path.join(sourceRoot, 'filtered_counts.mtx.gz')
const featuresPath = path.join(sourceRoot, 'features.tsv.gz')
const barcodesPath = path.join(sourceRoot, 'barcodes.tsv.gz')
const binName = `${datasetKey}_expression.bin`
const indexName = `${datasetKey}_expression_index.json`
const binPath = path.join(publicDir, binName)

function readGzipLines(filePath) {
  return zlib.gunzipSync(fs.readFileSync(filePath)).toString('utf8').trim().split(/\r?\n/)
}

function parseFeatures() {
  return readGzipLines(featuresPath).map((line, index) => {
    const cols = line.split('\t')
    return {
      index,
      gene: cols[2] || cols[0] || `Gene_${index + 1}`,
      geneId: cols[1] || cols[0] || `Gene_${index + 1}`,
      feature: cols[0] || '',
      rawFeatureId: cols[3] || '',
      rawFeatureName: cols[4] || ''
    }
  })
}

async function scanMatrix(onEntry) {
  const rl = readline.createInterface({ input: fs.createReadStream(matrixPath).pipe(zlib.createGunzip()) })
  let dimensions = null
  for await (const line of rl) {
    if (!line || line.startsWith('%')) continue
    const parts = line.split(' ')
    if (!dimensions) {
      dimensions = parts.map(Number)
      continue
    }
    onEntry(Number(parts[0]) - 1, Number(parts[1]) - 1, Number(parts[2]))
  }
  return dimensions
}

fs.mkdirSync(publicDir, { recursive: true })
fs.mkdirSync(srcIndexDir, { recursive: true })

const features = parseFeatures()
const barcodes = readGzipLines(barcodesPath)
const rowCounts = new Uint32Array(features.length)
let maxCount = 0
let observedNnz = 0
let dimensions = await scanMatrix((geneIndex, cellIndex, count) => {
  rowCounts[geneIndex]++
  observedNnz++
  if (count > maxCount) maxCount = count
})

if (dimensions[0] !== features.length) throw new Error(`Feature count mismatch: ${dimensions[0]} vs ${features.length}`)
if (dimensions[1] !== barcodes.length) throw new Error(`Cell count mismatch: ${dimensions[1]} vs ${barcodes.length}`)
if (dimensions[2] !== observedNnz) throw new Error(`NNZ mismatch: ${dimensions[2]} vs ${observedNnz}`)

const recordSize = maxCount <= 65535 ? 6 : 8
const valueBytes = recordSize === 6 ? 2 : 4
const geneStarts = new Uint32Array(features.length)
let cursor = 0
for (let i = 0; i < rowCounts.length; i++) {
  geneStarts[i] = cursor
  cursor += rowCounts[i]
}

const positions = new Uint32Array(features.length)
const cellIndices = new Uint32Array(observedNnz)
const counts = recordSize === 6 ? new Uint16Array(observedNnz) : new Uint32Array(observedNnz)

await scanMatrix((geneIndex, cellIndex, count) => {
  const pos = geneStarts[geneIndex] + positions[geneIndex]
  positions[geneIndex]++
  cellIndices[pos] = cellIndex
  counts[pos] = count
})

const fd = fs.openSync(binPath, 'w')
const genes = []
let byteOffset = 0
for (let geneIndex = 0; geneIndex < features.length; geneIndex++) {
  const nnz = rowCounts[geneIndex]
  const start = geneStarts[geneIndex]
  const byteLength = nnz * recordSize
  const buffer = Buffer.allocUnsafe(byteLength)
  for (let i = 0; i < nnz; i++) {
    const sourceIndex = start + i
    const offset = i * recordSize
    buffer.writeUInt32LE(cellIndices[sourceIndex], offset)
    if (valueBytes === 2) buffer.writeUInt16LE(counts[sourceIndex], offset + 4)
    else buffer.writeUInt32LE(counts[sourceIndex], offset + 4)
  }
  fs.writeSync(fd, buffer)
  genes.push({ ...features[geneIndex], nnz, offset: byteOffset, length: byteLength })
  byteOffset += byteLength
}
fs.closeSync(fd)

const payload = {
  datasetKey,
  matrixFile: `/single-cell-expression/${binName}`,
  recordSize,
  valueBytes,
  cellCount: barcodes.length,
  geneCount: features.length,
  nnz: observedNnz,
  maxCount,
  genes
}
const json = JSON.stringify(payload)
fs.writeFileSync(path.join(publicDir, indexName), json, 'utf8')
fs.writeFileSync(path.join(srcIndexDir, indexName), json, 'utf8')
console.log(`${datasetKey}: ${features.length} genes, ${barcodes.length} cells, ${observedNnz} non-zero expression records`)
console.log(`recordSize=${recordSize}, maxCount=${maxCount}, binary=${Math.round(byteOffset / 1024 / 1024)} MB`)