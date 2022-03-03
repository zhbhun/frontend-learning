/**
 * React Component
 */

export default {
  path: 'component',
  title: 'Component',
  routes: [
    require('./hook').default,
    require('./lifecycle').default,
    require('./state').default,
  ],
};
