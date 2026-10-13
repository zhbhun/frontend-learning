/*
quill-cursors 的 package exports 只暴露 './css' 子路径(不带 .css 后缀):
Vite 运行时可以解析,TypeScript 需要一条副作用导入声明。
运行时解析链见 node_modules/quill-cursors/package.json 的 exports 字段。
*/
declare module 'quill-cursors/css';
