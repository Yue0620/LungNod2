import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import SampleRes from '../views/SampleRes.vue'
import StatsAnalysis from '../views/StatsAnalysis.vue'
import GeneNetwork from '../views/GeneNetwork.vue'

const routes = [
    { path: '/', name: 'Home', component: Home },
    { path: '/samples', name: 'SampleRes', component: SampleRes },
    { path: '/analysis', name: 'Analysis', component: StatsAnalysis },
    {
        path: '/genenetwork',
        name: 'GeneNetwork',
        component: GeneNetwork
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router