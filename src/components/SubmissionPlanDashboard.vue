<script setup>
import { ref, computed, watch } from 'vue'
import { currentLang } from '@/store/lang.js'
import source from '@/data/submissionPlan.json'
import actuals from '@/data/submissionActuals.json'
import PlanProgressCell from './PlanProgressCell.vue'
import UnplannedWork from './UnplannedWork.vue'

const labels = {
  zh: { title: '数据提交计划与进度', subtitle: '按项目 ID 汇总，展开查看数据类型、疾病与组织明细', demo: '真实接口快照 · 2026-11-04', search: '搜索项目 ID 或数据类型', period: '分期完成', cumulative: '累计完成', expand: '展开全部', collapse: '收起全部', ids: '项目 ID', items: '计划提交项次', submitted: '已核实样本提交项次', total: '全计划总进度', type: '数据大类型 / 子类型', context: '疾病 / 组织', detail: '计划明细', noPlan: '无计划', empty: '没有匹配的计划', note: '按接口创建时间归入半年。三站记录合并展示，OMIX 按每个文件计一个样本。查询失败按零计。无法分配至组织的进度标为待核实。单细胞 RNA-Seq 的 20 项按计划分配至血液和肺组织，各 10 项。', mode: '累计列表示截至该期的计划与提交合计；分期列仅计算该期任务。', records: '条原始计划', count: '已提交 / 计划项次', source: '原始行', volume: '计划数据大小（原表数值，单位未注明）', hint: '点击左侧箭头查看类型明细；横向滚动可查看全部时间段。', overupto: '截至' },
  en: { title: 'Submission Plans & Progress', subtitle: 'One row per project ID. Expand for data types, diseases and tissues.', demo: 'API snapshot · 2026-11-04', search: 'Search project ID or data type', period: 'By period', cumulative: 'Cumulative', expand: 'Expand all', collapse: 'Collapse all', ids: 'Project IDs', items: 'Planned submission items', submitted: 'Verified sample submission items', total: 'Overall progress', type: 'Data category / subtype', context: 'Disease / tissue', detail: 'Plan details', noPlan: 'No plan', empty: 'No matching plans', note: 'Periods use record creation dates. Records from all three sources are combined. Each OMIX file counts as one sample. Failed queries count as zero. Counts without tissue allocation are marked pending. The 20 single-cell RNA-Seq items are allocated according to the plan: 10 blood and 10 lung.', mode: 'Cumulative columns include all plans through that period. Period columns include only that period.', records: 'source records', count: 'Submitted / planned items', source: 'Source rows', volume: 'Planned data size (source values; unit unspecified)', hint: 'Expand a plan for type details. Scroll horizontally to see all periods.', overupto: 'Through' }
}
const t = computed(() => labels[currentLang.value] || labels.zh)
const periods = [...new Set(source.map(r => r.period))].sort((a,b) => Number(a.split('.')[0])-Number(b.split('.')[0]) || Number(a.split('.')[1].split('-')[0])-Number(b.split('.')[1].split('-')[0]))
const totalIds = new Set(source.map(row => row.id)).size
const search = ref('')
const query = computed(() => search.value.trim().toLowerCase())
const sortMetric = ref('percent')
const downloading = ref(false)
const downloadError = ref(false)
const mode = ref('period')
const expanded = ref(new Set())
const records = source
const plannedFileRecords = actuals.files.filter(record => !record.outsidePlan)

function aggregate(rows) {
  const planned = rows.reduce((count, row) => count + row.planned, 0)
  const rowIds = new Set(rows.map(row => row.sourceRow))
  const fileRecords = plannedFileRecords.filter(record => record.rows.some(id => rowIds.has(id)))
  const files = fileRecords.filter(record => record.rows.every(id => rowIds.has(id)))
    .reduce((count, record) => count + record.submitted, 0)
  let partial = fileRecords.some(record => !record.rows.every(id => rowIds.has(id)))
  let submitted = files
  for (const match of actuals.matches) {
    if (match.rows.every(id => rowIds.has(id))) submitted += match.submitted
    else if (match.rows.some(id => rowIds.has(id))) partial = true
  }
  return { planned, submitted, partial, percent: planned && !partial ? Math.round(submitted / planned * 100) : null }
}
function cell(rows, period) {
  return aggregate(rows.filter(r => mode.value === 'cumulative' ? periods.indexOf(r.period) <= periods.indexOf(period) : r.period === period))
}
function detailKey(r) { return JSON.stringify([r.type,r.subtype,r.disease,r.tissue]) }
function matchesSearch(fields) {
  return fields.some(value => String(value ?? '').toLowerCase().includes(query.value))
}

