export default [
  {
    path: '/user',
    layout: false,
    routes: [
      { name: '登录', path: '/user/login', component: './user/Login' },
      { component: './404' },
    ],
  },
  { path: '/welcome', name: '欢迎', icon: 'smile', component: './Welcome' },
  {
    path: '/admin',
    name: '管理页',
    icon: 'crown',
    access: 'canAdmin',
    component: './Admin',
    routes: [
      { path: '/admin/sub-page', name: '二级管理页', icon: 'smile', component: './Welcome' },
      { component: './404' },
    ],
  },
  { name: '查询表格', icon: 'table', path: '/list', component: './TableList' },
  {
    name: '表单',
    icon: 'form',
    path: '/pro-form',
    routes: [
      { name: '基础使用', icon: 'smile', path: '/pro-form/basic', component: './pro-form/basic' },
    ],
  },
  {
    name: '表格',
    icon: 'table',
    path: '/pro-table',
    routes: [
      { name: '基础使用', icon: 'smile', path: '/pro-table/basic', component: './pro-table/basic' },
    ],
  },
  { path: '/', redirect: '/welcome' },
  { component: './404' },
];
