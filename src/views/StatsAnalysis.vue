<template>
  <div class="analysis-page">
    <main class="container">
      <div class="action-bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>统计分析</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- 1. 顶部数字看板 -->
      <el-row :gutter="20" class="stat-cards">
        <el-col :span="6">
          <el-card shadow="hover" class="data-card green">
            <div class="card-label">数据集 (Datasets)</div>
            <div class="card-value">{{ stats.totalDatasets }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="data-card blue">
            <div class="card-label">研究项目 (Projects)</div>
            <div class="card-value">{{ stats.totalProjects }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="data-card orange">
            <div class="card-label">样本总数 (Samples)</div>
            <div class="card-value">{{ stats.totalSamples }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="data-card purple">
            <div class="card-label">个体总数 (Individuals)</div>
            <div class="card-value">{{ stats.totalIndividuals }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 2. 图表区域 -->
      <el-row :gutter="20" class="chart-row">
        <!-- 疾病分期分布饼图 -->
        <el-col :span="12">
          <el-card header="样本分期分布 (Stage Distribution)" shadow="never">
            <div id="stageChart" style="height: 350px;"></div>
          </el-card>
        </el-col>
        <!-- 组织类型分布 -->
        <el-col :span="12">
          <el-card header="样本组织分布 (Tissue Distribution)" shadow="never">
            <div id="tissueChart" style="height: 350px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="chart-row">
        <!-- 疾病类型分布 -->
        <el-col :span="12">
          <el-card header="疾病类型分布 (Disease Distribution)" shadow="never">
            <div id="diseaseChart" style="height: 350px;"></div>
          </el-card>
        </el-col>
        <!-- 组学数据分布 -->
        <el-col :span="12">
          <el-card header="组学数据类型覆盖 (Omics Coverage)" shadow="never">
            <div id="omicsChart" style="height: 350px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 3. 数据源统计表格 -->
      <el-card header="Omics 数据源统计 (Omics Data Sources)" shadow="never" class="table-card">
        <el-table :data="omicsDataTable" border stripe>
          <el-table-column prop="type" label="数据源类型 (Type)" width="200" />
          <el-table-column prop="dataCount" label="数据集数 (Datasets)" width="150" />
          <el-table-column prop="sampleCount" label="样本数 (Samples)" width="150" />
          <el-table-column prop="dataPercent" label="数据集占比 (%)" />
        </el-table>
      </el-card>

      <!-- 4. 数据分布详情表格 -->
      <el-card header="样本分布详情 (Sample Distribution Details)" shadow="never" class="table-card">
        <el-tabs tab-position="left">
          <el-tab-pane label="分期 (Stage)">
            <el-table :data="stageTable" border stripe max-height="400">
              <el-table-column prop="stage" label="分期" width="150" />
              <el-table-column prop="count" label="样本数" width="150" />
              <el-table-column prop="percent" label="占比">
                <template #default="scope">
                  <el-progress :percentage="scope.row.percent" :color="scope.row.color" />
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="组织 (Tissue)">
            <el-table :data="tissueTable" border stripe max-height="400">
              <el-table-column prop="tissue" label="组织类型" width="150" />
              <el-table-column prop="count" label="样本数" width="150" />
              <el-table-column prop="percent" label="占比">
                <template #default="scope">
                  <el-progress :percentage="scope.row.percent" :color="scope.row.color" />
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="疾病 (Disease)">
            <el-table :data="diseaseTable" border stripe max-height="400" size="small">
              <el-table-column prop="disease" label="疾病类型" width="250" />
              <el-table-column prop="count" label="样本数" width="150" />
              <el-table-column prop="percent" label="占比" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { fetchAnalysisStats } from '@/api/nodule'

const stats = ref({
  totalProjects: 0,
  totalDatasets: 0,
  totalSamples: 0,
  totalIndividuals: 0,
  stageDist: {},
  tissueDist: {},
  diseaseDist: {},
  omicsDistData: {},
  omicsDistSamples: {}
})

const omicsDataTable = ref([])
const stageTable = ref([])
const tissueTable = ref([])
const diseaseTable = ref([])

onMounted(async () => {
  const res = await fetchAnalysisStats()
  stats.value = res

  // 准备 Omics 数据源表格
  omicsDataTable.value = Object.entries(res.omicsDistData).map(([type, dataCount]) => {
    const sampleCount = res.omicsDistSamples[type] || 0
    const dataPercent = Math.round((dataCount / res.totalDatasets) * 100)
    return { type, dataCount, sampleCount, dataPercent }
  })

  // 准备分期表格
  stageTable.value = Object.entries(res.stageDist)
    .filter(([stage]) => stage !== 'NA')
    .map(([stage, count]) => ({
      stage,
      count,
      percent: Math.round((count / res.totalSamples) * 100),
      color: stage === 'Healthy' ? '#42b983' : '#E6A23C'
    }))

  // 准备组织表格
  tissueTable.value = Object.entries(res.tissueDist)
    .sort((a, b) => b[1] - a[1])
    .map(([tissue, count]) => ({
      tissue,
      count,
      percent: Math.round((count / res.totalSamples) * 100),
      color: '#67C23A'
    }))

  // 准备疾病表格
  diseaseTable.value = Object.entries(res.diseaseDist)
    .sort((a, b) => b[1] - a[1])
    .map(([disease, count]) => ({
      disease,
      count,
      percent: Math.round((count / res.totalSamples) * 100)
    }))

  // 初始化图表
  nextTick(() => {
    initStageChart()
    initTissueChart()
    initDiseaseChart()
    initOmicsChart()
  })
})

const initStageChart = () => {
  const chart = echarts.init(document.getElementById('stageChart'))
  const data = Object.entries(stats.value.stageDist)
    .filter(([stage]) => stage !== 'NA')
    .map(([name, value]) => ({ name, value }))

  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%', left: 'center' },
    color: ['#91cc75', '#fac858', '#ee6666', '#73c0de'],
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: data
    }]
  })
}

