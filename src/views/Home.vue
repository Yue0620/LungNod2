<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { fetchStats } from '@/api/nodule'
import { useRouter } from 'vue-router'

const router = useRouter()

// 1. 肺结节阶段数据
const lungStages = [
  {
    id: 1, name: '正常肺部', label: 'Healthy', file: 'Lung1.png',
    desc: '影像表现：肺野清晰，纹理自然',
    detail: '无异常密度增高影，胸膜平滑。这是对比诊断的基础基准。'
  },
  {
    id: 2, name: '实性结节', label: 'Solid', file: 'Lung2.png',
    desc: '影像表现：高密度、边界清晰',
    detail: '结节内部完全被实性成分占据。需关注其直径增长及倍增时间。'
  },
  {
    id: 3, name: '磨玻璃结节', label: 'GGO', file: 'Lung3.png',
    desc: '影像表现：云雾状半透明影',
    detail: '典型亚实性结节（pGGN）。具有较高的早期腺癌风险。'
  },
  {
    id: 4, name: '恶性演变', label: 'Malignant', file: 'Lung4.png',
    desc: '影像表现：分叶征、毛刺征明显',
    detail: '提示病灶具有浸润性，需临床高度介入或手术治疗。'
  }
]

// 响应式状态
const activeIndex = ref(null)
const pinnedIndex = ref(null)
const showHint = ref(true)
const statsData = ref({ cases: '---', images: '---', integrity: '---' })

let rotationIdx = 0
let autoPlayTimer = null

// 修正路径：使用 @ 符号从 src 根目录寻找
const getImageUrl = (name) => {
  return new URL(`../img/${name}`, import.meta.url).href
}

const startAutoPlay = () => {
  stopAutoPlay()
  autoPlayTimer = setInterval(() => {
    if (activeIndex.value === null && pinnedIndex.value === null) {
      activeIndex.value = rotationIdx
      rotationIdx = (rotationIdx + 1) % lungStages.length
      setTimeout(() => {
        if (pinnedIndex.value === null && activeIndex.value === (rotationIdx === 0 ? 3 : rotationIdx - 1)) {
          activeIndex.value = null
        }
      }, 2500)
    }
  }, 2500)
}

