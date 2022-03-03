<template>
  <input :value="value" @input="handleChange" />
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";

interface User {
  readonly name: string;
  readonly sex: number;
}

const Input = defineComponent({
  props: {
    value: {
      type: String,
      required: true
    },
    user: {
      type: Object as PropType<User>
    },
    onChange: {
      type: Function
    }
  },

  setup(props, context) {
    const handleChange = (event: Event) => {
      console.log(
        props.value,
        props.user?.name,
        props.user?.sex,
        props.onChange
      );
      console.log(context.attrs);
      // props.onChange(event.target.value);
    };

    return {
      handleChange
    };
  }
});

// const Input1 = 1;

export default Input;
</script>

<style></style>
