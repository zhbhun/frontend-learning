<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ msg: string }>()

const count = ref(0)
</script>

<template>
  <div class="a" @click="count++">{{count}}</div>
</template>

<style scoped>
.a {
  color: blue;
}
</style>
