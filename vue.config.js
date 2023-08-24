const path = require('path')
module.exports = {
    configureWebpack: {
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src')
            }
        }
    },
    pluginOptions: {
        productName: "哔哩哔哩-播放器", //应用名称,
        electronBuilder: {
            // 允许在渲染进程中使用nodejs
            nodeIntegration: true,
            // 解决打包后资源路径定位错误
            customFileProtocol: "./"
        },
        win: {
            icon: './src/assets/icons/icon.ico' //打包windows版本的logo
        },
        nsis: {
            allowToChangeInstallationDirectory: true,
            oneClick: false,
            installerIcon: "./src/assets/icons/icon.ico", //安装logo
            installerHeaderIcon: "./src/assets/icons/icon.ico" //安装logo
        }
    }
}
