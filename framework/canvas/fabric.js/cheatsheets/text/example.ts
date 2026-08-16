/**
 * 范例介绍：用 5 个独立画布核对 FabricText 的核心机制——
 * 1. 构造即测量：width/height 是逐字符测量的派生值，字体参数一变就整体重算；
 * 2. textAlign / lineHeight / charSpacing 影响行内位置与行高，height 遵循固定公式（×1.13、末行不乘 lineHeight）；
 * 3. FabricText 只认 \n 手动换行；按 width 自动换行是 Textbox 的职责（对照演示分工）；
 * 4. styles 分片按“行 / 字素”双索引逐字符覆盖样式，分片字号参与测量（width 跟着变）；
 * 5. 测量入口 calcTextWidth / getLineWidth / measureLine / getHeightOfLine 的读数同源一致。
 * 输入：每个范例各自由 Controls 提供（字体参数、对齐/行距/字距、换行宽度、分片预设等）。
 * 预期结果：画面变化与 readout 读数（尺寸派生、行数、序列化分片区间、生效值覆盖）逐项对应。
 * 阅读主线：5 个 create* 函数各对应正文一个小节，update() 展示对应公开 API 的最小用法。
 */
import { Canvas, FabricText, Rect, Textbox } from 'fabric';
import type { TextStyle } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
const STAGE_CENTER = { x: INITIAL_SIZE.width / 2, y: INITIAL_SIZE.height / 2 };

