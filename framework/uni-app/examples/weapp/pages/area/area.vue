<template>
	<view>
		<demo-block title="基础用法">
			<van-area :value="value" :loading="loading" :area-list="areaList" @change="onChange" @confirm="onConfirm" @cancel="onCancel" />
		</demo-block>

		<demo-block title="选中省市县">
			<van-area :value="value" :loading="loading" :area-list="areaList" @change="onChange" @confirm="onConfirm" />
		</demo-block>

		<demo-block title="配置显示列">
			<van-area title="标题" :columns-num="2" :loading="loading" :area-list="areaList" @change="onChange" @confirm="onConfirm" />
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
				areaList: {},
				loading: true,
				value: 330302
			}
		},
		onLoad() {},
		methods: {
			onShow() {
				wx.request({
					url: 'https://cashier.youzan.com/wsctrade/uic/address/getAllRegion.json',
					success: response => {
						this.loading = false
						this.areaList = response.data.data
					}
				});
			},

			onChange(event) {
				const {
					values
				} = event.detail;

				Toast(values.map(item => item.name).join('-'));
			},

			onConfirm(event) {
				console.log(event);
			},

			onCancel(event) {
				console.log(event);
			}

		}
	}
</script>

<style>

</style>
