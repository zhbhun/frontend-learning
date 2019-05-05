import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import Counter from './components/Counter';
import counter from './reducers';
import { increment, decrement } from './actions';

const store = createStore(counter);
const rootEl = document.getElementById('root');

function render() {
  ReactDOM.render(
    <Counter
      value={store.getState()}
      onIncrement={() => store.dispatch(increment())}
      onDecrement={() => store.dispatch(decrement())}
    />,
    rootEl
  );
}

render()
store.subscribe(render)
