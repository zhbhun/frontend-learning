/**
 * Hook
 */

export default {
  path: 'hook',
  title: 'Hook',
  routes: [
    require('./UseContext').default,
    require('./UseEffect').default,
    require('./UseEffectWithCleanup').default,
    require('./UseState').default,
  ],
};