const initTissueChart = () => {
  const chart = echarts.init(document.getElementById('tissueChart'))
  const entries = Object.entries(stats.value.tissueDist).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const names = entries.map(([name]) => name.substring(0, 10))
  const values = entries.map(([, value]) => value)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '5%', right: '5%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: names, axisLabel: { rotate: 45 } },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: values,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#67C23A' },
          { offset: 1, color: '#85CE61' }
        ])
      },
      label: { show: true, position: 'top' }
    }]
  })
}

const initDiseaseChart = () => {
  const chart = echarts.init(document.getElementById('diseaseChart'))
  const entries = Object.entries(stats.value.diseaseDist).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const names = entries.map(([name]) => name.substring(0, 15))
  const values = entries.map(([, value]) => value)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '5%', right: '5%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: names, axisLabel: { rotate: 45 } },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: values,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#42b983' },
          { offset: 1, color: '#82d8b2' }
        ])
      },
      label: { show: true, position: 'top' }
    }]
  })
}

const initOmicsChart = () => {
  const chart = echarts.init(document.getElementById('omicsChart'))
  const types = Object.keys(stats.value.omicsDistData)
  const dataValues = Object.values(stats.value.omicsDistData)
  const sampleValues = types.map(t => stats.value.omicsDistSamples[t] || 0)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Datasets', 'Samples'] },
    grid: { left: '5%', right: '5%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: types.map(t => t.substring(0, 12)), axisLabel: { rotate: 45 } },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Datasets',
        type: 'bar',
        data: dataValues,
        itemStyle: { color: '#42b983' }
      },
      {
        name: 'Samples',
        type: 'bar',
        data: sampleValues,
        itemStyle: { color: '#67C23A' }
      }
    ]
  })
}
</script>

<style scoped>
.analysis-page { background-color: #f5f7fa; min-height: 100vh; padding: 20px; }
.stat-cards { margin-bottom: 25px; }
.data-card { text-align: center; border-radius: 12px; border: none; }
.card-label { font-size: 0.85rem; color: #909399; margin-bottom: 10px; }
.card-value { font-size: 2rem; font-weight: 800; }

/* 卡片主题色 */
.green .card-value { color: #42b983; }
.blue .card-value { color: #42b983; }
.orange .card-value { color: #E6A23C; }
.purple .card-value { color: #8e44ad; }

.chart-row { margin-bottom: 25px; }
.table-card { border-radius: 12px; margin-bottom: 25px; }

:deep(.el-card__header) { font-weight: bold; color: #303133; border-bottom: 1px solid #f0f0f0; }
:deep(.el-tabs__nav) { border-bottom: 1px solid #D9D9D9; }
</style>