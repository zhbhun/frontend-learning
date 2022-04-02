<template>
  <div class="p-5px mt-[0.3px]">1</div>
  <button class="bg-hex-b2a8bb">11</button>
  <button class="bg-[hsl(211.7,81.9%,69.6%)]">11</button>
  <div class="grid-cols-[auto,1fr,30px]">111</div>
  <img alt="Vue logo" src="./assets/logo.png" />
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "App",
});
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
