/**
 * 演示数据：Chrome DevTools 官方快捷键速查表，按面板与场景分组。
 * 输入或前置状态：SHORTCUT_GROUPS 是全部分组；Controls 的「分组过滤」选中组名后由 filterShortcutGroups 过滤。
 * 主要操作：勾选或取消分组，画布立即重排。
 * 预期结果：画布只显示所选分组的快捷键；写法为 macOS / Windows（Linux 同 Windows），两个平台相同时只列一次。
 * 阅读主线：本文件是主题输入（快捷键数据本身），分栏布局与 Canvas 绘制见 shortcut-table.ts。
 */

export interface ShortcutItem {
  /** 动作的中文描述 */
  action: string;
  /** macOS 写法 */
  mac: string;
  /** Windows/Linux 写法；与 mac 相同时渲染只画一次 */
  win: string;
}

export interface ShortcutGroup {
  /** 组名，同时作为 Controls 分组过滤的选项值 */
  name: string;
  items: ShortcutItem[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    name: '打开 DevTools',
    items: [
      { action: '打开 DevTools（上次面板）', mac: 'Cmd+Opt+I', win: 'F12 或 Ctrl+Shift+I' },
      { action: '打开 Console 面板', mac: 'Cmd+Opt+J', win: 'Ctrl+Shift+J' },
      { action: '进入检查元素模式', mac: 'Cmd+Shift+C', win: 'Ctrl+Shift+C' },
    ],
  },
  {
    name: '面板与导航',
    items: [
      { action: '切换到下一个面板', mac: 'Cmd+]', win: 'Ctrl+]' },
      { action: '切换到上一个面板', mac: 'Cmd+[', win: 'Ctrl+[' },
      { action: '恢复上次的停靠位置', mac: 'Cmd+Shift+D', win: 'Ctrl+Shift+D' },
      { action: '打开/关闭抽屉（Drawer）', mac: 'Esc', win: 'Esc' },
      { action: '打开 Settings 设置', mac: '? 或 Fn+F1', win: '? 或 F1' },
      { action: '打开 Command Menu', mac: 'Cmd+Shift+P', win: 'Ctrl+Shift+P' },
      { action: '打开文件', mac: 'Cmd+O 或 Cmd+P', win: 'Ctrl+O 或 Ctrl+P' },
      { action: '当前面板内搜索', mac: 'Cmd+F', win: 'Ctrl+F' },
      { action: '在所有资源中搜索', mac: 'Cmd+Opt+F', win: 'Ctrl+Shift+F' },
    ],
  },
  {
    name: 'Elements 与 Styles',
    items: [
      { action: '撤销 DOM 修改', mac: 'Cmd+Z', win: 'Ctrl+Z' },
      { action: '重做 DOM 修改', mac: 'Cmd+Shift+Z', win: 'Ctrl+Y' },
      { action: '展开/收起全部子节点', mac: 'Opt+点击箭头', win: 'Ctrl+Alt+点击箭头' },
      { action: '隐藏/显示元素', mac: 'H', win: 'H' },
      { action: '编辑为 HTML', mac: 'Fn+F2', win: 'F2' },
      { action: '微调样式数值 ±1/±10/±0.1/±100', mac: '↑↓ · Shift↑↓ · Opt↑↓ · Cmd↑↓', win: '↑↓ · Shift↑↓ · Alt↑↓ · Ctrl↑↓' },
    ],
  },
  {
    name: 'Console',
    items: [
      { action: '清空 Console', mac: 'Cmd+K 或 Opt+L', win: 'Ctrl+L' },
      { action: '聚焦 Console 输入行', mac: 'Ctrl+`', win: 'Ctrl+`' },
      { action: '接受补全建议', mac: 'Tab 或 →', win: 'Tab 或 →' },
      { action: '切换上一条/下一条命令', mac: '↑ / ↓', win: '↑ / ↓' },
      { action: '输入换行（多行编辑）', mac: 'Shift+Enter', win: 'Shift+Enter' },
    ],
  },
  {
    name: 'Sources 调试',
    items: [
      { action: '暂停/恢复脚本执行', mac: 'F8 或 Cmd+\\', win: 'F8 或 Ctrl+\\' },
      { action: '单步跳过（Step over）', mac: "F10 或 Cmd+'", win: "F10 或 Ctrl+'" },
      { action: '单步进入（Step into）', mac: 'F11 或 Cmd+;', win: 'F11 或 Ctrl+;' },
      { action: '单步跳出（Step out）', mac: 'Shift+F11', win: 'Shift+F11' },
      { action: '添加/移除断点', mac: 'Cmd+B', win: 'Ctrl+B' },
      { action: '跳到指定行', mac: 'Ctrl+G', win: 'Ctrl+G' },
      { action: '跳到成员定义', mac: 'Cmd+Shift+O', win: 'Ctrl+Shift+O' },
    ],
  },
  {
    name: 'Network 与 Performance',
    items: [
      { action: '开始/停止录制', mac: 'Cmd+E', win: 'Ctrl+E' },
      { action: '在请求/录制结果中搜索', mac: 'Cmd+F', win: 'Ctrl+F' },
      { action: '重放 XHR 请求', mac: 'R', win: 'R' },
      { action: '保存录制结果', mac: 'Cmd+S', win: 'Ctrl+S' },
    ],
  },
];

/**
 * 按组名过滤分组。返回空数组表示「未选择任何分组」，由渲染器画提示。
 */
export function filterShortcutGroups(selected: string[]): ShortcutGroup[] {
  if (selected.length === 0) {
    return [];
  }

  const names = new Set(selected);

  return SHORTCUT_GROUPS.filter((group) => names.has(group.name));
}
