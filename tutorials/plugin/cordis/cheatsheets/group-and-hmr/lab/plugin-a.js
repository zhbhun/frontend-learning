// 插件 A：打印问候语（config.greet 由 !!js 表达式求值）
export default (ctx, config) => {
  console.log(`[plugin-a] apply, greet = ${config.greet}`)
  return () => console.log('[plugin-a] dispose')
}
