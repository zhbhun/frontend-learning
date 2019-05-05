import { createStore, combineReducers, __DO_NOT_USE__ActionTypes as ActionTypes } from 'redux';

const __ = (state = {}, action) => {
  console.log(action, state);
  if (
    action.type === '@@INIT' ||
    action.type === ActionTypes.REPLACE ||
    action.type === ActionTypes.INIT
  ) {
    // return {
    //   ts: Date.now(),
    // };
  }
  return state;
};
const homeReducer = (state = {}) => {
  return state;
};
const detailReducer = (state = {}) => {
  return state;
};


const reducers1 = combineReducers({
  __,
  home: homeReducer,
  detail: detailReducer
});
const store = createStore(reducers1, window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());
console.log(store.getState());

setTimeout(() => {
  // app come back to hoem page from detail page
  // new reducers remove detail reducer, but detail state is still in store
  const reducers2 = combineReducers({
    __,
    home: detailReducer
  });
  store.replaceReducer(reducers2);
  console.log(store.getState());
}, 1000);


setTimeout(() => {
  store.replaceReducer(reducers1);
  console.log(store.getState());
}, 2000);
