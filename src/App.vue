<template>
  <div class="app-container">
    <!-- 1. 顶部导航栏 -->
    <header class="header">
      <div class="header-inner container">
        <router-link to="/" class="logo" aria-label="IDP-LNOD home">
          <img :src="logoUrl" alt="" class="brand-logo" width="60" height="60" />
          <span>IDP-LNOD</span>
        </router-link>

        <nav class="nav-links">
          <router-link to="/" active-class="active-link">{{ texts.home }}</router-link>
          
          <!-- 下拉菜单：数据浏览 -->
          <div class="nav-item-dropdown">
            <span class="dropdown-trigger"
              :class="{ 'active-link': $route.path.startsWith('/sample-search') || $route.path.startsWith('/data-search') }">
              {{ texts.dataSearch }}
              <i class="arrow-icon"></i>
            </span>
            <div class="dropdown-panel">
              <router-link to="/sample-search" class="dropdown-link" active-class="active-child">
                {{ texts.sampleData }}
              </router-link>
              <router-link to="/data-search" class="dropdown-link" active-class="active-child">
                {{ texts.searchByProject }}
              </router-link>
            </div>
          </div>
          <!-- 下拉菜单：工具 -->
          <div class="nav-item-dropdown">
            <span
                class="dropdown-trigger"
                :class="{ 'active-link': $route.path.startsWith('/genenetwork') || $route.path.startsWith('/tcr-repertoire') }"
            >
              {{ texts.plot }}
              <i class="arrow-icon"></i>
            </span>
            <div class="dropdown-panel">
              <router-link to="/genenetwork" class="dropdown-link" active-class="active-child">
                {{ texts.geneNetwork }}
              </router-link>
              <router-link to="/tcr-repertoire" class="dropdown-link" active-class="active-child">
                {{ texts.tcrRepertoire }}
              </router-link>
            </div>
          </div>

          <router-link to="/analysis" active-class="active-link">{{ texts.statAnalysis }}</router-link>

          <router-link to="/standards" active-class="active-link">{{ texts.dataStandard }}</router-link>

          <a href="https://ngdc.cncb.ac.cn/idp/" target="_blank" rel="noopener noreferrer" class="idp-hub-link">IDP-Hub <span aria-hidden="true">↗</span></a>

          <a href="#">{{ texts.aboutUs }}</a>

          <!-- 分割线 -->
          <div class="divider"></div>

          <!-- 中英切换按钮 -->
          <button class="lang-toggle-btn" @click="toggleLang">
            <svg class="globe-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              <path d="M2 12h20"></path>
            </svg>
            {{ lang === 'zh' ? 'EN' : '中文' }}
          </button>
        </nav>
      </div>
    </header>

    <!-- 2. 核心路由视图 -->
    <router-view />

    <!-- 3. 底部 -->
    <footer class="footer">
      <div class="footer-inner container">
        <p>{{ texts.footer }}</p>
      </div>
    </footer>

  </div>
</template>

<script>
// 引入刚刚建好的全局状态
import { currentLang, toggleLang } from '@/store/lang.js';

const dictionary = {
  zh: {
    home: '首页', dataSearch: '数据浏览', sampleData: '样本浏览', searchByProject: '数据集浏览', plot: '工具', geneNetwork: '基因网络', tcrRepertoire: 'TCR 免疫组库', statAnalysis: '统计', dataStandard: '数据标准', aboutUs: '关于我们', footer: '© 2024 LungNod Database Project. 肺结节影像科研平台', sidebarTitle: '数据标准说明', sidebarItem1Title: '1. 影像数据标准', sidebarItem1Desc: '所有CT影像均为DICOM格式，层厚 <= 1.25mm...', sidebarItem2Title: '2. 标注规范', sidebarItem2Desc: '由两名主治医师进行双盲标注，IoU > 0.5 视为有效...', sidebarItem3Title: '3. 基因数据', sidebarItem3Desc: '采用 GRCh38 参考基因组...'
  },
  en: {
    home: 'Home', dataSearch: 'Browse', sampleData: 'By Sample', searchByProject: 'By Dataset', plot: 'Tools', geneNetwork: 'Gene Network', tcrRepertoire: 'TCR Repertoire', statAnalysis: 'Statistics', dataStandard: 'Standards', aboutUs: 'About Us', footer: '© 2024 LungNod Database Project. Lung Nodule Imaging Research Platform.', sidebarTitle: 'Data Standards Specification', sidebarItem1Title: '1. Imaging Standards', sidebarItem1Desc: 'All CT images are in DICOM format, slice thickness <= 1.25mm...', sidebarItem2Title: '2. Annotation Norms', sidebarItem2Desc: 'Double-blind annotation by two attending physicians, IoU > 0.5 is valid...', sidebarItem3Title: '3. Genomic Data', sidebarItem3Desc: 'Using GRCh38 reference genome...'
  }
};

