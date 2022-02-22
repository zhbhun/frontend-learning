import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { render } from "react-dom";

export const XXXContext = React.createContext<{\
  model: Function,
  unmodel: Function,
}>(null);

const EMPTY: unique symbol = Symbol();

export interface ContainerProviderProps<State = void> {
  initialState?: State;
  children: React.ReactNode;
}

export interface Container<Value, State = void> {
  Provider: React.ComponentType<ContainerProviderProps<State>>;
  useContainer: () => Value;
}

export function createContainer<Value, State = void>(
  models
): Container<Value, State> {
  let Context = React.createContext<Value | typeof EMPTY>(EMPTY);



  function Provider(props: ContainerProviderProps<State>) {
    const $this = useRef<{
      value: Value;
      listeners: Function[];
    }>({
      value,
      listeners: [],
    });
    const model = useCallback(() => {

    }, [])
    const unmodel = useCallback(() => {

    }, [])
    const contextValue = useMemo(() => {
      return {
        getState: () => $this.current.value,
        subscribe,
      };
    }, [$this, subscribe]);
    useEffect(() => {
      $this.current.listeners.forEach((listen) => listen());
    }, [$this, value]);
    return (
      <Context.Provider value={contextValue}>{props.children}</Context.Provider>
    );
  }

  function useContainer(): Value {
    let xxxContenxt = React.useContext(XXXContext);
    // if (value === EMPTY) {
    //   throw new Error("Component must be wrapped with <Container.Provider>");
    // }
    // return value;
    return xxxContenxt;
  }

  return { Provider, useContainer };
}

export function useModel<Value, State = void>(
  container: Container<Value, State>
): Value {
  return container.useContainer();
}

export function createModel<Value, State = void>(
  useHook: (initialState?: State) => Value
): Container<Value, State> {
  let Context = React.createContext<Value | typeof EMPTY>(EMPTY);

  function Provider(props: ContainerProviderProps<State>) {
    const xxxContext = useContext(XXXContext);
    let value = useHook(props.initialState);
    const $this = useRef<{
      value: Value;
      listeners: Function[];
    }>({
      value,
      listeners: [],
    });
    const subscribe = useCallback(
      (callback: Function) => {
        $this.current.listeners.push(callback);
      },
      [$this]
    );
    const contextValue = useMemo(() => {
      return {
        getState: () => $this.current.value,
        subscribe,
      };
    }, [$this, subscribe]);
    useEffect(() => {
      $this.current.listeners.forEach((listen) => listen());
    }, [$this, value]);
    return (
      <Context.Provider value={contextValue}>{props.children}</Context.Provider>
    );
  }

  function useContainer(): Value {
    let value = React.useContext(XXXContext);
    if (value === EMPTY) {
      throw new Error("Component must be wrapped with <Container.Provider>");
    }
    return value;
  }

  return { Provider, useContainer };
}

// ---

function useCounter(initialState = 0) {
  let [count, setCount] = useState(initialState);
  let decrement = () => setCount(count - 1);
  let increment = () => setCount(count + 1);
  return { count, decrement, increment };
}

let Counter = createModel(useCounter);
