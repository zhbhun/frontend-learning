/**
 * 范例介绍：高频事务里跑重活的代价——同样一批连续输入，「每次 update 全量 getJSON」
 * 与「防抖后读一次」的耗时差距。
 * 前置状态：约 300 段的大文档；schema 只装 Document、Paragraph、Text。
 * 操作：点「模拟连续输入」——一次性插入指定数量的字符（每个字符一个事务）；
 *   切换「回调模式」对比三种 update 回调处理。
 * 预期结果：per-update 模式 update 事件次数等于输入次数，回调累计耗时把整批输入拖慢一个数量级；
 *   debounced 模式实际读数只有 1 次，整批耗时接近「不读数」档。
 * 阅读主线：事务是计费单位——热路径里每次事务执行的全量操作，总成本 = 单次成本 × 事务次数。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type CallbackMode = 'none' | 'per-update' | 'debounced';

export interface UpdateCallbackArgs {
  callbackMode: CallbackMode;
  burst: number;
}

export interface UpdateCallbackSnapshot {
  updateCount: number;
  callbackCost: number;
  readCount: number;
  batchCost: number;
}

export interface UpdateCallbackInstance {
  update(args: UpdateCallbackArgs): void;
  dispose(): void;
}

const EXTENSIONS = [Document, Paragraph, Text];
const PARAGRAPH_COUNT = 300;

function buildContent(count: number): string {
  const paragraphs: string[] = [];
  for (let i = 0; i < count; i += 1) {
    paragraphs.push(
      `<p>第 ${i + 1} 段：大文档里每次全量读数的成本都会随文档规模增长。</p>`,
    );
  }
  return paragraphs.join('');
}

const INITIAL_CONTENT = buildContent(PARAGRAPH_COUNT);
const DEBOUNCE_DELAY = 300;

export function createUpdateCallbackDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: UpdateCallbackSnapshot) => void,
): UpdateCallbackInstance {
  const frame = document.createElement('div');
  frame.className = 'perf-frame';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'perf-toolbar';
  const runButton = document.createElement('button');
  runButton.type = 'button';
  runButton.className = 'perf-btn';
  runButton.textContent = '模拟连续输入';
  toolbar.append(runButton);

  const hostLabel = document.createElement('p');
  hostLabel.className = 'perf-box-label';
  hostLabel.textContent = `编辑器（${PARAGRAPH_COUNT} 段大文档，点按钮后观察读数）`;
  const host = document.createElement('div');
  host.className = 'perf-editor perf-editor--edit';

  frame.append(toolbar, hostLabel, host);

  const editor = new Editor({
    element: host,
    extensions: EXTENSIONS,
    content: INITIAL_CONTENT,
  });

  let mode: CallbackMode = 'per-update';
  let burst = 150;
  let debounceTimer: number | undefined;

  function emitSnapshot(
    updateCount: number,
    callbackCost: number,
    readCount: number,
    batchCost: number,
  ): void {
    emit({ updateCount, callbackCost, readCount, batchCost });
  }

  function runBurst(): void {
    window.clearTimeout(debounceTimer);

    // 重置内容，保证每次测量从同一份文档出发
    editor.commands.setContent(INITIAL_CONTENT, { emitUpdate: false });
    editor.commands.setTextSelection(1);

    let updateCount = 0;
    let callbackCost = 0;
    let readCount = 0;
    let batchCost = 0;

    const onUpdate = () => {
      updateCount += 1;

      if (mode === 'per-update') {
        // 热路径反例：每个事务都全量读一次整棵文档树
        const start = performance.now();
        editor.getJSON();
        callbackCost += performance.now() - start;
        readCount += 1;
      } else if (mode === 'debounced') {
        // 正确做法：一批输入结束后只读一次
        window.clearTimeout(debounceTimer);
        const settledCount = updateCount;
        debounceTimer = window.setTimeout(() => {
          const start = performance.now();
          editor.getJSON();
          callbackCost += performance.now() - start;
          readCount += 1;
          emitSnapshot(settledCount, callbackCost, readCount, batchCost);
        }, DEBOUNCE_DELAY);
      }
    };

    editor.on('update', onUpdate);

    const start = performance.now();
    for (let i = 0; i < burst; i += 1) {
      // 每个字符一个事务，等价于连续按键
      editor.view.dispatch(editor.state.tr.insertText('字'));
    }
    batchCost = performance.now() - start;

    editor.off('update', onUpdate);
    emitSnapshot(updateCount, callbackCost, readCount, batchCost);
  }

  runButton.addEventListener('click', runBurst);
  emitSnapshot(0, 0, 0, 0);

  return {
    update(args) {
      mode = args.callbackMode;
      burst = args.burst;
      window.clearTimeout(debounceTimer);
      emitSnapshot(0, 0, 0, 0);
    },
    dispose() {
      window.clearTimeout(debounceTimer);
      editor.destroy();
      frame.remove();
    },
  };
}
