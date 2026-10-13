/**
 * 范例：并发插入下「绝对索引」与「相对位置（Y.RelativePosition）」的落点对照。
 * 输入：并发插入字符数 insertCount、插入位置 insertMode（锚点前方 / 恰好锚点处 / 锚点后方）、
 * 吸附方向 assoc（0 / -1，即 createRelativePositionFromTypeIndex 的第三参）。
 * 操作：客户端 A、B 从同一文本出发；A 把光标同时存成裸索引与相对位置，
 * B 在本地并发插入若干「新」字，双向同步后各自重新定位。
 * 预期：锚点前方插入时，绝对索引落入插入区（漂移），相对位置仍指向锚点字符「文」；
 * 锚点后方插入时两者一致；恰好锚点处插入时，assoc >= 0 的相对位置随插入块右移，
 * assoc < 0 的停在插入块之前。
 * 阅读主线:runAnchorScenario() 纯模拟两客户端并发与同步 → createAnchorDemo() 画字符格与两条位置标线。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type InsertMode = 'before' | 'at' | 'after';

export interface AnchorScenarioOptions {
  /** 客户端 B 并发插入的字符数 */
  insertCount: number;
  /** 并发插入相对锚点的位置 */
  insertMode: InsertMode;
  /** 吸附方向：>= 0 锚定位置之后的字符，< 0 锚定位置之前的字符 */
  assoc: number;
}

export interface AnchorScenarioResult {
  /** 同步后的最终文本（两个客户端一致） */
  text: string;
  /** 并发插入区间 [insertStart, insertEnd),无插入时为 -1 */
  insertStart: number;
  insertEnd: number;
  /** A 留下的裸绝对索引（创建后不再维护） */
  absoluteIndex: number;
  /** 相对位置解析出的当前索引；失效时为 -1 */
  relativeIndex: number;
  /** 创建相对位置时它指向的字符 */
  anchorChar: string;
  /** 「绝对索引落点」读数 */
  absoluteLanding: string;
  /** 「相对位置解析」读数 */
  relativeLanding: string;
  /** 一句话结论 */
  verdict: string;
}

export interface AnchorDemoSnapshot {
  anchorChar: string;
  absoluteLanding: string;
  relativeLanding: string;
  verdict: string;
}

export interface AnchorDemoInstance {
  update(options: Partial<AnchorScenarioOptions>): void;
  dispose(): void;
}

const INITIAL_TEXT = '协同编辑让文档保持鲜活';
/** 锚点固定在「文」之前：索引 5 */
const ANCHOR_INDEX = 5;
/** 各插入位置对应的插入点（相对初始文本） */
const INSERT_POSITIONS: Record<InsertMode, number> = {
  before: 1, // 「协」之后，明确在锚点前方
  at: ANCHOR_INDEX, // 恰好锚点处，assoc 的差别只在这里显现
  after: 8, // 「保」之前，明确在锚点后方
};
const INSERT_CHAR = '新';
const MODE_LABELS: Record<InsertMode, string> = {
  before: '锚点前方',
  at: '恰好锚点处',
  after: '锚点后方',
};

const DEFAULT_OPTIONS: AnchorScenarioOptions = {
  insertCount: 6,
  insertMode: 'before',
  assoc: 0,
};

export function runAnchorScenario(
  options: AnchorScenarioOptions,
): AnchorScenarioResult {
  const { insertCount, insertMode, assoc } = options;

  // 两个客户端从同一份文本出发。
  const docA = new Y.Doc();
  const textA = docA.getText('content');
  textA.insert(0, INITIAL_TEXT);
  const docB = new Y.Doc();
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
  const textB = docB.getText('content');

  // A 在同一位置留下两种记号：裸索引（存成数字，不再维护）与相对位置（锚定 item）。
  const absoluteIndex = ANCHOR_INDEX;
  const relPos = Y.createRelativePositionFromTypeIndex(
    textA,
    ANCHOR_INDEX,
    assoc,
  );

  // B 在本地并发插入；此时两边互不知情。
  const insertPos = INSERT_POSITIONS[insertMode];
  if (insertCount > 0) {
    textB.insert(insertPos, INSERT_CHAR.repeat(insertCount));
  }

  // 双向同步（同步协议本身见「文档更新与同步协议」一课）。
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB)));
  Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA)));

  const text = textA.toString();
  const resolved = Y.createAbsolutePositionFromRelativePosition(relPos, docA);
  const relativeIndex = resolved ? resolved.index : -1;

  const anchorChar = INITIAL_TEXT[ANCHOR_INDEX];
  const charAfter = (index: number) =>
    index >= 0 && index < text.length ? text[index] : '末尾';
  const charBefore = (index: number) =>
    index > 0 && index <= text.length ? text[index - 1] : '开头';

  const absoluteLanding = `索引 ${absoluteIndex} → 后为「${charAfter(absoluteIndex)}」`;
  const relativeLanding =
    relativeIndex < 0
      ? '解析失败（null）'
      : assoc >= 0
        ? `索引 ${relativeIndex} → 后为「${charAfter(relativeIndex)}」`
        : `索引 ${relativeIndex} → 前为「${charBefore(relativeIndex)}」`;

  let verdict: string;
  if (insertCount === 0) {
    verdict = '未发生插入：两者一致';
  } else if (insertMode === 'before') {
    verdict = '绝对索引漂移，相对位置仍锚定';
  } else if (insertMode === 'after') {
    verdict = '插入在锚点后方：两者一致';
  } else if (assoc >= 0) {
    verdict = 'assoc ≥ 0：锚点随插入块右移';
  } else {
    verdict = 'assoc < 0：锚点停在插入块之前';
  }

  return {
    text,
    insertStart: insertCount > 0 ? insertPos : -1,
    insertEnd: insertCount > 0 ? insertPos + insertCount : -1,
    absoluteIndex,
    relativeIndex,
    anchorChar,
    absoluteLanding,
    relativeLanding,
    verdict,
  };
}

