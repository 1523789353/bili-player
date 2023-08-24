<template>
    <Layout>
        <router-view />
    </Layout>
</template>
<script>
import Layout from "@/components/Layout.vue";
export default {
    components: { Layout },
    created() {
        document.title = "哔哩哔哩-播放器"
        // 全局监听 Ctrl+R, 刷新页面
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                window.location.reload();
            }
        });
    },
    mounted() {
        console.log('App Lunched.');
    }
}
</script>
<style lang="scss">
body {
    padding: 0;
    margin: 0;
}

* {
    &::-webkit-scrollbar-thumb {
        border-radius: 4px;
        background-color: rgba($color: #ffffff, $alpha: 0.3);

        &:hover {
            background-color: rgba($color: #ffffff, $alpha: 0.5);
        }
    }

    &::-webkit-scrollbar {
        width: 8px;
        height: 8px;
        background-color: transparent;
    }
}


/* 谷歌 Material Symbols Outlined 字体 */
@font-face {
    font-family: 'Material Symbols Outlined';
    font-style: normal;
    font-weight: 400;
    src: url("@/assets/Material Symbols Outlined.woff2") format('woff2');
}

.material-symbols-outlined,
.icon-material {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
}
</style>
