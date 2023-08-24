<template>
    <div class="bili-player">
        <DanmakuLayer ref="danmaku" :path="danmakuPath" />
        <video ref="video" class="video" controls autoplay />
    </div>
</template>
<script>
import path from 'path';
import * as fs from 'fs-extra';
import DanmakuLayer from '@/components/DanmakuLayer';
export default {
    props: ['controls', 'autoplay', 'loop'],
    components: { DanmakuLayer },
    data() {
        return {
            get downloadDir() {
                return localStorage.getItem('downloadDir') ?? '';
            },
            videoInfo: {
                avid: '',
                cid: '',
                type: ''
            },
            danmakuPath: '', // 弹幕路径
        }
    },
    mounted() {
        this.hookEvent();
        this.$mitt.on('video-play', task => {
            this.videoInfo = {
                avid: task.meta.av_id,
                cid: task.meta.cid,
                type: task.meta.typeTag
            };
            this.load();
        })
    },
    methods: {
        load() {
            // 创建 MediaSource 对象并设置视频和音频源
            const mediaSource = new MediaSource();
            this.$refs.video.src = URL.createObjectURL(mediaSource);
            this.$refs.danmaku.reset();

            // 监听 MediaSource 的 sourceopen 事件
            this.waitEvent(mediaSource, 'sourceopen').then(() => this.sourceopen(mediaSource))
        },
        async sourceopen(mediaSource) {
            const taskPath = path.join(this.downloadDir, 'zzdownloadtaskmanagertask', 'av', this.videoInfo.avid, 'c' + this.videoInfo.cid, this.videoInfo.type);
            const videoPath = path.join(taskPath, '0.section');
            const audioPath = path.join(taskPath, '1.section');
            this.danmakuPath = path.join(taskPath, `av_${this.videoInfo.avid}_c${this.videoInfo.cid}.danmaku`);

            const videoBuffer = fs.readFileSync(videoPath);
            const audioBuffer = fs.readFileSync(audioPath);

            // 创建 SourceBuffer
            const videoSourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="hev1.2.4.L93.B0"');
            const audioSourceBuffer = mediaSource.addSourceBuffer('audio/mp4; codecs="mp4a.40.2"');

            // 添加视频和音频数据到 SourceBuffer
            videoSourceBuffer.appendBuffer(new Uint8Array(videoBuffer));
            audioSourceBuffer.appendBuffer(new Uint8Array(audioBuffer));
        },
        waitEvent(eventTarget, event) {
            return new Promise(resolve => {
                eventTarget.addEventListener(event, () => {
                    resolve();
                }, { once: true })
            })
        },
        hookEvent() {
            // 播放同步
            this.$refs.video.addEventListener('play', () => {
                this.syncDanmaku();
                this.$refs.danmaku.play();
            })
            // 暂停同步
            this.$refs.video.addEventListener('pause', () => {
                this.$refs.danmaku.pause();
                this.syncDanmaku();
            })
            // 拖动同步
            this.$refs.video.addEventListener('seeked', () => {
                this.syncDanmaku();
            })
        },
        syncDanmaku() {
            this.$refs.danmaku.seek(this.$refs.video.currentTime);
        }
    }
}
</script>
<style lang="scss">
.bili-player {
    width: 100%;
    height: 100%;
    overflow: hidden;

    .video {
        width: 100%;
        height: 100%;
        background-color: #000000;
    }
}
</style>
