<template>
    <div class="video-card">
        <div class="left">
            <img class="cover" @click="play" :src="$localRes(coverPath)" />
        </div>
        <div class="right">
            <div class="title" @click="play">{{ title }}</div>
            <div class="up">{{ video.task.meta.upnickName }}</div>
            <div class="video-info">
                <span class="quality">{{ video.task.meta.qualityName }}</span>
                <span class="size">{{ totalSize }}</span>
                <span class="export" @click="exportVideo">导出</span>
            </div>
        </div>
    </div>
</template>
<script>
import path from 'path';
import * as fs from 'fs-extra';
import { exec } from 'child_process'
export default {
    props: ['video'],
    data() {
        return {
            get downloadDir() {
                return localStorage.getItem('downloadDir') ?? '';
            },
            avid: this.video.task.meta.av_id,
            title: this.video.type == 'drama' ? this.video.task.meta.title : this.video.task.meta.avname,
            totalSize: '0',
            coverPath: ''
        }
    },
    created() {
        this.coverPath = path.join(this.downloadDir, 'zzdownloadtaskmanagertask', 'av', this.avid, this.avid + '.cover')
        this.getVideoInfo();
    },
    methods: {
        getVideoInfo() {
            let taskPath = path.join(this.downloadDir, 'zzdownloadtaskmanagertask', 'av', this.video.avid, 'c' + this.video.task.meta.cid, this.video.task.meta.typeTag);
            let videoPath = path.join(taskPath, '0.section');
            let audioPath = path.join(taskPath, '1.section');
            let videoSize = fs.statSync(videoPath).size;
            let audioSize = fs.statSync(audioPath).size;

            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let unitIndex = 0;
            let totalSize = videoSize + audioSize;
            while (totalSize > 1024) {
                totalSize /= 1024;
                unitIndex++;
            }
            this.totalSize = totalSize.toFixed(2) + units[unitIndex];
        },
        play() {
            this.$mitt.emit('video-play', this.video.task);
            document.title = this.title;
        },
        async exportVideo() {
            let selectResult = await this.$remote.dialog.showSaveDialog({
                // 默认文件名
                defaultPath: this.title + '.mp4',
                filters: [
                    // 仅允许保存为 MP4 格式
                    { name: 'MP4 文件', extensions: ['mp4'] }
                ]
            });
            if (selectResult.canceled)
                return;
            let output = selectResult.filePath;

            let taskPath = path.join(this.downloadDir, 'zzdownloadtaskmanagertask', 'av', this.video.avid, 'c' + this.video.task.meta.cid, this.video.task.meta.typeTag);
            let videoPath = path.join(taskPath, '0.section');
            let audioPath = path.join(taskPath, '1.section');

            let cmdline = `ffmpeg -i "${videoPath}" -i "${audioPath}" -c copy "${output}"`;
            this.runCmd(cmdline).then(({ err, stdout, stderr }) => {
                console.log('导出成功:', err, stdout, stderr);
                this.runCmd(`explorer /select,"${output}"`).catch(() => { });
            }, ({ err, stdout, stderr }) => {
                console.log('导出失败:', err, stdout, stderr);
            })
        },
        async runCmd(cmdline) {
            return new Promise((resolve, reject) => {
                exec(cmdline, (err, stdout, stderr) => {
                    if (err !== null) {
                        reject({ err, stdout, stderr });
                    } else {
                        resolve({ err, stdout, stderr });
                    }
                })
            });
        }
    }
}
</script>
<style lang="scss" scoped>
.video-card {
    width: 100%;
    display: flex;
    flex-direction: row;
    margin-bottom: 16px;

    &:hover {
        background: rgba($color: #ffffff, $alpha: 0.2);
    }

    .left {
        flex-shrink: 0;
        display: flex;
        justify-content: center;

        .cover {
            width: 192px;
            height: 108px;
            border-radius: 4px;
            cursor: pointer;
        }
    }

    .right {
        flex-shrink: 1;

        &>*:not(:last-child) {
            margin-bottom: 4px;
        }

        .title {
            height: 2.4em;
            line-height: 1.2em;
            overflow: hidden;
            text-overflow: ellipsis;
            -webkit-line-clamp: 2;
            word-break: break-all;
            cursor: pointer;
        }

        .up {}

        .video-info {
            &>*:not(:last-child) {
                margin-right: 12px;
            }

            .export {
                // 链接颜色
                color: #00a1d6;
                cursor: pointer;
            }
        }
    }
}
</style>
