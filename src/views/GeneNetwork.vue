<template>
  <div class="network-container">
    <aside class="data-aside" :class="{ 'aside-collapsed': isCollapsed }">
      <div class="aside-header">
        <span v-if="!isCollapsed">基因网络工作站</span>
        <el-button link @click="toggleSidebar">
          <el-icon><DArrowLeft v-if="!isCollapsed" /><DArrowRight v-else /></el-icon>
        </el-button>
      </div>

      <div v-if="!isCollapsed" class="aside-content">
        <!-- 1. 压力测试区 -->
        <div class="layout-controls stress-panel">
          <div class="config-title">快速压力测试 (节点规模)</div>
          <div class="stress-grid">
            <el-button v-for="n in [50, 100, 150, 200, 1000]" :key="n"
                       size="small" @click="runStressTest(n)" :type="n > 500 ? 'warning' : 'default'">
              {{ n }}
            </el-button>
          </div>
        </div>

        <!-- 2. 手动输入区 -->
        <div class="input-section">
          <div class="input-label">自定义连线 (Source Target):</div>
          <el-input v-model="rawEdgesText" type="textarea" :rows="3" class="gene-textarea" />
        </div>
        <el-button type="primary" @click="parseAndLoad" class="w-100" :icon="Check">解析自定义数据</el-button>

        <el-divider />

        <!-- 3. 布局切换核心 -->
        <div class="layout-controls">
          <div class="config-title">排版算法</div>
          <el-select v-model="pendingLayoutName" size="small" class="w-100">
            <el-option v-for="item in layoutOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button type="primary" size="small" @click="reLayout" class="w-100" style="margin-top: 10px;" icon="VideoPlay" :loading="isProcessing">
            应用全局排版
          </el-button>

          <div class="config-title" style="margin-top: 15px;">局部微调</div>
          <el-button size="small" type="success" plain @click="layoutSelectedNodes" class="w-100" icon="Aim">
            对选中项执行局部圆排版
          </el-button>
        </div>

        <div class="layout-controls">
          <el-switch v-model="showLabels" active-text="显示基因名称" @change="updateStyles" />
        </div>
      </div>
    </aside>

    <main class="canvas-main">
      <div ref="cyRef" class="cy-canvas"></div>

      <!-- 左下角图例 -->
      <div class="cluster-legend" v-if="legendList.length > 0">
        <div class="legend-header">聚类图例 (点击选择)</div>
        <el-scrollbar max-height="150px">
          <div v-for="item in legendList" :key="item.name" class="legend-item" @click="selectNodesByCluster(item.name)">
            <span class="color-dot" :style="{ backgroundColor: item.color }"></span>
            <span class="legend-label">{{ item.name }}</span>
          </div>
        </el-scrollbar>
      </div>

      <!-- 右侧看板 -->
      <div class="right-stats-wrapper" :class="{ 'stats-open': showRightTable }">
        <div class="toggle-button" @click="showRightTable = !showRightTable">
          <el-icon><DataLine v-if="!showRightTable" /><Close v-else /></el-icon>
        </div>
        <div class="stats-panel" v-if="showRightTable">
          <div class="panel-inner-header">基因拓扑统计 (N={{ nodeList.length }})</div>
          <el-table :data="nodeList" size="small" height="100%" stripe border>
            <el-table-column prop="id" label="基因" />
            <el-table-column prop="degree" label="度" width="55" sortable />
            <el-table-column label="操作" width="50" align="center">
              <template #default="scope">
                <el-button link type="primary" @click="focusNode(scope.row.id)"><el-icon><View /></el-icon></el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <div class="grid-bg"></div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, shallowRef } from 'vue';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { ElMessage } from 'element-plus';
import { DArrowLeft, DArrowRight, Refresh, Check, View, DataLine, Close, Aim, VideoPlay } from '@element-plus/icons-vue';

cytoscape.use(fcose);

const cyRef = ref(null);
const cyInstance = shallowRef(null);
const isCollapsed = ref(false);
const showRightTable = ref(false);
const showLabels = ref(false);
const isProcessing = ref(false);
const rawEdgesText = ref('');
const rawNodesText = ref('');
const nodeList = ref([]);
const legendList = ref([]);
const pendingLayoutName = ref('fcose');

const layoutOptions = [
  { label: '智能力导向 (fCoSE)', value: 'fcose' },
  { label: '致密圆形 (Circle)', value: 'circle' },
  { label: '同心圆布局 (Concentric)', value: 'concentric' }
];

let currentLayoutTask = null;

