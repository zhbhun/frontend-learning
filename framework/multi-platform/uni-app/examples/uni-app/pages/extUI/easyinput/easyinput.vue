<template>
	<view>
		<text class="example-info"> easyinput 组件是对原生input组件的增强 ，是专门为配合表单组件 uni-forms 而设计的，easyinput 内置了边框，图标等，同时包含 input 所有功能</text>
		<uni-section title="默认" type="line"></uni-section>
		<view class="example">
			<uni-easyinput v-model="value" focus placeholder="请输入内容" @input="input"></uni-easyinput>
		</view>

		<uni-section title="去除空格" type="line"></uni-section>
		<view class="example">
			<text class="text">输入内容：{{ '"'+value+'"' }}</text>
			<uni-easyinput trim="all" v-model="value" placeholder="请输入内容" @input="input"></uni-easyinput>
		</view>

		<uni-section title="自定义样式" type="line"></uni-section>
		<view class="example">
			<uni-easyinput v-model="value" :styles="styles" :placeholderStyle="placeholderStyle" placeholder="请输入内容" @input="input"></uni-easyinput>
		</view>
		<uni-section title="左图标" type="line"></uni-section>
		<view class="example">
			<uni-easyinput prefixIcon="search" v-model="value" placeholder="请输入内容" @iconClick="iconClick"></uni-easyinput>
		</view>
		<uni-section title="右图标" type="line"></uni-section>
		<view class="example">
			<uni-easyinput suffixIcon="search" v-model="value" placeholder="请输入内容" @iconClick="iconClick"></uni-easyinput>
		</view>
		<uni-section title="禁用" type="line"></uni-section>
		<view class="example">
			<uni-easyinput disabled value="已禁用" placeholder="请输入内容"></uni-easyinput>
		</view>
		<uni-section title="密码框" type="line"></uni-section>
		<view class="example">
			<uni-easyinput type="password" v-model="password" placeholder="请输入密码"></uni-easyinput>
		</view>
		<uni-section title="多行文本" type="line"></uni-section>
		<view class="example">
			<uni-easyinput type="textarea" v-model="value" placeholder="请输入内容"></uni-easyinput>
		</view>

		<uni-section title="多行文本自动高度" type="line"></uni-section>
		<view class="example">
			<uni-easyinput type="textarea" autoHeight v-model="value" placeholder="请输入内容"></uni-easyinput>
		</view>

	</view>
</template>

<script>
	export default {
		data() {
			return {
				value: '',
				password: '',
				placeholderStyle: "color:#499721;font-size:16px",
				styles: {
					color: 'blue',
					borderColor: '#499721'
				}
			}

		},
		onLoad() {},
		onReady() {},
		methods: {
			input(e) {
				console.log('输入内容：', e);
			},
			iconClick(type) {
				uni.showToast({
					title: `点击了${type==='prefix'?'左侧':'右侧'}的图标`,
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

	.example {
		padding: 10px;
		background-color: #fff;
	}

	.text {
		font-size: 14px;
		color: #333;
		margin-bottom: 10px;
	}
</style>