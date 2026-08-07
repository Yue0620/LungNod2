import request from './config'

export function fetchStats() {
    return request({ url: '/stats', method: 'get' })
}

// 根据 stage 获取样本列表
export function fetchSamples(stageId) {
    return request({
        url: '/samples',
        method: 'get',
        params: { stage: stageId }
    })
}

// 获取数据库数据（支持多种过滤条件）
export function fetchLungData(params) {
    return request({
        url: '/data',
        method: 'get',
        params
    })
}

// 获取数据集详情（按内部 projectId + datasetId 精确查询）
export function fetchDataDetail(projectId, datasetId) {
    return request({
        url: '/data/detail',
        method: 'get',
        params: { projectId, datasetId }
    })
}

// 获取所有项目列表
export function fetchAllProjects() {
    return request({
        url: '/data/projects',
        method: 'get'
    })
}

// 获取肺结节样本数据（lungnod_sample表）
export function fetchNodeSamples(params) {
    return request({
        url: '/node-samples',
        method: 'get',
        params
    })
}

export function fetchAnalysisStats() {
    return request({
        url: '/analysis/stats',
        method: 'get'
    })
}