const initCytoscape = () => {
  cyInstance.value = cytoscape({
    container: cyRef.value,
    style: [
      {
        selector: 'node',
        style: {
          'width': 'data(size)', 'height': 'data(size)',
          'background-color': 'data(mainColor)',
          'label': showLabels.value ? 'data(label)' : '',
          'font-size': '8px', 'min-zoomed-font-size': '6px',
          'text-valign': 'center', 'color': '#333', 'border-width': 1, 'border-color': '#fff',
          'pie-size': '100%',
          'pie-1-background-color': 'data(color1)', 'pie-1-background-size': 'data(p1)',
          'pie-2-background-color': 'data(color2)', 'pie-2-background-size': 'data(p2)',
        }
      },
      { selector: 'node:selected', style: { 'border-width': 4, 'border-color': '#42b983' } },
      { selector: 'edge', style: { 'width': 0.8, 'line-color': '#adb5bd', 'curve-style': 'haystack', 'opacity': 0.15, 'events': 'no' } },
      { selector: '.faded', style: { 'opacity': 0.05, 'text-opacity': 0 } }
    ]
  });

  cyInstance.value.on('mouseover', 'node', (e) => {
    const neighborhood = e.target.neighborhood().add(e.target);
    cyInstance.value.elements().addClass('faded');
    neighborhood.removeClass('faded');
  });
  cyInstance.value.on('mouseout', 'node', () => cyInstance.value.elements().removeClass('faded'));
};

const reLayout = () => {
  if (!cyInstance.value) return;
  isProcessing.value = true;
  const nodes = cyInstance.value.nodes();

  let config = {
    name: pendingLayoutName.value,
    animate: nodes.length < 300,
    fit: true,
    padding: 20
  };

  // 【核心修复】：为不同算法配置差异化参数
  switch (pendingLayoutName.value) {
    case 'circle':
      config.spacingFactor = 0.5; // 极度压缩
      config.nodeRepulsion = 100;
      config.gravity = 10;
      config.sort = (a, b) => (a.data('cluster') || '').localeCompare(b.data('cluster') || '');
      break;

    case 'fcose':
      config.nodeRepulsion = 5500; // 正常的排斥力，让它散开
      config.gravity = 0.15;       // 【关键】极小的向心力，防止它变成圆
      config.idealEdgeLength = 60; // 正常的线长，呈现蛛网结构
      config.nodeDimensionsIncludeLabels = true;
      break;

    case 'concentric':
      config.concentric = (node) => node.degree();
      config.levelWidth = () => 1;
      config.minNodeSpacing = 40;
      break;
  }

  if (currentLayoutTask) currentLayoutTask.stop();
  currentLayoutTask = cyInstance.value.layout(config);
  currentLayoutTask.one('layoutstop', () => isProcessing.value = false);
  currentLayoutTask.run();

  nodeList.value = cyInstance.value.nodes().map(n => ({
    id: n.id(), degree: n.degree(), clusters: n.data('clusters')
  })).sort((a,b) => b.degree - a.degree);
};

// 压力测试：生成模拟网络
const runStressTest = (n) => {
  let edges = "", nodes = "";
  const clusters = ["Path_A", "Path_B", "Path_C", "Path_D", "Path_E"];
  for (let i = 1; i <= n; i++) {
    const id = `G_${i}`;
    const clus = clusters[i % 5];
    nodes += `${id} ${clus}\n`;
    edges += `${id} G_${(i % n) + 1}\n`; // 基础环形
    if (Math.random() > 0.8) {
      edges += `${id} G_${Math.ceil(Math.random() * (n/10) || 1)}\n`; // 连向 Hub
    }
  }
  rawEdgesText.value = edges;
  rawNodesText.value = nodes;
  parseAndLoad();
};

const parseAndLoad = () => {
  const edgeLines = rawEdgesText.value.trim().split('\n');
  const nodeLines = rawNodesText.value.trim().split('\n');
  const nodesSet = new Set();
  const nodeToClusters = {};
  const clustersFound = new Set();
  const degreeMap = {};

  nodeLines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const [n, cStr] = parts;
      const cList = cStr.split(',');
      nodeToClusters[n] = cList;
      cList.forEach(c => clustersFound.add(c));
    }
  });

  edgeLines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      degreeMap[parts[0]] = (degreeMap[parts[0]] || 0) + 1;
      degreeMap[parts[1]] = (degreeMap[parts[1]] || 0) + 1;
    }
  });

  const maxD = Math.max(...Object.values(degreeMap), 1);
  legendList.value = Array.from(clustersFound).map(c => ({ name: c, color: getClusterColor(c) }));

  const elements = [];
  Object.keys(degreeMap).forEach(id => {
    const cList = nodeToClusters[id] || ['Other'];
    const d = degreeMap[id] || 0;
    const nodeData = {
      id, label: id, cluster: cList[0], clusters: cList,
      size: 14 + (d / maxD * 25), mainColor: getClusterColor(cList[0])
    };
    if (cList.length > 1) {
      nodeData.color1 = getClusterColor(cList[0]); nodeData.p1 = 50;
      nodeData.color2 = getClusterColor(cList[1]); nodeData.p2 = 50;
    }
    elements.push({ data: nodeData });
  });

  edgeLines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) elements.push({ data: { id: `e-${parts[0]}-${parts[1]}`, source: parts[0], target: parts[1] } });
  });

  if (cyInstance.value) {
    cyInstance.value.elements().remove();
    cyInstance.value.add(elements);
    reLayout();
  }
};

