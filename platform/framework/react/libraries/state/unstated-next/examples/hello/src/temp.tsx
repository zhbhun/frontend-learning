import React, { useCallback, useEffect, useMemo, useRef } from "react";

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
  useHook: (initialState?: State) => Value
): Container<Value, State> {
  let Context = React.createContext<Value | typeof EMPTY>(EMPTY);

  function Provider(props: ContainerProviderProps<State>) {
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
    let value = React.useContext(Context);
    if (value === EMPTY) {
      throw new Error("Component must be wrapped with <Container.Provider>");
    }
    return value;
  }

  return { Provider, useContainer };
}

export function useContainer<Value, State = void>(
  container: Container<Value, State>
): Value {
  return container.useContainer();
}
