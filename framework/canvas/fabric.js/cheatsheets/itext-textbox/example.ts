/**
 * 范例介绍：演示 IText 编辑态的进入/退出与选区操作，以及 Textbox 宽度驱动的自动换行——
 * 1. 双击（选中后再单击）进入编辑，esc / tab / 点击空白退出；editable=false 时双击不再进入；
 * 2. 编辑态的 setSelectionStyles / setSelectionStyles 无参重载作用于当前选区；
 *    setSuperscript / setSubscript 按换算规则写样式分片（fontSize × 0.6，deltaY = fontSize × -0.35 / +0.11）；
 * 3. Textbox：set('width') 自动重排换行、高度自适应；splitByGrapheme 不在 textLayoutProperties，
 *    set 后需要手动 initDimensions() 重排；中文长串默认按空格分词、整句算一个词，会把 width 顶到词宽。
 * 输入：允许编辑、选区上下标、选区填充色（IText 范例）；文本框宽度、按字素换行（Textbox 范例）。
 * 预期结果：编辑中/选区/选区 fontSize 与 deltaY 读数随双击、esc 与控件切换变化（40 → 24、-14 / +4.4）；
 * Textbox 行数与 width×height 随宽度滑杆变化，中文句在默认模式下顶住最小宽、开启字素换行后跟随滑杆。
 * 阅读主线：createItextLesson() 看编辑态与选区脚本；createWrapLesson() 看宽度重排与字素换行。
 */
import { Canvas, IText, Textbox } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 读者输入（IText 范例）：对应 Controls 面板 */
export interface ITextLessonOptions {
  /** 对应 IText.editable */
  editable: boolean;
  /** 选区脚本：标准 / 上标 / 下标 */
  script: 'none' | 'superscript' | 'subscript';
  /** 选区填充色，setSelectionStyles({ fill }) 应用 */
  selectionFill: string;
}

/** 派生读数（IText 范例）：由 readout 显示 */
export interface ITextLessonSnapshot {
  editing: string;
  selection: string;
  selectedText: string;
  fontSize: number;
  deltaY: number;
}

export interface ITextLessonInstance {
  update(options: ITextLessonOptions): void;
  dispose(): void;
}

/** 读者输入（Textbox 范例） */
export interface WrapLessonOptions {
  /** 文本框宽度：set('width', v) 自动重排 */
  boxWidth: number;
  /** 对应 Textbox.splitByGrapheme */
  splitByGrapheme: boolean;
}

/** 派生读数（Textbox 范例） */
export interface WrapLessonSnapshot {
  editing: string;
  lineCount: number;
  size: string;
  minLimit: string;
}

