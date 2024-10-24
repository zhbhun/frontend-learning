- https://github.com/solidjs/solid
- https://github.com/ryansolid/dom-expressions
- https://github.com/adamhaile/S
- [solid.js](https://juejin.cn/column/7124722390239543303)

## Example

- input:

  ```js
  import { Show } from "solid-js";
  import { render } from "solid-js/web";
  import { createSignal } from "solid-js";

  interface ValueProps {
    content: number;
  }

  function Value(props: ValueProps) {
    return (
      <span
        style={{
          color: props.content % 2 == 0 ? "#f00" : "#00f",
          "background-color": "#eee",
        }}
      >
        {props.content}
      </span>
    );
  }

  function App(props: any) {
    const [count, setCount] = createSignal(0);
    const [logs, setLogs] = createSignal<number[]>([0]);
    const increment = () => {
      const newCount = count() + 1;
      setCount(newCount);
      setLogs([...logs(), newCount]);
    };
    return (
      <>
        <button type="button" onClick={increment}>
          <Value content={count()} />
        </button>
        <Show when={count() % 2 === 1} fallback={<div>0</div>}>
          <div>1</div>
        </Show>
        <Switch fallback={<div>0</div>}>
          <Match when={count() === 1}>
            <div>1</div>
          </Match>
          <Match when={count() === 2}>
            <div>2</div>
          </Match>
        </Switch>
        <ul>
          <For each={logs()} fallback={<div>...</div>}>
            {(item, index) => (
              <li>
                #{index()} {item}
              </li>
            )}
          </For>
        </ul>
      </>
    );
  }

  render(() => <App />, document.getElementById("app")!);
  ```

- output

  ```js
  import { template as _$template } from "solid-js/web";
  import { delegateEvents as _$delegateEvents } from "solid-js/web";
  import { For as _$For } from "solid-js/web";
  import { Match as _$Match } from "solid-js/web";
  import { Switch as _$Switch } from "solid-js/web";
  import { createComponent as _$createComponent } from "solid-js/web";
  import { effect as _$effect } from "solid-js/web";
  import { insert as _$insert } from "solid-js/web";
  var _tmpl$ = /*#__PURE__*/_$template(`<span>`),
    _tmpl$2 = /*#__PURE__*/_$template(`<button type=button>`),
    _tmpl$3 = /*#__PURE__*/_$template(`<div>1`),
    _tmpl$4 = /*#__PURE__*/_$template(`<div>2`),
    _tmpl$5 = /*#__PURE__*/_$template(`<ul>`),
    _tmpl$6 = /*#__PURE__*/_$template(`<div>0`),
    _tmpl$7 = /*#__PURE__*/_$template(`<div>...`),
    _tmpl$8 = /*#__PURE__*/_$template(`<li>#<!> `);
  import { Show } from "solid-js";
  import { render } from "solid-js/web";
  import { createSignal } from "solid-js";
  function Value(props) {
    return (() => {
      var _el$ = _tmpl$();
      _el$.style.setProperty("background-color", "#eee");
      _$insert(_el$, () => props.content);
      _$effect(_$p => (_$p = props.content % 2 == 0 ? "#f00" : "#00f") != null ? _el$.style.setProperty("color", _$p) : _el$.style.removeProperty("color"));
      return _el$;
    })();
  }
  function App(props) {
    const [count, setCount] = createSignal(0);
    const [logs, setLogs] = createSignal([0]);
    const increment = () => {
      const newCount = count() + 1;
      setCount(newCount);
      setLogs([...logs(), newCount]);
    };
    return [(() => {
      var _el$2 = _tmpl$2();
      _el$2.$$click = increment;
      _$insert(_el$2, _$createComponent(Value, {
        get content() {
          return count();
        }
      }));
      return _el$2;
    })(), _$createComponent(Show, {
      get when() {
        return count() % 2 === 1;
      },
      get fallback() {
        return _tmpl$6();
      },
      get children() {
        return _tmpl$3();
      }
    }), _$createComponent(_$Switch, {
      get fallback() {
        return _tmpl$6();
      },
      get children() {
        return [_$createComponent(_$Match, {
          get when() {
            return count() === 1;
          },
          get children() {
            return _tmpl$3();
          }
        }), _$createComponent(_$Match, {
          get when() {
            return count() === 2;
          },
          get children() {
            return _tmpl$4();
          }
        })];
      }
    }), (() => {
      var _el$6 = _tmpl$5();
      _$insert(_el$6, _$createComponent(_$For, {
        get each() {
          return logs();
        },
        get fallback() {
          return _tmpl$7();
        },
        children: (item, index) => (() => {
          var _el$10 = _tmpl$8(),
            _el$11 = _el$10.firstChild,
            _el$13 = _el$11.nextSibling,
            _el$12 = _el$13.nextSibling;
          _$insert(_el$10, index, _el$13);
          _$insert(_el$10, item, null);
          return _el$10;
        })()
      }));
      return _el$6;
    })()];
  }
  render(() => _$createComponent(App, {}), document.getElementById("app"));
  _$delegateEvents(["click"]);
  ```