const plans = computed(() => {
  const groups = new Map()
  for (const r of records) {
    if (!groups.has(r.id)) groups.set(r.id, {id:r.id, rows:[]})
    groups.get(r.id).rows.push(r)
  }
  return [...groups.values()].map(p => {
    const matchesProject = matchesSearch([p.id])
    const rows = matchesProject ? p.rows : p.rows.filter(row => matchesSearch([row.type, row.subtype, row.disease, row.tissue]))
    const unplanned = actuals.files.filter(row => row.projectId === p.id && row.outsidePlan &&
      (matchesProject || matchesSearch([row.type, row.subtype, row.accession])))
    const details = new Map()
    for (const r of rows) {
      const key = detailKey(r)
      if (!details.has(key)) details.set(key,{key,type:r.type,subtype:r.subtype,disease:r.disease,tissue:r.tissue,rows:[]})
      details.get(key).rows.push(r)
    }
    return { ...p, rows, unplanned, total: aggregate(rows), details: [...details.values()] }
  }).filter(p => p.rows.length || p.unplanned.length)
})
watch(query, (keyword, previousKeyword) => {
  if (keyword) expanded.value = new Set(plans.value.map(p => p.id))
  else if (previousKeyword) expanded.value = new Set()
})
const summary = computed(() => ({...aggregate(plans.value.flatMap(p=>p.rows)), ids:plans.value.length}))
const allExpanded = computed(() => plans.value.length>0 && plans.value.every(p=>expanded.value.has(p.id)))
function toggle(id) { const next = new Set(expanded.value); next.has(id)?next.delete(id):next.add(id); expanded.value=next }
function toggleAll() { expanded.value=allExpanded.value?new Set():new Set(plans.value.map(p=>p.id)) }
function periodLabel(p) { const [year,half]=p.split('.'); return currentLang.value==='en'?`${year} H${half==='1-6'?'1':'2'}`:`${year}${half==='1-6'?' 上半年':' 下半年'}` }
const number = n => n.toLocaleString('en-US')
function detailTitle(d) { return `${t.value.source}: ${d.rows.map(r=>r.sourceRow).join(', ')}\n${t.value.volume}: ${Number(d.rows.reduce((n,r)=>n+r.volume,0).toPrecision(8))}` }

