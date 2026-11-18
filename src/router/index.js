import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import SampleRes from '../views/SampleRes.vue'
import DataSearch from '../views/DataSearch.vue'
import SampleSearch from '../views/SampleSearch.vue'
import StatsAnalysis from '../views/StatsAnalysis.vue'
import GeneNetwork from '../views/GeneNetwork.vue'
import Standards from '../views/Standards.vue'
import DataDetail from '../views/DataDetail.vue'
import TcrRepertoire from '../views/TcrRepertoire.vue'

const routes = [
    { path: '/', name: 'Home', component: Home },
    { path: '/samples', name: 'SampleRes', component: SampleRes },
    { path: '/data-search', name: 'DataSearch', component: DataSearch },
    { path: '/data-detail/:projectId/:datasetId', name: 'DataDetail', component: DataDetail },
    { path: '/sample-search', name: 'SampleSearch', component: SampleSearch },
    { path: '/analysis', name: 'Analysis', component: StatsAnalysis },
    { path: '/tcr-repertoire', name: 'TcrRepertoire', component: TcrRepertoire },
    { path: '/standards', name: 'Standards', component: Standards },
    {
        path: '/genenetwork',
        name: 'GeneNetwork',
        component: GeneNetwork
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router