const stopAutoPlay = () => {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

const handleMouseEnter = (index) => {
  stopAutoPlay()
  pinnedIndex.value = null
  activeIndex.value = index
  rotationIdx = index
}

const handleCardClick = (index) => {
  if (pinnedIndex.value === index) {
    pinnedIndex.value = null
    startAutoPlay()
  } else {
    pinnedIndex.value = index
    activeIndex.value = index
    stopAutoPlay()
  }
  showHint.value = false
}

const handleAction = (index) => {
  router.push({
    path: '/samples',
    query: { stage: index + 1 }
  })
}

const handleMouseLeaveWrapper = () => {
  activeIndex.value = null
  if (pinnedIndex.value === null) {
    rotationIdx = (rotationIdx + 1) % lungStages.length
    startAutoPlay()
  }
}

onMounted(async () => {
  try {
    const res = await fetchStats()
    if (res) statsData.value = res
  } catch (error) {
    statsData.value = { cases: '10,256+', images: '52,480+', integrity: '99.2%' }
  }
  startAutoPlay()
})

onUnmounted(() => {
  stopAutoPlay()
})
</script>

<template>
  <main class="main-content">
    <section class="hero">
      <div class="hero-content container">
        <div class="hero-left">
          <h1 class="hero-title">LungNod <br/><span class="green-text">肺结节数据库</span></h1>
          <p class="subtitle">赋能医疗影像研究，助力精准诊断与科研创新</p>

          <div class="search-box">
            <input type="text" placeholder="输入结节ID、特征或病理分期..." />
            <button class="search-btn">搜索数据库</button>
          </div>

          <!-- 优化：居中且更具设计感的 Stats -->
          <div class="stats-glass">
            <div class="stat-item">
              <span class="number">{{ statsData.cases }}</span>
              <span class="label">病例样本</span>
            </div>
            <div class="divider"></div>
            <div class="stat-item">
              <span class="number">{{ statsData.images }}</span>
              <span class="label">标注图像</span>
            </div>
            <div class="divider"></div>
            <div class="stat-item">
              <span class="number">{{ statsData.integrity }}</span>
              <span class="label">数据完整</span>
            </div>
          </div>
        </div>

        <div class="hero-right">
          <div class="interaction-hint" :class="{ 'hide-hint': !showHint }">
            <span class="hint-dot pulse"></span>
            {{ pinnedIndex !== null ? '详情已锁定 · 移动鼠标可解锁并切换' : '演进图自动轮播中 · 点击可锁定' }}
          </div>

          <div class="evolution-wrapper" @mouseleave="handleMouseLeaveWrapper">
            <div
                v-for="(stage, index) in lungStages"
                :key="stage.id"
                class="stage-card"
                :class="{
                  'is-active': activeIndex === index || pinnedIndex === index,
                  'is-idle': activeIndex === null && pinnedIndex === null
                }"
                @mouseenter="handleMouseEnter(index)"
                @click.stop="handleCardClick(index)"
            >
              <Transition name="slide">
                <div
                    v-if="activeIndex === index || pinnedIndex === index"
                    class="info-popup"
                    :class="index < 2 ? 'popup-right' : 'popup-left'"
                >
                  <div class="popup-header">
                    <span class="tag">STAGE 0{{ stage.id }}</span>
                    <span v-if="pinnedIndex === index" class="pin-icon">📌 锁定预览</span>
                    <h4>{{ stage.name }}</h4>
                  </div>
                  <p class="popup-desc">{{ stage.desc }}</p>
                  <p class="popup-detail">{{ stage.detail }}</p>
                  <div class="popup-action" @click.stop="handleAction(index)">进入样本库 →</div>
                </div>
              </Transition>

              <div class="img-inner-box">
                <img :src="getImageUrl(stage.file)" :alt="stage.name" class="lung-img" />
                <!-- 增强：始终活跃在当前选中卡片的扫描线 -->
                <div class="scan-line" v-if="activeIndex === index || pinnedIndex === index"></div>

                <!-- 浮动文字层 -->
                <div class="stage-overlay">
                  <span class="stage-num">0{{ stage.id }}</span>
                  <span class="stage-name">{{ stage.name }}</span>
                </div>
              </div>
              <div class="stage-label-bottom">{{ stage.label }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 特性介绍 -->
    <section class="features container">
      <div class="feature-card">
        <div class="icon-box">📊</div>
        <h3>海量样本数据</h3>
        <p>收录超过万例经病理证实的肺结节病例，覆盖多种形态特征。</p>
      </div>
      <div class="feature-card">
        <div class="icon-box">🏷️</div>
        <h3>多维精准标注</h3>
        <p>包含高分辨率 CT 影像、临床信息及病理结果数据。</p>
      </div>
      <div class="feature-card">
        <div class="icon-box">🧠</div>
        <h3>智能辅助分析</h3>
        <p>集成前沿 AI 算法模型，提供自动化的结节检测与风险预测。</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* 核心布局修复 */
.main-content { overflow: hidden; }
.hero { background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); padding: 1rem 0; overflow: visible; }
.hero-content { display: flex; align-items: center; justify-content: space-between; gap: 40px; }
.hero-left { flex: 0 0 35%; text-align: left; }
.hero-title { font-size: 3.8rem; color: #2c3e50; line-height: 1.2; margin-bottom: 1.5rem; font-weight: 800; }
.green-text { color: #42b983; }
.subtitle { font-size: 1.2rem; color: #64748b; margin-bottom: 2.5rem; line-height: 1.6; }

/* 搜索框 */
.search-box { display: flex; box-shadow: 0 10px 30px rgba(66, 185, 131, 0.1); border-radius: 50px; overflow: hidden; background: #fff; margin-bottom: 3.5rem; border: 1px solid #e2e8f0; }
.search-box input { flex: 1; padding: 1.2rem 1.5rem; border: none; outline: none; font-size: 1rem; }
.search-btn { background: #42b983; color: #fff; border: none; padding: 0 2rem; font-weight: 600; cursor: pointer; transition: 0.3s; }
.search-btn:hover { background: #38a169; }

/* 玻璃拟态统计栏 */
.stats-glass {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px);
  padding: 1.5rem 2rem; border-radius: 24px; border: 1px solid rgba(66, 185, 131, 0.2);
  box-shadow: 0 10px 20px rgba(0,0,0,0.03);
}
.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-item .number { font-size: 1.8rem; font-weight: 800; color: #42b983; line-height: 1.2; }
.stat-item .label { font-size: 0.8rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
.divider { width: 1px; height: 30px; background: #e2e8f0; }

/* 右侧交互区 */
.hero-right { flex: 1; display: flex; flex-direction: column; align-items: flex-end; position: relative; }
.interaction-hint { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #42b983; margin-bottom: 15px; font-weight: 600; transition: opacity 0.5s; }
.hide-hint { opacity: 0; }
.hint-dot { width: 8px; height: 8px; background: #42b983; border-radius: 50%; }
.pulse { animation: pulseAnim 2s infinite; }

.evolution-wrapper { display: flex; gap: 20px; align-items: center; height: 480px; width: 100%; justify-content: flex-end; }

/* 卡片与扫描动画 */
.stage-card { position: relative; width: 120px; height: 400px; transition: all 0.7s cubic-bezier(0.23, 1, 0.32, 1); opacity: 0.6; cursor: pointer; }
.stage-card.is-idle { animation: breathe 3s infinite ease-in-out; }
.stage-card.is-active { width: 320px; opacity: 1; z-index: 10; }

.img-inner-box { width: 100%; height: 100%; border-radius: 60px; overflow: hidden; position: relative; background: #f8fafc; border: 2px solid transparent; transition: 0.3s; }
.stage-card.is-active .img-inner-box { border-color: #42b983; box-shadow: 0 20px 40px rgba(66, 185, 131, 0.2); }
.lung-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.8s; }

/* 扫描线效果 - 确保可见 */
.scan-line {
  position: absolute; top: 0; left: 0; width: 100%; height: 6px;
  background: linear-gradient(to right, transparent, rgba(66, 185, 131, 1), transparent);
  box-shadow: 0 0 15px #42b983;
  animation: scanMove 2.5s linear infinite;
  z-index: 5;
}

/* 浮动字体层 */
.stage-overlay {
  position: absolute; bottom: 50px; left: 20px; color: #fff; writing-mode: vertical-lr;
  display: flex; flex-direction: column; gap: 15px; z-index: 3;
  text-shadow: 0 4px 12px rgba(0,0,0,0.5);
}
.stage-num { font-weight: 900; font-size: 2rem; opacity: 0.9; }
.stage-name { font-weight: 600; letter-spacing: 2px; white-space: nowrap; font-size: 1.2rem; }
.stage-label-bottom { position: absolute; bottom: 20px; width: 100%; text-align: center; font-size: 0.75rem; font-weight: 800; color: #94a3b8; letter-spacing: 1px; }

/* 悬浮弹出层 */
.info-popup {
  position: absolute; top: 50%; transform: translateY(-50%); width: 280px;
  background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(15px);
  padding: 24px; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.15);
  border: 1px solid rgba(66, 185, 131, 0.4); z-index: 100;
}
.popup-left { right: calc(100% + 10px); text-align: right; }
.popup-right { left: calc(100% + 10px); text-align: left; }
.tag { background: #42b983; color: white; font-size: 0.7rem; padding: 3px 10px; border-radius: 10px; font-weight: 700; width: fit-content; }
.popup-header h4 { font-size: 1.4rem; margin: 8px 0 0; color: #1e293b; }
.popup-desc { color: #42b983; font-weight: 700; font-size: 0.95rem; margin-top: 8px; }
.popup-detail { color: #64748b; font-size: 0.85rem; line-height: 1.6; margin-top: 10px; }
.popup-action { margin-top: 15px; font-size: 0.85rem; font-weight: 700; color: #42b983; cursor: pointer; display: inline-block; }
.popup-action:hover { text-decoration: underline; }

/* 关键帧动画 */
@keyframes scanMove { 0% { top: 0%; } 100% { top: 100%; } }
@keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
@keyframes pulseAnim { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }

.slide-enter-active, .slide-leave-active { transition: all 0.4s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-50%) scale(0.9); }

/* Features Section */
.features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5rem; padding: 2rem 0; }
.feature-card { background: #fff; padding: 3rem 2.5rem; border-radius: 20px; border: 1px solid #f1f5f9; transition: 0.4s; text-align: left; }
.feature-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0,0,0,0.05); border-color: #42b983; }
.icon-box { font-size: 2.5rem; margin-bottom: 1.5rem; }
.feature-card h3 { font-size: 1.5rem; color: #1e293b; margin-bottom: 1rem; }
.feature-card p { color: #64748b; line-height: 1.7; font-size: 0.95rem; }
</style>