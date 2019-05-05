var store = Redux.createStore(counter);

render();
store.subscribe(render);
