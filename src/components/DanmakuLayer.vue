<template>
    <div class="danmaku-layer"
        :class="{ paused }"
        :style="{
            '--container-width': `${containerRect.width}px`,
            '--container-height': `${containerRect.height}px`,
            '--playbackrate': playbackrate,
            '--danmaku-font-size': danmakuStyle.fontSize,
            '--danmaku-font-weight': danmakuStyle.fontWeight,
            '--danmaku-text-stroke': danmakuStyle.textStroke,
            '--danmaku-opacity': danmakuStyle.opacity,
        }">
        <div class="danmaku" style="opacity: 0;">测试弹幕</div>
        <div class="danmaku roll"
            v-for="danmaku in danmakuOnScreen"
            :key="danmaku.index"
            :style="{
                '--channel-top': `${danmaku.channelTop}px`,
                '--danmaku-width': `${danmaku.width}px`,
                '--timeleft': `${danmaku.timeleft}s`,
                '--progress': danmaku.progress,
                '--color': danmaku.color
            }">
            {{ danmaku.text }}
        </div>
    </div>
</template>
<script>
/**
 * @Todo 实现 底端弹幕、顶端弹幕
 * @Todo 优化 代码可读性 、健壮性
 */
import * as fs from 'fs-extra';
export default {
    data() {
        return {
            containerRect: {
                width: 0,
                height: 0,
            },
            canvasContext: document.createElement('canvas').getContext('2d'), // 创建canvas, 用于测量文字宽度
            playbackrate: 1,
            danmakuDuration: 10, // 弹幕持续时间, 调整速度用
            danmakuStyle: { // 弹幕样式
                fontSize: 32, // px
                fontWeight: 'bold',
                textStroke: '',
                opacity: 0.5
            },
            danmakuList: [], // 弹幕列表, 存放所有弹幕, 按时间排列, index越小时间越早
            danmakuOnScreen: [],

            danmakuHeight: 0, // 弹幕高度, 用于计算最大通道数
            channelMax: 0, // 最大通道数
            danmakuChannels: {}, // 弹幕通道
            channelSpare: 10, // 弹幕通道间距(px)

            currentTime: 0, // 当前播放时间
            renderIndex: 0, // 渲染索引, 指向下一个要渲染的弹幕
            renderTimer: 0, // 渲染计时器
            lastRenderTime: 0, // 上一次渲染时间
            paused: true
        }
    },
    // 需要操作元素, 所以在mounted中完成初始化
    mounted() {
        this.init();
        window.getTextWidth = this.getTextWidth;
    },
    methods: {
        init() {
            // 监听窗口大小变化
            window.addEventListener('resize', this.resize);
            // 立即更新
            this.resize();
        },
        resize() {
            // 更新弹幕容器大小
            this.containerRect = this.$el.getBoundingClientRect();

            // 动态更新样式
            this.reactiveFontStyle();
            // 获取测试弹幕样式
            let testDanmaku = this.$el.firstElementChild
            let testDanmakuStyle = getComputedStyle(testDanmaku);
            // 传递给 canvas, 用于计算文本宽高
            this.canvasContext.font = testDanmakuStyle.font;
            this.danmakuHeight = parseInt(testDanmakuStyle.height.slice(0, -2)) + 4;
            // 根据文本高度计算弹道
            this.channelMax = Math.floor(this.containerRect.height / (this.danmakuHeight + this.channelSpare)); // 最大通道数
            for (let i = 0; i < this.channelMax; i++) {
                if (!Number.isInteger(this.danmakuChannels[i])) {
                    this.danmakuChannels[i] = 0;
                }
            }
        },
        // danmaku文件解析: https://blog.csdn.net/bigbigsman/article/details/78639053
        loadDanmaku(path) {
            // 检测文件是否能读取
            if (!fs.existsSync(path)) {
                console.warn('加载弹幕失败, 弹幕文件不存在!');
                return;
            }

            // 重置弹幕
            this.pause();
            this.reset();

            // 读取弹幕文件
            let text = fs.readFileSync(path);
            // 解析xml
            let danmakuDoc = this.XMLparse(text);
            // 获取弹幕列表
            let danmakuElems = danmakuDoc.querySelectorAll('d');
            let danmakuList = [];
            // XML doc 转 json
            for (let danmakuElem of danmakuElems) {
                let attrs = danmakuElem.getAttribute('p');
                let [time, type, fontSize, color, timestamp, pool, uid, rowId] = attrs.split(',');
                let danmaku = {
                    time: parseFloat(time), // 弹幕出现时间(s)
                    type: parseInt(type), // 弹幕类型 (1..3 滚动弹幕 4底端弹幕 5顶端弹幕 6.逆向弹幕 7精准定位 8高级弹幕)
                    fontSize: parseInt(fontSize), // 12非常小,16特小,18小,25中,36大,45很大,64特别大
                    color: '#' + parseInt(color).toString(16).padStart(6, 0), // 弹幕颜色
                    timestamp: parseInt(timestamp), // 发送时间戳
                    pool: parseInt(pool), // 弹幕池 (0普通池 1字幕池 2特殊池(高级弹幕))
                    uid: parseInt(uid), // 发送者用户id
                    rowId: rowId, // 历史弹幕id
                    text: danmakuElem.innerHTML, // 弹幕文本
                    width: this.getTextWidth(danmakuElem.innerHTML), // 弹幕宽度
                    // 动态赋值
                    channel: -1, // 弹幕轨道
                    channelTop: 0, // 弹幕轨道顶部位置
                    timeleft: 0,
                    progress: 0,
                    enterTime: 0,
                };
                danmakuList.push(danmaku);
            }
            // 弹幕按时间排序
            danmakuList.sort((d1, d2) => d1.time - d2.time);
            // 给每个弹幕上 index
            for (let index in danmakuList) {
                let danmaku = danmakuList[index];
                danmaku.index = index;
            }
            // 保存弹幕列表
            this.danmakuList = danmakuList;
        },
        // XML序列化
        XMLparse(string) {
            let parser = new DOMParser()
            let xmlDoc = parser.parseFromString(string, 'text/xml')
            return xmlDoc
        },
        // XMLstringify(xmlDoc) {
        //     let serializer = new XMLSerializer()
        //     let xmlString = serializer.serializeToString(xmlDoc)
        //     return xmlString
        // },
        reactiveFontStyle() {
            // 字体缩放倍率
            let fontScale = 0.8;
            let containerHeight = this.containerRect.height;
            // 分辨率:字体大小 规则
            let rules = [
                { min: 0, max: 320, get fontSize() { return 16; } }, // 高度在320px以下时固定16px字体
                { min: 320, max: 500, get fontSize() { return (containerHeight * 0.0385 + 3.3) * fontScale; } }, //3.29
                { min: 500, max: 620, get fontSize() { return (containerHeight * 0.0428 + 0.92) * fontScale; } }, // 0.9167
                { min: 620, max: Infinity, get fontSize() { return (containerHeight * 0.022 + 12) * fontScale } }, // 12
            ];
            // 匹配规则
            let matchedRule = rules.find(rule => rule.min <= containerHeight && containerHeight < rule.max);
            let fontSize = matchedRule.fontSize;
            // 修改字体大小
            this.danmakuStyle.fontSize = `${fontSize}px`;

            // 生成内外两圈描边
            let innerTextStroke = Math.max(fontSize * 0.065, 1.35); // 内层黑色描边, 最低1px宽度
            let outerTextStroke = innerTextStroke * 1.55; // 外层白色描边
            this.danmakuStyle.textStroke = [this.genTextStroke('#000000', innerTextStroke),
            this.genTextStroke('#FFFFFF', outerTextStroke),
                '2px 2px 4px #000000',
                '0 0 16px #000000'
            ].join(',');
        },
        // 生成文本描边
        genTextStroke(color, width) {
            let textStroke = {
                shadows: [],
                add(h, v, blur, color) {
                    this.shadows.push([this.num2px(h), this.num2px(v), this.num2px(blur), color].join(' '));
                },
                num2px(num, maxLen = 4) {
                    const factor = Math.pow(10, maxLen);
                    const formatted = Math.round(num * factor) / factor;
                    if (formatted == 0) return '0';
                    return formatted + 'px';
                },
                toString() {
                    return Array.from(new Set(this.shadows)).join(', ');
                }
            };
            // 虚化半径, 抗锯齿
            let blur = 0.5;

            // 基础阴影
            textStroke.add(0, -width, blur, color); // 上
            textStroke.add(width, 0, blur, color); // 右
            textStroke.add(0, width, blur, color); // 下
            textStroke.add(-width, 0, blur, color); // 左

            // { '无': 0, '低': 1, '中': 2, '高': 4}
            let level = 1;
            // 字体阴影的数量 (向上取整是为了均匀分布)
            let amount = Math.ceil(width * Math.PI * level);
            for (var i = 0; i < amount; i++) { // 在 amount 个方向上均匀分布
                let theta = Math.PI * 2 * i / amount; // 2 pi等于360°, 按百分比取角度
                let delta_x = width * Math.sin(theta); // x轴偏移量
                let delta_y = width * Math.cos(theta); // y轴偏移量
                textStroke.add(delta_x, delta_y, blur, color);
            }

            return textStroke.toString();
        },
        // 如果将danmaku制作成子组件, 就可以在mounted中获取到更准确的宽度
        getTextWidth(text) {
            return this.canvasContext.measureText(text).width;
        },
        reset() {
            // 暂停弹幕播放
            this.pause();
            // 情况清空弹幕
            this.danmakuList = [];
            this.danmakuOnScreen = [];
            // 清空轨道
            for (let i in this.danmakuChannels) {
                this.danmakuChannels[i] = 0;
            }
            // 重置状态
            this.currentTime = 0;
            this.renderIndex = 0;
        },
        play() {
            this.paused = false;
            this.lastRenderTime = performance.now();
            this.renderTimer = requestAnimationFrame(this.render);
        },
        render() {
            let now = performance.now();
            let timeDiff = now - this.lastRenderTime;
            timeDiff *= this.playbackrate;
            this.currentTime += timeDiff / 1000;

            this.clearChannels();

            // 检查单帧时间内出现的弹幕, 塞入 danmakuOnScreen
            for (let i = this.renderIndex; i < this.danmakuList.length; i++) {
                let danmaku = this.danmakuList[i];
                this.renderIndex = i;
                // 只检查 [0, this.currentTime] 之间的弹幕
                if (danmaku.time > this.currentTime)
                    break;
                // 跳过 [0, this.currentTime - timeDiff] 之间的弹幕
                if (danmaku.time < this.currentTime - timeDiff)
                    continue;
                this.placeDanmaku(danmaku, this.currentTime);
                this.allocateChannel(danmaku);

                this.danmakuOnScreen.push(danmaku);
            }

            // 清除过期弹幕
            while (this.danmakuOnScreen[0] !== undefined && (this.danmakuOnScreen[0].time < this.currentTime - this.danmakuDuration)) {
                this.danmakuOnScreen.shift(1);
            }

            this.lastRenderTime = now;
            // 检查渲染终止
            if (this.paused)
                return;
            this.renderTimer = requestAnimationFrame(this.render);
        },
        pause() {
            this.paused = true;
            cancelAnimationFrame(this.renderTimer);
        },
        seek(time) {
            // 允许误差0.5s
            if (Math.abs(time - this.currentTime) < 0.5)
                return;
            // 清空轨道
            for (let i in this.danmakuChannels) {
                this.danmakuChannels[i] = 0;
            }

            // seek时默认暂停, render函数不会运行, 需要手动更新屏幕上的弹幕
            let danmakuOnScreen = [];
            // 遍历弹幕列表, 加入弹幕
            for (let i = 0; i < this.danmakuList.length; i++) {
                let danmaku = this.danmakuList[i];
                // 记录弹幕索引, 指向下一个要渲染的弹幕
                this.renderIndex = i;

                // 只检查 [0, time] 之间的弹幕
                if (time < danmaku.time)
                    break;
                // 跳过 [0, time - this.danmakuDuration] 之间的弹幕
                if (danmaku.time < time - this.danmakuDuration)
                    continue;

                this.currentTime = danmaku.time;
                this.placeDanmaku(danmaku, time);
                this.allocateChannel(danmaku);

                // 清理弹幕轨道
                // 不能用 clearChannels(), 因为尚未应用到 this.danmakuOnScreen
                // 检查弹幕是否进入屏幕. 由于进入时间由弹幕长度确定(无序), 所以需要遍历所有弹幕
                for (let danmaku of danmakuOnScreen) {
                    if (0 < danmaku.enterTime && danmaku.enterTime < this.currentTime) {
                        if (this.danmakuChannels[danmaku.channel] > 0) {
                            this.danmakuChannels[danmaku.channel]--;
                        }
                        danmaku.enterTime = 0;
                    }
                }

                danmakuOnScreen.push(danmaku);
            }

            this.currentTime = time;
            this.danmakuOnScreen = danmakuOnScreen;
        },
        // 定位弹幕
        placeDanmaku(danmaku, time) {
            let timeused = time - danmaku.time;
            danmaku.timeleft = this.danmakuDuration - timeused;
            danmaku.progress = timeused / this.danmakuDuration;
            let speed = (danmaku.width + this.containerRect.width) / this.danmakuDuration;
            // 弹幕尾部进入屏幕的时间
            danmaku.enterTime = danmaku.time + danmaku.width / speed + 1;
        },
        // 给弹幕分配发射轨道
        allocateChannel(danmaku) {
            // 寻找轨道
            let targetChannel = 0; // 弹幕通道
            let targetCount = this.danmakuChannels[0]; // 弹幕通道的弹幕数量
            // 遍历通道, 找到弹幕数量最少的通道
            for (let i in this.danmakuChannels) {
                if (i >= this.channelMax)
                    break;
                let channelCount = this.danmakuChannels[i];
                if (channelCount < targetCount) {
                    targetChannel = i;
                    targetCount = channelCount;
                }
            }
            // 将弹幕放入通道
            danmaku.channel = targetChannel;
            danmaku.channelTop = targetChannel * (this.danmakuHeight + this.channelSpare);
            this.danmakuChannels[targetChannel] = targetCount + 1;
        },
        // 清理弹幕轨道
        clearChannels() {
            // 检查弹幕是否进入屏幕. 由于进入时间由弹幕长度确定(无序), 所以需要遍历所有弹幕
            for (let danmaku of this.danmakuOnScreen) {
                if (0 < danmaku.enterTime && danmaku.enterTime < this.currentTime) {
                    if (this.danmakuChannels[danmaku.channel] > 0) {
                        this.danmakuChannels[danmaku.channel]--;
                    }
                    danmaku.enterTime = 0;
                }
            }
        }
    }
}
</script>
<style lang="scss" scoped>
.danmaku-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
    z-index: 1;

    color: #ffffff;
    pointer-events: none;

    @keyframes roll {
        0% {
            transform: translateX(calc(var(--container-width) - calc(var(--container-width) + var(--danmaku-width)) * var(--progress)));
        }

        to {
            // 出屏幕4px再停止动画
            transform: translateX(calc(-100% - 4px));
        }
    }

    .danmaku.roll {
        position: absolute;
        top: var(--channel-top);
        color: var(--color);
        opacity: var(--danmaku-opacity);
        font-size: var(--danmaku-font-size);
        font-weight: var(--danmaku-font-weight);
        text-shadow: var(--danmaku-text-stroke);
        animation: roll linear calc(var(--timeleft) / var(--playbackrate)) forwards;
        // text-rendering: optimizeSpeed;
    }

    &.paused>.danmaku.roll {
        animation-play-state: paused !important;
    }
}
</style>
