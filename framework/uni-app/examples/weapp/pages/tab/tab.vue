<template>
	<view>
		<demo-block title="基础用法">
			<van-tabs :active="1" @change="onChange">
				<van-tab v-for="(item,index) in tabs" :key="index" :title="'标签' + item">
					<view class="content">
						{{ '内容' + item }}
					</view>
				</van-tab>
			</van-tabs>
		</demo-block>

		<demo-block title="自定义标题">
			<van-tabs :active="1" @change="onChange" tab-class="tab-class" tab-active-class="tab-active-class">
				<van-icon slot="nav-right" name="search" custom-class="right-nav" @click="onClickNavRight" />
				<van-tab v-for="(item,index) in tabs" :key="index"  :title="'标签' + item" :dot="index === 1" :info="index === 2 ? 99 : null">
					<view class="content">
						{{ '内容' + item }}
					</view>
				</van-tab>
			</van-tabs>
		</demo-block>

		<demo-block title="横向滚动">
			<van-tabs>
				<van-tab v-for="(item,index) in tabsMore" :key="index" :title="'标签' + item">
					<view class="content">
						{{ '内容' + item }}
					</view>
				</van-tab>
			</van-tabs>
		</demo-block>
		
		<demo-block title="禁用标签">
			<van-tabs @disabled="onClickDisabled">
				<van-tab v-for="(item,index) in tabs" :key="index" :disabled="index === 1" :title="'标签' + item">
					<view class="content">
						{{ '内容' + item }}
					</view>
				</van-tab>
			</van-tabs>
		</demo-block>

		<demo-block title="样式风格">
			<van-tabs type="card">
				<van-tab v-for="(item,index) in tabs" :key="index" :title="'标签' + item">
					<view class="content-2">
						{{ '内容' + item }}
					</view>
				</van-tab>
			</van-tabs>
		</demo-block>

		<demo-block title="点击事件">
			<van-tabs @click="onClick">
				<van-tab v-for="(item,index) in tabs" :key="index" :title="'标签' + item">
					<view class="content">
						{{ '内容' + item }}
					</view>
				</van-tab>
			</van-tabs>
		</demo-block>

		<demo-block title="粘性布局">
			<van-tabs sticky>
				<van-tab v-for="(item,index) in tabs" :key="index" :title="'标签' + item">
					<view class="content">
						{{ '内容' + item }}
					</view>
				</van-tab>
			</van-tabs>
		</demo-block>

		<demo-block title="切换动画">
			<van-tabs animated>
				<van-tab v-for="(item,index) in tabs" :key="index" :title="'标签' + item">
					<view class="content" style="height: 400px;">
						{{ '内容' + item }}
					</view>
				</van-tab>
			</van-tabs>
		</demo-block>

		<demo-block title="滑动切换">
			<van-tabs swipeable>
				<van-tab v-for="(item,index) in tabs" :key="index" :title="'标签' + item">
					<view class="content">
						{{ '内容' + item }}
					</view>
				</van-tab>
			</van-tabs>
		</demo-block>

	</view>
</template>

<script>
	import Page from '../../common/page';

	export default {
		data() {
			return {
				tabs: [1, 2, 3, 4],
				tabsMore: [1, 2, 3, 4, 5, 6, 7, 8]
			}
		},
		onLoad() {},
		methods: {
			onClickDisabled(event) {
				wx.showToast({
					title: `标签 ${event.detail.index + 1} 已被禁用`,
					icon: 'none'
				});
			},

			onChange(event) {
				wx.showToast({
					title: `切换到标签 ${event.detail.index + 1}`,
					icon: 'none'
				});
			},

			onClickNavRight() {
				wx.showToast({
					title: '点击right nav',
					icon: 'none'
				});
			},

			onClick(event) {
				wx.showToast({
					title: `点击标签 ${event.detail.index + 1}`,
					icon: 'none'
				});
			}
		}
	}
</script>

<style>
	.content {
		padding: 20px;
		background-color: #fff;
	}

	.content-2 {
		padding: 20px;
	}

	.right-nav {
		padding: 0 10px;
		line-height: 44px !important;
	}

	.tab-class {
		transition: all 0.25s ease-in-out;
	}

	.tab-active-class {
		font-size: 1.05em !important;
		color: #1989fa !important;
	}
</style>
