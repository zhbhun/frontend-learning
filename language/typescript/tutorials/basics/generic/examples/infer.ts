// 泛型推导
(function () {
  // React 函数组件
  type FunctionComponentType<P> = (props: P) => any;
  type TypeOfFunctionComponentProps<T extends FunctionComponentType<any>> =
    T extends FunctionComponentType<infer P> ? P : {};
  interface FunctionComponentProps {
    name: string;
  }
  function FunctionComponent(props: FunctionComponentProps) {}
  type FunctionComponentPropsByInfer = TypeOfFunctionComponentProps<
    typeof FunctionComponent
  >; // FunctionComponentProps

  // React 类组件
  class Component<P> {
    props: P;
  }
  type ClassComponentType<P> = new (props: P) => Component<P>;
  type ComponentProps<T extends ClassComponentType<any>> =
    T extends ClassComponentType<infer P> ? P : {};
  interface ClassComponentProps {
    name: string;
  }
  class ClassComponent extends Component<ClassComponentProps> {}
  type ClassComponentPropsByInfer = ComponentProps<typeof ClassComponent>; // ClassComponentProps
})();
