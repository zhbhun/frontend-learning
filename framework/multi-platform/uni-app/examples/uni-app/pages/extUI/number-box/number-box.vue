<template>
	<view class="page">
		<text class="example-info">数字输入框组件多用于购物车加减商品等场景</text>
		<uni-section title="基本用法" type="line"></uni-section>
		<view class="example-body">
			<uni-number-box @change="changeValue" />
		</view>
		<uni-section :title="'使用v-model : '+ vModelValue" type="line"></uni-section>
		<view class="example-body">
			<uni-number-box v-model="vModelValue" @blur="blur" @focus="focus" @change="changeValue" />
		</view>
		<uni-section title="设置最小值和最大值" type="line"></uni-section>
		<view class="example-body">
			<uni-number-box :min="2" :max="9" :value="5" />
		</view>
		<uni-section title="设置步长（步长0.1)" type="line"></uni-section>
		<view class="example-body">
			<uni-number-box :step="0.1" />
		</view>
		<uni-section title="禁用状态" type="line"></uni-section>
		<view class="example-body">
			<uni-number-box :disabled="true" />
		</view>
		<uni-section :title="'获取输入的值 : '+ numberValue" type="line"></uni-section>
		<view class="example-body">
			<uni-number-box :value="numberValue" @change="change" />
		</view>
	</view>
</template>
<script>
	export default {
		components: {},
		data() {
			return {
				numberValue: 0,
				vModelValue: 3
			}
		},
		methods: {
			change(value) {
				this.numberValue = value
			},
			changeValue(value) {
				console.log('返回数值：', value);
			},
			blur(e) {
				console.log('-------blur:', e);
			},
			focus(e) {
				console.log('-------focus:', e);
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
</style>