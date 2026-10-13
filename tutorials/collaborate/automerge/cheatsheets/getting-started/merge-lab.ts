/**
 * 范例外壳：把 runMergeLoop 的闭环结果画成「两副本 → 合并」的三卡片图。
 * 本文件只负责 Canvas 绘图与生命周期；全部 Automerge 逻辑在 merge-loop.ts。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import {
  runMergeLoop,
  type MergeLoopInput,
  type MergeLoopResult,
} from './merge-loop';

export interface MergeLabSnapshot {
  input: MergeLoopInput;
  result: MergeLoopResult;
}

export interface MergeLabInstance {
  update(input: MergeLoopInput): void;
  dispose(): void;
}

const COLORS = {
  ink: '#172033',
  muted: '#5b6b7f',
  card: '#ffffff',
  border: '#c4cfdd',
  accent: '#4f7cff',
  ok: '#0f766e',
};

const FONT_SANS = 'ui-sans-serif, system-ui, sans-serif';
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export function createMergeLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MergeLabSnapshot) => void,
): MergeLabInstance {
  const drawingContext = canvas.getContext('2d');
  if (!drawingContext) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = drawingContext;

  // 初始 current 不带 mode：runMergeLoop 只读 input.mode === 'concurrent'，
  // 缺省与 'independent' 走同一分支，且首帧渲染前会被 story args 覆盖；断言对齐类型。
  let current: MergeLoopInput = { field: 'title', valueA: '', valueB: '' } as MergeLoopInput;
  let result: MergeLoopResult | null = null;

  function fitText(text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let clipped = text;
    while (
      clipped.length > 1 &&
      ctx.measureText(`${clipped}…`).width > maxWidth
    ) {
      clipped = clipped.slice(0, -1);
    }
    return `${clipped}…`;
  }

  function drawCard(x: number, y: number, w: number, h: number, accent: string) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fillStyle = COLORS.card;
    ctx.fill();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, 4, h);
  }

  function drawReplicaCard(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    actorId: string,
    value: string,
    field: string,
  ) {
    drawCard(x, y, w, h, COLORS.accent);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.ink;
    ctx.font = `600 14px ${FONT_SANS}`;
    ctx.fillText(label, x + 16, y + 26);
    ctx.fillStyle = COLORS.muted;
    ctx.font = `11px ${FONT_MONO}`;
    ctx.fillText(`actor ${actorId.slice(0, 8)}`, x + 16, y + 46);
    ctx.fillStyle = COLORS.ink;
    ctx.font = `13px ${FONT_SANS}`;
    ctx.fillText(fitText(`${field} = “${value}”`, w - 32), x + 16, y + 68);
  }

  function drawArrow(fromX: number, fromY: number, toX: number, toY: number) {
    const head = 7;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - head * Math.cos(angle - Math.PI / 6),
      toY - head * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      toX - head * Math.cos(angle + Math.PI / 6),
      toY - head * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = COLORS.muted;
    ctx.fill();
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!result) {
      return;
    }

    const pad = 18;

    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.muted;
    ctx.font = `12px ${FONT_SANS}`;
    ctx.fillText(
      'from 创建起点 → clone 分出两副本 → change 各自修改 → merge 自动合并',
      pad,
      26,
    );

    const cardW = (width - pad * 2 - 24) / 2;
    const cardY = 42;
    const cardH = 86;
    drawReplicaCard(
      pad,
      cardY,
      cardW,
      cardH,
      '副本 A',
      result.actorA,
      result.replicaAValue,
      result.fieldA,
    );
    drawReplicaCard(
      pad + cardW + 24,
      cardY,
      cardW,
      cardH,
      '副本 B',
      result.actorB,
      result.replicaBValue,
      result.fieldB,
    );

    const mergedY = cardY + cardH + 26;
    drawArrow(pad + cardW / 2, cardY + cardH, width / 2 - 12, mergedY);
    drawArrow(
      pad + cardW + 24 + cardW / 2,
      cardY + cardH,
      width / 2 + 12,
      mergedY,
    );
    ctx.fillStyle = COLORS.muted;
    ctx.font = `11px ${FONT_MONO}`;
    ctx.fillText('merge', width / 2 + 18, (cardY + cardH + mergedY) / 2 + 4);

    const mergedH = 54;
    drawCard(pad, mergedY, width - pad * 2, mergedH, COLORS.ok);
    ctx.fillStyle = COLORS.ink;
    ctx.font = `600 14px ${FONT_SANS}`;
    ctx.fillText('merge 后的文档', pad + 16, mergedY + 32);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.muted;
    ctx.font = `13px ${FONT_SANS}`;
    ctx.fillText(
      fitText(
        `{ title: “${result.mergedTitle}”, note: “${result.mergedNote}” }`,
        width / 2 - pad * 2,
      ),
      width - pad - 16,
      mergedY + 32,
    );
    ctx.textAlign = 'left';
  }

  function recompute() {
    result = runMergeLoop(current);
    draw();
    emit({ input: current, result });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  recompute();

  return {
    update(input) {
      current = input;
      recompute();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