/** 共享的舞台装配：创建交互画布并跟随共享舞台尺寸；dispose 释放观察器与画布 */
function setupStage(
  canvasEl: HTMLCanvasElement,
  syncSize: (width: number, height: number) => void,
) {
  const fabricCanvas = new Canvas(canvasEl, { ...INITIAL_SIZE });
  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () => {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    syncSize(width, height);
  });
  return {
    fabricCanvas,
    dispose() {
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}

/** 把尺寸读数统一为定宽文本，便于 readout 对齐 */
function joinSize(object: { width: number; height: number }) {
  return `${Math.round(object.width)}×${Math.round(object.height)}`;
}

/** 保留 1 位小数：行高、行宽等测量值不是整数 */
function round1(value: number) {
  return Math.round(value * 10) / 10;
}

// ---------------------------------------------------------------------------
// 范例 1：构造与字体参数——options 单对象 + 派生尺寸随字体参数重算
// ---------------------------------------------------------------------------

export type TextPreset = 'single' | 'manual';

const TEXT_PRESETS: Record<TextPreset, string> = {
  single: '单行文本对象',
  manual: '第一行手动换行\n第二行内容',
};

export interface TextBasicsOptions {
  textPreset: TextPreset;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
}

export interface TextBasicsSnapshot {
  size: string;
  lineCount: number;
  singleLineHeight: string;
}

export interface TextBasicsInstance {
  update(options: TextBasicsOptions): void;
  dispose(): void;
}

export function createTextBasics(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: TextBasicsSnapshot) => void,
): TextBasicsInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    // 画布尺寸变化只重设画布与对象中心，字体参数交给 Controls
    stage.fabricCanvas.setDimensions({ width, height });
    text.set({ left: width / 2, top: height / 2 });
  });

  // 只给文字内容与位置：字体参数全部落在默认值（Times New Roman / 40 / normal / normal）
  const text = new FabricText(TEXT_PRESETS.single, {
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
  });
  stage.fabricCanvas.add(text);

  function emitSnapshot() {
    emit({
      size: joinSize(text),
      lineCount: text.textLines.length,
      singleLineHeight: `${text.fontSize}×1.13 = ${round1(text.fontSize * 1.13)}`,
    });
  }

  function update(options: TextBasicsOptions) {
    // text / 字体四件套都是布局属性：set() 内部自动 initDimensions() + setCoords()
    text.set({
      text: TEXT_PRESETS[options.textPreset],
      fontFamily: options.fontFamily,
      fontSize: options.fontSize,
      fontWeight: options.fontWeight,
      fontStyle: options.fontStyle,
    });
    // set() 只改属性并重排布局，画面刷新仍要 requestRenderAll
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 2：对齐与间距——textAlign 的行内偏移、lineHeight/charSpacing 进入尺寸
// ---------------------------------------------------------------------------

export type AlignValue = 'left' | 'center' | 'right' | 'justify';

// 两行都带空格：justify 靠拉伸空格铺满宽度，无空格的行看不出效果
const ALIGN_TEXT = 'Justify 拉伸 行内 空格 铺满宽度\n第二行 较短 也有 空格';

export interface AlignSpacingOptions {
  alignTextAlign: AlignValue;
  alignLineHeight: number;
  alignCharSpacing: number;
}

export interface AlignSpacingSnapshot {
  textAlign: string;
  size: string;
  heightFormula: string;
  lineWidths: string;
}

export interface AlignSpacingInstance {
  update(options: AlignSpacingOptions): void;
  dispose(): void;
}

export function createAlignSpacing(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: AlignSpacingSnapshot) => void,
): AlignSpacingInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
    guide.set({ left: width / 2, top: height / 2 });
    text.set({ left: width / 2, top: height / 2 });
  });

  // 参考框只画包围盒：与文本同中心、同 width/height，让“短行在框内怎么摆”可见
  const guide = new Rect({
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
    width: 10,
    height: 10,
    fill: 'rgba(79,124,255,0.06)',
    stroke: '#94a3b8',
    strokeWidth: 1,
    strokeDashArray: [4, 4],
  });
  const text = new FabricText(ALIGN_TEXT, {
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
    fontSize: 32,
  });
  stage.fabricCanvas.add(guide, text);

  function emitSnapshot() {
    const fontSize = text.fontSize;
    const lines = text.textLines.length;
    emit({
      textAlign: text.textAlign,
      size: joinSize(text),
      heightFormula:
        `${fontSize}×1.13×(${text.lineHeight}×${lines - 1}+1)` +
        ` = ${round1(text.height)}`,
      lineWidths: `${round1(text.getLineWidth(0))} / ${round1(
        text.getLineWidth(lines - 1),
      )}`,
    });
  }

  function update(options: AlignSpacingOptions) {
    text.set({
      textAlign: options.alignTextAlign,
      lineHeight: options.alignLineHeight,
      charSpacing: options.alignCharSpacing,
    });
    // 重排后同步参考框：包围盒尺寸就是派生出的 width×height
    guide.set({ width: text.width, height: text.height });
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 3：换行分工——FabricText 只认 \n，Textbox 按 width 自动换行
// ---------------------------------------------------------------------------

export type WrapPreset = 'short' | 'long';

// Textbox 默认按“词”换行（splitByGrapheme: false）：中文词之间留空格才能断行
const WRAP_TEXTS: Record<WrapPreset, string> = {
  short: '一行 短句 对照',
  long: 'FabricText 不按 宽度 自动 换行，长 文本 会 一行 拉通 直到 超出 设定 宽度',
};

const WRAP_LEFT = 32;

export interface WrapContrastOptions {
  wrapPreset: WrapPreset;
  wrapWidth: number;
}

export interface WrapContrastSnapshot {
  plainLines: number;
  plainWidth: number;
  boxLines: number;
  boxHeight: number;
}

export interface WrapContrastInstance {
  update(options: WrapContrastOptions): void;
  dispose(): void;
}

export function createWrapContrast(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: WrapContrastSnapshot) => void,
): WrapContrastInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });

  // 左上角锚定的对照布局：两个对象同文本、同字号，差异只在“宽度是不是布局输入”
  const labelTop = new FabricText('FabricText（只认 \\n 手动换行）', {
    left: WRAP_LEFT,
    top: 48,
    originX: 'left',
    originY: 'top',
    fontSize: 13,
    fill: '#64748b',
    selectable: false,
  });
  const plain = new FabricText(WRAP_TEXTS.short, {
    left: WRAP_LEFT,
    top: 76,
    originX: 'left',
    originY: 'top',
    fontSize: 22,
  });
  const labelBottom = new FabricText('Textbox（width 是布局输入）', {
    left: WRAP_LEFT,
    top: 208,
    originX: 'left',
    originY: 'top',
    fontSize: 13,
    fill: '#64748b',
    selectable: false,
  });
  const box = new Textbox(WRAP_TEXTS.short, {
    left: WRAP_LEFT,
    top: 236,
    originX: 'left',
    originY: 'top',
    width: 320,
    fontSize: 22,
  });
  stage.fabricCanvas.add(labelTop, plain, labelBottom, box);

  function emitSnapshot() {
    emit({
      plainLines: plain.textLines.length,
      plainWidth: Math.round(plain.width),
      boxLines: box.textLines.length,
      boxHeight: Math.round(box.height),
    });
  }

  function update(options: WrapContrastOptions) {
    const content = WRAP_TEXTS[options.wrapPreset];
    // FabricText：换文本行数只由 \n 决定，width 始终重算回最宽行宽
    plain.set('text', content);
    // Textbox：width 在其布局属性表里，set 后按词重排、高度随行数派生
    box.set({ text: content, width: options.wrapWidth });
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 4：styles 分片——行/字素双索引覆盖样式，分片字号参与测量
// ---------------------------------------------------------------------------

export type SpanPreset = 'none' | 'keyword' | 'enlarge' | 'combo';

const SPAN_TEXT = '把分片两字做大变红\n第二行保持普通';

/**
 * 分片索引按“行 / 字素”计：行 0 的第 1、2 个字素是“分”“片”。
 * 可覆盖属性只限 styleProperties 清单：字体四件套、fill/stroke/strokeWidth、
 * 装饰线三项、deltaY、textBackgroundColor、textDecoration 厚度与颜色。
 */
const SPAN_STYLES: Record<SpanPreset, TextStyle> = {
  none: {},
  keyword: {
    0: {
      1: { fill: '#e11d48', fontWeight: 'bold' },
      2: { fill: '#e11d48', fontWeight: 'bold' },
    },
  },
  enlarge: {
    0: {
      1: { fontSize: 64 },
      2: { fontSize: 64 },
    },
  },
  combo: {
    0: {
      1: { fill: '#e11d48', fontWeight: 'bold', underline: true },
      2: { fill: '#e11d48', fontWeight: 'bold', underline: true },
      3: { textBackgroundColor: '#fde68a' },
    },
  },
};

export interface StyleSpansOptions {
  spanPreset: SpanPreset;
}

export interface StyleSpansSnapshot {
  spans: string;
  objectFill: string;
  overrideFill: string;
  size: string;
}

export interface StyleSpansInstance {
  update(options: StyleSpansOptions): void;
  dispose(): void;
}

export function createStyleSpans(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: StyleSpansSnapshot) => void,
): StyleSpansInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
    text.set({ left: width / 2, top: height / 2 });
  });

  const text = new FabricText(SPAN_TEXT, {
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
    fontSize: 36,
  });
  stage.fabricCanvas.add(text);

  function emitSnapshot() {
    // toObject() 把逐字符 styles 序列化为 [{ start, end, style }] 区间数组
    const serialized: unknown = text.toObject().styles;
    const spans = Array.isArray(serialized)
      ? (serialized as { start: number; end: number; style: object }[])
          .map((range) => `[${range.start},${range.end}) ${Object.keys(range.style).join('/')}`)
          .join('，')
      : '（非数组）';
    emit({
      spans: spans || '（空）',
      objectFill: String(text.fill),
      // 生效值入口：分片覆盖 ?? 对象级
      overrideFill: String(text.getValueOfPropertyAt(0, 1, 'fill')),
      size: joinSize(text),
    });
  }

  function update(options: StyleSpansOptions) {
    // styles 是布局属性：分片里的 fontSize 会参与测量，width 随之重算
    text.set('styles', SPAN_STYLES[options.spanPreset]);
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 5：测量读数——四个宽度入口同源一致，行高与高度公式可对账
// ---------------------------------------------------------------------------

const MEASURE_TEXT = '测量入口对照 Measure';

export interface MeasureReadoutOptions {
  fontFamily: string;
  fontSize: number;
}

export interface MeasureReadoutSnapshot {
  width: number;
  calcTextWidth: number;
  lineWidth: number;
  measureLine: number;
  height: number;
  heightOfLine: number;
}

export interface MeasureReadoutInstance {
  update(options: MeasureReadoutOptions): void;
  dispose(): void;
}

export function createMeasureReadout(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: MeasureReadoutSnapshot) => void,
): MeasureReadoutInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
    text.set({ left: width / 2, top: height / 2 });
  });

  const text = new FabricText(MEASURE_TEXT, {
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
  });
  stage.fabricCanvas.add(text);

  function emitSnapshot() {
    emit({
      width: round1(text.width),
      calcTextWidth: round1(text.calcTextWidth()),
      lineWidth: round1(text.getLineWidth(0)),
      measureLine: round1(text.measureLine(0).width),
      height: round1(text.height),
      heightOfLine: round1(text.getHeightOfLine(0)),
    });
  }

  function update(options: MeasureReadoutOptions) {
    // 字体属性 set() 同步重排：读数立即可读，无需等待渲染
    text.set({ fontFamily: options.fontFamily, fontSize: options.fontSize });
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}
