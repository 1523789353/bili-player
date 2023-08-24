import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'root',
        redirect: { name: 'home' }
    },
    {
        path: '/home',
        name: 'home',
        component() {
            return import('@/views/Home.vue');
        }
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router
