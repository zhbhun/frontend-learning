<template>
	<view>
		<text class="example-info">倒计时组件主要用于促销商品剩余时间，发送短信验证等待时间等场景</text>
		<uni-section title="一般用法" type="line"></uni-section>
		<view class="example-body">
			<uni-countdown :day="1" :hour="1" :minute="12" :second="40" />
		</view>
		<uni-section title="自由控制开始/暂停" type="line"></uni-section>
		<view class="example-body">
			<uni-countdown :start="start" :day="1" :hour="1" :minute="12" :second="40" />
		</view>
		<uni-section title="不显示天数" type="line"></uni-section>
		<view class="example-body">
			<uni-countdown :show-day="false" :hour="12" :minute="12" :second="12" />
		</view>
		<uni-section title="文字分隔符" type="line"></uni-section>
		<view class="example-body">
			<uni-countdown :minute="30" :second="0" :show-colon="false" />
		</view>
		<uni-section title="修改颜色" type="line"></uni-section>
		<view class="example-body">
			<uni-countdown :day="1" :hour="2" :minute="30" :second="0" color="#FFFFFF" background-color="#007AFF" border-color="#007AFF" />
		</view>
		<uni-section title="倒计时回调事件" type="line"></uni-section>
		<view class="example-body">
			<uni-countdown :show-day="false" :second="timeupSecond" @timeup="timeup" />
		</view>
		<uni-section title="动态赋值" type="line"></uni-section>
		<view class="example-body">
			<uni-countdown :show-day="false" :hour="testHour" :minute="testMinute" :second="testSecond" />
		</view>
	</view>
</template>
<script>
	export default {
		components: {},
		data() {
			return {
				testHour: 1,
				testMinute: 0,
				testSecond: 0,
				start: false,
				timeupSecond: 10
			}
		},
		mounted() {
			setTimeout(() => {
				this.testHour = 1
				this.testMinute = 1
				this.testSecond = 0
				this.start = true
			}, 3000)
			setTimeout(() => {
				this.start = false
			}, 10000)
		},
		methods: {
			timeup() {
				uni.showToast({
					title: '时间到'
				})
				this.timeupSecond = 29
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
		padding: 10px;
	}
</style>