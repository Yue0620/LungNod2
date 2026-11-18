<script setup>
import { currentLang } from '@/store/lang.js'
defineProps({ value: { type: Object, required: true }, label: String, empty: String })
</script>
<template>
  <span v-if="!value.planned" class="no-plan" :title="empty">—</span>
  <div v-else-if="value.partial" class="progress-caption">
    <b>{{ currentLang === 'en' ? 'Pending' : '待核实' }}</b>
    <small v-if="value.submitted">≥ {{ value.submitted.toLocaleString('en-US') }} / {{ value.planned.toLocaleString('en-US') }}</small>
  </div>
  <div v-else class="plan-progress" :class="{'complete':value.submitted>=value.planned}" :title="`${label}: ${value.submitted.toLocaleString('en-US')} / ${value.planned.toLocaleString('en-US')}`">
    <div class="progress-caption"><b>{{ value.submitted > value.planned ? '100%+' : value.percent + '%' }}</b><small>{{ value.submitted.toLocaleString('en-US') }} / {{ value.planned.toLocaleString('en-US') }}</small></div>
    <div class="progress-track" role="progressbar" :aria-label="label" :aria-valuenow="Math.min(100,value.percent)" :aria-valuetext="`${value.submitted} / ${value.planned}`" aria-valuemin="0" aria-valuemax="100"><span :style="{width:Math.min(100,value.percent)+'%'}"></span></div>
  </div>
</template>
<style scoped>
.plan-progress{min-width:0}.progress-caption{display:flex;flex-direction:column;gap:4px;align-items:flex-start;font-variant-numeric:tabular-nums}.progress-caption b{color:#4c7c62;font-size:14px;font-weight:600}.progress-caption small{font-size:13px;color:#6d8074;white-space:nowrap}.progress-track{height:7px;background:#eaf1ec;border-radius:8px;margin-top:7px;overflow:hidden}.progress-track span{display:block;height:100%;background:#77c6a1;border-radius:inherit}.complete .progress-track span{background:#2da777}.complete b{color:#249766}.no-plan{color:#b2bfb6;font-size:14px}
</style>
