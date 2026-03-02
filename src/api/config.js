import axios from 'axios'

// 创建 axios 实例
const service = axios.create({
  // 在开发环境中，vite 会代理 /api 请求到 http://localhost:8010
  baseURL: '/api', 
  timeout: 5000 // 请求超时时间
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 在这里可以添加 token 等请求头
    // if (store.getters.token) {
    //   config.headers['X-Token'] = getToken()
    // }
    return config
  },
  error => {
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    // 这里可以根据后端的响应结构进行统一处理
    // 例如：如果 res.code !== 200，则提示错误
    return res
  },
  error => {
    console.log('err' + error) // for debug
    return Promise.reject(error)
  }
)

export default service
