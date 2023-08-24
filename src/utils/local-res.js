import * as fs from 'fs-extra';
function localRes(path, config) {
    // 读取文件内容
    const data = fs.readFileSync(path);
    // 创建 Blob 对象
    const blob = new Blob([data], config);
    // 生成 Blob URL
    const blobUrl = URL.createObjectURL(blob);
    return blobUrl;
}

export default {
    install(app) {
        // 注册全局变量
        app.config.globalProperties.$localRes = localRes;
    }
}
