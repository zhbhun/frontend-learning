<template>
	<view>
		<text class="example-info">加载更多组件用于页面加载更多数据时，页面底部显示内容等场景。</text>
		<uni-section title="基本用法" type="line"></uni-section>
		<view class="example-body">
			<uni-load-more :status="status" />
		</view>
		<uni-section title="修改默认文字" type="line"></uni-section>
		<view class="example-body">
			<uni-load-more :status="status" :content-text="contentText" />
		</view>
		<uni-section title="改变颜色" type="line"></uni-section>
		<view class="example-body">
			<uni-load-more color="#007AFF" :status="status" />
		</view>
		<!-- #ifndef APP-NVUE -->
		<uni-section title="指定加载图标样式 - 按平台自动选择样式" type="line"></uni-section>
		<view class="example-body">
			<uni-load-more iconType="auto" :status="status" />
		</view>
		<uni-section title="指定加载图标样式 - 环形" type="line"></uni-section>
		<view class="example-body">
			<uni-load-more iconType="circle" :status="status" />
		</view>
		<uni-section title="指定加载图标样式 - 雪花" type="line"></uni-section>
		<view class="example-body">
			<uni-load-more iconType="snow" :status="status" />
		</view>
		<!-- #endif -->
		<uni-section title="指定加载图标大小" type="line"></uni-section>
		<view class="example-body">
			<uni-load-more iconType="snow" :iconSize="36" :status="status" />
		</view>
		<uni-section title="点击事件" type="line"></uni-section>
		<view class="example-body">
			<uni-load-more :status="status" @clickLoadMore="clickLoadMore" />
		</view>
		<uni-section title="改变组件状态" type="line"></uni-section>
		<radio-group class="uni-list" @change="onChange">
			<view v-for="(item, index) in statusTypes" :key="index" class="uni-list-item">
				<view class="uni-list-item__container">
					<view class="uni-list-item__content">
						<text class="uni-list-item__content-title">{{ item.text }}</text>
					</view>
					<view class="uni-list-item__extra">
						<radio :value="item.value" :checked="item.checked" />
					</view>
				</view>
			</view>
		</radio-group>
	</view>
</template>
<script>
	export default {
		components: {},
		data() {
			return {
				status: 'more',
				statusTypes: [{
					value: 'more',
					text: '加载前',
					checked: true
				}, {
					value: 'loading',
					text: '加载中',
					checked: false
				}, {
					value: 'noMore',
					text: '没有更多',
					checked: false
				}],
				contentText: {
					contentdown: '查看更多',
					contentrefresh: '加载中',
					contentnomore: '没有更多'
				}
			}
		},
		methods: {
			onChange(e) {
				this.status = e.detail.value
			},
			clickLoadMore(e) {
				uni.showToast({
					icon: 'none',
					title: "当前状态：" + e.detail.status
				})
			}
		}
	}
</script>

<style>
	/* 头条小程序组件内不能引入字体 */
	/* #ifdef MP-TOUTIAO */
	@font-face {
		font-family: uniicons;
		font-weight: normal;
		font-style: normal;
		src: url("~@/static/uni.ttf") format("truetype");
	}

	/* #endif */
	/* #ifndef APP-NVUE */
	page {
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		background-color: #efeff4;
		min-height: 100%;
		height: auto;
	}

	view {
		font-size: 14px;
		line-height: inherit;
	}

	.example {
		padding: 0 15px 15px;
	}

	.example-info {
		padding: 15px;
		color: #3b4144;
		background: #ffffff;
	}

	.example-body {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		padding: 0;
		font-size: 14px;
		background-color: #ffffff;
	}

	/* #endif */
	.example {
		padding: 0 15px;
	}

	.example-info {
		/* #ifndef APP-NVUE */
		display: block;
		/* #endif */
		padding: 15px;
		color: #3b4144;
		background-color: #ffffff;
		font-size: 14px;
		line-height: 20px;
	}

	.example-info-text {
		font-size: 14px;
		line-height: 20px;
		color: #3b4144;
	}

	.example-body {
		flex-direction: column;
		padding: 15px;
		background-color: #ffffff;
	}

	.word-btn-white {
		font-size: 18px;
		color: #FFFFFF;
	}

	.word-btn {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		height: 48px;
		margin: 15px;
		background-color: #007AFF;
	}

	.word-btn--hover {
		background-color: #4ca2ff;
	}

	.uni-list {
		background-color: #fff;
	}

	.example-body {
		padding: 6px 15px;
		/* #ifndef APP-NVUE */
		display: block;
		/* #endif */
	}

	.uni-list-item {
		border-bottom-style: solid;
		border-bottom-width: 1px;
		border-bottom-color: #e5e5e5;
	}

	.uni-list-item__container {
		/* #ifndef APP-NVUE */
		display: flex;
		width: 100%;
		box-sizing: border-box;
		/* #endif */
		padding: 12px 15px;
		flex: 1;
		position: relative;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
	}

	.uni-list-item__content-title {
		font-size: 16px;
	}
</style>