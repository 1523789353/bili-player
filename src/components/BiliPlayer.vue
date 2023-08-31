<template>
    <div class="bili-player">
        <DanmakuLayer ref="danmaku" />
        <video ref="video" class="video" controls autoplay />
        <div class="panel">
            <div class="top"></div>
            <div class="bottom">
                <div class="mask"></div>
                <div class="highlight"></div>
                <div class="progress">
                    <div class="buffered"></div>
                    <div class="played"></div>
                </div>
                <div class="controls">
                    <div class="left">
                        <div class="button" :class="{ play, pause: !play }"></div>
                        <div class="time"></div>
                    </div>
                    <div class="right">
                        <div class="quality"></div>
                        <div class="playback-rate"></div>
                        <div class="subtitle"></div>
                        <div class="volume" :class="{ mute }"></div>
                        <div class="settings"></div>
                        <div v-if="false" class="picture-in-picture"></div>
                        <div v-if="false" class="wide-screen"></div>
                        <div v-if="false" class="maximize"></div>
                        <div class="fullscreen"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
/**
 * @Todo 实现 控制界面
 */
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
            play: false,
            mute: false
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
            mediaSource.addEventListener('sourceopen', () => {
                this.sourceopen(mediaSource);
            }, { once: true });
        },
        async sourceopen(mediaSource) {
            const taskPath = path.join(this.downloadDir, 'zzdownloadtaskmanagertask', 'av', this.videoInfo.avid, 'c' + this.videoInfo.cid, this.videoInfo.type);
            const videoPath = path.join(taskPath, '0.section');
            const audioPath = path.join(taskPath, '1.section');
            const danmakuPath = path.join(taskPath, `av_${this.videoInfo.avid}_c${this.videoInfo.cid}.danmaku`);
            this.$refs.danmaku.loadDanmaku(danmakuPath);

            const videoBuffer = fs.readFileSync(videoPath);
            const audioBuffer = fs.readFileSync(audioPath);

            // 创建 SourceBuffer
            const videoSourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="hev1.2.4.L93.B0"');
            const audioSourceBuffer = mediaSource.addSourceBuffer('audio/mp4; codecs="mp4a.40.2"');

            // 添加视频和音频数据到 SourceBuffer
            videoSourceBuffer.appendBuffer(new Uint8Array(videoBuffer));
            audioSourceBuffer.appendBuffer(new Uint8Array(audioBuffer));
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
            // 播放倍速同步
            this.$refs.video.addEventListener('ratechange', () => {
                this.$refs.danmaku.playbackrate = this.$refs.video.playbackRate;
                this.syncDanmaku();
            });
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
