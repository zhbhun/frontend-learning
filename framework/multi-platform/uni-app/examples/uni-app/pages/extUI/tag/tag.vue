<template>
	<view>
		<text class="example-info">标签组件多用于商品分类、重点内容显示等场景。</text>
		<uni-section title="实心标签" type="line"></uni-section>
		<view class="example-body">
			<view class="tag-view">
				<uni-tag text="标签" />
			</view>
			<view class="tag-view">
				<uni-tag text="标签" type="primary" />
			</view>
			<view class="tag-view">
				<uni-tag text="标签" type="success" />
			</view>
			<view class="tag-view">
				<uni-tag text="标签" type="warning" />
			</view>
			<view class="tag-view">
				<uni-tag text="标签" type="error" />
			</view>
			<view class="tag-view">
				<uni-tag text="标签" type="royal" />
			</view>
		</view>
		<uni-section title="空心标签" type="line"></uni-section>
		<view class="example-body">
			<view class="tag-view">
				<uni-tag :inverted="true" text="标签" />
			</view>
			<view class="tag-view">
				<uni-tag :inverted="true" text="标签" type="primary" />
			</view>
			<view class="tag-view">
				<uni-tag :inverted="true" text="标签" type="success" />
			</view>
			<view class="tag-view">
				<uni-tag :inverted="true" text="标签" type="warning" />
			</view>
			<view class="tag-view">
				<uni-tag :inverted="true" text="标签" type="error" />
			</view>
			<view class="tag-view">
				<uni-tag :inverted="true" text="标签" type="royal" />
			</view>
		</view>
		<uni-section title="圆角样式" type="line"></uni-section>
		<view class="example-body">
			<view class="tag-view">
				<uni-tag :circle="true" text="标签" type="primary" size="small" />
			</view>
			<view class="tag-view">
				<uni-tag :inverted="true" :circle="true" text="标签" type="success" size="small" />
			</view>
			<view class="tag-view">
				<uni-tag :circle="true" text="标签" type="warning" />
			</view>
			<view class="tag-view">
				<uni-tag :inverted="true" :circle="true" text="标签" type="error" />
			</view>
			<view class="tag-view">
				<uni-tag :inverted="true" :circle="true" text="标签" type="royal" />
			</view>
		</view>
		<uni-section title="自定义样式" type="line"></uni-section>
		<view class="example-body">
			<view class="tag-view">
				<uni-tag text="我是自定义样式标签" custom-style="background-color: #000; color: #fff;"></uni-tag>
			</view>
		</view>
		<uni-section title="标记样式" type="line"></uni-section>
		<view class="example-body">
			<view class="tag-view">
				<uni-tag :mark="true" text="标签" type="primary" size="small" />
			</view>
			<view class="tag-view">
				<uni-tag :mark="true" text="标签" type="success" size="small" />
			</view>
			<view class="tag-view">
				<uni-tag :mark="true" text="标签" type="warning" />
			</view>
			<view class="tag-view">
				<uni-tag :mark="true" :circle="true" text="标签" type="error" />
			</view>
			<view class="tag-view">
				<uni-tag :mark="true" :circle="true" text="标签" type="royal" />
			</view>
		</view>
		<uni-section title="点击事件" type="line"></uni-section>
		<view class="example-body">
			<view class="tag-view">
				<uni-tag :type="type" text="标签" @click="setType" />
			</view>
			<view class="tag-view">
				<uni-tag :circle="true" :inverted="inverted" text="标签" type="primary" @click="setInverted" />
			</view>
		</view>

		<uni-section title="小标签" type="line"></uni-section>
		<view class="example-body">
			<view class="tag-view">
				<uni-tag text="标签" size="small" />
			</view>
			<view class="tag-view">
				<uni-tag text="标签" type="primary" size="small" />
			</view>
			<view class="tag-view">
				<uni-tag text="标签" type="success" size="small" />
			</view>
			<view class="tag-view">
				<uni-tag :inverted="true" :mark="true" text="标签" type="warning" size="small" />
			</view>
			<view class="tag-view">
				<uni-tag :inverted="true" :circle="true" text="标签" type="error" size="small" />
			</view>
		</view>

		<uni-section title="不可点击状态" type="line"></uni-section>
		<view class="example-body">
			<view class="tag-view">
				<uni-tag :disabled="true" text="标签" />
			</view>
			<view class="tag-view">
				<uni-tag :disabled="true" text="标签" type="primary" />
			</view>
			<view class="tag-view">
				<uni-tag :inverted="true" :disabled="true" text="标签" type="error" size="small" />
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		components: {},
		data() {
			return {
				type: 'default',
				inverted: false
			};
		},
		methods: {
			setType() {
				let types = ['default', 'primary', 'success', 'warning', 'error'];
				let index = types.indexOf(this.type);
				types.splice(index, 1);
				let randomIndex = Math.floor(Math.random() * 4);
				this.type = types[randomIndex];
			},
			setInverted() {
				this.inverted = !this.inverted;
			}
		}
	};
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
		/* #ifndef APP-PLUS-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		justify-content: flex-start;
		flex-wrap: wrap;
		padding: 20rpx;
	}

	.tag-view {
		/* #ifndef APP-PLUS-NVUE */
		display: flex;
		/* #endif */
		flex-direction: column;
		margin: 10rpx 15rpx;
		justify-content: center;
	}
</style>