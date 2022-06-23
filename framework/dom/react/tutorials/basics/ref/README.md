# 引用

## 用法

- Class Component

    ```js
    class MyComponent extends React.Component {
      constructor(props) {
        super(props);
        this.myRef = React.createRef();
      }
      render() {
        return <div ref={this.myRef} />;
      }
    }
    ```

- Function Component

使用场景

- 管理焦点，文本选择或媒体播放。
- 触发强制动画。
- 集成第三方 DOM 库。

注意事项

- 当 ref 属性用于 HTML 元素时，构造函数中使用 React.createRef() 创建的 ref 接收底层 DOM 元素作为其 current 属性。
- ref 属性用于自定义 class 组件时，ref 对象接收组件的挂载实例作为其 current 属性。
- 不能在函数组件上使用 ref 属性，因为他们没有实例，但可以换个属性名传给子组件，然后交给子组件手动创建实例。

## 转发

- Function Component

    ```js
    const FancyButton = React.forwardRef((props, ref) => (
      <button ref={ref} className="FancyButton">
        {props.children}
      </button>
    ));
    
    // 你可以直接获取 DOM button 的 ref：
    const ref = React.createRef();
    <FancyButton ref={ref}>Click me!</FancyButton>;
    ```

- Class Component：

    Class 组件该怎么使用 forwardRef，参考 [How to use React.forwardRef in a class based component?](https://stackoverflow.com/questions/51526461/how-to-use-react-forwardref-in-a-class-based-component) 或 [dom_ref_forwarding_alternatives_before_16.3.md](https://gist.github.com/gaearon/1a018a023347fe1c2476073330cc5509)

- HOC

    ```js
    function logProps(Component) {
      class LogProps extends React.Component {
        componentDidUpdate(prevProps) {
          console.log('old props:', prevProps);
          console.log('new props:', this.props);
        }
    
        render() {
          const {forwardedRef, ...rest} = this.props;
    
          // 将自定义的 prop 属性 “forwardedRef” 定义为 ref
          return <Component ref={forwardedRef} {...rest} />;
        }
      }
    
      // 注意 React.forwardRef 回调的第二个参数 “ref”。
      // 我们可以将其作为常规 prop 属性传递给 LogProps，例如 “forwardedRef”
      // 然后它就可以被挂载到被 LogProps 包裹的子组件上。
      return React.forwardRef((props, ref) => {
        return <LogProps {...props} forwardedRef={ref} />;
      });
    }
    ```

在 DevTools 中显示自定义名称

- ForwardRef

    ```js
    const WrappedComponent = React.forwardRef((props, ref) => {
      return <LogProps {...props} forwardedRef={ref} />;
    });
    ```

- ForwardRef(myFunction)

    ```js
    const WrappedComponent = React.forwardRef(
      function myFunction(props, ref) {
        return <LogProps {...props} forwardedRef={ref} />;
      }
    );
    ```

- displayName

    ```
    function logProps(Component) {
      class LogProps extends React.Component {
        // ...
      }

      function forwardRef(props, ref) {
        return <LogProps {...props} forwardedRef={ref} />;
      }

      // 在 DevTools 中为该组件提供一个更有用的显示名。
      // 例如 “ForwardRef(logProps(MyComponent))”
      const name = Component.displayName || Component.name;
      forwardRef.displayName = `logProps(${name})`;

      return React.forwardRef(forwardRef);
    }
    ```

## 问题

### ref 回调函数重复执行？

> 如果 ref 回调函数是以内联函数的方式定义的，在更新过程中它会被执行两次，第一次传入参数 null，然后第二次会传入参数 DOM 元素。这是因为在每次渲染时会创建一个新的函数实例，所以 React 清空旧的 ref 并且设置新的。通过将 ref 的回调函数定义成 class 的绑定函数的方式可以避免上述问题，但是大多数情况下它是无关紧要的。

## 参考

- [Refs 转发](https://zh-hans.reactjs.org/docs/forwarding-refs.html)
- [Refs and the DOM](https://zh-hans.reactjs.org/docs/reconciliation.html)
- [React新文档：不要滥用Ref哦～](https://segmentfault.com/a/1190000041991074)
