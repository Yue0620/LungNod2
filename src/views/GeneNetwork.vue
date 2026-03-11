<template>
  <div class="network-container">
    <!-- 1. 左侧控制窗格 -->
    <aside class="data-aside" :class="{ 'aside-collapsed': isCollapsed }">
      <div class="aside-header">
        <span v-if="!isCollapsed">分析中心 (v4.0)</span>
        <el-button link @click="toggleSidebar">
          <el-icon><DArrowLeft v-if="!isCollapsed" /><DArrowRight v-else /></el-icon>
        </el-button>
      </div>

      <div v-if="!isCollapsed" class="aside-content">
        <div class="input-section">
          <div class="input-label">1. 互作网络 (Edge List):</div>
          <el-input v-model="rawEdgesText" type="textarea" :rows="6" class="gene-textarea" />
        </div>
        <div class="input-section">
          <div class="input-label">2. 节点聚类 (Node Attribute):</div>
          <el-input v-model="rawNodesText" type="textarea" :rows="6" class="gene-textarea" />
        </div>

        <div class="action-group">
          <el-button type="primary" @click="parseAndLoad" class="w-100" :icon="Check">执行全量更新</el-button>
          <div class="secondary-btns">
            <el-button @click="fillExample50" size="small">50点全联通示例</el-button>
            <el-button @click="clearData" size="small" type="danger" plain>清空</el-button>
          </div>
        </div>

        <el-divider />

        <div class="layout-controls">
          <div class="config-title">核心排版切换</div>
          <!-- 核心：切换布局模式 -->
          <el-radio-group v-model="layoutMode" size="small" @change="parseAndLoad" class="w-100">
            <el-radio-button label="circular">全域致密圆</el-radio-button>
            <el-radio-button label="cluster">聚类容器盒</el-radio-button>
          </el-radio-group>

          <div class="config-title" style="margin-top: 15px;">视觉设置</div>
          <el-switch v-model="showLabels" active-text="显示名称" @change="updateStyles" />
        </div>

        <el-button @click="reLayout" :icon="Refresh" class="w-100" style="margin-top:20px" :loading="isProcessing">
          平滑重排
        </el-button>
      </div>
    </aside>

    <!-- 2. 画布主区 -->
    <main class="canvas-main">
      <div ref="cyRef" class="cy-canvas"></div>

      <!-- 右侧悬浮面板 -->
      <div class="floating-stats-panel" v-if="nodeList.length > 0">
        <div class="panel-inner-header">节点属性概览</div>
        <el-table :data="nodeList" size="small" height="280" class="mini-table">
          <el-table-column prop="id" label="基因" width="80" />
          <el-table-column prop="cluster" label="聚类" show-overflow-tooltip />
          <el-table-column prop="degree" label="度" width="40" />
          <el-table-column label="定位" width="40">
            <template #default="scope">
              <el-button link type="primary" @click="focusNode(scope.row.id)"><el-icon><View /></el-icon></el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="grid-bg"></div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, shallowRef } from 'vue';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { DArrowLeft, DArrowRight, Refresh, Check, View } from '@element-plus/icons-vue';

cytoscape.use(fcose);

const cyRef = ref(null);
const cyInstance = shallowRef(null);
const isCollapsed = ref(false);
const isProcessing = ref(false);
const showLabels = ref(false);
const layoutMode = ref('cluster'); // 默认聚类
const rawEdgesText = ref('');
const rawNodesText = ref('');
const nodeList = ref([]);
let currentLayout = null;

const initCytoscape = () => {
  cyInstance.value = cytoscape({
    container: cyRef.value,
    style: [
      {
        selector: 'node',
        style: {
          'width': 'data(size)',
          'height': 'data(size)',
          'background-color': 'data(color)',
          'label': showLabels.value ? 'data(label)' : '',
          'font-size': '8px',
          'text-valign': 'center',
          'color': '#333',
          'border-width': 1,
          'border-color': '#fff',
          'z-index': 10,
          'transition-property': 'background-color, opacity, width, height',
          'transition-duration': '0.3s'
        }
      },
      {
        selector: ':parent', // 【盒子容器样式】
        style: {
          'background-color': '#f0f4f8',
          'background-opacity': 0.3,
          'border-width': 1,
          'border-color': '#409EFF',
          'border-style': 'dashed',
          'shape': 'roundrectangle',
          'padding': 30,
          'label': 'data(label)',
          'text-valign': 'top',
          'text-halign': 'center',
          'font-size': '12px',
          'font-weight': 'bold',
          'color': '#409EFF'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 1,
          'line-color': '#adb5bd',
          'curve-style': 'haystack',
          'opacity': 0.15,
          'events': 'no'
        }
      },
      {
        selector: '.faded',
        style: {
          'opacity': 0.05,
          'text-opacity': 0
        }
      }
    ]
  });

  // 【核心修复】：防止 Hover 时父容器变淡导致内容消失
  cyInstance.value.on('mouseover', 'node', (e) => {
    const node = e.target;
    if (node.isParent()) return;

    const neighborhood = node.neighborhood().add(node);

    // 关键过滤：仅让非邻居节点变淡，且显式排除所有父节点 (:parent)
    cyInstance.value.elements().filter(ele => {
      return !neighborhood.contains(ele) && !ele.isParent();
    }).addClass('faded');
  });

  cyInstance.value.on('mouseout', 'node', () => {
    cyInstance.value.elements().removeClass('faded');
  });
};

