/**
 * 范例介绍：从零编写的两个自定义扩展——批注标记 Annotation 与提示块节点 Callout。
 * 前置状态：无需输入；文件本身就是可直接 import 的扩展源码。
 * 操作：在「扩展实验台」里通过按钮调用它们注册的命令。
 * 预期结果：annotation 标记给选中文字挂 data-annotation，callout 节点渲染为
 *   带 data-callout 的 div；五个命令出现在 editor.commands 上。
 * 阅读主线：每个扩展 = 声明（schema 字段，见 4.1 课）+ addCommands（注册命令）
 *   + declare module（给命令补全 TS 类型），三段缺一不可。
 */
import { Mark, Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'info' | 'warning' | 'success';

/* ------------------------------------------------------------------ */
/* 自定义 Mark：批注。只给文字"着色"，不占树的层级（判断入口见 4.1 课） */
/* ------------------------------------------------------------------ */

export const Annotation = Mark.create({
  name: 'annotation',

  // attrs 的收——存——出链路在 4.1 课讲过；这里只有 id 一个属性
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-annotation'),
        renderHTML: (attributes) =>
          attributes.id ? { 'data-annotation': attributes.id } : {},
      },
    };
  },

  parseHTML() {
    // 收：带 data-annotation 的 span（粘贴、初始 content 都走这条规则）
    return [{ tag: 'span[data-annotation]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // 出：HTMLAttributes 已含属性级 renderHTML 产出的 data-annotation
    return ['span', HTMLAttributes, 0];
  },

  // 注册命令：this 上下文里有 name / type / editor / options / storage
  // this.type 是该标记在 schema 里的 MarkType，喂给内置命令即可
  addCommands() {
    return {
      // 命令签名 = 收参数的外层 + 收 CommandProps 的内层，必须返回 boolean
      setAnnotation:
        (attributes: { id: string }) =>
        ({ chain, state }) => {
          // 返回 false 表示"当前不可用"：单发与链式调用得到 false，can() 干跑同样判定不可用
          if (state.selection.empty) {
            return false;
          }
          return chain().setMark(this.type, attributes).run();
        },

      unsetAnnotation:
        () =>
        ({ commands }) =>
          // 组合内置命令：commands 上的每个成员都是另一个命令
          commands.unsetMark(this.type),
    };
  },
});

// 类型补全：addCommands 只登记了运行时命令，TS 不认识它们；
// 用模块声明把命令名与参数类型合并进 Commands 接口，编辑器才有补全
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotation: {
      setAnnotation: (attributes: { id: string }) => ReturnType;
      unsetAnnotation: () => ReturnType;
    };
  }
}

/* -------------------------------------------------------------------- */
/* 自定义 Node：提示块。占树的一层块级节点，能装若干段落                 */
/* -------------------------------------------------------------------- */

export const Callout = Node.create({
  name: 'callout',
  content: 'paragraph+', // 只装段落，也避免了 callout 嵌套 callout
  group: 'block',        // 归入 block 组，才能被 doc 的 block+ 收下

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-callout'),
        renderHTML: (attributes) => ({ 'data-callout': attributes.type }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // 输出标签与属性完全由声明决定，节点自身只是提供 0 号内容洞
    return ['div', HTMLAttributes, 0];
  },

  addCommands() {
    return {
      // 插入：组合内置 insertContent，插入后光标跟随进新节点
      insertCallout:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { type: 'info' },
            content: [{ type: 'paragraph' }],
          }),

      // 切换：光标所在块在 callout 与普通段落之间来回
      toggleCallout:
        () =>
        ({ commands }) =>
          commands.toggleNode(this.name, 'paragraph', { type: 'info' }),

      // 改属性：光标不在 callout 内时 updateAttributes 找不到目标，命令返回 false
      setCalloutType:
        (attributes: { type: CalloutType }) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attributes),
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: () => ReturnType;
      toggleCallout: () => ReturnType;
      setCalloutType: (attributes: { type: CalloutType }) => ReturnType;
    };
  }
}
