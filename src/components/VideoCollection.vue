<template>
    <div class="video-collection">
        <div class="title" v-show="list.videos.length > 1" @click="collapsed = !collapsed">
            <span class="icon-material">{{ collapsed ? 'expand_more' : 'expand_less' }}</span>
            <span>[合集](共{{ list.videos.length }}个视频): {{ list.title }}</span>
        </div>
        <div class="content" :class="{ collapsed }">
            <VideoCard v-for="(video, index) in list.videos" :key="index" :video="video" />
        </div>
    </div>
</template>
<script>
import VideoCard from '@/components/VideoCard';
export default {
    components: { VideoCard },
    props: ['list'],
    data() {
        return {
            collapsed: this.list.videos.length > 1
        }
    },
}
</script>
<style lang="scss">
.video-collection {
    border-bottom: 1px solid rgba($color: #ffffff, $alpha: 0.5);

    >.title {
        display: flex;
        align-items: center;
        margin: 16px 0;
        cursor: pointer;
    }

    .content {
        overflow: hidden;
        transition: height 3s ease;

        &.collapsed {
            height: 0 !important;
        }
    }
}
</style>
