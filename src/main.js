import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 1. 引入 Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 2. 引入所有图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 3. 注册所有图标 (必须在 app.use 之前或之后，但要在 mount 之前)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

app.use(ElementPlus) // 这是解决 Failed to resolve component 的关键
app.use(router)
app.mount('#app')