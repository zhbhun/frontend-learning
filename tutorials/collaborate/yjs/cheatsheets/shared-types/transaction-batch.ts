/**
 * 范例：事务把多次修改合并为一次通知。
 * 演示：对同一个 Y.Map 连续写 N 次——包在 doc.transact 里 vs 逐次裸写，
 *       observe 回调次数与 doc update 消息（一次网络发送的单位）的差异。
 * 输入：是否包事务、修改次数。
 * 操作：每次控件变化都整体重算——重建文档与计数，再按所选方式写入。
 * 预期：包事务时 N 次写入只产生 1 次回调与 1 条 update，事件载荷合并为一份；
 *       裸写时每次写入各产生 1 次回调与 1 条 update。
 * 主线：run() 建计数 → 按 useTransact 选择写入方式 → 读计数与合并后的 keys。
 */
import * as Y from 'yjs';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TransactionBatchOptions {
  useTransact: boolean;
  edits: number;
}

export interface TransactionBatchSnapshot {
  edits: number;
  callbacks: number;
  updates: number;
  batched: string;
  keysSummary: string;
}

export interface TransactionBatchInstance {
  update(options: TransactionBatchOptions): void;
  dispose(): void;
}

interface RunResult {
  callbacks: number;
  updates: number;
  keysSummary: string;
}

function run(options: TransactionBatchOptions): RunResult {
  const doc = new Y.Doc();
  const ymap = doc.getMap('meta');
  const result: RunResult = { callbacks: 0, updates: 0, keysSummary: '' };

  const payloads: string[] = [];
  ymap.observe((event) => {
    result.callbacks += 1;
    // 每次回调一份载荷：包事务时 N 次写入合并成一份，裸写时逐次各一份。
    const parts: string[] = [];
    event.changes.keys.forEach((change, key) => {
      parts.push(`${key}: ${change.action}`);
    });
    payloads.push(parts.join('；'));
    result.keysSummary = payloads.join(' │ ');
  });
  // doc.on('update') 每提交一个事务触发一次，Provider 按条发送更新。
  doc.on('update', () => {
    result.updates += 1;
  });

  const writeAll = () => {
    for (let index = 0; index < options.edits; index += 1) {
      ymap.set(`k${index}`, index);
    }
  };

  if (options.useTransact) {
    doc.transact(writeAll, '批量录入');
  } else {
    writeAll();
  }
  return result;
}

export function createTransactionBatch(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TransactionBatchSnapshot) => void,
): TransactionBatchInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: TransactionBatchOptions = {
    useTransact: true,
    edits: 3,
  };

  function drawBar(x: number, y: number, label: string, count: number, max: number, color: string) {
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(label, x, y + 14);
    const track = 320;
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(x + 150, y, track, 20, 4);
    ctx.fill();
    const barWidth = max === 0 ? 0 : Math.max(20, (count / max) * track);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 150, y, Math.min(track, barWidth), 20, 4);
    ctx.fill();
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`${count} 次`, x + 150 + track + 12, y + 15);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = 260;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const result = run(current);

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      current.useTransact
        ? `doc.transact(() => { …${current.edits} 次 ymap.set… })`
        : `逐次裸写 ${current.edits} 次 ymap.set（每次自带隐式事务）`,
      24,
      40,
    );

    drawBar(24, 88, 'observe 回调', result.callbacks, current.edits, '#4f7cff');
    drawBar(24, 128, "doc.on('update')", result.updates, current.edits, '#f59e0b');

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`写入次数：${current.edits} · 事件载荷（按回调次序）：${result.keysSummary}`, 24, 196);
    ctx.fillText(
      current.useTransact
        ? '事务提交时才通知：多次写入合并为一次回调、一条更新消息、一份合并载荷。'
        : '每次写入都是一个隐式事务：回调与更新消息逐次产生。',
      24,
      218,
    );

    emit({
      edits: current.edits,
      callbacks: result.callbacks,
      updates: result.updates,
      batched: current.useTransact ? '包事务' : '裸写',
      keysSummary: result.keysSummary,
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
