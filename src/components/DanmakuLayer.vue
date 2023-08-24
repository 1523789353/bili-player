<template>
    <div class="danmaku-layer"
        :class="{ paused }"
        :style="{
            '--container-width': `${containerRect.width}px`,
            '--container-height': `${containerRect.height}px`,
            '--danmaku-font-size': danmakuStyle.fontSize,
            '--danmaku-font-weight': danmakuStyle.fontWeight,
        }">
        <div class="danmaku"
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
import * as fs from 'fs-extra';
export default {
    props: ['path'],
    data() {
        return {
            containerRect: {
                width: 0,
                height: 0,
            },
            canvasContext: document.createElement('canvas').getContext('2d'), // 创建canvas, 用于测量文字宽度
            danmakuDuration: 10, // 弹幕持续时间, 调整速度用
            danmakuStyle: { // 弹幕样式
                fontSize: '32px',
                fontWeight: 'bold',
            },
            danmakuList: [], // 弹幕列表, 存放所有弹幕, 按时间排列, index越小时间越早
            danmakuOnScreen: [{ // 当前屏幕上的弹幕, 按时间排列, index越小时间越早
                index: -1,
                time: 0,
                fontSize: 25,
                color: 'rgba(0, 0, 0, 0)',
                text: '测试弹幕',
                channel: -1,
                channelTop: 0,
                timeleft: 0,
                progress: 0,
                enterTime: 0,
            }],

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
    mounted() {
        // 需要操作元素, 所以在mounted中初始化
        this.init();
    },
    methods: {
        init() {
            // 获取测试弹幕样式
            let testDanmaku = this.$el.firstElementChild
            let testDanmakuStyle = getComputedStyle(testDanmaku);
            this.canvasContext.font = testDanmakuStyle.font;
            this.danmakuHeight = parseInt(testDanmakuStyle.height.slice(0, -2));

            // 移除测试弹幕
            this.danmakuOnScreen = [];

            // 监听窗口大小变化
            window.addEventListener('resize', this.resize);
            // 立即更新
            this.resize();
        },
        resize() {
            this.containerRect = this.$el.getBoundingClientRect();
            this.channelMax = Math.floor(this.containerRect.height / (this.danmakuHeight + this.channelSpare)); // 最大通道数
            for (let i = 0; i < this.channelMax; i++) {
                if (!Number.isInteger(this.danmakuChannels[i])) {
                    this.danmakuChannels[i] = 0;
                }
            }
        },
        getTextWidth(text) {
            let { width } = this.canvasContext.measureText(text);
            return width;
        },
        // danmaku文件解析: https://blog.csdn.net/bigbigsman/article/details/78639053
        loadDanmaku() {
            // 检测文件是否能读取
            if (!fs.existsSync(this.path)) {
                console.warn('加载弹幕失败, 弹幕文件不存在!');
                return;
            }

            // 重置弹幕
            this.reset();

            // 读取弹幕文件
            let text = fs.readFileSync(this.path);
            // 解析xml
            let danmakuDoc = this.XMLparse(text);
            // 获取弹幕列表
            let danmakuElems = danmakuDoc.querySelectorAll('d');
            let danmakuList = [];
            // XML doc 转 json
            for (let danmakuElem of danmakuElems) {
                let attrs = danmakuElem.getAttribute('p');
                // 391.11800,1,25,16777215,1680701402,0,ef87b767,1288575775670691328,10
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
        reset() {
            this.pause();
            this.danmakuList = [];
            this.danmakuOnScreen = [];
            for (let i of Object.keys(this.danmakuChannels)) {
                this.danmakuChannels[i] = 0;
            }
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
            while (this.danmakuOnScreen[0].time < this.currentTime - this.danmakuDuration) {
                this.danmakuOnScreen.shift(1);
            }

            this.lastRenderTime = now;
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
            for (let i of Object.keys(this.danmakuChannels)) {
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
            danmaku.enterTime = danmaku.time + danmaku.width / speed;
        },
        // 给弹幕分配发射轨道
        allocateChannel(danmaku) {
            // 寻找轨道
            let targetChannel = 0; // 弹幕通道
            let targetCount = this.danmakuChannels[0]; // 弹幕通道的弹幕数量
            // 遍历通道, 找到弹幕数量最少的通道
            for (let i in this.danmakuChannels) {
                if (i > this.channelMax)
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
    },
    watch: {
        path() {
            this.loadDanmaku();
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
            transform: translateX(calc(-1 * var(--danmaku-width)));
        }
    }

    .danmaku {
        position: absolute;
        top: var(--channel-top);
        color: var(--color);
        font-size: var(--danmaku-font-size);
        font-weight: var(--danmaku-font-weight);
        animation: roll linear var(--timeleft) forwards;
        text-rendering: optimizeSpeed;
    }

    &.paused>.danmaku {
        animation-play-state: paused !important;
    }
}
</style>
