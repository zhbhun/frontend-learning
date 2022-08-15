import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";

let count = 0;

class MapStore {
  value = new Map([[0, { value: Date.now() }]]);

  constructor() {
    makeObservable(this, {
      value: observable,
      add: action,
      update: action,
    });
  }

  add() {
    this.value.set(++count, { value: Date.now() });
    console.log(">> add", this.value);
  }

  assign() {
    this.value.set(count, { value: Date.now() });
    console.log(">> assign", this.value);
  }

  update() {
    const item = this.value.get(count);
    if (item?.value) {
      item.value = Date.now();
    }
    console.log(">> update", this.value);
  }
}

const mapStore = new MapStore();

export default observer(() => {
  return (
    <div ref={(ref) => console.log(ref)}>
      <button onClick={() => mapStore.add()}>add: {mapStore.value.size}</button>
      <button onClick={() => mapStore.assign()}>
        assign: {JSON.stringify(mapStore.value.get(count))}
      </button>
      <button onClick={() => mapStore.update()}>
        update: {JSON.stringify(mapStore.value.get(count))}
      </button>
    </div>
  );
});
