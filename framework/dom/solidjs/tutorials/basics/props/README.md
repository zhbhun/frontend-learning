# 属性

- signal 传递给组件属性：创建组件实例时会将对应属性转换为 getter 属性，然后在 get 方法里调用获取 signal 值（这里会产生依赖收集）

    ```tsx
    function App() {
        const [count, setCount] = createSignal(0);
        const handleClick = () => {
            setCount((currCount) => currCount + 1);
        };
        return (
            <div onClick={handleClick}>
                <Demo count={count()} />
            </div>
        );
    }
    // 编译后
    import {
        insert as _$insert,
        template as _$template,
    } from "solid-js/web";
    const _tmpl$ = /*#__PURE__*/ _$template(`<div></div>`, 2);
    function App() {
        const [count, setCount] = createSignal(0);
        const handleClick = () => {
            setCount((currCount) => currCount + 1);
        };
        return (() => {
            const _el$ = _tmpl$.cloneNode(true);
            _el$.$$click = handleClick;
            _$insert(
                _el$,
                _$createComponent(Demo, {
                    get count() {
                        return count();
                    },
                })
            );
            return _el$;
        })();
    }
    ```

- props 透传给子组件属性：创建组件实例时会将对应属性转换为 getter 属性，然后在 get 方法里返回对应需要透传的属性（这里会产生依赖收集）

    ```tsx
    function Demo(props: { count: number }) {
        console.log(">> demo", props.count);
        return <Child count={props.count} />;
    }
    // 编译后
    function Demo(props) {
        console.log(">> demo", props.count);
        return _$createComponent(Child, {
            get count() {
                return props.count;
            },
        });
    }
    ```

- props 或 signal 传递给 DOM 元素属性：通过 effect 包装来设置 DOM 元素属性（副作用函数会收集调用时的依赖，对应依赖变化时重新执行副作用函数）

    ```tsx
    function Child(props: { count: number }) {
        console.log(">> child", props.count);
        return <div data-count={props.count}>{props.count}</div>;
    }
    // 编译后
    import {
        effect as _$effect,
        insert as _$insert,
        setAttribute as _$setAttribute,
        template as _$template,
    } from "solid-js/web";
    const _tmpl$ = /*#__PURE__*/ _$template(`<div></div>`, 2);
    function Child(props) {
        console.log('>> child', props.count);
        return (()=>{
            const _el$2 = _tmpl$.cloneNode(true);
            _$insert(_el$2, ()=>props.count);
            _$effect(()=>_$setAttribute(_el$2, "data-count", props.count));
            return _el$2;
        }】)();
    }
    ```
