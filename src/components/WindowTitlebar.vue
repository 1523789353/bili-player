<template>
    <!-- 使用此组件时请注意, 启用窗口透明将导致全屏相关的功能异常 -->
    <!-- See: https://github.com/electron/electron/pull/28207 -->
    <div id="titlebar" :class="{ focus }">
        <div id="spare">
            <div id="title">{{ title }}</div>
        </div>
        <div id="button-group">
            <div
                class="button settings"
                @click="settings">
                <span class="icon-material">settings</span>
            </div>
            <div
                class="button minimize"
                @click="minimizeWindow">
                <span class="icon-material">minimize</span>
            </div>
            <div
                class="button maximize"
                @click="maximizeWindow">
                <span class="icon-material">crop_square</span>
            </div>
            <div
                class="button close"
                @click="closeWindow">
                <span class="icon-material">close</span>
            </div>
        </div>
    </div>
</template>
<script>
import { injectNative } from '@/utils/hook';
export default {
    data() {
        return {
            ...injectNative(this)('title', document, 'title'),
            focus: true,
        }
    },
    created() {
        this.listenFocus();
    },
    methods: {
        listenFocus() {
            this.focus = this.$remote.window.isFocused();
            window.addEventListener('focus', () => { this.focus = true });
            window.addEventListener('blur', () => { this.focus = false });
        },
        minimizeWindow() {
            this.$remote.window.minimize();
        },
        maximizeWindow() {
            // 切换最大化状态
            if (this.$remote.window.isMaximized()) {
                this.$remote.window.unmaximize();
            } else {
                this.$remote.window.maximize();
            }
        },
        closeWindow() {
            this.$remote.window.close();
        },
        settings() {
            this.$mitt.emit('toggle-setting');
        }
    }
}
</script>
<style lang="scss" scoped>
#titlebar {
    position: sticky;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    width: 100%;
    height: 30px;

    user-select: none;
    -webkit-user-drag: none;

    // 失去焦点时标题栏背景色 (默认)
    background-color: hsl(0, 0%, 90%);
    transition: background-color .4s ease-in-out;


    // 获得焦点时标题栏背景色
    &.focus {
        // background-color: hsl(0, 0%, 85%);
        background-color: hsl(340, 100%, 80%);
    }

    // 左侧可拖动区域
    #spare {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        padding-left: 8px;
        flex-grow: 1;
        -webkit-app-region: drag;

        #title {
            height: 16px;
            font-size: 12px;
            overflow: hidden;
        }
    }

    // 右侧按钮组
    #button-group {
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        -webkit-app-region: nodrag;

        .button {
            position: relative;
            // Win11 默认按钮 58px*36px
            width: 55px;
            height: 30px;
            text-align: center;
            transition: background-color .2s ease;
            background-color: transparent;
            -webkit-app-region: no-drag;

            &:hover {
                transition: background-color .2s ease;
                background-color: rgba(0, 0, 0, .15);
            }



            &.settings {
                .icon-material {

                    font-size: 18px;
                    line-height: 30px;
                    transform: none;
                    transition: transform 0.3s ease;
                }

                &:hover {
                    .icon-material {
                        transform: rotate(120deg);
                    }
                }
            }

            &.minimize {
                .icon-material {
                    line-height: 16px;
                    font-size: 22px;
                }
            }

            &.maximize {
                .icon-material {
                    line-height: 30px;
                    font-size: 14px;
                }
            }

            &.close {
                .icon-material {
                    line-height: 30px;
                    font-size: 18px;
                }

                &:hover {
                    background-color: #c42b1c;
                }
            }
        }
    }
}
</style>
@/utils/hook
