<template>
    <div id="home">
        <BiliPlayer />
        <VideoList />
    </div>
</template>
<script>
import BiliPlayer from '@/components/BiliPlayer';
import VideoList from '@/components/VideoList';
export default {
    components: { BiliPlayer, VideoList },
}
</script>
<style lang="scss">
#home {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>
