<template>
	<view>
		<text class="example-info">列表组件可以在其中使用图标、略缩图或放置任何你想放的元素，使用场景如：导航菜单、列表、设置中心排版等</text>
		<uni-section title="基础用法" type="line"></uni-section>
		<uni-list>
			<uni-list-item title="列表文字" rightText="右侧文字" />
			<uni-list-item title="列表文字" note="列表描述信息" rightText="右侧文字" />
		</uni-list>
		<uni-section title="禁用列表" type="line"></uni-section>
		<uni-list>
			<uni-list-item :disabled="true" title="列表禁用状态" rightText="右侧文字" />
		</uni-list>
		<uni-section title="展示箭头" type="line"></uni-section>
		<uni-list>
			<uni-list-item showArrow title="列表文字" />
			<uni-list-item showArrow title="列表文字" rightText="右侧文字" />
		</uni-list>
		<uni-section title="点击反馈" type="line"></uni-section>
		<uni-list>
			<uni-list-item title="弹窗提示" clickable @click="onClick" />
			<uni-list-item title="页面跳转" :to="`./chat`" @click="onClick" />
			<uni-list-item title="关闭当前页面打开新页面" link="redirectTo" to="./chat" @click="onClick" />
			<uni-list-item title="打开错误页面(查看控制台)" link="redirectTo" to="./chats" @click="onClick" />
		</uni-list>
		<uni-section title="不显示分割线" type="line"></uni-section>
		<uni-list :border="false">
			<uni-list-item title="列表文字" />
			<uni-list-item :border="false" title="列表文字" note="列表描述信息" rightText="右侧文字" />
			<uni-list-item :border="true" title="列表文字" note="列表描述信息" rightText="右侧文字" />
		</uni-list>
		<uni-section title="文字溢出隐藏" type="line"></uni-section>
		<uni-list>
			<uni-list-item :ellipsis="1" title="列表 title 超长文字显示一行,以下是测试文字以下是测试文字以下是测试文字以下是测试文字以下是测试文字以下是测试文字" showArrow rightText="右侧文字" />
			<uni-list-item :ellipsis="2" title="列表 title 超长文字显示二行,以下是测试文字以下是测试文字以下是测试文字以下是测试文字以下是测试文字以下是测试文字" showArrow rightText="右侧文字" />
			<uni-list-item title="列表 title 全部显示,以下是测试文字以下是测试文字以下是测试文字以下是测试文字以下是测试文字以下是测试文字" showArrow rightText="右侧文字" />
		</uni-list>

		<uni-section title="显示图标或图片" type="line"></uni-section>
		<uni-list>
			<uni-list-item title="列表左侧带略缩图" note="列表描述信息" showArrow thumb="https://vkceyugu.cdn.bspapp.com/VKCEYUGU-dc-site/460d46d0-4fcc-11eb-8ff1-d5dcf8779628.png" thumb-size="sm" rightText="小图" />

			<uni-list-item title="列表左侧带略缩图" note="列表描述信息" showArrow thumb="https://vkceyugu.cdn.bspapp.com/VKCEYUGU-dc-site/460d46d0-4fcc-11eb-8ff1-d5dcf8779628.png" thumb-size="base" rightText="默认" />
			<uni-list-item title="列表左侧带略缩图" note="列表描述信息" showArrow thumb="https://vkceyugu.cdn.bspapp.com/VKCEYUGU-dc-site/460d46d0-4fcc-11eb-8ff1-d5dcf8779628.png" thumb-size="lg" rightText="大图" />
			<uni-list-item :show-extra-icon="true" showArrow :extra-icon="extraIcon" title="列表左侧带扩展图标" />
		</uni-list>
		<uni-section title="右侧显示 switch/badge" type="line"></uni-section>
		<uni-list>
			<uni-list-item :show-extra-icon="true" :extra-icon="extraIcon" :show-badge="true" badge-text="99" showArrow title="禁用状态" @switchChange="switchChange" />
			<uni-list-item :show-extra-icon="true" :extra-icon="extraIcon" :show-switch="true" title="列表右侧带 switch" @switchChange="switchChange" />
			<uni-list-item :disabled="true" :show-extra-icon="true" :extra-icon="extraIcon" :show-switch="true" :switch-checked="true" title="禁用状态" @switchChange="switchChange" />
		</uni-list>
		<uni-section title="使用插槽" type="line"></uni-section>
		<uni-list>
			<uni-list-item>
				<template v-slot:body>
					<view class="slot-box">
						<text class="slot-text">默认插槽</text>
						<uni-badge text="2" type="primary" />
					</view>
				</template>
			</uni-list-item>
			<uni-list-item title="自定义右侧插槽" note="列表描述信息" link>
				<template v-slot:header>
					<image class="slot-image" src="/static/logo.png" mode="widthFix"></image>
				</template>
			</uni-list-item>
			<uni-list-item>
				<template v-slot:header>
					<view class="slot-box">
						<image class="slot-image" src="/static/logo.png" mode="widthFix"></image>
					</view>
				</template>
				<template v-slot:body>
					<text class="slot-box slot-text">自定义左侧插槽</text>
				</template>
				<template v-slot:footer>
					<image class="slot-image" src="/static/logo.png" mode="widthFix"></image>
				</template>
			</uni-list-item>
		</uni-list>

		<uni-section title="列表扩展" type="line"></uni-section>
		<uni-list>
			<uni-list-item title="聊天列表" link :to="`./chat`" @click="onClick($event,1)" />
		</uni-list>
	</view>
</template>

<script>
	export default {
		components: {},
		data() {
			return {
				extraIcon: {
					color: '#4cd964',
					size: '22',
					type: 'gear-filled'
				}
			};
		},
		methods: {
			onClick(e) {
				console.log('执行click事件', e.data)
				uni.showToast({
					title: '点击反馈'
				});
			},
			switchChange(e) {
				uni.showToast({
					title: 'change:' + e.value,
					icon: 'none'
				});
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

	.slot-box {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		align-items: center;
	}

	.slot-image {
		/* #ifndef APP-NVUE */
		display: block;
		/* #endif */
		margin-right: 10px;
		width: 30px;
		height: 30px;
	}

	.slot-text {
		flex: 1;
		font-size: 14px;
		color: #4cd964;
		margin-right: 10px;
	}
</style>