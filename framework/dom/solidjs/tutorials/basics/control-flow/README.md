## 控制流

### Show

Show 基本等价于三元表达式，两者均能按需渲染对应了解的元素（不会创建不符合条件的到的元素），但 Show 的可读性会更好。有时候为了避免模板代码过于复杂或者为了复用模板，会将目标提取到独立的渲染函数内，这时候如果使用了 if 条件控制渲染不同的元素，可能会导致 DOM 元素返回销毁和闯将。

-   IF

    ```tsx
    const renderButton = () => {
        console.log(">> render");
        if (loggedIn()) {
            return <button onClick={toggle}>Log out</button>;
        }
        return <button onClick={toggle}>Log in</button>;
    };

    <section>
        <h2>IF</h2>
        {renderButton()}
    </section>;
    // 编译后
    const _tmpl$ = /*#__PURE__*/ _$template(`<section><h2>IF</h2></section>`, 4),
        _tmpl$2 = /*#__PURE__*/ _$template(`<button>Log out</button>`, 2),
        _tmpl$3 = /*#__PURE__*/ _$template(`<button>Log in</button>`, 2);
    const renderButton = () => {
        console.log(">> render");
        if (loggedIn()) {
            return (() => {
                const _el$ = _tmpl$3.cloneNode(true);
                _el$.$$click = toggle;
                return _el$;
            })();
        }
        return (() => {
            const _el$2 = _tmpl$2.cloneNode(true);
            _el$2.$$click = toggle;
            return _el$2;
        })();
    };
    (() => {
        const _el$3 = _tmpl$3.cloneNode(true),
            _el$4 = _el$3.firstChild;
        // renderButton 传入 _$insert 这个副作用函数内渲染时会收集 renderButton 内的响应式依赖，loggedIn 变化时会重新执行 renderButton 方法，而且每次都是返回新的 DOM 元素。
        // 优化方案是，将 Show 一起放到 renderButton 里面。
        _$insert(_el$3, renderButton, null);
        return _el$3;
    })();
    ```

-   三元表达式

    ```tsx
    <section>
        <h2>Ternaries</h2>
        {loggedIn() ? (
            <button onClick={toggle}>Log out</button>
        ) : (
            <button onClick={toggle}>Log in</button>
        )}
    </section>;
    // 编译后
    const _tmpl$ = /*#__PURE__*/ _$template(
            `<section><h2>Ternaries</h2></section>`,
            4
        ),
        _tmpl$2 = /*#__PURE__*/ _$template(`<button>Log out</button>`, 2),
        _tmpl$3 = /*#__PURE__*/ _$template(`<button>Log in</button>`, 2);
    (() => {
        const _el$ = _tmpl$.cloneNode(true),
            _el$2 = _el$.firstChild;
        _$insert(
            _el$,
            (() => {
                const _c$ = _$memo(() => !!loggedIn());
                return () =>
                    _c$()
                        ? (() => {
                              const _el$3 = _tmpl$2.cloneNode(true);
                              _el$3.$$click = toggle;
                              return _el$3;
                          })()
                        : (() => {
                              const _el$4 = _tmpl$3.cloneNode(true);
                              _el$4.$$click = toggle;
                              return _el$4;
                          })();
            })(),
            null
        );
        return _el$;
    })();
    ```

-   Show

    ```tsx
    <section>
        <h2>Show</h2>
        <Show
            when={loggedIn()}
            fallback={<button onClick={toggle}>Log in</button>}
        >
            <button onClick={toggle}>Log out</button>
        </Show>
    </section>;
    // 编译后
    const _tmpl$ = /*#__PURE__*/ _$template(
            `<section><h2>Show</h2></section>`,
            4
        ),
        _tmpl$2 = /*#__PURE__*/ _$template(`<button>Log out</button>`, 2),
        _tmpl$3 = /*#__PURE__*/ _$template(`<button>Log in</button>`, 2);
    (() => {
        const _el$5 = _tmpl$.cloneNode(true),
            _el$6 = _el$5.firstChild;
        _$insert(
            _el$5,
            _$createComponent(Show, {
                get when() {
                    return loggedIn();
                },
                get fallback() {
                    return (() => {
                        const _el$8 = _tmpl$3.cloneNode(true);
                        _el$8.$$click = toggle;
                        return _el$8;
                    })();
                },
                get children() {
                    const _el$7 = _tmpl$2.cloneNode(true);
                    _el$7.$$click = toggle;
                    return _el$7;
                },
            }),
            null
        );
        return _el$5;
    })();
    ```
