<template>
  <div class="home">
    <Test />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Test from "@/components/Test";

export default defineComponent({
  name: "Home",
  components: {
    Test
  }
});
</script>
