export function injectNative(scope) {
    return function bind(key, target, prop) {
        // 防止重复 hook 的 tag
        const tag = Symbol.for(`${prop}-scope`);
        let lastScope = target[tag];
        if (lastScope !== undefined) {
            // devserver 热重载时切换上下文
            target[tag] = scope;
            // 继承值并注入data; 为防止重复注入, 直接返回
            return { [key]: lastScope[key] };
        }

        // 保存 vue 实例
        target[tag] = scope;
        // hook 对象
        const getter = target.__lookupGetter__(prop);
        const setter = target.__lookupSetter__(prop);

        Object.defineProperty(target, prop, {
            get: getter.bind(target),
            set(value) {
                // 更新 vue 实例中的值
                target[tag][key] = value;
                setter.call(target, value);
            }
        });

        // 函数绑定初始值, 在data中使用展开运算符, 就能够把初始值注入到data中
        bind[key] = target[prop];

        // 直接返回函数
        return bind;
    }
}

export default {
    injectNative
}
