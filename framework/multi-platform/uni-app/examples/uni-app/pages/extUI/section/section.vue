<template>
	<view class="uni-wrap">
		<scroll-view class="scroll" scroll-y>
			<view class="example-info">
				<text class="example-info-text"> uni-section 组件主要用于文章、列表详情的等标题展示 </text>
			</view>
			<uni-section class="uni-section" title="基础用法" sub-title="副标题"></uni-section>
			<view class="example-body">
				<uni-list>
					<uni-list-item title="item" />
					<uni-list-item title="item" />
				</uni-list>
			</view>
			<uni-section title="竖线装饰" sub-title="副标题" type="line"></uni-section>
			<view class="example-body">
				<uni-list>
					<uni-list-item title="item" />
					<uni-list-item title="item" />
				</uni-list>
			</view>
			<uni-section title="圆形装饰" sub-title="副标题" type="circle"></uni-section>
			<view class="example-body">
				<uni-list>
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
					<uni-list-item title="item" />
				</uni-list>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	export default {
		components: {},
		data() {
			return {
				appear: false,
			}
		},
		onReady() {

		},
		methods: {

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

	.uni-wrap {
		flex-direction: column;
		/* #ifdef H5 */
		height: calc(100vh - 44px);
		/* #endif */
		/* #ifndef H5 */
		height: 100vh;
		/* #endif */
		flex: 1;
	}

	.scroll {
		flex-direction: column;
		flex: 1;
	}

	.example-body {
		padding: 0;
		/* #ifndef APP-NVUE */
		display: block;
		/* #endif */
	}
</style>