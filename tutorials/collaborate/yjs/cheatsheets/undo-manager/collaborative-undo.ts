/**
 * 范例:协作场景下,UndoManager 的 trackedOrigins 怎样决定「撤销回滚谁的改动」。
 * 输入:A 的 UndoManager 是否把远端 origin('remote')加入 trackedOrigins。
 * 操作:两个 Y.Doc 经 update 事件互相同步(applyUpdate 带 origin 'remote',模拟 Provider);
 *      A 插入「甲」→ B 插入「乙」→ A 执行一次 undo。
 * 预期:默认配置(trackedOrigins 只含 null)时撤销栈里只有 A 的「甲」,
 *      undo 回滚 A 自己的改动,双方文本剩「乙」,B 的输入不受影响;
 *      把 'remote' 加入 trackedOrigins 后,B 的「乙」也进栈且位于栈顶,
 *      A 的一次 undo 回滚了 B 刚写的「乙」,双方文本剩「甲」。
 * 阅读主线:update() → replay() 建双文档互同步、按固定序列操作、undo →
 *      draw() 左右两栏画两个客户端 undo 前后的文本。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface CollaborativeUndoOptions {
  /** true 时 A 的 UndoManager 配置 trackedOrigins: new Set([null, 'remote']) */
  trackRemote: boolean;
}

export interface CollaborativeUndoSnapshot {
  stackDepth: number;
  undoResult: string;
  textAfterA: string;
  textAfterB: string;
}

export interface CollaborativeUndoInstance {
  update(options: CollaborativeUndoOptions): void;
  dispose(): void;
}

type Author = 'A' | 'B';

interface CharCell {
  char: string;
  author: Author;
  removed: boolean;
}

interface ReplayResult {
  stackDepth: number;
  applied: boolean;
  cells: CharCell[];
  textAfterA: string;
  textAfterB: string;
}

const AUTHOR_COLORS: Record<Author, string> = {
  A: '#4f7cff',
  B: '#f59e0b',
};

function replay(options: CollaborativeUndoOptions): ReplayResult {
  // 每次输入变化都用全新的两个 Y.Doc 重放,保证读数干净、结果确定。
  const docA = new Y.Doc();
  const docB = new Y.Doc();
  // applyUpdate 的第三参成为应用方事务的 origin:
  // Provider 转发远端更新时同样带固定 origin,远端事务因此与本地事务可区分。
  docA.on('update', (update: Uint8Array) => Y.applyUpdate(docB, update, 'remote'));
  docB.on('update', (update: Uint8Array) => Y.applyUpdate(docA, update, 'remote'));

  const textA = docA.getText('note');
  const textB = docB.getText('note');
  const undoManager = new Y.UndoManager(
    textA,
    options.trackRemote
      ? { trackedOrigins: new Set<unknown>([null, 'remote']) }
      : {},
  );

  // 固定操作序列:A 写「甲」→ B 写「乙」。stopCapturing 保证各占一步。
  textA.insert(0, '甲');
  undoManager.stopCapturing();
  textB.insert(1, '乙');
  undoManager.stopCapturing();

  const stackDepth = undoManager.undoStack.length;
  const popped = undoManager.undo();

  const afterA = textA.toString();
  const removedChar = afterA === '甲乙' ? null : afterA === '甲' ? '乙' : '甲';

  const cells: CharCell[] = [
    { char: '甲', author: 'A', removed: removedChar === '甲' },
    { char: '乙', author: 'B', removed: removedChar === '乙' },
  ];

  return {
    stackDepth,
    applied: popped !== null,
    cells,
    textAfterA: JSON.stringify(afterA),
    textAfterB: JSON.stringify(textB.toString()),
  };
}

export function createCollaborativeUndo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CollaborativeUndoSnapshot) => void,
): CollaborativeUndoInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: CollaborativeUndoOptions = { trackRemote: false };
  let result: ReplayResult = replay(current);

  function drawCell(cell: CharCell, x: number, top: number, faded: boolean) {
    const size = 34;
    drawingContext.fillStyle = faded ? '#cbd5e1' : AUTHOR_COLORS[cell.author];
    drawingContext.fillRect(x, top, size, size);
    drawingContext.fillStyle = faded ? '#64748b' : '#ffffff';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(cell.char, x + size / 2 - 8, top + size / 2 + 5);
    if (faded) {
      // 已被撤销的字符画删除线。
      drawingContext.strokeStyle = '#64748b';
      drawingContext.lineWidth = 2;
      drawingContext.beginPath();
      drawingContext.moveTo(x + 4, top + size / 2);
      drawingContext.lineTo(x + size - 4, top + size / 2);
      drawingContext.stroke();
    }
  }

  function drawClientPanel(title: string, left: number) {
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(title, left, 96);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('undo 前', left, 128);
    drawingContext.fillText('undo 后', left, 182);

    result.cells.forEach((cell, index) => {
      drawCell(cell, left + 72 + index * 44, 106, false);
    });
    result.cells.forEach((cell, index) => {
      drawCell(cell, left + 72 + index * 44, 160, cell.removed);
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(520, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      current.trackRemote
        ? "trackedOrigins 含 'remote':B 的改动也进 A 的撤销栈"
        : '默认 trackedOrigins(只含 null):A 的撤销栈只追踪 A 自己的改动',
      48,
      48,
    );

    const mid = Math.round(width / 2);
    drawClientPanel('客户端 A(执行 undo)', 48);
    drawClientPanel('客户端 B', mid + 24);

    // 图例:字符块颜色标注改动作者。
    drawingContext.fillStyle = AUTHOR_COLORS.A;
    drawingContext.fillRect(48, height - 56, 14, 14);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('A 写入「甲」', 68, height - 44);
    drawingContext.fillStyle = AUTHOR_COLORS.B;
    drawingContext.fillRect(160, height - 56, 14, 14);
    drawingContext.fillStyle = '#475569';
    drawingContext.fillText('B 写入「乙」', 180, height - 44);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      result = replay(options);
      draw();
      emit({
        stackDepth: result.stackDepth,
        undoResult: result.applied ? 'StackItem' : 'null',
        textAfterA: result.textAfterA,
        textAfterB: result.textAfterB,
      });
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
