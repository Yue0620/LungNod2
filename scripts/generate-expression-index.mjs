import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const rawDir = path.join(root, 'src/rawdata')
const indexDir = path.join(root, 'src/data/basic-expression')
const publicDir = path.join(root, 'public/basic-expression')
const labelPath = path.join(rawDir, 'label.txt')

function cleanToken(value) {
  return String(value || '').trim().replace(/^"|"$/g, '')
}

function geneLabel(rawId) {
  const id = cleanToken(rawId)
  const idx = id.lastIndexOf('_')
  return idx > 0 ? id.slice(idx + 1) : id
}

function compactNumber(value, digits = 4) {
  if (!Number.isFinite(value)) return '0'
  return Number(value.toFixed(digits)).toString()
}

function readLabels() {
  const text = fs.readFileSync(labelPath, 'utf8').trim()
  const rows = text.split(/\r?\n/).slice(1)
  const labels = new Map()
  for (const row of rows) {
    const [project, dataset, sample, label] = row.split('\t').map(cleanToken)
    if (project && dataset && sample && label) labels.set(`${project}_${dataset}_${sample}`, label)
  }
  return labels
}

function writeLine(fd, line) {
  const buffer = Buffer.from(line, 'utf8')
  fs.writeSync(fd, buffer)
  return buffer.length
}

fs.mkdirSync(indexDir, { recursive: true })
fs.mkdirSync(publicDir, { recursive: true })

const labels = readLabels()
const rawFiles = fs.readdirSync(rawDir).filter(name => name.endsWith('_Transcriptome_Bulk.txt')).sort()
const index = []

for (const fileName of rawFiles) {
  const datasetKey = fileName.replace('_Transcriptome_Bulk.txt', '')
  const [project, dataset] = datasetKey.split('_')
  const rawPath = path.join(rawDir, fileName)
  const outName = `${datasetKey}_expression.tsv`
  const outPath = path.join(publicDir, outName)
  const text = fs.readFileSync(rawPath, 'utf8').trim()
  const lines = text.split(/\r?\n/)
  const samples = lines[0].split('\t').slice(1).map(cleanToken)
  const sampleItems = samples.map(sample => ({
    sample,
    label: labels.get(`${project}_${dataset}_${sample}`) || 'Unknown'
  }))
  const uniqueLabels = [...new Set(sampleItems.map(item => item.label))]
  const genes = []
  const fd = fs.openSync(outPath, 'w')
  let offset = 0
  offset += writeLine(fd, ['gene', 'geneId', ...samples].join('\t') + '\n')

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t')
    if (cols.length < samples.length + 1) continue
    const geneId = cleanToken(cols[0])
    const gene = geneLabel(geneId)
    const values = cols.slice(1).map(value => compactNumber(Math.log2((Number(value) || 0) + 1), 4))
    const line = [gene, geneId, ...values].join('\t') + '\n'
    const length = Buffer.byteLength(line, 'utf8')
    genes.push({ gene, geneId, offset, length })
    offset += writeLine(fd, line)
  }
  fs.closeSync(fd)

  const indexName = `${datasetKey}_expression.json`
  const indexPayload = JSON.stringify({
    datasetKey,
    matrixFile: `/basic-expression/${outName}`,
    samples: sampleItems,
    labels: uniqueLabels,
    genes
  })
  fs.writeFileSync(path.join(indexDir, indexName), indexPayload, 'utf8')
  fs.writeFileSync(path.join(publicDir, indexName), indexPayload, 'utf8')

  index.push({ datasetKey, file: indexName, matrixFile: `/basic-expression/${outName}`, genes: genes.length, samples: samples.length })
  console.log(`${datasetKey}: ${genes.length} genes, ${samples.length} samples`)
}

const datasetIndex = JSON.stringify(index, null, 2)
fs.writeFileSync(path.join(indexDir, 'index.json'), datasetIndex, 'utf8')
fs.writeFileSync(path.join(publicDir, 'index.json'), datasetIndex, 'utf8')
