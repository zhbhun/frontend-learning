import { useLocalObservable, useObserver } from "mobx-react";

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
      {useObserver(() => {
        console.log(">> tester useLocalObservable", Date.now(), state.user);
        return (
          <button onClick={() => state.increase()}>{state.user.age}</button>
        );
      })}
    </div>
  );
};
