<script setup>
import { computed, ref } from 'vue'
import { currentLang } from '@/store/lang.js'
const props = defineProps({ projectId: { type: String, required: true }, records: { type: Array, required: true } })
const t = computed(() => currentLang.value==='en' ? {title:'Unplanned work',note:'Submissions without a matching planned type and period.',total:'Total samples',empty:'No unplanned submissions found.',columns:['Period','Data category','Subtype','Accession','Plan classification','Samples']} : {title:'计划外工作',note:'展示该时间段未安排对应数据类型的提交。',total:'样本数合计',empty:'未查到计划外提交。',columns:['提交时间段','数据大类型','数据子类型','归档编号','计划归类','样本数']})
const columns=['period','type','subtype','accession','outsidePlan','submitted']
const sort=ref({key:'period',direction:'asc'})
const rows=computed(()=>[...props.records].sort((a,b)=>{
  const key=sort.value.key
  const result=key==='submitted'?a[key]-b[key]:String(a[key]).localeCompare(String(b[key]),'en',{numeric:true})
  return sort.value.direction==='asc'?result:-result
}))
const total=computed(()=>rows.value.reduce((n,r)=>n+r.submitted,0))
function toggle(key){sort.value={key,direction:sort.value.key===key&&sort.value.direction==='asc'?'desc':'asc'}}
function periodLabel(p){const [year,half]=p.split('.');return currentLang.value==='en'?`${year} H${half==='1-6'?'1':'2'}`:`${year}${half==='1-6'?' 上半年':' 下半年'}`}
</script>
<template>
  <section class="unplanned-work" :aria-labelledby="`unplanned-${projectId}`">
    <header><div><h3 :id="`unplanned-${projectId}`">{{ t.title }}</h3><p>{{ t.note }}</p></div><div class="unplanned-total">{{ t.total }} <strong>{{ total.toLocaleString('en-US') }}</strong></div></header>
    <table class="unplanned-table"><thead><tr><th v-for="(key,i) in columns" :key="key" scope="col" :aria-sort="sort.key===key?(sort.direction==='asc'?'ascending':'descending'):'none'"><button type="button" @click="toggle(key)">{{ t.columns[i] }} <span>{{ sort.key===key?(sort.direction==='asc'?'↑':'↓'):'↕' }}</span></button></th></tr></thead><tbody><tr v-for="(row,i) in rows" :key="i"><td>{{ periodLabel(row.period) }}</td><td>{{ row.type }}</td><td>{{ row.subtype }}</td><td>{{ row.accession }}</td><td>{{ currentLang === 'en' ? (row.outsidePlan ? 'Unplanned' : 'Planned type') : (row.outsidePlan ? '计划外' : '计划内类型') }}</td><td class="unplanned-count">{{ row.submitted.toLocaleString('en-US') }}</td></tr><tr v-if="!rows.length"><td colspan="6" class="unplanned-empty">{{ t.empty }}</td></tr></tbody></table>
  </section>
</template>
<style scoped>
.unplanned-work{margin-top:22px;border:1px solid #e3e9e5;border-radius:10px;background:#fff;overflow:hidden}.unplanned-work header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 20px;background:#fbf0db;border-left:4px solid #b47a22}.unplanned-work h3{font-size:17px;font-weight:700;color:#724b16;margin:0}.unplanned-work p{font-size:15px;color:#745d39;line-height:1.6;margin:7px 0 0}.unplanned-total{font-size:15px;color:#745d39;white-space:nowrap}.unplanned-total strong{font-size:23px;color:#724b16;margin-left:12px;font-variant-numeric:tabular-nums}.unplanned-table{width:100%;border-collapse:collapse;text-align:left;table-layout:fixed;min-width:900px}.unplanned-table th{background:#fcf6ea;color:#704e20;padding:12px 16px;font-size:16px;font-weight:700}.unplanned-table td{padding:16px;border-top:1px solid #edf1eb;font-size:16px;color:#607668;overflow-wrap:anywhere}.unplanned-table button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:2px 0;text-align:left}.unplanned-table button span{color:#8da594;margin-left:5px}.unplanned-table button:focus-visible{outline:2px solid #42b983;outline-offset:3px}.unplanned-table .unplanned-count{font-weight:650;color:#3f7858;font-variant-numeric:tabular-nums}.unplanned-table .unplanned-empty{text-align:center;color:#8c9b90;padding:26px}
</style>
