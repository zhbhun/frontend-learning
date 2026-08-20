/*
 * Vite 显式 URL 导入的补充声明(vite/client 自带 *?url 与 *?raw)。
 * `?url&no-inline` 在 ?url 基础上禁止把小文件内联为 data: URI,
 * 让 Phaser Loader 在开发与静态构建下都拿到真实 HTTP URL。
 */
declare module '*?url&no-inline' {
  const src: string;
  export default src;
}
