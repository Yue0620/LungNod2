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
            <div class="card-label">总个体数 (Individuals)</div>
            <div class="card-value">{{ stats.totalIndividuals }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="data-card blue">
            <div class="card-label">总子样本数 (Sub-Samples)</div>
            <div class="card-value">{{ stats.totalSubSamples }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="data-card orange">
            <div class="card-label">临床指标总数</div>
            <div class="card-value">62</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="data-card purple">
            <div class="card-label">多组学覆盖维度</div>
            <div class="card-value">11</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 2. 图表区域 -->
      <el-row :gutter="20" class="chart-row">
        <!-- 疾病分期分布饼图 -->
        <el-col :span="10">
          <el-card header="疾病演进阶段分布" shadow="never">
            <div id="stageChart" style="height: 350px;"></div>
          </el-card>
        </el-col>
        <!-- 组学数据分布柱状图 -->
        <el-col :span="14">
          <el-card header="各组学数据类型规模" shadow="never">
            <div id="omicsChart" style="height: 350px;"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 3. 数据构成概览表格 -->
      <el-card header="数据集构成详细预览" shadow="never" class="table-card">
        <el-table :data="summaryTable" border stripe>
          <el-table-column prop="category" label="分类维度" width="200" />
          <el-table-column prop="count" label="样本数量" />
          <el-table-column prop="percent" label="占比 (%)">
            <template #default="scope">
              <el-progress :percentage="scope.row.percent" :color="scope.row.color" />
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { fetchAnalysisStats } from '@/api/nodule'

const stats = ref({
  totalIndividuals: 0,
  totalSubSamples: 0,
  stageDist: {},
  omicsDist: {}
})

const summaryTable = ref([])

onMounted(async () => {
  const res = await fetchAnalysisStats()
  stats.value = res

  // 转换数据给表格
  summaryTable.value = Object.entries(res.stageDist).map(([name, count]) => ({
    category: `分期: ${name}`,
    count: count,
    percent: Math.round((count / res.totalSubSamples) * 100),
    color: '#42b983'
  }))

  // 初始化图表
  nextTick(() => {
    initStageChart()
    initOmicsChart()
  })
})

const initStageChart = () => {
  const chart = echarts.init(document.getElementById('stageChart'))
  const data = Object.entries(stats.value.stageDist).map(([name, value]) => ({ name, value }))

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

const initOmicsChart = () => {
  const chart = echarts.init(document.getElementById('omicsChart'))
  const keys = Object.keys(stats.value.omicsDist)
  const values = Object.values(stats.value.omicsDist)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: keys },
    series: [{
      type: 'bar',
      data: values,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#83bff6' },
          { offset: 0.5, color: '#188df0' },
          { offset: 1, color: '#188df0' }
        ])
      },
      label: { show: true, position: 'right' }
    }]
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
.blue .card-value { color: #409EFF; }
.orange .card-value { color: #E6A23C; }
.purple .card-value { color: #8e44ad; }

.chart-row { margin-bottom: 25px; }
.table-card { border-radius: 12px; }

:deep(.el-card__header) { font-weight: bold; color: #303133; border-bottom: 1px solid #f0f0f0; }
</style>