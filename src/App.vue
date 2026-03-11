<template>
  <div class="app-container">
    <!-- 1. 顶部导航栏 -->
    <header class="header">
      <div class="header-inner container">
        <div class="logo" @click="$router.push('/')">LungNod</div>

        <nav class="nav-links">
          <router-link to="/" active-class="active-link">首页</router-link>
          <router-link to="/samples" active-class="active-link">数据检索</router-link>

          <!-- 改动一：美化后的下拉菜单 -->
          <div class="nav-item-dropdown">
            <span
                class="dropdown-trigger"
                :class="{ 'active-link': $route.path.startsWith('/genenetwork') }"
            >
              绘图功能
              <i class="arrow-icon"></i>
            </span>
            <!-- 下拉内容面板 -->
            <div class="dropdown-panel">
              <router-link to="/genenetwork" class="dropdown-link" active-class="active-child">
                基因网络
              </router-link>
              <!-- 示例：你可以加更多 -->
              <!-- <router-link to="/heatmap" class="dropdown-link">2. 热图绘制</router-link> -->
            </div>
          </div>

          <router-link to="/analysis" active-class="active-link">统计分析</router-link>

          <!-- 改动二：数据标准 (点击触发侧边栏) -->
          <a href="javascript:void(0)" @click="openSidebar" class="nav-btn">数据标准</a>

          <a href="#">关于我们</a>
        </nav>
      </div>
    </header>

    <!-- 2. 核心路由视图 -->
    <router-view />

    <!-- 3. 底部 -->
    <footer class="footer">
      <div class="footer-inner container">
        <p>&copy; 2024 LungNod Database Project. 肺结节影像科研平台</p>
      </div>
    </footer>

    <!-- 4. 侧边栏 (抽屉组件) -->
    <!-- 遮罩层 -->
    <transition name="fade">
      <div v-if="showSidebar" class="sidebar-mask" @click="closeSidebar"></div>
    </transition>
    <!-- 内容层 -->
    <transition name="slide-right">
      <div v-if="showSidebar" class="sidebar-container">
        <div class="sidebar-header">
          <h3>数据标准说明</h3>
          <button class="close-btn" @click="closeSidebar">×</button>
        </div>
        <div class="sidebar-content">
          <h4>1. 影像数据标准</h4>
          <p>所有CT影像均为DICOM格式，层厚 <= 1.25mm...</p>
          <br>
          <h4>2. 标注规范</h4>
          <p>由两名主治医师进行双盲标注，IoU > 0.5 视为有效...</p>
          <br>
          <h4>3. 基因数据</h4>
          <p>采用 GRCh38 参考基因组...</p>
        </div>
      </div>
    </transition>

  </div>
</template>

<script>
export default {
  data() {
    return {
      showSidebar: false
    };
  },
  methods: {
    openSidebar() {
      this.showSidebar = true;
      // 也可以在这里禁止 body 滚动
      document.body.style.overflow = 'hidden';
    },
    closeSidebar() {
      this.showSidebar = false;
      // 恢复 body 滚动
      document.body.style.overflow = '';
    }
  }
};
</script>

<style>
/* --- 全局基础 --- */
:root { --primary-color: #42b983; --text-color: #333; --bg-gray: #f8fafc; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: var(--text-color); }
.container { max-width: 1280px; margin: 0 auto; padding: 0 2rem; width: 100%; }

/* --- Header & Nav --- */
.header { background: #fff; border-bottom: 1px solid #eef2f6; position: sticky; top: 0; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
.header-inner { display: flex; justify-content: space-between; align-items: center; height: 80px; }
.logo { font-size: 1.8rem; font-weight: 800; color: #2c3e50; cursor: pointer; letter-spacing: -0.5px; }
.nav-links { display: flex; gap: 2rem; align-items: center; }

/* 通用链接样式 */
.nav-links > a, .dropdown-trigger {
  text-decoration: none; color: #64748b; font-weight: 500; cursor: pointer; transition: all 0.3s ease; position: relative;
}
.nav-links > a:hover, .dropdown-trigger:hover { color: var(--primary-color); }
.active-link { color: var(--primary-color) !important; font-weight: 700 !important; }

/* --- 优化后的下拉菜单 --- */
.nav-item-dropdown {
  position: relative;
  height: 80px; /* 与 header 高度一致，方便 hover 区域 */
  display: flex;
  align-items: center;
}

/* 箭头图标 (纯CSS) */
.arrow-icon {
  display: inline-block;
  width: 0; height: 0;
  margin-left: 6px;
  vertical-align: middle;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #cbd5e1;
  transition: transform 0.3s ease, border-top-color 0.3s;
}

/* Hover 状态：箭头旋转、变色 */
.nav-item-dropdown:hover .arrow-icon {
  transform: rotate(180deg);
  border-top-color: var(--primary-color);
}

/* 下拉面板 */
.dropdown-panel {
  position: absolute;
  top: 100%; /* 正好在 header 下方 */
  left: 50%;
  transform: translateX(-50%) translateY(10px); /* 初始位置略微向下 */
  background: #fff;
  min-width: 180px;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid #f1f5f9;

  /* 隐藏状态 */
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 增加一个小三角形指向菜单 (可选) */
.dropdown-panel::before {
  content: '';
  position: absolute;
  top: -6px; left: 50%;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid #fff;
}

/* Hover 显示菜单 */
.nav-item-dropdown:hover .dropdown-panel {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0); /* 向上浮动归位 */
}

/* 下拉子链接 */
.dropdown-link {
  display: block;
  padding: 10px 16px;
  color: #475569;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: background 0.2s;
}
.dropdown-link:hover { background: #f0fdf4; color: var(--primary-color); }
.active-child { background: #f0fdf4; color: var(--primary-color); font-weight: 600; }


/* --- 侧边栏 (Sidebar) 样式 --- */
/* 1. 遮罩层 */
.sidebar-mask {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index: 2000; /* 比 Header 高 */
}

/* 2. 侧边栏容器 */
.sidebar-container {
  position: fixed;
  top: 0; right: 0;
  width: 400px;
  height: 100%;
  background: #fff;
  z-index: 2001;
  box-shadow: -5px 0 25px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sidebar-header h3 { font-size: 1.25rem; color: #1e293b; }
.close-btn {
  background: none; border: none; font-size: 2rem; color: #94a3b8; cursor: pointer; line-height: 1;
}
.close-btn:hover { color: #333; }

.sidebar-content {
  padding: 1.5rem;
  overflow-y: auto;
  color: #475569;
  line-height: 1.6;
}
.sidebar-content h4 { color: #1e293b; margin-bottom: 0.5rem; border-left: 4px solid var(--primary-color); padding-left: 10px;}

/* --- Vue 动画过渡 --- */
/* 遮罩淡入淡出 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter, .fade-leave-to { opacity: 0; }

/* 侧边栏从右滑入 */
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s ease-out; }
.slide-right-enter, .slide-right-leave-to { transform: translateX(100%); }

.footer { background: #1e293b; color: #94a3b8; padding: 2rem 0; text-align: center; }
</style>