const parseAndLoad = () => {
  isProcessing.value = true;
  const edgeLines = rawEdgesText.value.trim().split('\n');
  const nodeLines = rawNodesText.value.trim().split('\n');
  const elements = [];
  const nodesSet = new Set();
  const nodeToCluster = {};
  const clusters = new Set();
  const degreeMap = {};

  nodeLines.forEach(line => {
    const [n, c] = line.trim().split(/\s+/);
    if (n && c) { nodeToCluster[n] = c; clusters.add(c); }
  });

  edgeLines.forEach(line => {
    const [s, t] = line.trim().split(/\s+/);
    if (s && t) {
      degreeMap[s] = (degreeMap[s] || 0) + 1;
      degreeMap[t] = (degreeMap[t] || 0) + 1;
    }
  });

  const maxD = Math.max(...Object.values(degreeMap), 1);
  const tableData = [];

  edgeLines.forEach(line => {
    const [s, t] = line.trim().split(/\s+/);
    if (s && t) {
      [s, t].forEach(id => {
        if (!nodesSet.has(id)) {
          const cluster = nodeToCluster[id] || 'Other';
          const d = degreeMap[id] || 0;
          const ratio = d / maxD;
          const color = `hsl(${(cluster.split('').reduce((a,b)=>a+b.charCodeAt(0),0) * 137) % 360}, 75%, 60%)`;

          elements.push({
            data: {
              id, label: id,
              // 模式判断：cluster 模式添加 parent 属性
              parent: layoutMode.value === 'cluster' ? `p-${cluster}` : null,
              cluster, size: 8 + (ratio * 15), color
            }
          });
          nodesSet.add(id);
          tableData.push({ id, degree: d, cluster });
        }
      });
      elements.push({ data: { id: `e-${s}-${t}`, source: s, target: t } });
    }
  });

  // 聚类模式下创建容器节点
  if (layoutMode.value === 'cluster') {
    clusters.forEach(c => elements.push({ data: { id: `p-${c}`, label: c } }));
  }

  if (cyInstance.value) {
    if (currentLayout) currentLayout.stop();
    cyInstance.value.elements().remove();
    cyInstance.value.add(elements);
    nodeList.value = tableData.sort((a,b) => b.degree - a.degree);
    reLayout();
  }
};

const reLayout = () => {
  if (!cyInstance.value) return;
  if (currentLayout) currentLayout.stop();

  const isCircular = layoutMode.value === 'circular';

  currentLayout = cyInstance.value.layout({
    name: 'fcose',
    animate: true,
    animationDuration: 1000,
    fit: true,
    padding: 40,
    tile: !isCircular, // 聚类模式下开启平铺
    gravity: isCircular ? 25.0 : 1.2,
    nodeRepulsion: isCircular ? 150000 : 45000,
    idealEdgeLength: isCircular ? 40 : 50,
    nodeDimensionsIncludeLabels: true
  });

  currentLayout.one('layoutstop', () => { isProcessing.value = false; });
  currentLayout.run();
};

const fillExample50 = () => {
  let edges = "", nodes = "";
  const clusters = ["Pathway_A", "Pathway_B", "Pathway_C", "Pathway_D", "Pathway_E"];
  for(let i=1; i<=50; i++) {
    const id = `G_${i}`;
    nodes += `${id} ${clusters[Math.floor((i-1) / 10)]}\n`;
  }
  for(let i=1; i<=50; i++) {
    for(let j=i+1; j<=50; j++) {
      if(Math.random() > 0.65) edges += `G_${i} G_${j}\n`;
    }
  }
  rawEdgesText.value = edges; rawNodesText.value = nodes;
  parseAndLoad();
};

const updateStyles = () => {
  cyInstance.value.style().selector('node').style('label', showLabels.value ? 'data(label)' : '').update();
};
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  setTimeout(() => { cyInstance.value?.resize(); cyInstance.value?.fit(30); }, 350);
};
const focusNode = (id) => {
  const node = cyInstance.value.getElementById(id);
  cyInstance.value.animate({ center: { eles: node }, zoom: 3 }, { duration: 500 });
};
const clearData = () => {
  rawEdgesText.value = ''; rawNodesText.value = '';
  cyInstance.value?.elements().remove();
  nodeList.value = [];
};

onMounted(() => { initCytoscape(); fillExample50(); });
</script>

<style scoped>
/* 保持一致的高级 UI 样式 */
.network-container { display: flex; width: 100%; height: calc(100vh - 110px); background: #fff; overflow: hidden; }
.data-aside { width: 340px; background: #fff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; transition: all 0.3s ease; flex-shrink: 0; }
.aside-collapsed { width: 48px; }
.aside-header { padding: 15px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; }
.aside-content { padding: 15px; flex: 1; overflow-y: auto; }
.input-section { margin-bottom: 15px; }
.input-label { font-size: 11px; color: #64748b; margin-bottom: 6px; font-weight: bold; }
.gene-textarea :deep(.el-textarea__inner) { font-family: 'Monaco', monospace; font-size: 10px; background: #f9fafb; padding: 8px; }
.layout-controls { background: #f8fafc; padding: 12px; border-radius: 10px; }
.canvas-main { flex: 1; position: relative; overflow: hidden; }
.cy-canvas { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 2; }
.floating-stats-panel {
  position: absolute; top: 20px; right: 20px; width: 260px; z-index: 10;
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
  border: 1px solid rgba(64, 158, 255, 0.2); border-radius: 12px; padding: 12px;
}
.panel-inner-header { font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 8px; border-left: 3px solid #409EFF; padding-left: 8px; }
.mini-table :deep(.el-table__cell) { padding: 2px 0; font-size: 10px; }
.grid-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: radial-gradient(#e5e7eb 0.8px, transparent 0.8px); background-size: 30px 30px; opacity: 0.4; z-index: 1; }
.w-100 { width: 100%; }
.secondary-btns { display: flex; gap: 8px; margin-top: 8px; }
.secondary-btns .el-button { flex: 1; }
</style>