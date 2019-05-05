/**
 * 组件生命周期
 */

export default {
  path: 'lifecycle',
  title: 'Lifecycle',
  routes: [
    'Sequence',
    require('./Mounting').default,
    require('./PropsUpdating').default,
    require('./StateUpdating').default,
    require('./ForceUpdating').default,
    require('./Unmounting').default,
    'Methods',
    require('./RenderTest').default,
  ],
};