const planSort = ref({ key: 'id', direction: 'asc' })
const detailSort = ref({ key: '', direction: 'asc' })
function changeSort(state, key) {
  const direction = state.key === key && state.direction === 'asc' ? 'desc' : 'asc'
  state.key = key
  state.direction = direction
}
function sortArrow(state, key) { return state.key === key ? (state.direction === 'asc' ? '↑' : '↓') : '↕' }
function ariaSort(state, keys) { return keys.includes(state.key) ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none' }
function sortValue(row, key) {
  if (key === 'total' || periods.includes(key)) {
    const progress = key === 'total' ? aggregate(row.rows) : cell(row.rows, key)
    return progress.planned ? progress[sortMetric.value] : null
  }
  return row[key]
}
function sortedRows(rows, state) {
  if (!state.key) return rows
  return [...rows].sort((a,b) => {
    const x = sortValue(a, state.key), y = sortValue(b, state.key)
    // No-plan cells remain last in both directions.
    if (x == null || y == null) return x == null && y == null ? 0 : x == null ? 1 : -1
    const result = typeof x === 'number' && typeof y === 'number' ? x-y : String(x).localeCompare(String(y), currentLang.value === 'en' ? 'en' : 'zh-CN', {numeric:true})
    return state.direction === 'asc' ? result : -result
  })
}
const sortedPlans = computed(() => sortedRows(plans.value, planSort.value))
function sortedDetails(plan) { return sortedRows(plan.details, detailSort.value) }

async function downloadResults() {
  downloadError.value = false
  downloading.value = true
  try {
    const { utils, writeFile } = await import('xlsx')
    const en = currentLang.value === 'en'
    const idHeader = en ? 'Project ID' : '项目 ID'
    const periodHeader = en ? 'Period' : '时间段'
    const progressHeaders = en ? ['Planned items', 'Submitted items', 'Progress'] : ['计划项次', '已提交项次', '进度']
    const typeHeaders = en ? ['Category', 'Subtype'] : ['数据大类型', '数据子类型']
    const summaryRows = [[idHeader, periodHeader, ...progressHeaders]]
    const detailRows = [[idHeader, ...typeHeaders, ...(en ? ['Disease', 'Tissue'] : ['疾病', '组织']), periodHeader, ...progressHeaders]]
    const extraRows = [[idHeader, periodHeader, ...typeHeaders, ...(en ? ['Accession', 'Submitted items'] : ['归档编号', '已提交项次'])]]
    const progressValues = value => [value.planned, value.submitted,
      value.partial ? (en ? 'Pending' : '待核实') : value.percent == null ? '—' : value.submitted > value.planned ? '100%+' : `${value.percent}%`]
    function appendProgress(target, identity, rows) {
      target.push([...identity, t.value.overall, ...progressValues(aggregate(rows))])
      for (const period of periods) {
        const label = `${mode.value === 'cumulative' ? t.value.upto + ' ' : ''}${periodLabel(period)}`
        target.push([...identity, label, ...progressValues(cell(rows, period))])
      }
    }
    for (const plan of sortedPlans.value) {
      appendProgress(summaryRows, [plan.id], plan.rows)
      for (const detail of sortedDetails(plan)) {
        appendProgress(detailRows, [plan.id, detail.type, detail.subtype, detail.disease, detail.tissue], detail.rows)
      }
      for (const row of plan.unplanned) {
        extraRows.push([plan.id, periodLabel(row.period), row.type, row.subtype, row.accession, row.submitted])
      }
    }
    const workbook = utils.book_new()
    utils.book_append_sheet(workbook, utils.aoa_to_sheet(summaryRows), en ? 'Progress summary' : '进度汇总')
    utils.book_append_sheet(workbook, utils.aoa_to_sheet(detailRows), en ? 'Plan details' : '计划明细')
    utils.book_append_sheet(workbook, utils.aoa_to_sheet(extraRows), en ? 'Unplanned work' : '计划外工作')
    writeFile(workbook, 'LungNod-submission-progress.xlsx')
  } catch (error) {
    console.error('Could not export submission progress', error)
    downloadError.value = true
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <section class="plan-dashboard" aria-labelledby="plan-title">
    <header class="plan-header">
      <div><div class="eyebrow">SUBMISSION TRACKER</div><h2 id="plan-title">{{ t.title }}</h2><p>{{ t.subtitle }}</p></div>
      <span class="demo-label"><span></span>{{ t.demo }}</span>
    </header>
    <div class="plan-summary">
      <div><span>{{ t.ids }}</span><strong>{{ summary.ids }}<small> / {{ totalIds }}</small></strong></div>
      <div><span>{{ t.items }}</span><strong>{{ number(summary.planned) }}</strong></div>
      <div><span>{{ t.submitted }}</span><strong class="green-value">{{ number(summary.submitted) }}</strong></div>
    </div>
    <div class="plan-toolbar">
      <div class="plan-filters"><input v-model="search" type="search" :placeholder="t.search" :aria-label="t.search"><fieldset class="sort-metric-options" :aria-label="currentLang === 'en' ? 'Progress column sort metric' : '进度列排序依据'">
        <span class="sort-metric-label">{{ currentLang === 'en' ? 'Sort by:' : '排序方式：' }}</span>
        <label><input v-model="sortMetric" type="radio" name="plan-sort-metric" value="percent">{{ currentLang === 'en' ? 'Progress (%)' : '完成进度（%）' }}</label>
        <label><input v-model="sortMetric" type="radio" name="plan-sort-metric" value="submitted">{{ currentLang === 'en' ? 'Submitted samples' : '已提交样本数' }}</label>
        <label><input v-model="sortMetric" type="radio" name="plan-sort-metric" value="planned">{{ currentLang === 'en' ? 'Planned samples' : '计划提交样本数' }}</label>
      </fieldset></div>
      <div class="plan-actions"><div class="mode-switch" role="group" :aria-label="t.title"><button :class="{active:mode==='period'}" :aria-pressed="mode==='period'" @click="mode='period'">{{ t.period }}</button><button :class="{active:mode==='cumulative'}" :aria-pressed="mode==='cumulative'" @click="mode='cumulative'">{{ t.cumulative }}</button></div><button class="expand-all" @click="toggleAll">{{ allExpanded?t.collapse:t.expand }}</button>
        <button type="button" class="expand-all download-button" :disabled="!plans.length || downloading" @click="downloadResults">{{ currentLang === 'en' ? 'Download Excel' : '下载 Excel' }}</button>
      </div>
    </div>
    <p v-if="downloadError" class="plan-footer" role="alert">{{ currentLang === 'en' ? 'Download failed. Please try again.' : '下载失败，请重试。' }}</p>
    <div class="plan-table-scroll" tabindex="0" :aria-label="t.title">
      <table class="plan-table">
        <colgroup><col style="width:190px"><col style="width:160px"><col v-for="p in periods" :key="p" style="width:160px"></colgroup>
        <thead><tr>
          <th scope="col" :aria-sort="ariaSort(planSort, ['id'])"><div class="sort-options"><button type="button" class="sort-button" @click="changeSort(planSort, 'id')">{{ t.ids }} <span>{{ sortArrow(planSort,'id') }}</span></button></div></th>
          <th scope="col" :aria-sort="ariaSort(planSort, ['total'])"><button type="button" class="sort-button" @click="changeSort(planSort, 'total')">{{ t.total }} <span>{{ sortArrow(planSort,'total') }}</span></button><small>{{ t.overall }}</small></th>
          <th v-for="p in periods" :key="p" scope="col" :aria-sort="ariaSort(planSort,[p])"><small v-if="mode==='cumulative'">{{ t.upto }}</small><button type="button" class="sort-button" @click="changeSort(planSort,p)">{{ periodLabel(p) }} <span>{{ sortArrow(planSort,p) }}</span></button></th>
        </tr></thead>
        <tbody>
          <template v-for="plan in sortedPlans" :key="plan.id">
            <tr class="plan-row" :class="{'is-expanded':expanded.has(plan.id)}">
              <th scope="row"><button class="plan-expander" :aria-expanded="expanded.has(plan.id)" :aria-controls="`details-${plan.id}`" @click="toggle(plan.id)"><span class="chevron" :class="{open:expanded.has(plan.id)}">›</span><span class="plan-id">{{ plan.id }}</span></button></th>
              <td><PlanProgressCell :value="plan.total" :label="t.count" :empty="t.noPlan" /></td>
              <td v-for="p in periods" :key="p"><PlanProgressCell :value="cell(plan.rows,p)" :label="t.count" :empty="t.noPlan" /></td>
            </tr>
            <tr v-if="expanded.has(plan.id)" :id="`details-${plan.id}`" class="detail-row"><td colspan="8">
              <div class="details-heading"><b>{{ plan.id }} · {{ t.detail }}</b><span>{{ plan.rows.length }} {{ t.records }}</span></div>
              <table v-if="plan.details.length" class="detail-table"><colgroup><col style="width:230px"><col style="width:160px"><col style="width:140px"><col v-for="p in periods" :key="p" style="width:160px"></colgroup>
                <thead><tr>
                  <th scope="col" :aria-sort="ariaSort(detailSort,['type','subtype'])"><div class="sort-options"><button type="button" class="sort-button" @click="changeSort(detailSort,'type')">{{ currentLang==='en'?'Category':'数据大类型' }} <span>{{ sortArrow(detailSort,'type') }}</span></button><button type="button" class="sort-button" @click="changeSort(detailSort,'subtype')">{{ currentLang==='en'?'Subtype':'子类型' }} <span>{{ sortArrow(detailSort,'subtype') }}</span></button></div></th>
                  <th scope="col" :aria-sort="ariaSort(detailSort,['disease','tissue'])"><div class="sort-options"><button type="button" class="sort-button" @click="changeSort(detailSort,'disease')">{{ currentLang==='en'?'Disease':'疾病' }} <span>{{ sortArrow(detailSort,'disease') }}</span></button><button type="button" class="sort-button" @click="changeSort(detailSort,'tissue')">{{ currentLang==='en'?'Tissue':'组织' }} <span>{{ sortArrow(detailSort,'tissue') }}</span></button></div></th>
                  <th scope="col" :aria-sort="ariaSort(detailSort,['total'])"><button type="button" class="sort-button" @click="changeSort(detailSort,'total')">{{ t.total }} <span>{{ sortArrow(detailSort,'total') }}</span></button></th>
                  <th v-for="p in periods" :key="p" scope="col" :aria-sort="ariaSort(detailSort,[p])"><small v-if="mode==='cumulative'">{{ t.upto }}</small><button type="button" class="sort-button" @click="changeSort(detailSort,p)">{{ periodLabel(p) }} <span>{{ sortArrow(detailSort,p) }}</span></button></th>
                </tr></thead>
                <tbody><tr v-for="d in sortedDetails(plan)" :key="d.key"><th scope="row" :title="detailTitle(d)"><span class="type-name">{{ d.type }}</span><span class="subtype-name">{{ d.subtype }}</span></th><td><span class="context-name">{{ d.disease }}</span><span class="subtype-name">{{ d.tissue }}</span></td><td><PlanProgressCell :value="aggregate(d.rows)" :label="t.count" :empty="t.noPlan" /></td><td v-for="p in periods" :key="p"><PlanProgressCell :value="cell(d.rows,p)" :label="t.count" :empty="t.noPlan" /></td></tr></tbody>
              </table>
              <UnplannedWork v-if="plan.unplanned.length > 0" :project-id="plan.id" :records="plan.unplanned" />
            </td></tr>
          </template>
          <tr v-if="!plans.length"><td colspan="8" class="empty-state">{{ t.empty }}</td></tr>
        </tbody>
      </table>
    </div>
    <footer class="plan-footer"><p>{{ t.hint }} {{ t.mode }}</p><p>{{ t.note }}</p></footer>
  </section>
</template>

<style scoped>
.plan-dashboard{margin:20px 0 26px;background:#fff;border:1px solid #e3ece7;border-radius:18px;overflow:hidden;color:#334b43;box-shadow:0 4px 20px #243d3205}
.plan-header{padding:24px 26px 20px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.eyebrow{font-size:13px;font-weight:700;letter-spacing:1.8px;color:#54a581;margin-bottom:8px}.plan-header h2{font-size:26px;color:#283f36;margin:0}.plan-header p{font-size:15px;line-height:1.6;color:#7e9087;margin:8px 0 0}.demo-label{display:flex;align-items:center;gap:6px;font-size:14px;color:#9c762e;background:#fff9ed;border:1px solid #efdfbc;border-radius:6px;padding:7px 10px;white-space:nowrap}.demo-label>span{width:6px;height:6px;border-radius:50%;background:#d4ad60}
.plan-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0 26px 20px;background:#f5f9f7;border:1px solid #eaf0ec;border-radius:10px;padding:16px 0}.plan-summary>div{padding:0 22px;border-right:1px solid #e1eae5}.plan-summary>div:last-child{border:0}.plan-summary span{display:block;font-size:14px;color:#7d8f84;margin-bottom:8px}.plan-summary strong{font-size:28px;font-variant-numeric:tabular-nums}.plan-summary small{font-size:14px;color:#9aa89f;font-weight:400}.green-value{color:#29a575}
.plan-toolbar,.plan-filters,.plan-actions{display:flex;gap:10px;align-items:center}.plan-toolbar{justify-content:space-between;flex-wrap:wrap;padding:0 26px 18px}.plan-filters input[type="search"],.plan-filters select{font:inherit;font-size:15px;border:1px solid #dfe8e2;border-radius:7px;background:#fff;color:#506358;height:40px;padding:0 10px}.plan-filters input[type="search"]{width:290px}.plan-filters input[type="search"]:focus,.plan-filters select:focus{outline:2px solid #9bd6ba;outline-offset:1px}.mode-switch{display:flex;background:#f0f4f1;border-radius:7px;padding:3px}.mode-switch button,.expand-all{font:inherit;font-size:14px;cursor:pointer;border:0;border-radius:5px;padding:7px 11px;color:#7a8a80;background:transparent}.mode-switch button.active{background:#fff;box-shadow:0 1px 4px #233e3210;color:#239465;font-weight:600}.expand-all{border:1px solid #dfe8e2;color:#507662;background:#fff}
.plan-table-scroll{max-height:650px;overflow:auto;border-top:1px solid #e9efeb;border-bottom:1px solid #e9efeb}.plan-table{width:100%;min-width:1310px;table-layout:fixed;border-collapse:separate;border-spacing:0;text-align:left}.plan-table>thead>tr>th{position:sticky;top:0;z-index:2;background:#e1efe6;color:#254e3b;padding:15px 16px;font-size:15px;font-weight:700;border-bottom:2px solid #bfd7c8}.plan-table thead small{display:block;font-weight:500;font-size:13px;margin-top:3px;color:#506b5c}.plan-row>th,.plan-row>td{padding:18px 16px;border-bottom:1px solid #edf2ef;background:#fff}.plan-row>th{position:sticky;left:0;z-index:1}.plan-table>thead>tr>th:first-child{left:0;z-index:3}.plan-row:hover>td,.plan-row:hover>th,.is-expanded>td,.is-expanded>th{background:#f9fcfa}.plan-expander{display:flex;gap:10px;align-items:center;border:0;background:transparent;text-align:left;cursor:pointer;color:inherit;width:100%;padding:0;font:inherit}.plan-expander b{font-size:15px;font-weight:600}.chevron{font-size:24px;color:#7e9c8c;transition:transform .15s}.chevron.open{transform:rotate(90deg)}.plan-id{display:block;color:#2b8e65;font-size:15px;font-weight:600;margin-top:5px}.plan-id small{font-size:13px;color:#96a69b;margin-left:6px;font-weight:400}
.detail-row>td{padding:16px 20px 22px;background:#f3f8f5;border-bottom:1px solid #dfebe3}.details-heading{display:flex;align-items:center;gap:14px;font-size:17px;padding:10px 14px;margin-bottom:12px;background:#deeee4;border-left:4px solid #368363;border-radius:4px;color:#244d3a}.details-heading span{font-size:13px;color:#516d5e}.detail-table{border-collapse:collapse;table-layout:fixed;min-width:1490px;width:100%;background:#fff;border:1px solid #e1eae4}.detail-table th,.detail-table td{padding:16px 14px;border-bottom:1px solid #edf2ee;vertical-align:middle;text-align:left}.detail-table thead th{font-size:14px;font-weight:700;color:#325845;background:#e7f1eb}.detail-table tbody th{font-weight:400}.type-name{display:block;color:#507362;font-size:13px;line-height:1.6;overflow-wrap:anywhere}.subtype-name{display:block;color:#6b8072;font-size:13px;line-height:1.6;margin-top:3px}.context-name{font-size:13px;color:#627e6e;overflow-wrap:anywhere}.empty-state{padding:40px;text-align:center;color:#97a49d;font-size:14px}.plan-footer{padding:14px 26px 18px;font-size:13px;color:#8d9f93;line-height:1.8}.source-warning{color:#a88952;margin-top:4px}
@media(max-width:700px){.plan-header{padding:20px 16px;flex-direction:column}.plan-header h2{font-size:20px}.plan-summary{margin:0 16px 16px;grid-template-columns:repeat(2,1fr);gap:18px 0}.plan-summary>div:nth-child(2){border:0}.plan-summary strong{font-size:22px}.plan-toolbar{padding:0 16px 16px}.plan-filters{flex-wrap:wrap}.plan-filters input[type="search"]{width:210px}.plan-footer{padding:12px 16px}.plan-table-scroll{max-height:560px}}
.sort-button{display:inline-flex;align-items:center;gap:6px;padding:3px 0;border:0;background:transparent;color:inherit;font:inherit;font-weight:600;text-align:left;cursor:pointer;line-height:1.5}.sort-button span{color:#86a994;white-space:nowrap}.sort-button:hover{color:#238859}.sort-button:focus-visible{outline:2px solid #42b983;outline-offset:3px;border-radius:2px}.sort-options{display:flex;flex-wrap:wrap;gap:4px 12px}th[aria-sort="ascending"] .sort-button,th[aria-sort="descending"] .sort-button{color:#2a8c62}
.download-button{background:#eaf6ef;color:#23784e;font-weight:600}.download-button:disabled{opacity:.55;cursor:default}.plan-actions,.plan-filters{flex-wrap:wrap}
.sort-metric-options{display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px;border:0;margin:0;padding:0;min-width:0}.sort-metric-label{font-size:14px;font-weight:600;color:#506358;white-space:nowrap}.sort-metric-options label{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:14px;color:#506358;cursor:pointer}.sort-metric-options input{margin:0;accent-color:#2d9668}
</style>
