<script setup>
const data = Array.from(Array(20)).map((item,index)=>index);
</script>

<template>
  <div class="page">
    <div v-for="item in data" class="item">{{ item }}</div>
    <van-popup show position="top" :style="{ height: '30%' }">
      <div class="demo">
        <div v-for="item in data" class="item">{{ item }}</div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
* {
  user-select: none;
}
.item {
  flex-shrink: 0;
  font-size: 50px;
  color: red;
}
.page {
  height: 100vh;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}
.page .item {
  height: 100px;
}
.page .item:nth-child(2n) {
  background-color: #f6ffed;
}
.page .item:nth-child(2n + 1) {
  background-color: #e6fffb;
}
.demo {
  height: 100%;
  background-color: #999;
  opacity: 0.8;
  overflow: auto;
  display: flex;
  flex-wrap: nowrap;
  flex-direction: row;
  -webkit-overflow-scrolling: touch;
}
.demo .item {
  width: 100px;
}
.demo .item:nth-child(2n) {
  background-color: #ffbb96;
}
.demo .item:nth-child(2n + 1) {
  background-color: #ffa39e;
}
</style>
