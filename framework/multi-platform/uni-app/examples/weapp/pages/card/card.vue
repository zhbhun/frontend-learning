<template>
	<view>
<view class="container">
  <demo-block title="基础用法">
    <van-card
      num="2"
      price="2.00"
      desc="描述信息"
      title="2018秋冬新款男士休闲时尚军绿飞行夹克秋冬新款男"
      :thumb="imageURL"
    />
  </demo-block>

  <demo-block title="高级用法">
    <van-card
      num="2"
      tag="标签"
      price="2.00"
      origin-price="10.00"
      desc="描述信息"
      title="2018秋冬新款男士休闲时尚军绿飞行夹克秋冬新款男"
      :thumb="imageURL"
    >
      <view slot="tags">
        <van-tag plain type="danger" custom-class="tag">标签1</van-tag>
        <van-tag plain type="danger">标签2</van-tag>
      </view>
      <view slot="footer" class="van-card__footer">
        <van-button size="mini" round custom-class="button">按钮</van-button>
        <van-button size="mini" round>按钮</van-button>
      </view>
    </van-card>
  </demo-block>
</view>

	</view>
</template>

<script>
	import Page from '../../common/page';

	export default {
		data() {
			return {
				imageURL: 'https://img.yzcdn.cn/upload_files/2017/07/02/af5b9f44deaeb68000d7e4a711160c53.jpg'

			}
		},
		onLoad() {},
		methods: {
			
		}
	}
</script>

<style>
.container {
  height: 100vh;
  background-color: #fff;
}

.tag,
.button {
  margin-right: 5px;
}

.van-card__footer {
  margin-top: 5px;
}

</style>