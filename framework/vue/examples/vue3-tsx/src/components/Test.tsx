import { ExtractPropTypes, defineComponent } from "vue";
import HelloWorld1, { InputProps } from "./HelloWorld1";
import HelloWorld2 from "./HelloWorld2.vue";

const Input = defineComponent({
  setup(props, context): any {
    return () => (
      <>
        <HelloWorld1
          value="xxx"
          user={{ name: "123", sex: 2 }}
          onChange={() => null}
        />
        <HelloWorld2
          value="yyy"
          user={{ name: "123", sex: 2 }}
          onChange={() => null}
        />
      </>
    );
  }
});

export default Input;
