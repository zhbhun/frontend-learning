<template>
	<view>
		<text class="example-info">过渡动画，通常用于元素的过渡效果，例如淡隐淡出效果，遮罩层的效果、放大缩小的效果等</text>
		<uni-section title="示例" type="line"></uni-section>
		<view class="example">
			<uni-transition ref="ani" custom-class="transition" :mode-class="modeClass" :styles="styles" :show="show"><text class="text">示例元素</text></uni-transition>
		</view>
		<uni-section title="操作" type="line"></uni-section>
		<view class="example-body">
			<button class="transition-button" type="default" @click="handle('fade')">淡隐淡出</button>
			<button class="transition-button" type="default" @click="handle(['fade', 'slide-top'])">由上至下</button>
			<button class="transition-button" type="default" @click="handle(['fade', 'slide-right'])">由右至左过</button>
			<button class="transition-button" type="default" @click="handle(['fade', 'zoom-in'])">由小到大过</button>
			<button class="transition-button" type="default" @click="custom">自定义动画</button>
		</view>
	</view>
</template>

<script>
	export default {
		components: {},
		data() {
			return {
				show: true,
				modeClass: 'fade',
				styles: {}
			}
		},
		onLoad() {
			// #ifdef APP-NVUE
			this.styles = {
				justifyContent: 'center',
				alignItems: 'center',
				width: '100px',
				height: '100px',
				borderRadius: '5px',
				textAlign: 'center',
				backgroundColor: '#4cd964',
				boxShadow: '0 0 5px 1px rgba(0,0,0,0.2)'
			}
			// #endif
		},
		methods: {
			handle(type) {
				this.show = !this.show
				this.modeClass = type
			},
			custom() {
				// TODO 下面修改宽高在百度下还有些问题待修复
				// this.$refs.ani.step({
				// 	width: '200px'
				// })
				// this.$refs.ani.step({
				// 	height: '150px'
				// },{
				// 	delay:100,
				// 	duration:200
				// })
				this.$refs.ani.step({
					width: '100px',
					height: '100px',
					rotate: '180'
				}, {
					delay: 200,
					duration: 300
				})
				this.$refs.ani.step({
					width: '100px',
					height: '100px',
					rotate: '0'
				}, {
					transformOrigin: '50% 50%'
				})

				this.$refs.ani.step({
					translateX: '-100px'
				}, {
					timingFunction: 'ease-in',
					duration: 100
				})

				this.$refs.ani.step({
					translateX: '100px'
				}, {
					timingFunction: 'ease',
					duration: 300
				})

				this.$refs.ani.step({
					translateX: '50px',
					scale: 1.5
				}, {
					timingFunction: 'linear',
					duration: 100
				})
				this.$refs.ani.step({
					translateX: '0px',
					scale: 1
				}, {
					timingFunction: 'linear',
					duration: 150
				})

				this.$refs.ani.run()
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
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		justify-content: center;
		align-items: center;
		height: 150px;
		background-color: #fff;
	}

	.example-body {
		padding: 10px 20px;
		padding-bottom: 0px;
	}

	.transition-button {
		/* #ifndef APP-NVUE */
		width: 100%;
		/* #endif */
		flex: 1;
		margin-bottom: 10px;
	}

	/* #ifndef APP-NVUE */
	.example ::v-deep .transition {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100px;
		height: 100px;
		border-radius: 5px;
		text-align: center;
		background-color: #4cd964;
		box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.2);
	}

	/* #endif */
	.text {
		font-size: 14px;
		color: #fff;
	}
</style>