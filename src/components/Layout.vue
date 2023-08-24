<template>
    <div id="layout" :class="{ 'win32-not-maximized': os == 'win32' && !maximized }">
        <div id="header">
            <WindowTitlebar />
        </div>
        <div id="content">
            <!-- 注意内部元素会被Windows窗口边框吞掉1px(全屏不会) -->
            <slot />
        </div>
    </div>
</template>
<script>
import WindowTitlebar from "@/components/WindowTitlebar";
export default {
    components: { WindowTitlebar },
    data() {
        return {
            os: process.platform,
            maximized: false
        }
    },
    created() {
        this.listenMaximiz();
    },
    methods: {
        listenMaximiz() {
            this.maximized = this.$remote.window.isMaximized();
            this.$remote.window.addListener('maximize', () => { this.maximized = true });
            this.$remote.window.addListener('unmaximize', () => { this.maximized = false });
        }
    }
}
</script>
<style lang="scss" scoped>
#layout {
    display: flex;
    flex-direction: column;

    width: 100vw;
    height: 100vh;

    &.win32-not-maximized {
        // Win11 下非全屏会有1px边框, 此处占位防止内容被边框吞掉
        border: 1px solid transparent;
        box-sizing: border-box;
    }

    background-color: #FFFFFF;
    overflow: hidden;

    #content {
        flex-grow: 1;
        overflow: auto;

        &::-webkit-scrollbar {
            padding-bottom: 12px;
        }
    }
}
</style>
