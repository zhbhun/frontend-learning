<template>
	<view>
		<demo-block title="基础用法">
			<van-nav-bar title="标题" left-text="返回" right-text="按钮" left-arrow @clickLeft="onClickLeft" @clickRight="onClickRight" />
		</demo-block>

		<demo-block title="高级用法">
			<van-nav-bar title="标题" left-text="返回" left-arrow>
				<van-icon name="search" slot="right" custom-class="icon" />
			</van-nav-bar>
		</demo-block>

	</view>
</template>

<script>
	import Page from '../../common/page';

	export default {
		data() {
			return {

			}
		},
		onLoad() {},
		methods: {
			onClickLeft() {
				console.log("11");//TODO 进不来
				uni.showToast({
					title: '点击返回',
					icon: 'none'
				});
			},

			onClickRight() {
				uni.showToast({
					title: '点击按钮',
					icon: 'none'
				});
			}
		}
	}
</script>

<style>
	.icon {
		color: #1989fa;
	}
</style>
