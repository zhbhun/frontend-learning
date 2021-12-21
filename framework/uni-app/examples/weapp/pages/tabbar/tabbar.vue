<template>
	<view>
		<demo-block title="基础用法">
			<van-tabbar :active="active" custom-class="tabbar" safe-area-inset-bottom="false" @change="onChange">
				<van-tabbar-item icon="home-o">标签</van-tabbar-item>
				<van-tabbar-item icon="search" dot>标签</van-tabbar-item>
				<van-tabbar-item icon="friends-o" info="5">标签</van-tabbar-item>
				<van-tabbar-item icon="setting-o" info="20">标签</van-tabbar-item>
			</van-tabbar>
		</demo-block>

		<demo-block title="自定义图标">
			<van-tabbar :active="active2" custom-class="tabbar" :safe-area-inset-bottom="false" @change="onChange">
				<van-tabbar-item info="3">
					<image slot="icon" :src="icon.normal" mode="aspectFit" />
					<image slot="icon-active" :src="icon.active" mode="aspectFit" />
					自定义
				</van-tabbar-item>
				<van-tabbar-item icon="search">标签</van-tabbar-item>
				<van-tabbar-item icon="setting-o">标签</van-tabbar-item>
			</van-tabbar>
		</demo-block>

		<demo-block title="自定义颜色">
			<van-tabbar :active="active" custom-class="tabbar" :safe-area-inset-bottom="false" active-color="#07c160"
			 @change="onChange">
				<van-tabbar-item icon="home-o">标签</van-tabbar-item>
				<van-tabbar-item icon="search">标签</van-tabbar-item>
				<van-tabbar-item icon="friends-o">标签</van-tabbar-item>
				<van-tabbar-item icon="setting-o">标签</van-tabbar-item>
			</van-tabbar>
		</demo-block>

	</view>
</template>

<script>
	import Page from '../../common/page';

	export default {
		data() {
			return {
				active: 0,
				active2: 0,
				icon: {
					normal: 'https://img.yzcdn.cn/public_files/2017/10/13/c547715be149dd3faa817e4a948b40c4.png',
					active: 'https://img.yzcdn.cn/public_files/2017/10/13/793c77793db8641c4c325b7f25bf130d.png'
				}
			}
		},
		onLoad() {},
		methods: {
			onChange(event) {
				console.log(event.detail);
			}
		}
	}
</script>

<style>
.tabbar {
  position: relative !important;
}
</style>
