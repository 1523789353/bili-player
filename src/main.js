import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 导入electron
import VueElectron from '@/utils/vue-electron'
// 导入 mitt
import VueMitt from '@/utils/vue-mitt'
// 导入自定义模块 use-local
import LocalRes from '@/utils/local-res'
// import NativeMixin from '@/utils/native-mixin'

const app = createApp(App)
app.use(router)
app.use(VueElectron)
app.use(VueMitt)
app.use(LocalRes)
// app.use(NativeMixin)
app.mount('#app')
