<template>
	<view>
		<text class="example-info">评分组件多用于商品评价打分、服务态度评价、用户满意度等场景。</text>
		<uni-section title="基本用法" type="line"></uni-section>
		<view class="example-body">
			<uni-rate v-model="rateValue" @change="onChange" />
		</view>
		<uni-section title="不支持滑动手势选择评分" type="line"></uni-section>
		<view class="example-body">
			<uni-rate :touchable="false" :value="5" @change="onChange" />
		</view>
		<uni-section title="设置尺寸大小" type="line"></uni-section>
		<view class="example-body">
			<uni-rate size="18" :value="5" />
		</view>
		<uni-section title="设置评分数" type="line"></uni-section>
		<view class="example-body">
			<uni-rate :max="10" :value="5" />
		</view>
		<uni-section title="设置星星间隔" type="line"></uni-section>
		<view class="example-body">
			<uni-rate :value="4" margin="20" />
		</view>
		<uni-section title="设置颜色" type="line"></uni-section>
		<view class="example-body">
			<uni-rate :value="3" color="#bbb" active-color="red" />
		</view>
		<uni-section title="半星" type="line"></uni-section>
		<view class="example-body">
			<uni-rate allow-half :value="3.5" />
		</view>
		<uni-section title="只读状态" type="line"></uni-section>
		<view class="example-body">
			<uni-rate :readonly="true" :value="2" />
		</view>
		<uni-section title="禁用状态" type="line"></uni-section>
		<view class="example-body">
			<uni-rate :disabled="true" disabledColor="#ccc" :value="3" />
		</view>
		<uni-section title="未选中的星星为镂空状态" type="line"></uni-section>
		<view class="example-body">
			<uni-rate :value="3" :is-fill="false" />
		</view>

	</view>
</template>

<script>
	export default {
		components: {},
		data() {
			return {
				rateValue: 0
			}
		},
		onLoad() {
			// 模拟动态赋值
			setTimeout(() => {
				this.rateValue = 3
			}, 1000)
		},
		methods: {
			onChange(e) {
				console.log('rate发生改变:' + JSON.stringify(e))
				// console.log(this.rateValue);
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