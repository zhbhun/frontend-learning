<template>
	<view class="fixforpc-window">
		<text class="example-info">通告栏组件多用于系统通知，广告通知等场景，可自定义图标，颜色，展现方式等。</text>
		<uni-section title="基本用法" type="line"></uni-section>
		<view class="example-body">
			<uni-notice-bar :single="true" text="[单行] uni-app 1.6发布，开发一次、7端覆盖！" />
			<uni-notice-bar text="[多行] uni-app 1.6版正式发布，开发一次，同时发布iOS、Android、H5、微信小程序、支付宝小程序、百度小程序、头条小程序等7大平台。" />
		</view>
		<uni-section title="加图标" type="line"></uni-section>
		<view class="example-body">
			<uni-notice-bar :single="true" :show-icon="true" text="uni-app行业峰会频频亮相，开发者反响热烈!" />
			<uni-notice-bar :show-icon="true" text="8月12日DCloud受邀参加iWEB峰会后，9月19日DCloud CEO 王安在千人小程序峰会——见实大会，做了主题为《App和小程序，鱼与熊掌如何兼得？》的分享。" />
		</view>
		<uni-section title="文字滚动" type="line"></uni-section>
		<view class="example-body">
			<uni-notice-bar :scrollable="true" :single="true" text="uni-app行业峰会频频亮相，开发者反响热烈!" />
			<uni-notice-bar :show-icon="true" :scrollable="true" :single="true" text="uni-app 1.6版正式发布，开发一次，同时发布iOS、Android、H5、微信小程序、支付宝小程序、百度小程序、头条小程序等7大平台。" />
			<uni-notice-bar :scrollable="true" text="8月12日DCloud受邀参加iWEB峰会后，9月19日DCloud CEO 王安在千人小程序峰会——见实大会，做了主题为《App和小程序，鱼与熊掌如何兼得？》的分享。" />
		</view>
		<uni-section title="查看更多" type="line"></uni-section>
		<view class="example-body">
			<uni-notice-bar :show-get-more="true" :single="true" text="年末大礼：uni-app1.4 新增百度、支付宝小程序。插件市场重磅上线！" @getmore="getMore" />
			<uni-notice-bar :show-get-more="true" :show-icon="true" :single="true" more-text="查看更多" text="年末大礼：uni-app1.4 新增百度、支付宝小程序。插件市场重磅上线！" @getmore="getMore" />
		</view>
		<uni-section title="修改颜色" type="line"></uni-section>
		<view class="example-body">
			<uni-notice-bar :single="true" more-text="查看更多" color="red" background-color="#eee" text="uni-app 1.6版正式发布，开发一次，同时发布iOS、Android、H5、微信小程序、支付宝小程序、百度小程序、头条小程序等7大平台。" />
			<uni-notice-bar :single="true" :show-get-more="true" more-text="查看更多" more-color="blue" color="red" background-color="#eee" text="uni-app 1.6版正式发布，开发一次，同时发布iOS、Android、H5、微信小程序、支付宝小程序、百度小程序、头条小程序等7大平台。" @getmore="getMore" />
			<uni-notice-bar :show-icon="true" color="blue" text="uni-app 1.6版正式发布，开发一次，同时发布iOS、Android、H5、微信小程序、支付宝小程序、百度小程序、头条小程序等7大平台。" />
		</view>
		<uni-section title="关闭按钮" type="line"></uni-section>
		<view class="example-body">
			<uni-notice-bar :show-close="true" :single="true" text="HBuilderX 1.0正式发布！uni-app实现里程碑突破！" />
			<uni-notice-bar :show-close="true" :show-icon="true" more-text="查看更多" text="HBuilderX 1.0正式发布！uni-app实现里程碑突破！" />
			<uni-notice-bar :show-close="true" :show-icon="true" text="uni-app 1.6发布，开发一次、7端覆盖！" />
			<uni-notice-bar :show-close="true" :show-icon="true" :single="true" text="uni-app 1.6版正式发布，开发一次，同时发布到iOS、Android、H5、微信小程序、支付宝小程序、百度小程序、头条小程序等7大平台。" />
		</view>
	</view>
</template>

<script>
	export default {
		components: {},
		data() {
			return {}
		},
		created() {},
		methods: {
			getMore() {
				uni.showToast({
					title: '点击查看更多',
					icon: 'none'
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

	.example-body {
		padding: 5rpx 0;
		padding-top: 20rpx;
		flex-direction: column;
		/* #ifndef APP-NVUE */
		display: block;
		/* #endif */
	}

	.fixforpc-window {
		/* #ifndef APP-NVUE */
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		/* #endif */
	}
</style>