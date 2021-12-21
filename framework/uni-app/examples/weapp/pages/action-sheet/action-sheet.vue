<template>
	<view>
		<demo-block title="基础用法" padding>
			<van-button @click="toggleActionSheet1">弹出 ActionSheet</van-button>
			<van-action-sheet :show="show1" :actions="actions" @close="toggleActionSheet1" @select="toggleActionSheet1" />
		</demo-block>

		<demo-block title="带取消按钮的 ActionSheet" padding>
			<van-button @click="toggleActionSheet2">弹出带取消按钮的 ActionSheet</van-button>
			<van-action-sheet :show="show2" :actions="actions" cancel-text="取消" @close="toggleActionSheet2" @cancel="toggleActionSheet2"
			 @select="toggleActionSheet2" />
		</demo-block>

		<demo-block title="带标题的 ActionSheet" padding>
			<van-button @click="toggleActionSheet3">弹出带标题的 ActionSheet</van-button>
			<van-action-sheet :show="show3" title="标题" @close="toggleActionSheet3">
				<view class="content">内容</view>
			</van-action-sheet>
		</demo-block>

	</view>
</template>

<script>
	import Page from '../../common/page';

	export default {
		data() {
			return {
				show1: false,
				show2: false,
				show3: false,
				actions: [{
						name: '选项'
					},
					{
						name: '分享',
						subname: '描述信息',
						openType: 'share'
					},
					{
						loading: true
					},
					{
						name: '禁用选项',
						disabled: true
					}
				]
			}
		},
		onLoad() {},
		methods: {
			toggleActionSheet1() {
				this.show1 = ! this.show1
			},

			toggleActionSheet2() {
				this.show2 = ! this.show2
			},

			toggleActionSheet3() {
				this.show3 = ! this.show3
			}
		}
	}
</script>

<style>
	.content {
		padding: 20px;
	}
</style>
