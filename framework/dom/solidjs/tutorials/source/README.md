- input:

  ```js
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
    const increment = () => setCount(count() + 1);
    return (
      <button type="button" onClick={increment}>
        <Value content={count()} />
      </button>
    );
  }

  render(() => <App />, document.getElementById("app")!);
  ```

- output

  ```js
  import { template as _$template } from "solid-js/web";
  import { delegateEvents as _$delegateEvents } from "solid-js/web";
  import { createComponent as _$createComponent } from "solid-js/web";
  import { effect as _$effect } from "solid-js/web";
  import { insert as _$insert } from "solid-js/web";
  var _tmpl$ = /*#__PURE__*/_$template(`<span>`),
    _tmpl$2 = /*#__PURE__*/_$template(`<button type=button>`);
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
    const increment = () => setCount(count() + 1);
    return (() => {
      var _el$2 = _tmpl$2();
      _el$2.$$click = increment;
      _$insert(_el$2, _$createComponent(Value, {
        get content() {
          return count();
        }
      }));
      return _el$2;
    })();
  }
  render(() => _$createComponent(App, {}), document.getElementById("app"));
  _$delegateEvents(["click"]);
  ```
