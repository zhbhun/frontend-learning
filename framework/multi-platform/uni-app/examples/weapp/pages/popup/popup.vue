<template>
  <div class="app">
    <wrap title="基础用法">
      <van-button @click="togglePopup">弹出 Popup</van-button>
      <van-popup :show="isShow.middle" custom-class="center" @close="togglePopup">
        内容
      </van-popup>
    </wrap>
    <wrap title="弹出位置">
      <van-button @click="toggleBottomPopup" class="demo-margin-right"
        >底部弹出</van-button
      >

      <van-popup
        :show="isShow.bottom"
        position="bottom"
        custom-class="bottom"
        @close="toggleBottomPopup"
      >
        内容
      </van-popup>

      <van-button @click="toggleTopPopup" class="demo-margin-right"
        >顶部弹出</van-button
      >
      <van-popup
        :show="isShow.top"
        position="top"
        :overlay="false"
        custom-class="top"
        @close="toggleTopPopup"
      >
        内容
      </van-popup>

      <van-button @click="toggleRightPopup">右侧弹出</van-button>
      <van-popup
        :show="isShow.right"
        position="right"
        custom-class="right"
        @close="toggleRightPopup"
      >
        <van-button @click="toggleRightPopup" class="demo-margin-right"
          >关闭弹层</van-button
        >

        <van-button @click="toggleRightPopup2">右侧弹出</van-button>
        <van-popup
          :show="isShow.right2"
          position="right"
          custom-class="right"
          @close="toggleRightPopup2"
        >
          <van-button @click="toggleRightPopup2">关闭弹层</van-button>
        </van-popup>
      </van-popup>
    </wrap>
    <van-toast id="van-toast" />
  </div>
</template>

<script>
import wrap from '@/components/wrap';
import Toast from '../../wxcomponents/vant/toast/toast';
export default {
  data() {
    return {
      isShow: {
        middle: false,
        top: false,
        bottom: false,
        right: false,
        right2: false,
      },
    };
  },
  methods: {
    show() {
      Toast('我是弹窗哈哈');
    },
    toggle(type) {
      console.log(type);
      this.isShow[type] = !this.isShow[type];
    },
    togglePopup() {
      console.log("togglePopup");
      this.toggle('middle');
    },

    toggleRightPopup() {
      this.toggle('right');
    },

    toggleRightPopup2() {
      this.toggle('right2');
    },

    toggleBottomPopup() {
      this.toggle('bottom');
    },

    toggleTopPopup() {
      this.toggle('top');
      setTimeout(() => {
        this.toggle('top');
      }, 2000);
    },
  },
  components: {
    wrap,
  },
};
</script>

<style>
:host {
  font-size: 16px;
}

.center {
  width: 60%;
  padding: 20px;
  text-align: center;
  box-sizing: border-box;
}

.top {
  color: #fff;
  width: 100%;
  padding: 20px;
  border-radius: 0;
  line-height: 20px;
  background-color: rgba(0, 0, 0, 0.8) !important;
}

.bottom {
  width: 100%;
  padding: 20px;
  line-height: 100px;
  background-color: #fff;
}

.right {
  width: 100%;
  height: 100%;
  padding: 20px;
}
.van-button {
  margin: 5px;
}
</style>
