import mitt from 'mitt'

export default {
    install(app) {
        // 注册全局变量 this.$mitt
        app.config.globalProperties.$mitt = mitt();
    }
}
