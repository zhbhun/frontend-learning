/* eslint-disable no-restricted-syntax */
import Rematch from './rematch';
import isListener from './utils/isListener';
import mergeConfig from './utils/mergeConfig';

// allows for global dispatch to multiple stores
const stores = {};
const dispatches = {};

/**
 * global Dispatch
 *
 * calls store.dispatch in all stores
 * @param action
 */
export const dispatch = (action) => {
  for (const storeName of Object.keys(stores)) {
    stores[storeName].dispatch(action);
  }
};

/**
 * global getState
 *
 * loads state from all stores
 * returns an object with key: storeName, value: store.getState()
 */
export const getState = () => {
  const state = {};
  for (const name of Object.keys(stores)) {
    state[name] = stores[name].getState();
  }
  return state;
};

/**
 * init
 *
 * generates a Rematch store
 * with a set configuration
 * @param config
 */
export const init = (initConfig = {}) => {
  const name = initConfig.name || Object.keys(stores).length.toString();
  const config = mergeConfig({ ...initConfig, name });
  const store = new Rematch(config).init();
  stores[name] = store;
  for (const modelName of Object.keys(store.dispatch)) {
    if (!dispatch[modelName]) {
      dispatch[modelName] = {};
    }
    for (const actionName of Object.keys(store.dispatch[modelName])) {
      if (!isListener(actionName)) {
        const action = store.dispatch[modelName][actionName];
        if (!dispatches[modelName]) {
          dispatches[modelName] = {};
        }
        if (!dispatches[modelName][actionName]) {
          dispatches[modelName][actionName] = {};
        }
        dispatches[modelName][actionName][name] = action;
        dispatch[modelName][actionName] = (payload, meta) => {
          for (const storeName of Object.keys(
            dispatches[modelName][actionName],
          )) {
            stores[storeName].dispatch[modelName][actionName](payload, meta);
          }
        };
      }
    }
  }
  return store;
};

export default {
  dispatch,
  getState,
  init,
};
