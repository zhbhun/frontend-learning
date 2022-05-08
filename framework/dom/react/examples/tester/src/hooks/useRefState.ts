import { useEffect, useRef, useState } from "react";

function useRefState<S = any>(initialState: S) {
  const [state, setState] = useState(initialState);
  const instatnce = useRef({
    state,
    setState: (newState: Partial<any> | ((currentState: S) => void)) => {
      if (typeof newState === "function") {
        setState((currentState) =>
          Object.assign({}, state, newState(currentState))
        );
      } else {
        setState(Object.assign({}, state, newState));
      }
    },
  });
  useEffect(() => {
    instatnce.current.state = state;
  }, [state, setState]);
  return instatnce;
}

export default useRefState;
