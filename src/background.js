'use strict'

import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-assembler';
// 已弃用, 不再维护
// import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import * as remote from '@electron/remote/main';

const isDevelopment = process.env.NODE_ENV !== 'production'

// 初始化 remote 模块
remote.initialize();

// Scheme 必须在 app ready前注册
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true } }
])

// 禁用Windows窗口缩放
app.commandLine.appendSwitch('high-dpi-support', 1)
app.commandLine.appendSwitch('force-device-scale-factor', 1)

async function createWindow() {
    // 创建浏览器窗口
    const win = new BrowserWindow({
        width: 1225,
        height: 720,
        minWidth: 800,
        minHeight: 450,
        icon: './src/assets/logo.png',
        frame: false,
        show: false, // 初始化尚未完成, 隐藏窗口
        webPreferences: {
            // 允许在渲染进程中使用nodejs, 请前往vue.config.js中配置
            // 详见 nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration
            nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
            contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
            // 允许在渲染进程中使用 remote 模块
            enableRemoteModule: true,
        }
    })

    // 将窗口实例注册到 remote 模块中
    remote.enable(win.webContents);

    // 隐藏菜单栏
    win.setMenu(null);

    // 指定窗口加载的页面
    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // 在开发模式下加载dev server的url
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
        if (!process.env.IS_TEST) win.webContents.openDevTools()
    } else {
        createProtocol('app')
        // 在非开发模式下加载index.html
        win.loadURL('app://./index.html')
    }

    // 窗口准备好时触发显示
    win.on('ready-to-show', () => {
        // 显示窗口
        win.show()
        // 前台显示
        win.focus()
    })
}

// 当所有窗口关闭时退出程序.
app.on('window-all-closed', () => {
    // 在macOS上, 应用程序和菜单栏是分开的, 通常应用程序和菜单栏是一起退出的
    // 为了保持活动状态, 直到用户使用 Cmd + Q 显式退出
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // 在macOS上, 当点击dock图标并且没有其他窗口打开时, 通常会重新创建一个窗口
    // 在其他平台上, 当窗口关闭时退出程序
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// 这个方法会在Electron完成初始化并且准备好创建浏览器窗口时调用
// 一些API只能在这个事件发生后使用
app.on('ready', async () => {
    if (isDevelopment && !process.env.IS_TEST) {
        // 安装 Vue Devtools
        try {
            await installExtension(VUEJS_DEVTOOLS)
        } catch (e) {
            console.error('Vue Devtools 安装失败:', e.toString())
        }
    }
    createWindow()
})


// 在开发模式下, 从父进程退出时清除
if (isDevelopment) {
    if (process.platform === 'win32') {
        process.on('message', (data) => {
            if (data === 'graceful-exit') {
                app.quit()
            }
        })
    } else {
        process.on('SIGTERM', () => {
            app.quit()
        })
    }
}
