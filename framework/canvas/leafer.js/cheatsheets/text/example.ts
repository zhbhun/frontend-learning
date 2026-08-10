/**
 * 演示内容：用 leafer-ui 的 Text 演示文本的字体样式、按宽度自动换行与文字测量。
 * 输入/前置：canvasStory 传入一个 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *           本课公开输入为 字号 fontSize、行高 lineHeight、字间距 letterSpacing、
 *           对齐 textAlign、文本框宽度 width（0 表示自动宽度，不换行）、填充色 fill。
 * 主要操作：new Leafer({ view: canvas }) 复用传入的 <canvas>；
 *           new Text({ text }) 创建文本节点，update() 里按 args 设置字体与换行属性；
 *           通过 text.boxBounds（文本框包围盒）与 text.textDrawData（含 rows 行数组）
 *           读出测量尺寸与行数，并用一个虚线 guide Rect 把「文本框」可视化。
 * 预期结果：调 fontSize / lineHeight / letterSpacing / fill → 文字外观与文本框尺寸同步；
 *           调 width（>0）→ 文字按宽度自动换行、行数变化；width=0 → 自动宽度、排成单行；
 *           调 textAlign → 仅在 width 固定时可见对齐效果（自动宽度时文本框贴合内容，对齐无视觉差）；
 *           左下角读数给出「文本框 / 行数 / 内容宽 / 溢出」，与正文断言一致。
 * 阅读主线：createText → Leafer 配置(view) → Text 创建与属性 → 读测量值 → guide 同步 → dispose 销毁。
 */
import { Leafer, Text, Rect } from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TextOptions {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
  /** 文本框宽度：0 表示自动宽度（不换行），>0 表示固定宽度并按此自动换行。 */
  width: number;
  fill: string;
}

export interface TextSnapshot {
  /** 文本框包围盒（boxBounds）的宽 × 高，单位 px。 */
  boxSize: string;
  /** 实际渲染行数（textDrawData.rows.length）。 */
  rows: number;
  /** 文字内容宽度（textDrawData.bounds.width），即最宽一行的宽度。 */
  contentW: number;
  /** 内容是否溢出固定文本框。 */
  overflow: string;
}

export interface TextInstance {
  update(options: TextOptions): void;
  dispose(): void;
}

// 示例文本：第一句较长用于演示自动换行，\n 演示手动断行。
const SAMPLE =
  'LeaferJS Text 按设定宽度自动换行，未设宽度时排成单行。\n第二行用换行符手动断开，行数随宽度与字号变化。';

const TEXT_X = 36;
const TEXT_Y = 48;

export function createText(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TextSnapshot) => void,
): TextInstance {
  let current: TextOptions = {
    fontSize: 18,
    lineHeight: 1.5,
    letterSpacing: 0,
    textAlign: 'left',
    width: 360,
    fill: '#1e293b',
  };

  // view 直接传入 HTMLCanvasElement 时，Leafer 复用该 <canvas> 作为渲染目标；
  // 不给 width / height，按画布元素客户端尺寸自适应，舞台变化时用 resize() 同步。
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
  });

  // guide：虚线矩形，用来把「文本框」可视化为可观察证据；先于文字加入，渲染在文字下方。
  const guide = new Rect({
    x: TEXT_X,
    y: TEXT_Y,
    stroke: '#94a3b8',
    strokeWidth: 1,
    strokeAlign: 'inside',
    dashPattern: [5, 4],
  });
  leafer.add(guide);

  const text = new Text({ text: SAMPLE });
  leafer.add(text);

  function syncSize() {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });
  }

  function render(options: TextOptions) {
    // width=0 → 自动宽度（不换行）；width>0 → 固定宽度并按此换行。
    text.set({
      fontSize: options.fontSize,
      // lineHeight 接受数字（px）或 { type:'percent', value:n }（倍数）；
      // 这里用 percent 让控件直接以「倍数」调节，与默认 1.5 倍一致。
      lineHeight: { type: 'percent', value: options.lineHeight },
      letterSpacing: options.letterSpacing,
      textAlign: options.textAlign,
      fill: options.fill,
      width: options.width,
    });

    // 读取测量值：boxBounds 是文本框包围盒，textDrawData 含 rows（逐行数据）与 bounds（内容包围盒）。
    // 访问这两个 getter 会自动触发 updateLayout()，因此读取顺序无要求。
    const box = text.boxBounds;
    const draw = text.textDrawData;

    // 用 guide 矩形把文本框可视化：宽高跟随 boxBounds，让「文本框尺寸」可直接看见。
    guide.set({ width: box.width, height: box.height });

    emit({
      boxSize: `${Math.round(box.width)} × ${Math.round(box.height)}`,
      rows: draw.rows.length,
      contentW: Math.round(draw.bounds.width),
      overflow: text.isOverflow ? '是' : '否',
    });
  }

  // 舞台尺寸变化（如 Docs 面板开合）时重置画布尺寸并重新渲染。
  const resizeObserver = createResizeObserver(canvas, () => {
    syncSize();
    render(current);
  });

  syncSize();
  render(current);

  return {
    update(options) {
      current = options;
      render(options);
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
