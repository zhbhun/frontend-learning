/**
 * 会话分区参考实现：persist: 前缀决定落盘，同名分区共享同一份档案。
 *
 * 前置状态：依赖 Electron 运行时与同目录的 index.html；分区数据写在
 * userData 下的独立目录（默认会话直接用 userData）。
 * 运行方式：放进 Forge 项目的 src/ 替换 index.js（npm start 或 rs 重启）。
 *
 * 预期结果：窗口 A 用 persist:work 分区，写入的 cookie 与站点数据重启后
 * 仍在；窗口 B 用 temp 分区，退出后它的数据全部消失；窗口与主进程各自
 * fromPartition 拿到的是同一份会话。
 *
 * 阅读主线：分区字符串的两种写法 → 绑定窗口 → 同名共享 → 内存会话的边界。
 */
const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');

const createWindow = () => {
  // 窗口 A：持久分区——persist: 前缀决定数据落盘，同名分区全应用共享
  const windowA = new BrowserWindow({
    width: 800,
    height: 560,
    webPreferences: {
      partition: 'persist:work',
    },
  });
  windowA.loadFile(path.join(__dirname, 'index.html'));

  // 窗口 B：内存分区——没有 persist: 前缀，数据只存内存，退出即清；
  // 两个页面各自写 localStorage 时互不可见，这就是分区的隔离效果
  const windowB = new BrowserWindow({
    width: 800,
    height: 560,
    webPreferences: {
      partition: 'temp',
    },
  });
  windowB.loadFile(path.join(__dirname, 'index.html'));

  // 分区只能在创建窗口时指定，指定后不可更改；
  // 窗口实际用哪个会话可从 webContents.session 只读读出
  console.log('窗口 A 的落盘位置：', windowA.webContents.session.getStoragePath());
};

app.whenReady().then(() => {
  // 主进程不经过窗口也能拿同一份会话：相同 partition 返回同一个实例
  const work = session.fromPartition('persist:work');
  // options（如 cache: false）只对从未用过的分区生效，用过再传会被忽略

  console.log('persist:work 落盘位置：', work.getStoragePath());
  // 内存分区没有目录可写：getStoragePath() 返回 null
  console.log('temp 落盘位置：', session.fromPartition('temp').getStoragePath());

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
