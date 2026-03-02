import request from './config'

export function fetchStats() {
    return request({ url: '/stats', method: 'get' })
}

// 新增：根据 stage 获取样本列表
export function fetchSamples(stageId) {
    return request({
        url: '/samples',
        method: 'get',
        params: { stage: stageId }
    })
}

export function fetchAnalysisStats() {
    return request({
        url: '/analysis/stats',
        method: 'get'
    })
}