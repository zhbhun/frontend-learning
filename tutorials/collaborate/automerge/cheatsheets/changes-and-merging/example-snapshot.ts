/**
 * 范例介绍：演示 save / load 二进制快照往返。
 * 输入：item 是要追加的待办文本。
 * 操作：change 追加一条待办 -> save 出二进制 -> load 还原 -> 对比并继续编辑。
 * 预期：往返后 equals 为真、actorId 更换、增量格式更小、还原文档可继续修改。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

const ALICE = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';

export interface SnapshotLabArgs {
  item: string;
}

export interface SnapshotLabSnapshot {
  rows: Array<[string, string]>;
}

export interface SnapshotLabInstance {
  update(options: SnapshotLabArgs): void;
  dispose(): void;
}

// from 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type TodoDoc = {
  todos: string[];
};

interface LabResult {
  lines: string[];
  rows: Array<[string, string]>;
}

function run(args: SnapshotLabArgs): LabResult {
  const item = args.item.trim() === '' ? '（空待办）' : args.item.trim();
  const lines: string[] = [];

  const doc1 = A.from<TodoDoc>({ todos: ['买牛奶'] }, ALICE);
  const doc2 = A.change(doc1, '添加待办', (d) => {
    d.todos.push(item);
  });
  lines.push(`doc2.todos = ${JSON.stringify(doc2.todos)}`);

  const binary = A.save(doc2);
  lines.push(`save(doc2) -> ${binary.length} 字节 Uint8Array（含全部历史）`);

  const restored = A.load<TodoDoc>(binary);
  lines.push(`load(binary).todos = ${JSON.stringify(restored.todos)}`);
  lines.push(`equals(doc2, restored) ? ${A.equals(doc2, restored)}`);
  lines.push(
    `actorId 相同 ? ${A.getActorId(restored) === A.getActorId(doc2)}（load 换新身份）`,
  );

  const again = A.change(restored, '还原后继续编辑', (d) => {
    d.todos.push('发周报');
  });
  lines.push(`还原文档可继续 change -> ${JSON.stringify(again.todos)}`);

  const incremental = A.saveIncremental(doc2);
  lines.push(
    `saveIncremental(doc2) -> ${incremental.length} 字节（全量 ${binary.length} 字节）`,
  );

  return {
    lines,
    rows: [
      ['保存字节数', String(binary.length)],
      ['往返 equals', String(A.equals(doc2, restored))],
      ['load 后 actorId 相同', String(A.getActorId(restored) === A.getActorId(doc2))],
      ['增量字节数', String(incremental.length)],
    ],
  };
}

function renderLab(canvas: HTMLCanvasElement, result: LabResult): void {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;
  const size = readCanvasSize(canvas);
  const width = Math.max(320, size.width);
  const height = Math.max(240, size.height);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawingContext.clearRect(0, 0, width, height);

  drawingContext.fillStyle = '#172033';
  drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
  drawingContext.fillText('save / load：二进制快照往返', 32, 44);

  drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawingContext.fillStyle = '#334155';
  let y = 78;
  for (const line of result.lines) {
    drawingContext.fillText(line, 32, y);
    y += 23;
  }
}

export function createSnapshotLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SnapshotLabSnapshot) => void,
): SnapshotLabInstance {
  let lastResult: LabResult | null = null;

  function update(options: SnapshotLabArgs): void {
    lastResult = run(options);
    renderLab(canvas, lastResult);
    emit({ rows: lastResult.rows });
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    if (lastResult) {
      renderLab(canvas, lastResult);
    }
  });

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
