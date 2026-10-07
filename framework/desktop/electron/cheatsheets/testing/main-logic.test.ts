/**
 * 单元测试示例：主进程业务不进 Electron 就能测。
 * 输入 / 前置：src/services/notes.ts 是不 import electron 的纯业务模块；
 *   src/main/ipc.ts 是注册 IPC 通道的薄层（依赖 electron 模块）。
 * 主要操作：先直接 import 纯函数断言输入输出；再用 vi.mock('electron')
 *   顶替运行时模块，验证「谁把业务注册到了哪个通道」。
 * 预期结果：npx vitest run 秒级通过，全程不启动任何应用进程。
 * 阅读主线：纯逻辑直接测 → wiring 层 mock 后测；mock 边界只到「注册关系」为止。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerNoteHandlers } from './src/main/ipc';
import { addNote } from './src/services/notes';

// vi.mock 会被提升到文件顶部：被测模块 import 'electron' 时拿到的就是这份替身。
// electron 模块由 Electron 运行时注入，纯 Node 测试环境里不存在，不 mock 就会直接报错。
const handlers = new Map<string, (draft: string) => unknown>();
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (draft: string) => unknown) =>
      handlers.set(channel, fn),
  },
}));

describe('addNote：纯业务逻辑', () => {
  it('追加一条新笔记，id 递增', () => {
    const notes = addNote([{ id: 1, text: '已有' }], '清单');
    expect(notes).toEqual([
      { id: 1, text: '已有' },
      { id: 2, text: '清单' },
    ]);
  });

  it('空白草稿不产生新记录', () => {
    expect(addNote([{ id: 1, text: '已有' }], '   ')).toHaveLength(1);
  });

  it('不改原数组（不可变更新）', () => {
    const before = [{ id: 1, text: '已有' }];
    addNote(before, '新笔记');
    expect(before).toHaveLength(1);
  });
});

describe('registerNoteHandlers：IPC 薄层', () => {
  beforeEach(() => {
    handlers.clear();
  });

  it('把业务注册到约定通道，且委托的是纯函数', () => {
    registerNoteHandlers();
    expect(handlers.has('notes:add')).toBe(true);
    // 通道回调的返回值与纯函数一致：wiring 只做转发，不带业务
    expect(handlers.get('notes:add')?.('清单')).toEqual([
      { id: 1, text: '清单' },
    ]);
  });
});
