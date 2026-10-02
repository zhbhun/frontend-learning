/**
 * 范例介绍：extensions 数组如何被 ExtensionManager 装配——核心扩展注入、打包展开、
 *   按 priority 排序、命令表合并。
 * 前置状态：用户扩展固定为 doc、paragraph、text、bold 加 Alpha、Beta 两个演示扩展；
 *   核心 10 个扩展（editable、commands、keymap 等）由编辑器自动注入，不在数组里。
 * 操作：切换「装配预设」，观察装配顺序与 signature() 命令的响应者。
 * 预期结果：默认顺序与注册顺序一致，signature() 由数组靠后的 beta 响应；
 *   交换注册顺序后换成 alpha 响应；把 alpha 提到 priority 1000 只会让它跳到装配
 *   顺序最前，命令表仍以后者 beta 为准——priority 负责重排，不改变“后者胜出”。
 * 阅读主线：装配顺序 = 展开后按 priority 降序（同值保持注册顺序）；命令表按
 *   装配顺序合并，同名命令永远以后注册者为准。
 */
import { Editor, Extension, type Extensions } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type AssemblyPreset = 'default' | 'swapped' | 'priority';

export interface AssemblyLineArgs {
  preset: AssemblyPreset;
}

export interface AssemblyLineSnapshot {
  userOrder: string;
  totalCount: string;
  winner: string;
}

export interface AssemblyLineInstance {
  update(args: AssemblyLineArgs): void;
  dispose(): void;
}

/** 演示扩展工厂：Alpha 与 Beta 注册同名命令 signature，把响应者记进自己的 storage。 */
function makePlayer(name: string, priority = 100) {
  return Extension.create({
    name,
    priority,
    addStorage() {
      return { winner: '' };
    },
    addCommands() {
      return {
        // 命令写法见「自定义 Node 与 Mark」课；这里只用来观察命令表的合并结果
        signature:
          () =>
          () => {
            // 运行期 this.storage 指向 editor.extensionStorage[name]，是当前编辑器的私有状态
            this.storage.winner = this.name;
            return true;
          },
      };
    },
  });
}

// 命令的类型补全（机制见「自定义 Node 与 Mark」课）
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    assemblyLine: {
      signature: () => ReturnType;
    };
  }
}

const BASE: Extensions = [Document, Paragraph, Text, Bold];

const PRESETS: Record<AssemblyPreset, () => Extensions> = {
  // 默认：alpha、beta 都是默认 priority 100，装配顺序与注册顺序一致
  default: () => [...BASE, makePlayer('alpha'), makePlayer('beta')],
  // 交换注册顺序：beta 在前，同名命令由排在后面的 alpha 接管
  swapped: () => [...BASE, makePlayer('beta'), makePlayer('alpha')],
  // alpha 提到 priority 1000：装配顺序跳到最前，但命令表仍以后者 beta 为准
  priority: () => [...BASE, makePlayer('alpha', 1000), makePlayer('beta')],
};

/** 用户注册的扩展名：装配顺序读数只看它们，其余是自动注入的核心扩展。 */
const USER_NAMES = new Set(['doc', 'paragraph', 'text', 'bold', 'alpha', 'beta']);

export function createAssemblyLineDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AssemblyLineSnapshot) => void,
): AssemblyLineInstance {
  const frame = document.createElement('div');
  frame.className = 'ext-frame ext-columns';
  canvas.replaceWith(frame);

  // 左列：用户扩展的装配顺序（priority 非 100 时标注）
  const userColumn = document.createElement('div');
  userColumn.className = 'ext-column';
  const userLabel = document.createElement('p');
  userLabel.className = 'ext-box-label';
  userLabel.textContent = '用户扩展（装配顺序）';
  const userPre = document.createElement('pre');
  userPre.className = 'ext-pre';
  userColumn.append(userLabel, userPre);

  // 右列：自动注入的核心扩展清单
  const coreColumn = document.createElement('div');
  coreColumn.className = 'ext-column';
  const coreLabel = document.createElement('p');
  coreLabel.className = 'ext-box-label';
  coreLabel.textContent = '核心扩展（自动注入，不在 extensions 数组里）';
  const corePre = document.createElement('pre');
  corePre.className = 'ext-pre';
  coreColumn.append(coreLabel, corePre);

  frame.append(userColumn, coreColumn);

  let editor: Editor | null = null;

  function apply(args: AssemblyLineArgs): void {
    editor?.destroy();

    // 每次切换预设都重新 new Editor，走一遍完整装配管线
    editor = new Editor({
      extensions: PRESETS[args.preset](),
      content: '<p>演示编辑器</p>',
      editable: false,
    });

    const manager = editor.extensionManager;
    const userExts = manager.extensions.filter((ext) => USER_NAMES.has(ext.name));
    const coreExts = manager.extensions.filter((ext) => !USER_NAMES.has(ext.name));

    userPre.textContent = userExts
      .map((ext) => {
        const priority = ext.config.priority ?? 100;
        return priority === 100 ? ext.name : `${ext.name}（priority ${priority}）`;
      })
      .join('\n');
    corePre.textContent = coreExts.map((ext) => ext.name).join('\n');

    // 执行一次 signature：Alpha 与 Beta 的同名命令只剩一个留在命令表上，
    // 响应者会把名字写进自己的 storage
    editor.commands.signature();
    // editor.storage 的合表类型不带索引签名，这里经 unknown 断言成 storage 表再取值
    const storage = editor.storage as unknown as Record<string, { winner: string }>;
    const winner = storage.alpha.winner || storage.beta.winner || '（无）';

    emit({
      userOrder: userExts.map((ext) => ext.name).join(' → '),
      totalCount: `${manager.extensions.length}（用户 ${userExts.length} + 核心 ${coreExts.length}）`,
      winner,
    });
  }

  return {
    update(nextArgs) {
      apply(nextArgs);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
