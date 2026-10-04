/*
  Workspaces 练习场脚本。
  练习点 2：stamp() 把年份写死了（© 2019）——在 Sources 编辑器里把它改成
  `new Date().getFullYear()` 并保存，刷新页面后年份就是对的，磁盘上的文件也变了。
  练习点 3：CTA 点击只会往 Console 打一条消息——把它改成真实行为（如滚动或提示）。
*/

function stamp() {
  return `© 2019 云杉笔记 · 预览版权限 30 天`; // 练习点：年份写死了
}

document.querySelector('#stamp').textContent = stamp();

document.querySelector('#cta').addEventListener('click', () => {
  console.info('[练习场] CTA 被点击——行为改进练习点：让它做点真实的事情。');
});
