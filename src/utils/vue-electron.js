import electron from 'electron';
import * as remote from '@electron/remote';

export default {
    install(app) {
        // 注册全局变量 this.$electron
        app.config.globalProperties.$electron = electron;

        // 定义getter, 简化调用
        remote.__defineGetter__('currentWebContents', remote.getCurrentWebContents);
        remote.__defineGetter__('window', remote.getCurrentWindow);
        remote.__defineGetter__('global', remote.getGlobal);

        // 注册全局变量 this.$remote
        app.config.globalProperties.$remote = remote;
    }
}
