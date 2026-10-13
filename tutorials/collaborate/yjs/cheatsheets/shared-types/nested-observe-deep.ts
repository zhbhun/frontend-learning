/**
 * 范例：嵌套组合与 observe / observeDeep 的边界。
 * 演示：Y.Array 里嵌套 Y.Map（Array<Map>，看板与卡片的典型结构），
 *       修改顶层数组与修改嵌套 Map 分别会惊动谁。
 * 输入：操作（顶层插入卡片 / 改嵌套卡片的标题）、新标题。
 * 操作：每次控件变化都整体重算——重建文档与两层观察，再执行所选操作。
 * 预期：顶层插入同时触发 board 的 observe 与 observeDeep；
 *       改嵌套 Map 只触发 observeDeep，事件里用 event.target 与 event.path（[0]）定位到卡片。
 * 主线：buildBoard() 建结构与计数 → runAction() 执行操作 → 读计数、事件来源与看板 JSON。
 */
import * as Y from 'yjs';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface NestedObserveDeepOptions {
  action: 'insert-card' | 'rename-card';
  title: string;
}

export interface NestedObserveDeepSnapshot {
  shallowCount: number;
  deepCount: number;
  source: string;
  path: string;
  json: string;
}

export interface NestedObserveDeepInstance {
  update(options: NestedObserveDeepOptions): void;
  dispose(): void;
}

interface RunResult {
  shallowCount: number;
  deepCount: number;
  source: string;
  path: string;
  board: Y.Array<Y.Map<unknown>>;
}

function buildBoard(): RunResult & { doc: Y.Doc } {
  const doc = new Y.Doc();
  const board = doc.getArray<Y.Map<unknown>>('board');

  // 嵌套：Y.Map 卡片作为 Y.Array 的元素，一张卡片自己又是一个共享类型。
  const cardA = new Y.Map<unknown>();
  cardA.set('title', '设计稿');
  cardA.set('done', false);
  const cardB = new Y.Map<unknown>();
  cardB.set('title', '评审');
  cardB.set('done', true);
  board.push([cardA, cardB]);

  const result: RunResult & { doc: Y.Doc } = {
    doc,
    board,
    shallowCount: 0,
    deepCount: 0,
    source: '（无）',
    path: '（无）',
  };

  board.observe(() => {
    result.shallowCount += 1;
  });
  board.observeDeep((events) => {
    result.deepCount += 1;
    const last = events[events.length - 1];
    result.source = last.target.constructor.name;
    result.path = JSON.stringify(last.path);
  });
  return result;
}

function runAction(result: RunResult, options: NestedObserveDeepOptions): void {
  if (options.action === 'insert-card') {
    // 顶层变更：board 本身的内容变了，observe 与 observeDeep 都会触发。
    const card = new Y.Map<unknown>();
    card.set('title', '新卡片');
    card.set('done', false);
    result.board.push([card]);
    return;
  }
  // 嵌套变更：board 的内容没变，只是卡片的键变了——observe 不触发，observeDeep 触发。
  const first = result.board.get(0);
  first.set('title', options.title);
}

export function createNestedObserveDeep(
  canvas: HTMLCanvasElement,
  emit: (snapshot: NestedObserveDeepSnapshot) => void,
): NestedObserveDeepInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: NestedObserveDeepOptions = {
    action: 'rename-card',
    title: '设计稿 v2',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = 300;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const run = buildBoard();
    runAction(run, current);
    const json = JSON.stringify(run.board.toJSON());

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    const actionLabel =
      current.action === 'insert-card'
        ? 'board.push([新卡片])（顶层变更）'
        : `board.get(0).set('title', '${current.title}')（嵌套变更）`;
    ctx.fillText(actionLabel, 24, 40);

    // 左侧：嵌套结构示意。
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText("ydoc.getArray('board')", 24, 86);
    run.board.toArray().forEach((card, index) => {
      const title = String(card.get('title'));
      const highlight =
        current.action === 'rename-card' && index === 0
          ? '#4f7cff'
          : current.action === 'insert-card' && index === run.board.length - 1
            ? '#f59e0b'
            : '#94a3b8';
      ctx.fillStyle = highlight;
      ctx.fillText(`└─ [${index}] Y.Map { title: '${title}' }`, 44, 86 + (index + 1) * 24);
    });

    // 右侧：两种观察的触发计数对比。
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(400, 64, 248, 128, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#172033';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('本次操作的回调次数', 416, 92);
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = run.shallowCount > 0 ? '#16a34a' : '#dc2626';
    ctx.fillText(`board.observe：${run.shallowCount} 次`, 416, 120);
    ctx.fillStyle = run.deepCount > 0 ? '#16a34a' : '#dc2626';
    ctx.fillText(`board.observeDeep：${run.deepCount} 次`, 416, 146);
    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`事件来源 ${run.source} · path ${run.path}`, 416, 174);

    // 底部：看板 JSON。
    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const jsonText = json.length > 76 ? `${json.slice(0, 73)}…` : json;
    ctx.fillText(`board.toJSON() = ${jsonText}`, 24, 268);

    emit({
      shallowCount: run.shallowCount,
      deepCount: run.deepCount,
      source: run.source,
      path: run.path,
      json,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
