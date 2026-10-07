/**
 * 范例介绍：WebContentsView 的完整主进程参考实现——挂载、独立会话、缩放跟随与视图内导航。
 * 前置：沿用 Forge 模板项目（src/index.js + index.html），需要联网加载远程页面。
 * 操作：运行后观察窗口底部的嵌入条；拖动窗口大小观察跟随；点击嵌入区再打字看焦点。
 * 预期：嵌入条始终贴住窗口底部；缩放后跟随；键盘输入进入嵌入页面。
 * 阅读主线：WebContentsView 不是 DOM 元素——挂载、布局、会话、控制全由主进程负责。
 */
const { app, BrowserWindow, WebContentsView } = require('electron');
const path = require('node:path');

const EMBED_HEIGHT = 200;

const createWindow = () => {
  const win = new BrowserWindow({ width: 960, height: 640 });
  win.loadFile(path.join(__dirname, 'index.html'));

  // webPreferences 与 BrowserWindow 同构：独立分区让 cookie、登录态不混入宿主窗口
  const embed = new WebContentsView({
    webPreferences: { partition: 'persist:embed' },
  });
  win.contentView.addChildView(embed); // 挂到窗口的内容视图：后加的在上层
  embed.setBackgroundColor('#ffffff'); // 打底色，避免远程页面加载完成前闪透
  embed.webContents.loadURL('https://www.electronjs.org');

  // bounds 是静态的：坐标相对父容器，窗口缩放要在这里重算
  const layoutEmbed = () => {
    const { width, height } = win.getContentBounds();
    embed.setBounds({ x: 0, y: height - EMBED_HEIGHT, width, height: EMBED_HEIGHT });
  };
  layoutEmbed();
  win.on('resize', layoutEmbed);

  // 嵌入页里点出的新窗口也归主进程管：留在同一视图里打开
  embed.webContents.setWindowOpenHandler(({ url }) => {
    embed.webContents.loadURL(url);
    return { action: 'deny' };
  });

  // 宿主页面与嵌入视图之间没有通道：数据交换必须经主进程转手
  embed.webContents.on('did-finish-load', () => {
    console.log('[嵌入视图] 加载完成：', embed.webContents.getURL());
  });
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
