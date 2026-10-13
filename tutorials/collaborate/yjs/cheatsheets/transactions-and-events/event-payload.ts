/**
 * 范例:一次事务产生的事件载荷(Y.Event)内容与 origin 标签的传递。
 * 输入:对共享类型的操作(更新键 / 新增键 / 删除键 / 同事务同键写两次 / 编辑数组)和 origin 标签。
 * 操作:在预置 { title: '项目草稿', done: false } 的 Y.Map 与 ['A','B','C'] 的 Y.Array 上
 *      重放所选操作,observe 回调记录 event.keys / event.delta 与 transaction.origin。
 * 预期:keys 记录每个被改键的 action 与事务开始前的 oldValue;数组变化用 delta
 *      (retain / insert / delete) 描述;origin 原样出现在 transaction.origin;
 *      同事务同键写两次,keys 仍只有一条记录,oldValue 是事务前的值。
 * 阅读主线:update() → replay() 重建文档、挂观察、在单个 transact(fn, origin) 里执行操作
 *      → draw() 左半画事务后的文档状态,右半画最近一次事件的载荷。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type PayloadAction =
  | 'update-key'
  | 'add-key'
  | 'delete-key'
  | 'set-key-twice'
  | 'edit-array';

export type PayloadOrigin = 'none' | 'editor' | 'toolbar';

export interface EventPayloadOptions {
  /** 在一个事务里对共享类型执行的操作 */
  action: PayloadAction;
  /** 作为 doc.transact 第二参传入的来源标签;'none' 表示不传 */
  origin: PayloadOrigin;
}

export interface EventPayloadSnapshot {
  origin: string;
  payload: string;
  observeCount: number;
}

export interface EventPayloadInstance {
  update(options: EventPayloadOptions): void;
  dispose(): void;
}

const ACTION_TITLES: Record<PayloadAction, string> = {
  'update-key': "map.set('title', '项目 v2'):更新已有键",
  'add-key': "map.set('owner', 'alice'):新增键",
  'delete-key': "map.delete('done'):删除键",
  'set-key-twice': "同一事务内两次写 'title':keys 只保留一条记录",
  'edit-array': "list.delete(1, 1) 之后 list.insert(1, ['X', 'Y'])",
};

interface ReplayResult {
  originText: string;
  payloadSummary: string;
  payloadLines: string[];
  stateLines: string[];
  observeCount: number;
}

function describeOrigin(origin: unknown): string {
  if (origin === undefined) {
    return 'undefined';
  }
  return JSON.stringify(origin) ?? String(origin);
}

export function createEventPayload(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EventPayloadSnapshot) => void,
): EventPayloadInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: EventPayloadOptions = { action: 'update-key', origin: 'editor' };
  let result: ReplayResult = replay(current);

  function replay(options: EventPayloadOptions): ReplayResult {
    // 每次输入变化都用全新的 Y.Doc 重放,保证读数干净、结果确定。
    const doc = new Y.Doc();
    const map = doc.getMap<unknown>('task');
    const list = doc.getArray<string>('tags');
    // 预置初始状态;此时还没挂观察,不计入事件统计。
    map.set('title', '项目草稿');
    map.set('done', false);
    list.insert(0, ['A', 'B', 'C']);

    let originText = 'undefined';
    let payloadSummary = '(本次操作未触发 observe)';
    const payloadLines: string[] = [];
    let observeCount = 0;

    // Y.Map 的变化看 event.keys:每个被改键一条 { action, oldValue }。
    map.observe((event, transaction) => {
      observeCount += 1;
      originText = describeOrigin(transaction.origin);
      const entries: string[] = [];
      event.keys.forEach((change, key) => {
        const oldValue =
          change.oldValue === undefined
            ? 'undefined'
            : JSON.stringify(change.oldValue);
        entries.push(`${key} → ${change.action},oldValue = ${oldValue}`);
      });
      payloadSummary = `keys { ${entries.join('; ')} }`;
      payloadLines.push('keys:', ...entries.map((line) => `  ${line}`));
    });

    // Y.Array 的变化看 event.delta:retain / insert / delete 按序回放。
    list.observe((event, transaction) => {
      observeCount += 1;
      originText = describeOrigin(transaction.origin);
      const ops = event.delta.map((op) => {
        if (op.retain !== undefined) {
          return `{ retain: ${op.retain} }`;
        }
        if (op.delete !== undefined) {
          return `{ delete: ${op.delete} }`;
        }
        return `{ insert: ${JSON.stringify(op.insert)} }`;
      });
      payloadSummary = `delta [ ${ops.join(', ')} ]`;
      payloadLines.push('delta:', ...ops.map((line) => `  ${line}`));
    });

    // origin 是任意值;这里用字符串常量,'none' 对应不显式传第二参。
    const origin = options.origin === 'none' ? undefined : options.origin;
    doc.transact(() => {
      switch (options.action) {
        case 'update-key':
          map.set('title', '项目 v2');
          break;
        case 'add-key':
          map.set('owner', 'alice');
          break;
        case 'delete-key':
          map.delete('done');
          break;
        case 'set-key-twice':
          // 同事务同键写两次:keys 仍只有一条记录,oldValue 是事务前的值。
          map.set('title', '项目 v2');
          map.set('title', '项目 v3');
          break;
        case 'edit-array':
          list.delete(1, 1);
          list.insert(1, ['X', 'Y']);
          break;
      }
    }, origin);

    const stateLines: string[] = [];
    map.forEach((value, key) => {
      stateLines.push(`task.${key} = ${JSON.stringify(value)}`);
    });
    stateLines.push(`tags = ${JSON.stringify(list.toArray())}`);

    return { originText, payloadSummary, payloadLines, stateLines, observeCount };
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(480, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(ACTION_TITLES[current.action], 48, 56);

    const mid = Math.round(width / 2);
    const lineHeight = 24;
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';

    // 左半:事务后的文档状态。
    let y = 104;
    drawingContext.fillStyle = '#334155';
    result.stateLines.forEach((line) => {
      drawingContext.fillText(line, 48, y);
      y += lineHeight;
    });

    // 右半:最近一次事件的 origin、载荷与回调次数。
    let ry = 104;
    drawingContext.fillStyle = '#334155';
    drawingContext.fillText(`origin: ${result.originText}`, mid + 24, ry);
    ry += lineHeight;
    result.payloadLines.forEach((line) => {
      drawingContext.fillText(line, mid + 24, ry);
      ry += lineHeight;
    });
    drawingContext.fillText(
      `observe 触发 ×${result.observeCount}`,
      mid + 24,
      ry + lineHeight,
    );
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      result = replay(options);
      draw();
      emit({
        origin: result.originText,
        payload: result.payloadSummary,
        observeCount: result.observeCount,
      });
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