const selectNodesByCluster = (clusterName) => {
  cyInstance.value.elements().unselect();
  const targets = cyInstance.value.nodes().filter(n => n.data('clusters')?.includes(clusterName));
  targets.select();
  cyInstance.value.animate({ center: { eles: targets } }, { duration: 500 });
};

const layoutSelectedNodes = () => {
  const selectedNodes = cyInstance.value.nodes(':selected');
  if (selectedNodes.length < 2) return ElMessage.warning('请选择多个节点');
  const pos = selectedNodes.boundingBox();
  selectedNodes.layout({
    name: 'circle',
    radius: selectedNodes.length * 4,
    boundingBox: { x1: pos.x1-50, y1: pos.y1-50, x2: pos.x2+50, y2: pos.y2+50 },
    animate: true,
    fit: false
  }).run();
};

const getClusterColor = (c) => {
  if (c === 'Other') return '#ced4da';
  const hash = c.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `hsl(${(hash * 137) % 360}, 65%, 60%)`;
};

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  setTimeout(() => cyInstance.value?.resize(), 350);
};

const updateStyles = () => {
  cyInstance.value.style().selector('node').style('label', showLabels.value ? 'data(label)' : '').update();
};

const focusNode = (id) => {
  const node = cyInstance.value.getElementById(id);
  cyInstance.value.animate({ center: { eles: node }, zoom: 2.5 }, { duration: 500 });
  node.select();
};

const clearData = () => {
  rawEdgesText.value = ''; rawNodesText.value = '';
  cyInstance.value?.elements().remove();
  nodeList.value = []; legendList.value = [];
};

onMounted(() => initCytoscape());
</script>

<style scoped>
.network-container { display: flex; width: 100%; height: calc(100vh - 110px); background: #fff; overflow: hidden; }
.data-aside { width: 340px; background: #fff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; transition: 0.3s ease; flex-shrink: 0; z-index: 100; }
.aside-collapsed { width: 48px; }
.aside-header { padding: 15px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; }
.aside-content { padding: 15px; flex: 1; overflow-y: auto; }

.stress-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: 10px; }
.stress-grid .el-button { margin-left: 0 !important; }

.input-section { margin-top: 15px; margin-bottom: 15px; }
.input-label { font-size: 11px; color: #64748b; margin-bottom: 6px; font-weight: bold; }
.gene-textarea :deep(.el-textarea__inner) { font-family: Arial, 'Microsoft YaHei', sans-serif; font-size: 10px; background: #f9fafb; padding: 8px; }
.layout-controls { background: #f8fafc; padding: 12px; border-radius: 10px; margin-bottom: 15px; }
.config-title { font-size: 11px; color: #94a3b8; font-weight: bold; margin-bottom: 8px; }

.canvas-main { flex: 1; position: relative; overflow: hidden; }
.cy-canvas { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 2; }
.right-stats-wrapper { position: absolute; top: 20px; right: 0; height: calc(100% - 40px); z-index: 10; display: flex; align-items: flex-start; transition: transform 0.4s ease; transform: translateX(100%); }
.stats-open { transform: translateX(0); }
.toggle-button { width: 32px; height: 100px; background: #42b983; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 8px 0 0 8px; }
.stats-panel { width: 320px; height: 100%; background: #fff; border-left: 1px solid #e2e8f0; padding: 15px; }
.panel-inner-header { font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 10px; border-left: 4px solid #42b983; padding-left: 8px; }
.cluster-legend { position: absolute; bottom: 20px; left: 20px; width: 220px; z-index: 10; background: rgba(255, 255, 255, 0.95); padding: 12px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.legend-header { font-size: 11px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
.legend-item { display: flex; align-items: center; gap: 8px; padding: 4px 8px; cursor: pointer; border-radius: 4px; transition: 0.2s; }
.legend-item:hover { background: #ecf5ff; }
.color-dot { width: 10px; height: 10px; border-radius: 2px; }
.legend-label { font-size: 11px; color: #475569; }
.grid-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: radial-gradient(#e5e7eb 0.8px, transparent 0.8px); background-size: 30px 30px; opacity: 0.4; z-index: 1; }
.w-100 { width: 100% !important; }
.secondary-btns { margin-top: 10px; display: flex; gap: 8px; }
</style>