- input:

  ```js
  import { render } from "solid-js/web";
  import { createSignal } from "solid-js";

  function PropsTetser(props: any) {
    return (
      <>
      <div>{PropsTester.value}</div>
      <div>{PropsTester.value + 1}</div>
      </>
    );
  }

  function Counter(props: any) {
    const [count, setCount] = createSignal();
    const increment = () => setCount(count() + 1);
    return (
      <>
        <button name={counter()} type="button" onClick={increment}>
          {count()}
        </button>
        <div name={count() + 1}>
          {count() + 1}
        </div>
      </>
    );
  }

  function App() {
    const [value, setValue] = createSignal(0);
    return (
      <>
        <PropsTester value={value() + 1} />
        <Counter />
      </>
    );
  }

  render(() => <Counter />, document.getElementById("app")!);

  ```

- output

  ```js
  import { template as _$template } from "solid-js/web";
  import { delegateEvents as _$delegateEvents } from "solid-js/web";
  import { createComponent as _$createComponent } from "solid-js/web";
  import { setAttribute as _$setAttribute } from "solid-js/web";
  import { effect as _$effect } from "solid-js/web";
  import { insert as _$insert } from "solid-js/web";
  var _tmpl$ = /*#__PURE__*/_$template(`<div>`),
    _tmpl$2 = /*#__PURE__*/_$template(`<button type=button>`);
  import { render } from "solid-js/web";
  import { createSignal } from "solid-js";
  function PropsTetser(props) {
    return [(() => {
      var _el$ = _tmpl$();
      _$insert(_el$, () => PropsTester.value);
      return _el$;
    })(), (() => {
      var _el$2 = _tmpl$();
      _$insert(_el$2, () => PropsTester.value + 1);
      return _el$2;
    })()];
  }
  function Counter(props) {
    const [count, setCount] = createSignal();
    const increment = () => setCount(count() + 1);
    return [(() => {
      var _el$3 = _tmpl$2();
      _el$3.$$click = increment;
      _$insert(_el$3, count);
      _$effect(() => _$setAttribute(_el$3, "name", counter()));
      return _el$3;
    })(), (() => {
      var _el$4 = _tmpl$();
      _$insert(_el$4, () => count() + 1);
      _$effect(() => _$setAttribute(_el$4, "name", count() + 1));
      return _el$4;
    })()];
  }
  function App() {
    const [value, setValue] = createSignal(0);
    return [_$createComponent(PropsTester, {
      get value() {
        return value() + 1;
      }
    }), _$createComponent(Counter, {})];
  }
  render(() => _$createComponent(Counter, {}), document.getElementById("app"));
  _$delegateEvents(["click"]);
  ```