export function createAnchorDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AnchorDemoSnapshot) => void,
): AnchorDemoInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: AnchorScenarioOptions = { ...DEFAULT_OPTIONS };
  let result: AnchorScenarioResult = runAnchorScenario(current);

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
    drawingContext.fillText(
      '双向同步后，客户端 A 重新定位自己留下的两种位置记号',
      48,
      48,
    );

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `B 并发插入 ${current.insertCount} 字 @ ${MODE_LABELS[current.insertMode]}，assoc = ${current.assoc}`,
      48,
      72,
    );

    // 字符格：每个字一格，并发插入的内容黄底，锚点字符蓝底。
    const chars = Array.from(result.text);
    const left = 48;
    const cellTop = 108;
    const cellH = 40;
    const cellW = Math.min(34, (width - 96) / Math.max(chars.length, 1));
    const anchorCell =
      result.relativeIndex >= 0
        ? current.assoc >= 0
          ? result.relativeIndex
          : result.relativeIndex - 1
        : -1;

    drawingContext.textAlign = 'center';
    drawingContext.textBaseline = 'middle';
    chars.forEach((ch, i) => {
      const x = left + i * cellW;
      const inserted = i >= result.insertStart && i < result.insertEnd;
      drawingContext.fillStyle = inserted ? '#fef3c7' : '#f8fafc';
      drawingContext.fillRect(x, cellTop, cellW, cellH);
      if (i === anchorCell) {
        drawingContext.fillStyle = '#dbeafe';
        drawingContext.fillRect(x, cellTop, cellW, cellH);
      }
      drawingContext.strokeStyle = '#cbd5e1';
      drawingContext.strokeRect(x + 0.5, cellTop + 0.5, cellW - 1, cellH - 1);
      drawingContext.fillStyle = '#172033';
      drawingContext.font =
        '14px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(ch, x + cellW / 2, cellTop + cellH / 2);
    });
    drawingContext.textAlign = 'left';
    drawingContext.textBaseline = 'alphabetic';

    // 两条位置标线：红色 = 裸绝对索引，绿色 = 相对位置解析结果。
    function caret(index: number, color: string, label: string, below: boolean) {
      const x = left + index * cellW;
      drawingContext.strokeStyle = color;
      drawingContext.lineWidth = 2;
      drawingContext.beginPath();
      drawingContext.moveTo(x, cellTop - 6);
      drawingContext.lineTo(x, cellTop + cellH + 6);
      drawingContext.stroke();
      drawingContext.lineWidth = 1;
      drawingContext.fillStyle = color;
      drawingContext.beginPath();
      drawingContext.moveTo(x - 5, cellTop - 6);
      drawingContext.lineTo(x + 5, cellTop - 6);
      drawingContext.lineTo(x, cellTop - 1);
      drawingContext.closePath();
      drawingContext.fill();
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        label,
        Math.min(x + 6, width - 96),
        below ? cellTop + cellH + 24 : cellTop - 12,
      );
    }

    caret(result.absoluteIndex, '#dc2626', '绝对索引', false);
    if (result.relativeIndex >= 0) {
      caret(result.relativeIndex, '#059669', '相对位置', true);
    }

    // 图例。
    const legendY = cellTop + cellH + 56;
    drawingContext.fillStyle = '#fef3c7';
    drawingContext.fillRect(48, legendY - 12, 14, 14);
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.strokeRect(48.5, legendY - 11.5, 13, 13);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('并发插入的内容', 70, legendY);
    drawingContext.fillStyle = '#dbeafe';
    drawingContext.fillRect(190, legendY - 12, 14, 14);
    drawingContext.strokeRect(190.5, legendY - 11.5, 13, 13);
    drawingContext.fillStyle = '#475569';
    drawingContext.fillText(`锚点字符「${result.anchorChar}」`, 212, legendY);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = { ...current, ...options };
      result = runAnchorScenario(current);
      draw();
      emit({
        anchorChar: `「${result.anchorChar}」（创建时索引 ${ANCHOR_INDEX}）`,
        absoluteLanding: result.absoluteLanding,
        relativeLanding: result.relativeLanding,
        verdict: result.verdict,
      });
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
