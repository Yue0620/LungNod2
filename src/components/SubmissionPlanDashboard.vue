<script setup>
import { ref, computed, watch } from 'vue'
import { currentLang } from '@/store/lang.js'
import source from '@/data/submissionPlan.json'
import actuals from '@/data/submissionActuals.json'
import projectInfo from '@/data/projectInfo.json'
import PlanProgressCell from './PlanProgressCell.vue'
import UnplannedWork from './UnplannedWork.vue'

const props = defineProps({ collapsible: { type: Boolean, default: false } })
const detailsVisible = ref(false)
const showProjectContacts = false

const labels = {
  zh: { title: '数据提交计划与进度', subtitle: '按项目汇总，展开查看数据类型、疾病与组织明细', demo: '更新时间 · 2026-11-04', search: '搜索项目或数据类型', period: '分期完成', cumulative: '累计完成', expand: '展开全部', collapse: '收起全部', ids: '项目', items: '计划提交项次', submitted: '已核实样本提交项次', total: '全计划总进度', type: '数据大类型 / 子类型', context: '疾病 / 组织', detail: '计划明细', noPlan: '无计划', empty: '没有匹配的计划', note: '按接口创建时间归入半年。三站记录合并展示，OMIX 按每个文件计一个样本。查询失败按零计。无法分配至组织的进度标为待核实。单细胞 RNA-Seq 的 20 项按计划分配至血液和肺组织，各 10 项。', mode: '累计列表示截至该期的计划与提交合计；分期列仅计算该期任务。', records: '条原始计划', count: '已提交 / 计划项次', source: '原始行', volume: '计划数据大小（原表数值，单位未注明）', hint: '点击左侧箭头查看类型明细；横向滚动可查看全部时间段。', overall: '全部时间段', upto: '截至' },
  en: { title: 'Submission Plans & Progress', subtitle: 'One row per project. Expand for data types, diseases and tissues.', demo: 'Last updated · 2026-11-04', search: 'Search project or data type', period: 'By period', cumulative: 'Cumulative', expand: 'Expand all', collapse: 'Collapse all', ids: 'Projects', items: 'Planned submission items', submitted: 'Verified sample submission items', total: 'Overall progress', type: 'Data category / subtype', context: 'Disease / tissue', detail: 'Plan details', noPlan: 'No plan', empty: 'No matching plans', note: 'Periods use record creation dates. Records from all three sources are combined. Each OMIX file counts as one sample. Failed queries count as zero. Counts without tissue allocation are marked pending. The 20 single-cell RNA-Seq items are allocated according to the plan: 10 blood and 10 lung.', mode: 'Cumulative columns include all plans through that period. Period columns include only that period.', records: 'source records', count: 'Submitted / planned items', source: 'Source rows', volume: 'Planned data size (source values; unit unspecified)', hint: 'Expand a plan for type details. Scroll horizontally to see all periods.', overall: 'All periods', upto: 'Through' }
}
const t = computed(() => labels[currentLang.value] || labels.zh)
const periods = [...new Set(source.map(r => r.period))].sort((a,b) => Number(a.split('.')[0])-Number(b.split('.')[0]) || Number(a.split('.')[1].split('-')[0])-Number(b.split('.')[1].split('-')[0]))
const yearGroups = [...new Set(periods.map(period => period.split('.')[0]))].map(year => ({
  year,
  periods: periods.filter(period => period.startsWith(year + '.'))
}))
function halfLabel(period) {
  const firstHalf = period.split('.')[1] === '1-6'
  return currentLang.value === 'en' ? (firstHalf ? 'H1' : 'H2') : (firstHalf ? '上半年' : '下半年')
}
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
    if (!groups.has(r.id)) groups.set(r.id, {id:r.id, ...projectInfo[r.id], rows:[]})
    groups.get(r.id).rows.push(r)
  }
  return [...groups.values()].map(p => {
    const matchesProject = matchesSearch([p.id, p.project_name, ...(showProjectContacts ? [p.name, p.organization] : [])])
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
    const idHeader = en ? 'Project' : '项目'
    const infoHeaders = showProjectContacts ? (en ? ['Project name', 'Name', 'Organization'] : ['项目名称', '姓名', '单位']) : [en ? 'Project name' : '项目名称']
    const periodHeader = en ? 'Period' : '时间段'
    const progressHeaders = en ? ['Planned items', 'Submitted items', 'Progress'] : ['计划项次', '已提交项次', '进度']
    const typeHeaders = en ? ['Category', 'Subtype'] : ['数据大类型', '数据子类型']
    const summaryRows = [[idHeader, ...infoHeaders, periodHeader, ...progressHeaders]]
    const detailRows = [[idHeader, ...infoHeaders, ...typeHeaders, ...(en ? ['Disease', 'Tissue'] : ['疾病', '组织']), periodHeader, ...progressHeaders]]
    const extraRows = [[idHeader, ...infoHeaders, periodHeader, ...typeHeaders, ...(en ? ['Accession', 'Submitted items'] : ['归档编号', '已提交项次'])]]
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
      const identity = [plan.id, plan.project_name || '', ...(showProjectContacts ? [plan.name || '', plan.organization || ''] : [])]
      appendProgress(summaryRows, identity, plan.rows)
      for (const detail of sortedDetails(plan)) {
        appendProgress(detailRows, [...identity, detail.type, detail.subtype, detail.disease, detail.tissue], detail.rows)
      }
      for (const row of plan.unplanned) {
        extraRows.push([...identity, periodLabel(row.period), row.type, row.subtype, row.accession, row.submitted])
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
      <div>
        <div class="eyebrow">SUBMISSION TRACKER</div>
        <div class="plan-title-row">
          <h2 id="plan-title">{{ t.title }}</h2>
    <button v-if="props.collapsible" type="button" class="dashboard-toggle"
      :aria-expanded="detailsVisible" aria-controls="home-submission-details"
      @click="detailsVisible = !detailsVisible">
      <span>{{ currentLang === 'en' ? (detailsVisible ? 'Hide submission details' : 'Show submission details') : (detailsVisible ? '收起提交明细' : '展开提交明细') }}</span>
      <span aria-hidden="true">{{ detailsVisible ? '−' : '+' }}</span>
    </button>
        </div>
        <p>{{ t.subtitle }}</p>
      </div>
      <span class="demo-label"><span></span>{{ t.demo }}</span>
    </header>
    <div class="plan-summary">
      <div><span>{{ t.ids }}</span><strong>{{ summary.ids }}<small> / {{ totalIds }}</small></strong></div>
      <div><span>{{ t.items }}</span><strong>{{ number(summary.planned) }}</strong></div>
      <div><span>{{ t.submitted }}</span><strong class="green-value">{{ number(summary.submitted) }}</strong></div>
    </div>

    <div v-show="!props.collapsible || detailsVisible" :id="props.collapsible ? 'home-submission-details' : undefined">
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
        <colgroup><col style="width:170px"><col style="width:145px"><col v-for="p in periods" :key="p" style="width:145px"></colgroup>
        <thead>
                  <tr>
<th rowspan="2" scope="col" :aria-sort="ariaSort(planSort, ['id'])"><div class="sort-options"><button type="button" class="sort-button" @click="changeSort(planSort, 'id')">{{ t.ids }} <span>{{ sortArrow(planSort,'id') }}</span></button></div></th>
          <th rowspan="2" scope="col" :aria-sort="ariaSort(planSort, ['total'])"><button type="button" class="sort-button" @click="changeSort(planSort, 'total')">{{ t.total }} <span>{{ sortArrow(planSort,'total') }}</span></button><small>{{ t.overall }}</small></th>
                    <th v-for="group in yearGroups" :key="group.year" :colspan="group.periods.length" scope="colgroup" class="year-heading">{{ group.year }}</th>
                  </tr>
                  <tr class="half-year-headings">
                    <th v-for="p in periods" :key="p" scope="col" :aria-sort="ariaSort(planSort,[p])">
                      <small v-if="mode==='cumulative'">{{ t.upto }}</small>
                      <button type="button" class="sort-button" :aria-label="periodLabel(p)" @click="changeSort(planSort,p)">{{ halfLabel(p) }} <span>{{ sortArrow(planSort,p) }}</span></button>
                    </th>
                  </tr>
                </thead>
        <tbody>
          <template v-for="plan in sortedPlans" :key="plan.id">
            <tr class="plan-row" :class="{'is-expanded':expanded.has(plan.id)}">
              <th scope="row"><button type="button" class="plan-expander" :title="currentLang === 'en' ? (expanded.has(plan.id) ? 'Collapse details' : 'Expand details') : (expanded.has(plan.id) ? '收起明细' : '展开明细')" :aria-expanded="expanded.has(plan.id)" :aria-controls="`details-${plan.id}`" @click="toggle(plan.id)"><span class="chevron" aria-hidden="true" :class="{open:expanded.has(plan.id)}">{{ expanded.has(plan.id) ? '−' : '+' }}</span><span class="plan-id">{{ plan.id }}</span></button></th>
              <td><PlanProgressCell :value="plan.total" :label="t.count" :empty="t.noPlan" /></td>
              <td v-for="p in periods" :key="p"><PlanProgressCell :value="cell(plan.rows,p)" :label="t.count" :empty="t.noPlan" /></td>
            </tr>
            <tr v-if="expanded.has(plan.id)" :id="`details-${plan.id}`" class="detail-row"><td colspan="8">
              <dl v-if="plan.project_name" class="project-info">
                <div class="project-info-title"><dt>{{ currentLang === 'en' ? 'Project name' : '项目名称' }}</dt><dd>{{ plan.project_name }}</dd></div>
                <div v-if="showProjectContacts"><dt>{{ currentLang === 'en' ? 'Name' : '姓名' }}</dt><dd>{{ plan.name }}</dd></div>
                <div v-if="showProjectContacts"><dt>{{ currentLang === 'en' ? 'Organization' : '单位' }}</dt><dd>{{ plan.organization }}</dd></div>
                <div class="project-info-records"><dt>{{ t.detail }}</dt><dd>{{ plan.rows.length }} {{ t.records }}</dd></div>
              </dl>

              <div v-if="plan.details.length" class="detail-table-scroll" tabindex="0" :aria-label="t.detail"><table class="detail-table"><colgroup><col style="width:18%"><col style="width:12%"><col style="width:10%"><col v-for="p in periods" :key="p" style="width:10%"></colgroup>
                <thead>
                  <tr>
<th rowspan="2" scope="col" :aria-sort="ariaSort(detailSort,['type','subtype'])"><div class="sort-options"><button type="button" class="sort-button" @click="changeSort(detailSort,'type')">{{ currentLang==='en'?'Category':'数据大类型' }} <span>{{ sortArrow(detailSort,'type') }}</span></button><button type="button" class="sort-button" @click="changeSort(detailSort,'subtype')">{{ currentLang==='en'?'Subtype':'子类型' }} <span>{{ sortArrow(detailSort,'subtype') }}</span></button></div></th>
                  <th rowspan="2" scope="col" :aria-sort="ariaSort(detailSort,['disease','tissue'])"><div class="sort-options"><button type="button" class="sort-button" @click="changeSort(detailSort,'disease')">{{ currentLang==='en'?'Disease':'疾病' }} <span>{{ sortArrow(detailSort,'disease') }}</span></button><button type="button" class="sort-button" @click="changeSort(detailSort,'tissue')">{{ currentLang==='en'?'Tissue':'组织' }} <span>{{ sortArrow(detailSort,'tissue') }}</span></button></div></th>
                  <th rowspan="2" scope="col" :aria-sort="ariaSort(detailSort,['total'])"><button type="button" class="sort-button" @click="changeSort(detailSort,'total')">{{ t.total }} <span>{{ sortArrow(detailSort,'total') }}</span></button></th>
                    <th v-for="group in yearGroups" :key="group.year" :colspan="group.periods.length" scope="colgroup" class="year-heading">{{ group.year }}</th>
                  </tr>
                  <tr class="half-year-headings">
                    <th v-for="p in periods" :key="p" scope="col" :aria-sort="ariaSort(detailSort,[p])">
                      <small v-if="mode==='cumulative'">{{ t.upto }}</small>
                      <button type="button" class="sort-button" :aria-label="periodLabel(p)" @click="changeSort(detailSort,p)">{{ halfLabel(p) }} <span>{{ sortArrow(detailSort,p) }}</span></button>
                    </th>
                  </tr>
                </thead>
                <tbody><tr v-for="d in sortedDetails(plan)" :key="d.key"><th scope="row" :title="detailTitle(d)"><span class="type-name">{{ d.type }}</span><span class="subtype-name">{{ d.subtype }}</span></th><td><span class="context-name">{{ d.disease }}</span><span class="subtype-name">{{ d.tissue }}</span></td><td><PlanProgressCell :value="aggregate(d.rows)" :label="t.count" :empty="t.noPlan" /></td><td v-for="p in periods" :key="p"><PlanProgressCell :value="cell(d.rows,p)" :label="t.count" :empty="t.noPlan" /></td></tr></tbody>
              </table></div>
              <UnplannedWork v-if="plan.unplanned.length > 0" :project-id="plan.id" :records="plan.unplanned" />
            </td></tr>
          </template>
          <tr v-if="!plans.length"><td colspan="8" class="empty-state">{{ t.empty }}</td></tr>
        </tbody>
      </table>
    </div>
    <footer class="plan-footer"><p>{{ t.hint }} {{ t.mode }}</p><p>{{ t.note }}</p></footer>
    </div>
  </section>
</template>

<style scoped>
.detail-table-scroll{width:100%;min-width:0;overflow-x:auto;overscroll-behavior-x:contain}
.detail-table-scroll:focus-visible{outline:2px solid #477aaa;outline-offset:2px}
.detail-table .sort-button{overflow-wrap:anywhere}

.project-info{display:grid;grid-template-columns:minmax(90px,auto) minmax(0,1fr);gap:14px 28px;margin:0 0 18px;padding:18px 20px;background:#fff;border:1px solid #ccdced;border-radius:8px;color:#294f77;font-size:16px;line-height:1.65}
.project-info>div{min-width:0;display:flex;gap:12px;align-items:baseline}
.project-info .project-info-title{grid-column:1/-1}
.project-info dt{flex-shrink:0;font-weight:600;color:#607b94}
.project-info dd{margin:0;overflow-wrap:anywhere}
.project-info-title dd{font-weight:600}
@media(max-width:700px){.project-info{grid-template-columns:minmax(0,1fr);padding:14px;gap:10px}.project-info>div{align-items:flex-start}}

.plan-dashboard{margin:20px 0 26px;background:#fff;border:1px solid #e3ece7;border-radius:18px;overflow:hidden;color:#334b43;box-shadow:0 4px 20px #243d3205}
.plan-header{padding:24px 26px 20px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.eyebrow{font-size:15px;font-weight:700;letter-spacing:1.8px;color:#54a581;margin-bottom:8px}.plan-header h2{font-size:26px;color:#283f36;margin:0}.plan-header p{font-size:16px;line-height:1.6;color:#7e9087;margin:8px 0 0}.demo-label{display:flex;align-items:center;gap:6px;font-size:16px;color:#9c762e;background:#fff9ed;border:1px solid #efdfbc;border-radius:6px;padding:7px 10px;white-space:nowrap}.demo-label>span{width:6px;height:6px;border-radius:50%;background:#d4ad60}
.plan-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0 26px 20px;background:#f5f9f7;border:1px solid #eaf0ec;border-radius:10px;padding:16px 0}.plan-summary>div{padding:0 22px;border-right:1px solid #e1eae5}.plan-summary>div:last-child{border:0}.plan-summary span{display:block;font-size:16px;color:#7d8f84;margin-bottom:8px}.plan-summary strong{font-size:28px;font-variant-numeric:tabular-nums}.plan-summary small{font-size:15px;color:#9aa89f;font-weight:400}.green-value{color:#29a575}
.plan-toolbar,.plan-filters,.plan-actions{display:flex;gap:10px;align-items:center}.plan-toolbar{justify-content:space-between;flex-wrap:wrap;padding:0 26px 18px}.plan-filters input[type="search"],.plan-filters select{font:inherit;font-size:16px;border:1px solid #dfe8e2;border-radius:7px;background:#fff;color:#506358;height:40px;padding:0 10px}.plan-filters input[type="search"]{width:290px}.plan-filters input[type="search"]:focus,.plan-filters select:focus{outline:2px solid #9bd6ba;outline-offset:1px}.mode-switch{display:flex;background:#f0f4f1;border-radius:7px;padding:3px}.mode-switch button,.expand-all{font:inherit;font-size:16px;cursor:pointer;border:0;border-radius:5px;padding:7px 11px;color:#7a8a80;background:transparent}.mode-switch button.active{background:#fff;box-shadow:0 1px 4px #233e3210;color:#239465;font-weight:600}.expand-all{border:1px solid #dfe8e2;color:#507662;background:#fff}
.plan-table-scroll{max-height:650px;overflow:auto;border-top:1px solid #e9efeb;border-bottom:1px solid #e9efeb}.plan-table{width:100%;min-width:1185px;table-layout:fixed;border-collapse:separate;border-spacing:0;text-align:left}.plan-table>thead>tr>th{background:#e1efe6;color:#254e3b;padding:15px 16px;font-size:16px;font-weight:700;border-bottom:2px solid #bfd7c8}.plan-table thead small{display:block;font-weight:500;font-size:15px;margin-top:3px;color:#506b5c}.plan-row>th,.plan-row>td{padding:18px 16px;border-bottom:1px solid #edf2ef;background:#fff}.plan-row>th{position:sticky;left:0;z-index:1}.plan-table>thead>tr>th:first-child{left:0;z-index:3}.plan-row:hover>td,.plan-row:hover>th,.is-expanded>td,.is-expanded>th{background:#f9fcfa}.plan-expander{display:flex;gap:10px;align-items:center;border:0;background:transparent;text-align:left;cursor:pointer;color:inherit;width:100%;padding:0;font:inherit}.plan-expander b{font-size:16px;font-weight:600}.chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  border: 2px solid #408765;
  border-radius: 8px;
  background: #e5f3eb;
  color: #246340;
  font-size: 25px;
  font-weight: 700;
  line-height: 1;
}
.chevron.open { background: #2f7854; color: #fff; border-color: #2f7854; }
.plan-expander { min-height: 44px; }
.plan-expander:hover .chevron { box-shadow: 0 0 0 3px #cfe8da; }
.plan-expander:focus-visible { outline: 3px solid #308b66; outline-offset: 4px; border-radius: 6px; }.plan-id{display:block;color:#2b8e65;font-size:16px;font-weight:600;margin-top:5px}.plan-id small{font-size:15px;color:#96a69b;margin-left:6px;font-weight:400}
.detail-row>td{padding:16px 20px 22px;background:#edf3fa;border-bottom:2px solid #c8d8eb}.details-heading{display:inline-flex;align-items:center;flex-wrap:wrap;width:fit-content;max-width:100%;gap:14px;font-size:17px;padding:10px 14px;margin-bottom:12px;background:#dce9f7;border-left:4px solid #477aaa;border-radius:4px;color:#294f77}.details-heading span{font-size:15px;color:#516d5e}.detail-table{border-collapse:collapse;table-layout:fixed;min-width:1100px;width:100%;background:#fff;border:1px solid #e1eae4}.detail-table th,.detail-table td{padding:16px 14px;border-bottom:1px solid #edf2ee;vertical-align:middle;text-align:left}.detail-table thead th{font-size:16px;font-weight:700;color:#2d537d;background:#dce8f6}.detail-table tbody th{font-weight:400}.type-name{display:block;color:#507362;font-size:15px;line-height:1.6;overflow-wrap:anywhere}.subtype-name{display:block;color:#6b8072;font-size:15px;line-height:1.6;margin-top:3px}.context-name{font-size:15px;color:#627e6e;overflow-wrap:anywhere}.empty-state{padding:40px;text-align:center;color:#97a49d;font-size:16px}.plan-footer{padding:14px 26px 18px;font-size:15px;color:#8d9f93;line-height:1.8}.source-warning{color:#a88952;margin-top:4px}
@media(max-width:700px){.plan-header{padding:20px 16px;flex-direction:column}.plan-header h2{font-size:20px}.plan-summary{margin:0 16px 16px;grid-template-columns:repeat(2,1fr);gap:18px 0}.plan-summary>div:nth-child(2){border:0}.plan-summary strong{font-size:22px}.plan-toolbar{padding:0 16px 16px}.plan-filters{flex-wrap:wrap}.plan-filters input[type="search"]{width:210px}.plan-footer{padding:12px 16px}.plan-table-scroll{max-height:560px}}
.sort-button{display:inline-flex;align-items:center;gap:6px;padding:3px 0;border:0;background:transparent;color:inherit;font:inherit;font-weight:600;text-align:left;cursor:pointer;line-height:1.5}.sort-button span{color:#86a994;white-space:nowrap}.sort-button:hover{color:#238859}.sort-button:focus-visible{outline:2px solid #42b983;outline-offset:3px;border-radius:2px}.sort-options{display:flex;flex-wrap:wrap;gap:4px 12px}th[aria-sort="ascending"] .sort-button,th[aria-sort="descending"] .sort-button{color:#2a8c62}
.download-button{background:#eaf6ef;color:#23784e;font-weight:600}.download-button:disabled{opacity:.55;cursor:default}.plan-actions,.plan-filters{flex-wrap:wrap}
.sort-metric-options{display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px;border:0;margin:0;padding:0;min-width:0}.sort-metric-label{font-size:16px;font-weight:600;color:#506358;white-space:nowrap}.sort-metric-options label{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:16px;color:#506358;cursor:pointer}.sort-metric-options input{margin:0;accent-color:#2d9668}
.detail-table tbody tr:nth-child(even) { background: #f1f6fc; }
.detail-table tbody tr:hover { background: #e5effa; }
.detail-table .type-name, .detail-table .context-name { color: #365779; }
.detail-table .subtype-name { color: #516b85; }
.detail-table :deep(.progress-caption b) { color: #315c88; }
.detail-table :deep(.progress-caption small) { color: #506981; }
.detail-table :deep(.progress-track) { background: #e0eaf4; }
.detail-table :deep(.progress-track span) { background: #6398c9; }
.detail-table :deep(.complete .progress-track span) { background: #3879b4; }
.dashboard-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 7px 12px;
  border: 1px solid #c4dece;
  border-radius: 6px;
  background: #f1f8f4;
  color: #2c7050;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.dashboard-toggle:hover { background: #e3f1e9; }
.dashboard-toggle:focus-visible { outline: 3px solid #408765; outline-offset: 3px; }
.dashboard-toggle span:last-child { font-size: 18px; line-height: 1; }
@media(max-width:700px) {
  .plan-title-row { gap: 12px; }
}
/* Toolbar wraps by group, so controls do not jump between desktop widths. */
.plan-dashboard { container-type: inline-size; min-width: 0; }
.plan-toolbar { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
.plan-filters { display: flex; flex-wrap: wrap; min-width: 0; gap: 12px 20px; }
.plan-filters input[type="search"] { width: clamp(220px, 22vw, 290px); max-width: 100%; }
.plan-actions { justify-content: flex-end; gap: 10px; }
.plan-header { flex-wrap: wrap; }
.plan-header > div { min-width: 0; }
.plan-table-scroll { max-height: clamp(440px, 65vh, 650px); overscroll-behavior-x: contain; }
.plan-table > thead > tr > th, .plan-row > th, .plan-row > td { padding-inline: clamp(10px, 1vw, 16px); }
@container (min-width: 1500px) {
  .plan-toolbar { grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
}
@media (max-width: 767px) {
  .plan-header h2 { font-size: 22px; }
  .plan-summary { grid-template-columns: minmax(0, 1fr); gap: 0; padding: 0; }
  .plan-summary > div { padding: 16px 18px; border-right: 0; border-bottom: 1px solid #e1eae5; }
  .plan-summary > div:last-child { border-bottom: 0; }
  .plan-actions { justify-content: flex-start; }
  .plan-summary strong { font-size: 26px; }
}
.plan-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 20px; }
.plan-title-row .dashboard-toggle { flex-shrink: 0; }
.plan-table > thead { position: sticky; top: 0; z-index: 3; }
.plan-table > thead > tr > th:first-child[rowspan] { position: sticky; left: 0; z-index: 4; }
.plan-table > thead > tr > th.year-heading,
.detail-table > thead > tr > th.year-heading {
  text-align: center;
  padding-top: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #bfd7c8;
  border-left: 1px solid #c9dfd1;
  letter-spacing: 0.5px;
}
.half-year-headings th { text-align: center; }
.plan-table > thead > .half-year-headings > th,
.detail-table > thead > .half-year-headings > th { padding-top: 7px; padding-bottom: 10px; }
.detail-table > thead > tr > th.year-heading { border-color: #c0d3e8; }
.half-year-headings .sort-button { justify-content: center; }
/* Compact typography for submission tables. */
.plan-table > thead > tr > th,.detail-table thead th,.plan-id{font-size:14px}
.plan-table thead small,.type-name,.subtype-name,.context-name{font-size:14px}
.plan-table :deep(.progress-caption b),.plan-table :deep(.no-plan){font-size:14px}
.plan-table :deep(.progress-caption small){font-size:13px}
.plan-table :deep(.unplanned-table th),.plan-table :deep(.unplanned-table td){font-size:14px}
/* Reduce row spacing while retaining room for progress captions. */
.plan-row > th,.plan-row > td{padding-top:10px;padding-bottom:10px}
.plan-expander{min-height:36px}
.detail-table th,.detail-table td{padding-top:10px;padding-bottom:10px}
.plan-table :deep(.progress-caption){gap:2px}
.plan-table :deep(.progress-track){height:6px;margin-top:5px}
.plan-table :deep(.unplanned-table td){padding-top:10px;padding-bottom:10px}
/* Keep project metadata on one line; long names retain their full text. */
.project-info{display:flex;flex-wrap:nowrap;align-items:baseline;gap:24px;padding:12px 16px;overflow-x:auto;font-size:14px}
.project-info>div{flex:0 0 auto;gap:8px;white-space:nowrap}
.project-info dd{overflow-wrap:normal}
/* Compact the expanded section into one metadata strip. */
.detail-row > td{padding:10px 14px 14px}
.project-info{margin-bottom:10px;padding:8px 10px;gap:18px;line-height:1.5}
.project-info-records{border-left:1px solid #ccdced;padding-left:16px}
.project-info-records dd{color:#607b94}
.plan-table > thead > tr > th{padding-block:8px}
.plan-table > thead > tr > th.year-heading,.detail-table > thead > tr > th.year-heading{padding-top:6px;padding-bottom:4px}
.plan-table > thead > .half-year-headings > th,.detail-table > thead > .half-year-headings > th{padding-top:4px;padding-bottom:6px}
.detail-table th,.detail-table td{padding-top:8px;padding-bottom:8px}
.type-name,.subtype-name,.context-name{line-height:1.4}
.subtype-name{margin-top:1px}
.plan-id{margin-top:0}
.plan-table :deep(.progress-caption){flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:2px 8px;line-height:1.3}
.plan-table :deep(.unplanned-work){margin-top:12px}
.plan-table :deep(.unplanned-work header){padding:10px 14px}
.plan-table :deep(.unplanned-work p){margin-top:3px}
</style>
