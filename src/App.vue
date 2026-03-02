<template>
  <div class="app-container">
    <header class="header">
      <div class="header-inner container">
        <div class="logo" @click="$router.push('/')">LungNod</div>
        <nav class="nav-links">
          <router-link to="/" active-class="active-link">首页</router-link>
          <router-link to="/samples" active-class="active-link">数据检索</router-link>
          <router-link to="/analysis" active-class="active-link">统计分析</router-link>
          <a href="#">关于我们</a>
        </nav>
      </div>
    </header>

    <!-- 核心：这里会根据 URL 切换显示 Home.vue 或 SampleRes.vue -->
    <router-view />

    <footer class="footer">
      <div class="footer-inner container">
        <p>&copy; 2024 LungNod Database Project. 肺结节影像科研平台</p>
      </div>
    </footer>
  </div>
</template>

<style>
/* 这里放全局通用的 CSS，不要加 scoped */
:root { --primary-color: #42b983; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; color: #333; }

.container { max-width: 1280px; margin: 0 auto; padding: 0 2rem; width: 100%; }

.header { background: #fff; border-bottom: 1px solid #f0f0f0; position: sticky; top: 0; z-index: 1000; }
.header-inner { display: flex; justify-content: space-between; align-items: center; height: 80px; }
.logo { font-size: 1.8rem; font-weight: 800; color: #2c3e50; cursor: pointer; }
.nav-links { display: flex; gap: 2.5rem; }
.nav-links a { text-decoration: none; color: #666; font-weight: 500; }
.active-link { color: var(--primary-color) !important; font-weight: 700 !important; }

.btn-outline { background: transparent; border: 1.5px solid var(--primary-color); color: var(--primary-color); padding: 0.6rem 1.8rem; border-radius: 25px; cursor: pointer; font-weight: 600; }

.footer { background: #1e293b; color: #94a3b8; padding: 2rem 0; text-align: center; }
</style>