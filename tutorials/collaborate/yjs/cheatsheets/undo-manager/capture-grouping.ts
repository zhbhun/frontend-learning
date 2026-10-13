/**
 * 范例:captureTimeout 与 stopCapturing 怎样决定一次撤销撤回多少内容。
 * 输入:连续输入字符数(2–6)、captureTimeout(0ms / 500ms)、是否在输入中途调用 stopCapturing。
 * 操作:新建 Y.Doc 与 Y.Text,逐字符 insert 模拟连续键入(中途按需 stopCapturing 切段),
 *      用 stack-item-added / stack-item-updated 事件记录每个字符落入哪个 StackItem,
 *      然后执行一次 undo。
 * 预期:captureTimeout=500(默认)时连续输入合并为一步,undo 一次全部撤回;
 *      captureTimeout=0 时每个字符各成一步,undo 一次只撤最后一字;
 *      500ms 下输入中途 stopCapturing 会把输入切成两步,undo 一次只撤后半段。
 * 阅读主线:update() → replay() 重建文档、按选项输入并 undo → draw() 上排画撤销栈分组,
 *      下排画 undo 一次后的文本。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface CaptureGroupingOptions {
  /** 连续输入的字符数 */
  chars: number;
  /** UndoManager 构造选项 captureTimeout(毫秒) */
  captureTimeout: 0 | 500;
  /** 输入到一半时调用一次 stopCapturing,强制切出新的 StackItem */
  split: boolean;
}

export interface CaptureGroupingSnapshot {
  stackSize: number;
  removed: number;
  textAfterUndo: string;
  canRedo: string;
}

export interface CaptureGroupingInstance {
  update(options: CaptureGroupingOptions): void;
  dispose(): void;
}

const INPUT_CHARS = ['h', 'e', 'l', 'l', 'o', '!'];

/** 分组色板:同一 StackItem 的字符用同一颜色 */
const GROUP_COLORS = ['#4f7cff', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#ef4444'];

interface ReplayResult {
  /** 每个字符落入的 StackItem 序号(0 起) */
  charGroups: number[];
  chars: string[];
  stackSize: number;
  removed: number;
  textAfterUndo: string;
  canRedo: boolean;
}

function replay(options: CaptureGroupingOptions): ReplayResult {
  // 每次输入变化都用全新的 Y.Doc 重放,保证读数干净、结果确定。
  const doc = new Y.Doc();
  const text = doc.getText('note');
  const undoManager = new Y.UndoManager(text, {
    captureTimeout: options.captureTimeout,
  });

  // 每个被捕获的事务结束时只触发两者之一:
  // added 表示开出新的 StackItem,updated 表示并入上一个 StackItem。
  // 据此给每个字符标注它落入的撤销步。
  const charGroups: number[] = [];
  let group = -1;
  undoManager.on('stack-item-added', () => {
    group += 1;
    charGroups.push(group);
  });
  undoManager.on('stack-item-updated', () => {
    charGroups.push(group);
  });

  const splitAt = Math.floor(options.chars / 2);
  for (let i = 0; i < options.chars; i += 1) {
    if (options.split && i === splitAt) {
      // 切断合并:即使仍在捕获窗口内,下一次修改也必开新的一步。
      undoManager.stopCapturing();
    }
    text.insert(i, INPUT_CHARS[i]);
  }

  const stackSize = undoManager.undoStack.length;
  const groupsSnapshot = charGroups.slice();
  const lengthBeforeUndo = text.length;

  // undo 本身也会触发事件(往 redo 栈压入),分组统计已在此前完成。
  undoManager.undo();

  return {
    charGroups: groupsSnapshot,
    chars: INPUT_CHARS.slice(0, options.chars),
    stackSize,
    removed: lengthBeforeUndo - text.length,
    textAfterUndo: JSON.stringify(text.toString()),
    canRedo: undoManager.canRedo(),
  };
}

export function createCaptureGrouping(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CaptureGroupingSnapshot) => void,
): CaptureGroupingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: CaptureGroupingOptions = { chars: 4, captureTimeout: 500, split: false };
  let result: ReplayResult = replay(current);

  function drawCharRun(
    chars: string[],
    charGroups: number[],
    top: number,
    fadedFromGroup: number | null,
  ) {
    const cell = 34;
    const gap = 8;
    const groupGap = 22;
    let x = 48;
    let previousGroup = -1;

    chars.forEach((char, index) => {
      const groupOfChar = charGroups[index];
      if (index > 0) {
        x += groupOfChar === previousGroup ? gap : groupGap;
      }
      const faded = fadedFromGroup !== null && groupOfChar >= fadedFromGroup;
      const color = faded ? '#cbd5e1' : GROUP_COLORS[groupOfChar % GROUP_COLORS.length];

      drawingContext.fillStyle = color;
      drawingContext.fillRect(x, top, cell, cell);
      drawingContext.fillStyle = faded ? '#64748b' : '#ffffff';
      drawingContext.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(char, x + cell / 2 - 4, top + cell / 2 + 5);

      if (faded) {
        // 已撤销的字符画删除线。
        drawingContext.strokeStyle = '#64748b';
        drawingContext.lineWidth = 2;
        drawingContext.beginPath();
        drawingContext.moveTo(x + 4, top + cell / 2);
        drawingContext.lineTo(x + cell - 4, top + cell / 2);
        drawingContext.stroke();
      }

      previousGroup = groupOfChar;
      x += cell;
    });
  }

  function drawGroupLabels(charGroups: number[], top: number) {
    const cell = 34;
    const gap = 8;
    const groupGap = 22;
    let x = 48;
    let previousGroup = -1;
    let groupStartX = 48;

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';

    charGroups.forEach((groupOfChar, index) => {
      if (index > 0) {
        x += groupOfChar === previousGroup ? gap : groupGap;
      }
      if (groupOfChar !== previousGroup) {
        groupStartX = x;
        drawingContext.fillText(`第 ${groupOfChar + 1} 步`, groupStartX, top);
      }
      previousGroup = groupOfChar;
      x += cell;
    });
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

    const undoGroup = result.stackSize - 1;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    const timeoutText =
      result.stackSize <= 1 ? '合并为一步' : `切成 ${result.stackSize} 步`;
    drawingContext.fillText(
      `captureTimeout = ${current.captureTimeout}ms,连续输入 ${current.chars} 字 → ${timeoutText}`,
      48,
      52,
    );

    // 泳道一:撤销栈分组,同一颜色的字符属于同一步。
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('撤销栈分组', 48, 92);
    drawGroupLabels(result.charGroups, 112);
    drawCharRun(result.chars, result.charGroups, 122, null);

    // 泳道二:undo 一次后,栈顶一步(最后一组)被撤回。
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('undo 一次后', 48, 208);
    drawCharRun(result.chars, result.charGroups, 218, undoGroup);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      result = replay(options);
      draw();
      emit({
        stackSize: result.stackSize,
        removed: result.removed,
        textAfterUndo: result.textAfterUndo,
        canRedo: result.canRedo ? '是' : '否',
      });
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
