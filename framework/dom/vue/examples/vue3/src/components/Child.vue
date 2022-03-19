<script setup>
import { onUpdated } from "vue";

defineProps({
  user: Object,
});

onUpdated(() => {
  console.log(">> ", Date.now(), "child updated");
});
</script>

<template>
  <h1>{{ (user && user.name) || "..." }}</h1>
</template>

<style scoped>
h1 {
  color: #42b983;
}
</style>
