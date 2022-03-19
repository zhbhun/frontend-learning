<script setup>
import { reactive, onUpdated } from "vue";
import Child from './Child.vue'

const state = reactive({
  title: "Parent",
  user: {
    name: "1",
  },
});

onUpdated(() => {
  console.log(">> ", Date.now(), "parent updated");
});
</script>

<template>
  <h1>{{ state.title }}</h1>
  <button @click="state.title = Date.now()">change parent</button>
  <button @click="state.user.name = Date.now()">change child</button>
  <Child :user="state.user" />
</template>

<style scoped>
h1 {
  color: #42b983;
}
</style>
