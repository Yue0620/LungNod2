import { ref } from 'vue'

// 1. 初始化当前语言，优先读取浏览器本地缓存
export const currentLang = ref(localStorage.getItem('lungnod_lang') || 'zh')

// 2. 暴露一个切换语言的方法
export const toggleLang = () => {
    currentLang.value = currentLang.value === 'zh' ? 'en' : 'zh'
    // 存入缓存，刷新不丢失
    localStorage.setItem('lungnod_lang', currentLang.value)
}