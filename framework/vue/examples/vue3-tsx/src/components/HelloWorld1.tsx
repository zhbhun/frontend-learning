import { PropType, defineComponent } from "vue";

interface User {
  readonly name: string;
  readonly sex: number;
}

export const InputProps = {
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
}

const Input = defineComponent({
  props: InputProps,

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

    return () => <input value={props.value} onInput={handleChange} />;
  }
});

export default Input;
