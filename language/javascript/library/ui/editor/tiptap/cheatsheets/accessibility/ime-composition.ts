/**
 * 范例介绍：输入法组词由底层 prosemirror-view 接管，且状态可以观察。
 * 前置状态：StarterKit 编辑器；把系统输入法切到中文 / 日文。
 * 主要操作：在编辑区用输入法打拼音（组词中），再直接敲英文对比。
 * 预期结果：组词期间 view.composing 为 true（读数「组词中」为是），组词产生的
 *   每个事务都带 composition meta（计数增加、标记为 composition）；
 *   直接敲英文时「组词中」恒为否、事务标记为无。
 * 阅读主线：transaction 回调里的 getMeta('composition') 与轮询的 view.composing。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export interface ImeCompositionSnapshot {
  composing: boolean;
  compositionTransactions: number;
  lastMeta: string;
}

export interface ImeCompositionInstance {
  update(): void;
  dispose(): void;
}

export function createImeCompositionDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ImeCompositionSnapshot) => void,
): ImeCompositionInstance {
  const frame = document.createElement('div');
  frame.className = 'ax-frame';

  const hint = document.createElement('p');
  hint.className = 'ax-hint';
  hint.textContent =
    '把输入法切到中文 / 日文，在这里打拼音试试；不用输入法直接敲英文时，「组词中」恒为否。';

  const container = document.createElement('div');
  container.className = 'ax-editor';
  frame.append(hint, container);
  canvas.replaceWith(frame);

  const editor = new Editor({
    element: container,
    extensions: [StarterKit],
    content: '<p>在这里用输入法打几个字。</p>',
  });

  let compositionTransactions = 0;
  let lastMeta = '（还没有事务）';

  editor.on('transaction', ({ transaction }) => {
    // 组词输入产生的事务携带 composition meta（值为组词 ID）；直接输入的事务没有
    const isComposition = transaction.getMeta('composition') !== undefined;
    if (isComposition) {
      compositionTransactions += 1;
    }
    lastMeta = isComposition ? 'composition' : '无';
  });

  // composing 在事务之间也会变化（组词开始 / 结束），用低频轮询保持读数新鲜
  const poll = window.setInterval(() => {
    emit({
      composing: editor.view.composing,
      compositionTransactions,
      lastMeta,
    });
  }, 100);

  return {
    update() {
      // 本实例没有 Controls 输入：读者通过自己的输入法触发
    },
    dispose() {
      window.clearInterval(poll);
      editor.destroy();
      frame.remove();
    },
  };
}
