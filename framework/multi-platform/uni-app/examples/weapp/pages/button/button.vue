<template>
  <view>
    <demo-section>
      <demo-block title="按钮类型" padding>
        <view class="row">
          <van-button class="demo-margin-right">默认按钮</van-button>
          <van-button type="primary" class="demo-margin-right">主要按钮</van-button>
          <van-button type="info" class="demo-margin-right">信息按钮</van-button>
        </view>
        <van-button type="danger" class="demo-margin-right">危险按钮</van-button>
        <van-button type="warning">警告按钮</van-button>
      </demo-block>

      <demo-block title="朴素按钮" padding>
        <van-button type="primary" plain class="demo-margin-right">朴素按钮</van-button>
        <van-button type="danger" plain>朴素按钮</van-button>
      </demo-block>

      <demo-block title="细边框" padding>
        <van-button type="primary" plain hairline class="demo-margin-right">细边框按钮</van-button>
        <van-button type="danger" plain hairline>细边框按钮</van-button>
      </demo-block>

      <demo-block title="禁用状态" padding>
        <van-button type="primary" disabled class="demo-margin-right">禁用状态</van-button>
        <van-button type="danger" disabled>禁用状态</van-button>
      </demo-block>

      <demo-block title="加载状态" padding>
        <van-button loading type="primary" class="demo-margin-right" />
        <van-button loading type="danger" loading-text="加载中..." />
      </demo-block>

      <demo-block title="按钮形状" padding>
        <van-button type="primary" square class="demo-margin-right">方形按钮</van-button>
        <van-button type="danger" round>圆形按钮</van-button>
      </demo-block>

      <demo-block title="按钮尺寸" padding>
        <van-button size="large" block custom-class="demo-margin-bottom">大号按钮</van-button>
        <van-button class="demo-margin-right">普通按钮</van-button>
        <van-button size="small" class="demo-margin-right">小型按钮</van-button>
        <van-button size="mini">迷你按钮</van-button>
      </demo-block>
    </demo-section>

  </view>
</template>

<script>
  import Page from '../../common/page';

  export default {
    data() {
      return {

      }
    },
    onLoad() {},
    methods: {
    }
  }
</script>

<style>
  .row {
    height: 44px;
    margin-bottom: 15px;
  }
</style>