export interface WrapLessonInstance {
  update(options: WrapLessonOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };

export function createItextLesson(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: ITextLessonSnapshot) => void,
): ITextLessonInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#ffffff',
  });

  // fontSize 保持默认 40：读数可直接核对上下标换算 40 × 0.6 = 24
  // 文本用空格分词，保证双击选词（词边界是空格与常用标点，= 不是）
  const itext = new IText('H2O mc2 log10x', {
    left: 320,
    top: 150,
  });
  fabricCanvas.add(itext);

  let editableLatched = true;
  let scriptLatched: ITextLessonOptions['script'] = 'none';
  let fillLatched = '#0f172a';

  function emitSnapshot() {
    const styles = itext.getSelectionStyles(); // 无参重载：默认读当前选区
    emit({
      editing: itext.isEditing ? '是' : '否',
      selection: `${itext.selectionStart}–${itext.selectionEnd}`,
      selectedText: itext.getSelectedText() || '（空）',
      fontSize: styles.length ? (styles[0].fontSize ?? itext.fontSize) : itext.fontSize,
      deltaY: styles.length ? (styles[0].deltaY ?? 0) : 0,
    });
  }

  /** 把脚本样式应用到当前选区；无选区时先 selectAll 保证操作可见 */
  function applyScript(script: ITextLessonOptions['script']) {
    if (itext.selectionEnd <= itext.selectionStart) {
      itext.selectAll();
    }
    const start = itext.selectionStart;
    const end = itext.selectionEnd;
    if (script === 'superscript') {
      itext.setSuperscript(start, end); // fontSize × 0.6，deltaY += fontSize × -0.35
    } else if (script === 'subscript') {
      itext.setSubscript(start, end); // fontSize × 0.6，deltaY += fontSize × +0.11
    } else {
      // 恢复为对象级默认字号与基线（真实场景可先 getSelectionStyles 保存原值）
      itext.setSelectionStyles({ fontSize: itext.fontSize, deltaY: 0 }, start, end);
    }
    // setSuperscript / setSelectionStyles 只写样式分片：尺寸缓存标记失效但不自动重排
    itext.initDimensions();
    itext.setCoords();
    fabricCanvas.requestRenderAll();
  }

  function syncSize() {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    fabricCanvas.setDimensions({ width, height });
  }

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  // 编辑态进出与选区变化走 contextTop 渲染，不一定触发主画布重绘，这里手动上报读数
  for (const eventName of [
    'editing:entered',
    'editing:exited',
    'selection:changed',
    'changed',
  ] as const) {
    itext.on(eventName, emitSnapshot);
  }
  // 主画布整帧重绘（控件操作、窗口尺寸变化）后同步读数
  fabricCanvas.on('after:render', (event) => {
    if (event.ctx === fabricCanvas.contextContainer) {
      emitSnapshot();
    }
  });

  function update(options: ITextLessonOptions) {
    if (options.editable !== editableLatched) {
      editableLatched = options.editable;
      itext.set('editable', options.editable);
      // 关闭编辑能力时结束正在进行的编辑
      if (!options.editable && itext.isEditing) {
        itext.exitEditing();
      }
    }

    if (options.script !== scriptLatched) {
      scriptLatched = options.script;
      applyScript(options.script);
    }

    if (options.selectionFill !== fillLatched) {
      fillLatched = options.selectionFill;
      if (itext.selectionEnd <= itext.selectionStart) {
        itext.selectAll();
      }
      // 编辑态无参重载：startIndex / endIndex 默认取当前选区
      itext.setSelectionStyles({ fill: options.selectionFill });
      itext.initDimensions();
      itext.setCoords();
      fabricCanvas.requestRenderAll();
    }

    emitSnapshot();
  }

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      itext.off();
      fabricCanvas.off();
      void fabricCanvas.dispose();
    },
  };
}

export function createWrapLesson(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: WrapLessonSnapshot) => void,
): WrapLessonInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#ffffff',
  });

  // 中文部分约 24 字（24px 字号下词宽约 576px）：默认按空格分词时整句一个词
  const textbox = new Textbox(
    'Textbox 自动换行：长中文句子没有空格，默认整句算一个词。',
    {
      width: 620,
      fontSize: 24,
      left: 320,
      top: 140,
    },
  );
  fabricCanvas.add(textbox);

  let graphemeLatched = false;
  let widthLatched = 620;

  function fmt(n: number): string {
    return Number.isFinite(n) ? String(Math.round(n)) : '—';
  }

  function emitSnapshot() {
    emit({
      editing: textbox.isEditing ? '是' : '否',
      lineCount: textbox.textLines.length,
      size: `${fmt(textbox.width)}×${fmt(textbox.height)}`,
      minLimit: fmt(textbox.dynamicMinWidth),
    });
  }

  function syncSize() {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    fabricCanvas.setDimensions({ width, height });
  }

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  // 编辑输入（text:changed）与编辑态进出都会伴随重绘或需要手动上报
  for (const eventName of [
    'editing:entered',
    'editing:exited',
    'changed',
  ] as const) {
    textbox.on(eventName, emitSnapshot);
  }
  fabricCanvas.on('after:render', (event) => {
    if (event.ctx === fabricCanvas.contextContainer) {
      emitSnapshot();
    }
  });

  function update(options: WrapLessonOptions) {
    if (options.splitByGrapheme !== graphemeLatched) {
      graphemeLatched = options.splitByGrapheme;
      // splitByGrapheme 不在 textLayoutProperties：set 不会自动重排，需手动 initDimensions
      textbox.set('splitByGrapheme', options.splitByGrapheme);
      textbox.initDimensions();
      textbox.setCoords();
      fabricCanvas.requestRenderAll();
    }

    if (options.boxWidth !== widthLatched) {
      widthLatched = options.boxWidth;
      // width 在 Textbox.textLayoutProperties 里：set 自动重排换行并重算高度
      textbox.set('width', options.boxWidth);
      fabricCanvas.requestRenderAll();
    }

    emitSnapshot();
  }

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      textbox.off();
      fabricCanvas.off();
      void fabricCanvas.dispose();
    },
  };
}
