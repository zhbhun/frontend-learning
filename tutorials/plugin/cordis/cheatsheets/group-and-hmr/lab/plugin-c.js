// 插件 C：默认 disabled 的对照项
export default () => {
  console.log('[plugin-c] apply')
  return () => console.log('[plugin-c] dispose')
}
