/**
 * 范例:同一批修改放进一个 transact 与分成多个独立事务时,observe 与 update 触发次数的差异。
 * 输入:修改次数(1–5)、是否合并为一个事务。
 * 操作:每次输入变化都新建一个 Y.Doc,重放 N 次 map.set,统计回调次数。
 * 预期:合并为一个事务时 observe 与 update 各触发 1 次;分成多个事务时各触发 N 次。
 * 阅读主线:update() → replay() 重建文档、挂观察、执行修改并计数 → draw() 画三条泳道。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TransactionBatchingOptions {
  /** 重放时连续调用 map.set 的次数 */
  edits: number;
  /** true 时用 doc.transact 包住全部修改;false 时每次 set 各自成为一个事务 */
  batched: boolean;
}

export interface TransactionBatchingSnapshot {
  edits: number;
  observeCount: number;
  updateCount: number;
}

export interface TransactionBatchingInstance {
  update(options: TransactionBatchingOptions): void;
  dispose(): void;
}

export function createTransactionBatching(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TransactionBatchingSnapshot) => void,
): TransactionBatchingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: TransactionBatchingOptions = { edits: 3, batched: true };
  let stats = { observeCount: 0, updateCount: 0 };

  function replay(options: TransactionBatchingOptions) {
    // 每次输入变化都用全新的 Y.Doc 重放,保证计数干净、结果确定。
    const doc = new Y.Doc();
    const map = doc.getMap<number>('form');
    let observeCount = 0;
    let updateCount = 0;

    map.observe(() => {
      observeCount += 1;
    });
    doc.on('update', () => {
      updateCount += 1;
    });

    if (options.batched) {
      // 一个事务包住的 N 次 set:observe 与 update 只在事务结束后各触发一次。
      doc.transact(() => {
        for (let i = 0; i < options.edits; i += 1) {
          map.set(`field-${i}`, i);
        }
      });
    } else {
      // 不显式包事务时,每次修改 API 调用各自开启一个隐式事务,各触发一轮回调。
      for (let i = 0; i < options.edits; i += 1) {
        map.set(`field-${i}`, i);
      }
    }
    stats = { observeCount, updateCount };
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      current.batched
        ? `${current.edits} 次修改合并为一个事务`
        : `${current.edits} 次修改各自成为一个事务`,
      48,
      56,
    );

    // 三条泳道:修改调用与两类通知一一对照,事件个数随事务边界变化。
    const lanes: Array<{
      label: string;
      count: number;
      color: string;
      shape: 'rect' | 'dot';
    }> = [
      { label: 'map.set 调用', count: current.edits, color: '#64748b', shape: 'rect' },
      { label: 'observe 回调', count: stats.observeCount, color: '#4f7cff', shape: 'dot' },
      { label: 'update 消息', count: stats.updateCount, color: '#f59e0b', shape: 'dot' },
    ];

    const laneTop = 96;
    const laneHeight = Math.max(52, (height - laneTop - 40) / lanes.length);
    const labelWidth = 120;
    const trackWidth = width - labelWidth - 120;
    const step = Math.min(56, trackWidth / Math.max(current.edits, 1));

    lanes.forEach((lane, index) => {
      const y = laneTop + index * laneHeight + laneHeight / 2;
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(lane.label, 48, y + 4);

      for (let i = 0; i < lane.count; i += 1) {
        const x = 48 + labelWidth + i * step;
        drawingContext.fillStyle = lane.color;
        if (lane.shape === 'rect') {
          drawingContext.fillRect(x, y - 10, 20, 20);
        } else {
          drawingContext.beginPath();
          drawingContext.arc(x + 10, y, 10, 0, Math.PI * 2);
          drawingContext.fill();
        }
      }
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      replay(options);
      draw();
      emit({ edits: options.edits, ...stats });
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