export default {
  computed: {
    logoUrl() { return import.meta.env.BASE_URL + 'lungnod-logo.png'; },
    // 监听全局语言变量
    lang() { return currentLang.value; },
    texts() { return dictionary[this.lang]; }
  },
  methods: {
    // 触发全局切换
    toggleLang() { toggleLang(); }
  }
};
</script>

<style>
/* --- 全局基础 --- */
:root { --primary-color: #42b983; --text-color: #333; --bg-gray: #f8fafc; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, 'Microsoft YaHei', sans-serif; color: var(--text-color); }
/* Shared responsive content width. */
.container { width: calc(100% - var(--page-gutter) * 2); max-width: 1680px; margin-inline: auto; padding: 0; }

/* --- Header & Nav --- */
.header { background: #fff; border-bottom: 1px solid #eef2f6; position: sticky; top: 0; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
.header-inner { display: flex; justify-content: space-between; align-items: center; height: 80px; }
.logo { display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0; text-decoration: none; white-space: nowrap; font-size: 1.8rem; font-weight: 800; color: #2c3e50; cursor: pointer; letter-spacing: -0.5px; }
.brand-logo { display: block; width: 60px; height: 60px; object-fit: contain; flex-shrink: 0; }
.nav-links { display: flex; gap: clamp(16px, 1.7vw, 32px); align-items: center; white-space: nowrap; }

.nav-links > a, .dropdown-trigger {
  text-decoration: none; color: #64748b; font-weight: 500; cursor: pointer; transition: all 0.3s ease; position: relative;
}
.nav-links > a:hover, .dropdown-trigger:hover { color: var(--primary-color); }
.active-link { color: var(--primary-color) !important; font-weight: 700 !important; }

/* 导航栏分割线 */
.divider { width: 1px; height: 20px; background-color: #e2e8f0; margin: 0 0.5rem; }

/* --- 中英切换按钮 --- */
.lang-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.lang-toggle-btn:hover {
  background: #f1f5f9;
  color: var(--primary-color);
  border-color: var(--primary-color);
}
.globe-icon {
  width: 16px;
  height: 16px;
}

/* --- 下拉菜单 --- */
.nav-item-dropdown { position: relative; height: 80px; display: flex; align-items: center; }
.arrow-icon { display: inline-block; width: 0; height: 0; margin-left: 6px; vertical-align: middle; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #cbd5e1; transition: transform 0.3s ease, border-top-color 0.3s; }
.nav-item-dropdown:hover .arrow-icon { transform: rotate(180deg); border-top-color: var(--primary-color); }

.dropdown-panel { position: absolute; top: 100%; left: 50%; transform: translateX(-50%) translateY(10px); background: #fff; min-width: 180px; padding: 8px; border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border: 1px solid #f1f5f9; opacity: 0; visibility: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.dropdown-panel::before { content: ''; position: absolute; top: -6px; left: 50%; transform: translateX(-50%); border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid #fff; }
.nav-item-dropdown:hover .dropdown-panel { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }

.dropdown-link { display: block; padding: 10px 16px; color: #475569; text-decoration: none; border-radius: 6px; font-size: 0.95rem; transition: background 0.2s; white-space: nowrap; }
.dropdown-link:hover { background: #f0fdf4; color: var(--primary-color); }
.active-child { background: #f0fdf4; color: var(--primary-color); font-weight: 600; }

.footer { background: #1e293b; color: #94a3b8; padding: 2rem 0; text-align: center; }
.header-inner { gap: 24px; }
@media (max-width: 1279px) {
  .header-inner { gap: 16px; }
  .logo { gap: 8px; font-size: 24px; }
  .brand-logo { width: 48px; height: 48px; }
  .nav-links { gap: 14px; font-size: 14px; }
  .nav-links > .divider { margin: 0; }
}
@media (max-width: 1023px) {
  .header-inner { height: auto; min-height: 80px; flex-wrap: wrap; padding-block: 10px; gap: 8px; }
  .nav-links { width: 100%; flex-wrap: wrap; gap: 8px 20px; }
  .nav-item-dropdown { height: 40px; }
  .dropdown-panel { left: 0; transform: translateY(10px); }
  .nav-item-dropdown:hover .dropdown-panel { transform: translateY(0); }
}
</style>