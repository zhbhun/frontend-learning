import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";

class CounterStore {
  value = 0;

  constructor() {
    makeObservable(this, {
      value: observable,
      increase: action,
    });
  }

  increase() {
    this.value += 1;
  }
}

const counterStore = new CounterStore();

export default observer(() => {
  return <button onClick={() => counterStore.increase()}>{counterStore.value}</button>;
});
