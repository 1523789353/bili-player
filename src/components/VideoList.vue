<template>
    <div class="video-list" :class="{ show }">
        <div class="move-panel">
            <div class="select-dir">
                <div class="left">
                    <span class="dir">当前目录: {{ downloadDir || '[无]' }}</span>
                </div>
                <div class="right" @click="selectDir">
                    <span class="icon-material">border_color</span>
                </div>
            </div>
            <div class="content">
                <VideoCollection v-for="videoList in videoLists" :key="videoList.title" :list="videoList" />
            </div>
        </div>
    </div>
</template>
<script>
import * as fs from 'fs-extra';
import path from 'path';
import VideoCollection from '@/components/VideoCollection';
export default {
    components: { VideoCollection },
    data() {
        return {
            get downloadDir() {
                return localStorage.getItem('downloadDir') ?? '';
            },
            set downloadDir(value) {
                if (value === undefined) {
                    localStorage.removeItem('downloadDir');
                    return;
                }
                localStorage.setItem('downloadDir', value);
            },
            /**
             * @type {Array<{
                    title: string,
                    cover: string,
                    time: number, // 开始下载的时间
                    videos: Array<{
                        index: number,
                        avid: number,
                        task: Task // task文件内容
                    }>
                }>}
             */
            videoLists: [],
            show: true
        }
    },
    created() {
        this.$mitt.on('toggle-setting', () => this.show = !this.show)
        if (this.downloadDir) {
            this.loadData();
        } else {
            this.selectDir();
        }
    },
    methods: {
        async selectDir() {
            let result = await this.$remote.dialog.showOpenDialog({ properties: ['openDirectory'] })
            if (result.canceled)
                return;
            this.downloadDir = result.filePaths[0];
            this.loadData();
        },
        async loadData() {
            let result = await fs.readdir(this.downloadDir);
            // zzdownloaddramafile              视频合集信息目录
            // zzdownloadtaskmanagertask        下载的视频/音频/封面/弹幕
            // zzdownloadtaskmanagertaskfile    视频下载任务目录, 包含视频 metadata
            if (result.join(',') !== 'zzdownloaddramafile,zzdownloadtaskmanagertask,zzdownloadtaskmanagertaskfile')
                console.error('下载目录不正确, 解析失败!');
            await this.loadDramas();
        },
        // 加载合集信息
        async loadDramas() {
            let dramaDir = path.join(this.downloadDir, 'zzdownloaddramafile');
            // avid 到 合集中单个视频的映射, 用于快速匹配视频
            const avMap = { /* [avid]: videoList.videos[?] */ };
            const videoLists = [];
            for (let dramaFilename of await fs.readdir(dramaDir)) {
                let dramaFilepath = path.join(dramaDir, dramaFilename);
                let dramaFile = await fs.readFile(dramaFilepath, { encoding: 'utf-8' });
                let drama = JSON.parse(dramaFile);
                // drama 转 videoList
                let videoList = {
                    type: 'drama', // 测试用
                    title: drama.title,
                    videos: []
                }
                // drama.avArr 转换为 videoList.videos
                for (let av of drama.avArr) {
                    let video = { index: av.sectionIdx, avid: av.avid };
                    // 放入 map, 以便后续匹配
                    avMap[video.avid] = video;
                    videoList.videos.push(video);
                }
                // 对合集视频进行排序
                videoList.videos.sort((v1, v2) => v1.index - v2.index);
                videoLists.push(videoList);
            }
            await this.loadTasks({ videoLists, avMap });
        },
        // 加载视频任务信息
        async loadTasks({ videoLists, avMap }) {
            let taskDir = path.join(this.downloadDir, 'zzdownloadtaskmanagertaskfile');
            // 无合集视频, 同 avid 的视频为分P, 放在一起
            let singleVideos = { /* [avid]: [$task, ...] */ };

            for (let taskFilename of await fs.readdir(taskDir)) {
                let taskFilepath = path.join(taskDir, taskFilename);
                let taskFile = await fs.readFile(taskFilepath, { encoding: 'utf-8' });
                let task = JSON.parse(taskFile);
                task.meta = JSON.parse(task.argv);
                // 匹配合集中的视频
                let avid = task.meta.av_id;
                let video = avMap[avid];
                if (video === undefined) {
                    // 无合集视频. 把视频添加到分P中
                    if (singleVideos[avid] === undefined)
                        singleVideos[avid] = [];
                    singleVideos[avid].push(task);
                } else {
                    // 装载合集中的视频
                    video.task = task;
                }
            }
            await this.trimData({ videoLists, singleVideos });
        },
        async trimData({ videoLists, singleVideos }) {
            let videoDir = path.join(this.downloadDir, 'zzdownloadtaskmanagertask');
            // 处理分P视频, 转换为 videoList
            for (let avid in singleVideos) {
                let videoSegs = singleVideos[avid];
                // 对分P进行排序
                videoSegs = videoSegs.sort((v1, v2) => v1.meta.page - v2.meta.page);
                // videoSegs 转 videoList
                let videoList = {
                    type: 'single', // 测试用
                    // 取第一个视频的标题和封面
                    title: videoSegs[0].meta.avname,
                    videos: videoSegs.map(t => ({
                        index: t.meta.page,
                        avid: t.meta.av_id,
                        task: t
                    }))
                }
                videoLists.push(videoList);
            }
            // 后处理数据
            for (let videoList of videoLists) {
                // 封面路径
                let avid = videoList.videos[0].avid;
                videoList.cover = path.join(videoDir, 'av', avid, `${avid}.cover`);
                // 开始下载的时间
                videoList.time = Infinity;
                for (let video of videoList.videos) {
                    video.type = videoList.type;
                    if (video.task.startTime < videoList.time)
                        videoList.time = video.task.startTime;
                }
            }
            // 按开始下载的时间排序 videoList
            videoLists.sort((l1, l2) => l2.time - l1.time);
            // 处理好再装载数据, 避免 dom 节点反复修改造成性能下降, 以及处理过程中的数据缺失
            this.videoLists = videoLists;
            window.videoLists = this.videoLists;
        }
    }
}
</script>
<style lang="scss" scoped>
.video-list {
    position: absolute;
    top: 0;
    right: 0;
    width: 525px;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
    z-index: 2;

    .move-panel {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;

        padding: 0 16px;
        box-sizing: border-box;

        overflow: auto;
        pointer-events: all;

        opacity: 0;
        transform: translateX(100%);
        transition-property: opacity transform;
        transition-duration: 0.3s;
        transition-timing-function: ease;

        color: #ffffff;
        background: rgba($color: #000000, $alpha: 0.8);

        .select-dir {
            position: sticky;
            top: 0;
            width: 100%;
            height: 50px;
            flex-shrink: 0;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba($color: #ffffff, $alpha: 0.5);

            .left {
                display: flex;
                align-items: center;
                flex-grow: 1;
                height: 50px;
                font-size: 16px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .right {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 50px;
                height: 50px;
                font-size: 18px;
                cursor: pointer;

                &:hover {
                    background: rgba($color: #ffffff, $alpha: 0.2);
                }
            }
        }

        .content {
            flex-shrink: 1;
            flex-grow: 0;
            overflow: auto;
        }
    }

    &.show {
        .move-panel {
            opacity: 1;
            transform: translateX(0) !important;
        }
    }
}
</style>
