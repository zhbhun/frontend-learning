/**
 * React 核心功能
 */

export default {
  path: 'react',
  title: 'React',
  routes: [
    require('./dom').default,
    require('./element').default,
    require('./component').default,
  ],
};
