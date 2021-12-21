<template>
	<view>
		<demo-block title="基础用法" padding>
			<van-switch :checked="checked" @change="onChange" />
		</demo-block>

		<demo-block title="禁用状态" padding>
			<van-switch :checked="checked" disabled @change="onChange" />
		</demo-block>

		<demo-block title="加载状态" padding>
			<van-switch :checked="checked" loading @change="onChange" />
		</demo-block>

		<demo-block title="自定义大小" padding>
			<van-switch :checked="checked" size="24px" @change="onChange" />
		</demo-block>

		<demo-block title="自定义颜色" padding>
			<van-switch :checked="checked" active-color="#07c160" inactive-color="#f44" @change="onChange" />
		</demo-block>

		<demo-block title="异步控制" padding>
			<van-switch :checked="checked2" size="36px" @change="onChange2" />
		</demo-block>

		<van-dialog id="van-dialog" />
	</view>
</template>

<script>
	import Dialog from '../../wxcomponents/vant/dialog/dialog';
	export default {
		data() {
			return {
				checked: true,
				checked2: true,
			};
		},
		methods: {
			onChange({detail}) {
				this.checked = detail
			}
			,
			onChange2({detail}) {
				Dialog.confirm({
                    title: '提示',
                    message: '是否切换开关？'
                }).then((res) => {
                    this.checked2 = detail
                }).catch((e) => {//on cancel
                    console.log(e)
                });
			}
		}
	};
</script>

<style></style>
