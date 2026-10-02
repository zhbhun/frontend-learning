/**
 * 范例介绍：计数卡节点——用 Node View 自管 DOM，带交互按钮与 contentDOM 嵌套内容。
 * 前置状态：无需输入；文件本身就是可直接 import 的扩展源码。
 * 操作：在「节点视图实验台」里点卡片头部的 +1 / 归零按钮，或用工具栏插入、选中卡片。
 * 预期结果：卡片头部是非编辑区（contenteditable="false"），contentDOM 里是可编辑内容；
 *   定义 update 方法时属性变化只刷新头部文案（复用 DOM），不定义时整棵重建。
 * 阅读主线：schema 声明（parseHTML / renderHTML）只管输入输出，addNodeView
 *   返回的 dom / contentDOM / 生命周期方法只管编辑器内的呈现与交互，两条线互不掺和。
 */
import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';

export type CounterCardEvent =
  | 'create'
  | 'update'
  | 'destroy'
  | 'selectNode'
  | 'deselectNode';

export interface CounterCardStats {
  created: number;
  updated: number;
  destroyed: number;
  selected: boolean;
}

// node view 的生命周期计数：由实验台读取展示，业务项目里可以去掉
export const counterCardStats: CounterCardStats = {
  created: 0,
  updated: 0,
  destroyed: 0,
  selected: false,
};

export const CounterCard = Node.create({
  name: 'counterCard',
  group: 'block',
  // contentDOM 里能装什么由 schema 说了算：block+ 允许段落等块级内容
  // （想顺便禁止卡片嵌套卡片，可仿照 4.4 课的 callout 写成 paragraph+）
  content: 'block+',

  addOptions() {
    return {
      // 是否给 node view 定义 update 方法：实验台用它对照"复用 DOM"与"整棵重建"
      withUpdate: true,
      // 生命周期日志回调：实验台注入，业务项目里可以删掉
      onEvent: (_event: CounterCardEvent) => {},
    };
  },

  addAttributes() {
    return {
      count: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute('data-count')) || 0,
        renderHTML: (attributes) => ({ 'data-count': attributes.count }),
      },
    };
  },

  parseHTML() {
    // 收：初始 content 与粘贴走这里，规则只认 data-counter-card，与 node view 长什么样无关
    return [{ tag: 'div[data-counter-card]' }];
  },

  // 出：getHTML() 走这里。node view 不参与输出——编辑器内再花哨，输出仍是这一行
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-counter-card': '' }, HTMLAttributes), 0];
  },

  // 编辑器内的渲染完全交给 node view
  addNodeView() {
    const stats = counterCardStats;
    const onEvent = this.options.onEvent;

    return (props) => {
      // 渲染函数收到的 node 是当前快照，update 复用旧 DOM 时要手动换成新节点
      let node = props.node;
      const { editor, getPos, HTMLAttributes } = props;

      stats.created += 1;
      stats.selected = false;
      onEvent('create');

      // dom：node view 的外层容器，非编辑区完全自管
      const dom = document.createElement('div');
      dom.className = 'nv-counter';
      dom.setAttribute('data-counter-card', '');
      // HTMLAttributes 是属性级 renderHTML 的产物；vanilla 写法要自己挂到 dom 上
      for (const [name, value] of Object.entries(HTMLAttributes)) {
        dom.setAttribute(name, String(value));
      }

      // 头部：非编辑区，加 contenteditable="false" 防止光标落进来（官方 overview 的建议）
      const head = document.createElement('div');
      head.className = 'nv-counter-head';
      head.contentEditable = 'false';

      const label = document.createElement('span');
      label.className = 'nv-counter-label';
      label.textContent = '计数卡';

      const value = document.createElement('span');
      value.className = 'nv-counter-value';

      // 改属性：getPos() 拿当前节点的位置，dispatch 一个 setNodeMarkup 事务
      function bump(delta: number): void {
        const pos = getPos();
        // 节点刚被删除等场景下拿不到位置，必须判空
        if (typeof pos !== 'number') return;
        editor.view.dispatch(
          editor.view.state.tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            count: Math.max(0, node.attrs.count + delta),
          }),
        );
        // 点击按钮后把焦点还给编辑器（官方文档示例同款）
        editor.commands.focus();
      }

      const inc = document.createElement('button');
      inc.type = 'button';
      inc.className = 'nv-btn';
      inc.textContent = '+1';
      inc.addEventListener('click', () => bump(1));

      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'nv-btn';
      reset.textContent = '归零';
      reset.addEventListener('click', () => bump(-node.attrs.count));

      head.append(label, inc, reset, value);
      dom.append(head);

      // contentDOM：嵌套内容的槽位，必须显式 append 进 dom，
      // ProseMirror 会把 schema 允许的子内容（block+）装进这里
      const contentDOM = document.createElement('div');
      contentDOM.className = 'nv-counter-content';
      dom.append(contentDOM);

      function refresh(current: PMNode): void {
        node = current;
        value.textContent = `count = ${current.attrs.count}`;
      }

      // 生命周期：被节点选区选中 / 取消选中（不写时 ProseMirror 默认加
      // ProseMirror-selectednode 类，这里改成自己的高亮样式）
      function selectNode(): void {
        stats.selected = true;
        dom.classList.add('nv-counter--selected');
        onEvent('selectNode');
      }

      function deselectNode(): void {
        stats.selected = false;
        dom.classList.remove('nv-counter--selected');
        onEvent('deselectNode');
      }

      // 生命周期：文档更新时被询问"能否复用现有 DOM"。只会收到同类型节点
      // （除非声明 multiType）；返回 true 保留 DOM，返回 false 放弃复用、整棵重建
      function update(next: PMNode): boolean {
        refresh(next);
        stats.updated += 1;
        onEvent('update');
        return true;
      }

      // 生命周期：节点被删除或编辑器销毁时调用，清理计时器、全局监听等在这里做
      function destroy(): void {
        stats.destroyed += 1;
        onEvent('destroy');
      }

      refresh(node);

      const view = {
        dom,
        contentDOM,
        selectNode,
        deselectNode,
        destroy,
        // 开关打开才有 update：属性变化复用 DOM；关闭则每次属性变化整棵重建
        ...(this.options.withUpdate ? { update } : {}),
      };
      return view;
    };
  },
});
