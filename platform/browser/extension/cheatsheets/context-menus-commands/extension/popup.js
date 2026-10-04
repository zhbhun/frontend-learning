// _execute_action 不会派发 commands.onCommand。
// 需要在 popup 打开时运行的逻辑放在 popup 的 DOMContentLoaded 里。
document.addEventListener('DOMContentLoaded', () => {
  console.log('popup 已打开');
});
