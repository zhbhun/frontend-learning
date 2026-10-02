/**
 * 范例介绍：badge 标记——用 Mark View 自管行内 DOM，点击徽标循环切换等级。
 * 前置状态：无需输入；文件本身就是可直接 import 的扩展源码。
 * 操作：在「标记视图实验台」里点徽标本身循环切换 info / warn / error，
 *   或选中文字后用工具栏按钮挂上 / 摘下标记。
 * 预期结果：mark view 的 dom（mark 元素）与 contentDOM 分离，被标记的文字由
 *   ProseMirror 装进 contentDOM；getHTML 输出的是 renderHTML 声明的
 *   <span data-badge="…">，与 mark view 的 DOM 结构无关。
 * 阅读主线：mark view 与 node view 共用一套契约，只是行内、收到的 props 不同，
 *   且多送一个 updateAttributes 助手。
 */
import { Mark, mergeAttributes } from '@tiptap/core';
import type { Mark as PMMark } from '@tiptap/pm/model';

export type BadgeLevel = 'info' | 'warn' | 'error';

export type BadgeEvent = 'create' | 'update' | 'destroy';

export const BADGE_LEVELS: BadgeLevel[] = ['info', 'warn', 'error'];

export interface BadgeStats {
  created: number;
  updated: number;
  destroyed: number;
}

// mark view 的生命周期计数：由实验台读取展示，业务项目里可以去掉
export const badgeStats: BadgeStats = { created: 0, updated: 0, destroyed: 0 };

export const Badge = Mark.create({
  name: 'badge',

  addOptions() {
    return {
      // 是否给 mark view 定义 update 方法：实验台用它对照"复用 DOM"与"整棵重建"
      withUpdate: true,
      // 生命周期日志回调：实验台注入，业务项目里可以删掉
      onEvent: (_event: BadgeEvent) => {},
    };
  },

  addAttributes() {
    return {
      level: {
        default: 'info' as BadgeLevel,
        parseHTML: (element) => element.getAttribute('data-badge'),
        renderHTML: (attributes) => ({ 'data-badge': attributes.level }),
      },
    };
  },

  parseHTML() {
    // 收：只认 data-badge 属性，不管编辑器里的徽标渲染成什么样
    return [{ tag: 'span[data-badge]' }];
  },

  // 出：getHTML() 只认这个声明。mark view 的两层 DOM 结构不会出现在输出里
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-badge': 'info' }, HTMLAttributes), 0];
  },

  addMarkView() {
    const stats = badgeStats;
    const onEvent = this.options.onEvent;

    return ({ mark, HTMLAttributes, updateAttributes }) => {
      stats.created += 1;
      onEvent('create');

      // dom：mark view 的外层元素（行内）
      const dom = document.createElement('mark');
      dom.className = 'nv-badge';
      // HTMLAttributes 是属性级 renderHTML 的产物；vanilla 写法要自己挂到 dom 上
      for (const [name, value] of Object.entries(HTMLAttributes)) {
        dom.setAttribute(name, String(value));
      }

      // contentDOM：被标记的文字由 ProseMirror 装进这里。
      // mark view 的 contentDOM 需要显式声明可编辑（官方文档做法）
      const contentDOM = document.createElement('span');
      contentDOM.className = 'nv-badge-content';
      contentDOM.contentEditable = 'true';
      dom.append(contentDOM);

      let current = mark;

      function refresh(next: PMMark): void {
        current = next;
        dom.dataset.badge = String(current.attrs.level);
      }

      // 点击徽标循环切换等级。updateAttributes 是 mark view 专属的助手，
      // 它会在文档里找到这一处标记实例并改写属性（官方文档的推荐做法）
      dom.addEventListener('click', () => {
        const index = BADGE_LEVELS.indexOf(current.attrs.level);
        const next = BADGE_LEVELS[(index + 1) % BADGE_LEVELS.length];
        updateAttributes({ level: next });
      });

      // 生命周期：标记更新时被询问"能否复用现有 DOM"。
      // 返回 true 保留 DOM 自己刷新，返回 false 整棵重建
      function update(next: PMMark): boolean {
        refresh(next);
        stats.updated += 1;
        onEvent('update');
        return true;
      }

      // 生命周期：标记被移除或编辑器销毁时调用
      function destroy(): void {
        stats.destroyed += 1;
        onEvent('destroy');
      }

      refresh(mark);

      const view = {
        dom,
        contentDOM,
        destroy,
        // 开关打开才有 update：等级变化复用 DOM；关闭则整棵重建
        ...(this.options.withUpdate ? { update } : {}),
      };
      return view;
    };
  },
});
