// 插件 B：每秒心跳，观察热重载后实例重建
export default (ctx) => {
  console.log('[plugin-b] apply')
  ctx.effect(() => {
    const timer = setInterval(() => console.log('[plugin-b] tick v1'), 1000)
    return () => { clearInterval(timer); console.log('[plugin-b] timer disposed') }
  })
  return () => console.log('[plugin-b] dispose')
}
