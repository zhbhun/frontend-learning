<template>
  <scroll-view
    :scroll-x="false"
    :scroll-y="false"
    class="container"
    @tap="handleTap"
  >
    <text>{{ count }}</text>
    <button @tap="handleIncrease">increase</button>
    <button @tap="handleDecrease">decrease</button>
  </scroll-view>
</template>

<script lang="ts">
import { PropType} from "vue";
import { defineComponent, ref } from "@vue/composition-api";

/**
 * 用户
 */
export interface User {
  /** 姓名 */
  name: string;
  /** 年龄 */
  age?: number;
}

export default defineComponent({
  props: {
    /**
     * 数字
     */
    number: Number,
    /**
     * 布尔
     */
    boolean: {
      type: Boolean,
      required: false,
    },
    /**
     * 字符
     */
    string: {
      type: String,
      required: true,
    },
    /**
     * 对象
     */
    object: Object as PropType<User>,
    /**
     * 数组
     */
    array: {
      type: Array as PropType<User[]>,
      required: false,
    },
  },
  setup(props) {
    console.log(props.object?.name);
    const count = ref(0);
    const handleTap = () => {
      console.log("taped");
    };
    const handleIncrease = () => {
      count.value += 1;
    };
    const handleDecrease = () => {
      count.value -= 1;
    };
    return {
      count,
      handleTap,
      handleIncrease,
      handleDecrease,
    };
  },
});
</script>

<style scoped lang="scss">
.container {
  color: red;
}
</style>
