/**
 * 范例介绍：演示 Konva.Text 的「文本框」模型——width 决定换行、height 决定截断，
 * 测量方法返回内容与框的尺寸。
 * 核心观察——Konva.Text 永远把文字塞进 width：wrap=word/char 时折成多行，
 *   wrap=none 时截成一行（超出部分丢弃，不溢出框外）。height 再把多出的行封顶，
 *   配合 ellipsis 在末行补「…」。读数对比 getTextWidth()（实际最长行）与
 *   measureSize()（完整文本一行的自然宽），让换行 / 截断的差异可核对。
 *
 * 输入：width（框宽）、height（框高）、fontSize、wrap（none/word/char）、
 *       ellipsis、align、verticalAlign。
 * 操作：update(options) 应用属性后用 layer.batchDraw() 重绘；尺寸变化时同步 stage 宽高。
 * 预期：虚线框始终贴合 width × height；wrap=none 时行数恒为 1（单段文本），
 *       文字被截到框宽内；wrap=word 缩小 width 时行数增加。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TextOptions {
  /** 文本框宽（含 padding）。固定后文字按 wrap 规则换行 / 截断。 */
  width: number;
  /** 文本框高（含 padding）。缩小到容不下内容时，配合 ellipsis 会截断。 */
  height: number;
  fontSize: number;
  wrap: 'none' | 'word' | 'char';
  ellipsis: boolean;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
}

export interface TextSnapshot {
  /** getTextWidth()：换行 / 截断后最长那一行的纯文本宽，不含 padding。 */
  textWidth: number;
  /** measureSize(DEMO_TEXT).width：完整文本排成一行时的自然宽，不含 padding。 */
  fullTextWidth: number;
  /** width()：整个文本框宽，含 padding（固定 width 时等于输入值）。 */
  boxWidth: number;
  /** 实际渲染行数。 */
  lines: number;
}

export interface TextInstance {
  update(options: TextOptions): void;
  dispose(): void;
}

// 演示文本：单段长句，不含 \n，便于纯粹观察 wrap 的换行效果。
const DEMO_TEXT =
  'Konva Text draws strings on the canvas. Narrow the width to wrap, or shorten the height to trigger ellipsis.';

// 视觉常量：文本与虚线框的颜色。
const TEXT_FILL = '#172033';
const FRAME_STROKE = '#94a3b8';
const PADDING = 12;
const LINE_HEIGHT = 1.25;
const FRAME_X = 30;
const FRAME_Y = 44;

export function createText(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TextSnapshot) => void,
): TextInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.inset = '0';
  root.appendChild(wrapper);
  canvas.style.display = 'none';

  const initial = readCanvasSize(canvas);
  const stage = new Konva.Stage({
    container: wrapper,
    width: initial.width,
    height: initial.height,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  // 虚线框：可视化文本框的 width × height 边界，让「框」可见。
  const frame = new Konva.Rect({
    x: FRAME_X,
    y: FRAME_Y,
    stroke: FRAME_STROKE,
    strokeWidth: 1,
    dash: [6, 4],
    listening: false,
  });
  layer.add(frame);

  // 文本节点：核心对象。padding/lineHeight 固定，其余属性由 update(options) 注入。
  const text = new Konva.Text({
    x: FRAME_X,
    y: FRAME_Y,
    text: DEMO_TEXT,
    fontFamily: 'Arial',
    fill: TEXT_FILL,
    padding: PADDING,
    lineHeight: LINE_HEIGHT,
    listening: false,
  });
  layer.add(text);

  let current: TextOptions = {
    width: 320,
    height: 200,
    fontSize: 22,
    wrap: 'word',
    ellipsis: false,
    align: 'left',
    verticalAlign: 'top',
  };

  function draw() {
    const { width: stageW, height: stageH } = readCanvasSize(canvas);
    stage.width(stageW);
    stage.height(stageH);

    // 应用全部可控属性。
    text.setAttrs({
      width: current.width,
      height: current.height,
      fontSize: current.fontSize,
      wrap: current.wrap,
      ellipsis: current.ellipsis,
      align: current.align,
      verticalAlign: current.verticalAlign,
    });

    // 虚线框贴合文本框尺寸。
    frame.size({ width: current.width, height: current.height });

    layer.batchDraw();

    // 读数全部来自公开 API：getTextWidth、measureSize、width()，以及 textArr 的行数。
    // textArr 是节点上的公开字段，记录按当前排版拆分后的每一行。
    emit({
      textWidth: text.getTextWidth(),
      fullTextWidth: text.measureSize(DEMO_TEXT).width,
      boxWidth: text.width(),
      lines: text.textArr.length,
    });
  }

  // 容器尺寸变化时重读宽高并重绘。
  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
    },
  };
}
