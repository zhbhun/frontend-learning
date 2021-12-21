<template>
	<view>
		<demo-block title="基础用法">
			<van-picker :columns="column1" @change="onChange1" />
		</demo-block>

		<demo-block title="禁用选项">
			<van-picker :columns="column2" />
		</demo-block>

		<demo-block title="展示顶部栏">
			<van-picker show-toolbar title="标题" :columns="column1" @change="onChange1" @confirm="onConfirm"
			 @cancel="onCancel" />
		</demo-block>

		<demo-block title="多列联动">
			<van-picker :columns="column4" @change="onChange2" />
		</demo-block>

		<demo-block title="加载状态">
			<van-picker loading :columns="column4" />
		</demo-block>

		<van-toast id="van-toast" />

	</view>
</template>

<script>
	import Page from '../../common/page';
	import Toast from '../../wxcomponents/vant/toast/toast';

	export default {
		data() {
			return {
				column1: ['杭州', '宁波', '温州', '嘉兴', '湖州'],
				column2: [{
						text: '杭州',
						disabled: true
					},
					{
						text: '宁波'
					},
					{
						text: '温州'
					}
				],
				column3: {
					浙江: ['杭州', '宁波', '温州', '嘉兴', '湖州'],
					福建: ['福州', '厦门', '莆田', '三明', '泉州']
				},
				column4: [{
						values: ['浙江', '福建'],
						className: 'column1'
					},
					{
						values: ['杭州', '宁波', '温州', '嘉兴', '湖州'],
						className: 'column2',
						defaultIndex: 2
					}
				]
			}
		},
		onLoad() {},
		methods: {
			onChange1(event) {
				const {
					value,
					index
				} = event.detail;
				Toast(`Value: ${value}, Index：${index}`);
			},

			onConfirm(event) {
				const {
					value,
					index
				} = event.detail;
				Toast(`Value: ${value}, Index：${index}`);
			},

			onCancel() {
				Toast('取消');
			},

			onChange2(event) {
				const {
					picker,
					value
				} = event.detail;
				picker.setColumnValues(1, this.column3[value[0]]);
				getApp().picker = picker;
			}
		}
	}
</script>

<style>

</style>
