<template>
	<view>
		<uni-section title="默认样式" type="line"></uni-section>
		<view class="example-body">
			<uni-pagination :total="50" title="标题文字" />
		</view>
		<uni-section title="修改按钮文字" type="line"></uni-section>
		<view class="example-body">
			<uni-pagination :total="50" title="标题文字" prev-text="前一页" next-text="后一页" />
		</view>
		<uni-section title="图标样式" type="line"></uni-section>
		<view class="example-body">
			<uni-pagination :show-icon="true" :total="50" title="标题文字" />
		</view>
		<uni-section title="修改数据长度" type="line"></uni-section>
		<view class="example-body">
			<uni-pagination :current="current" :total="total" title="标题文字" :show-icon="true" @change="change" />
		</view>
		<view class="btn-view">
			<view>
				<text class="example-info">当前页：{{ current }}，数据总量：{{ total }}条，每页数据：{{ pageSize }}</text>
			</view>
			<view class="button word-btn" hover-class="word-btn--hover" :hover-start-time="20" :hover-stay-time="70" @click="add"><text class="word-btn-white">增加10条数据</text></view>
			<button class="button" type="default" @click="reset">重置数据</button>
		</view>
	</view>
</template>

<script>
	export default {
		components: {},
		data() {
			return {
				current: 1,
				total: 0,
				pageSize: 10
			}
		},
		methods: {
			add() {
				this.total += 10
			},
			reset() {
				this.total = 0
				this.current = 1
			},
			change(e) {
				console.log(e)
				this.current = e.current
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
		/* #ifndef APP-NVUE */
		display: block;
		/* #endif */
	}

	.btn-view {
		/* #ifndef APP-NVUE */
		display: flex;
		flex-direction: column;
		/* #endif */
		padding: 15px;
		text-align: center;
		background-color: #fff;
		justify-content: center;
		align-items: center;
	}

	.button {
		margin-bottom: 20px;
		width: 350px;
	}
</style>