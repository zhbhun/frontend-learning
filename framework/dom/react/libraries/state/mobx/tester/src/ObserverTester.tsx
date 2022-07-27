import React from "react";
import { Observer, useLocalObservable } from "mobx-react";

export default () => {
  const state = useLocalObservable(() => ({
    user: {
      age: 0,
    },
    increase() {
      this.user.age += 1;
    },
  }));
  console.log(">> tester", Date.now());
  return (
    <div>
      <Observer>
        {() => {
          console.log(">> tester Observer", Date.now(), state.user);
          return (
            <button onClick={() => state.increase()}>{state.user.age}</button>
          );
        }}
      </Observer>
    </div>
  );
};
