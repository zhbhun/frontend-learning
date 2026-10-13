/**
 * 范例介绍：旧数据字节 load 进 3.x 之后的读回形态与转换杠杆。
 * 输入：一份包含三种字段的文档字节——普通字符串（文本序列）、
 *       ImmutableString（标量字符串，与 2.x 的 str 标量同形态）、Counter。
 * 操作：场景一原样 load 并检视各字段读回类型；场景二用 load 的
 *       convertImmutableStringsToText 选项把标量转成序列，splice 编辑后
 *       save，再不带选项 load 验证转换已固化。
 * 预期：原样 load 时标量字段读回 ImmutableString 实例、序列字段读回 string；
 *       转换后标量字段变成可 splice 的 string，save 往返后保持序列形态。
 * 阅读主线：measureCompat 返回的读数对应正文「数据兼容性」的实测结论；
 *           存储层 str 标量与 text 序列的区分在 2、3 之间未变（同文件格式），
 *           真正 2.x 产出的字节可加载这一点以官方博客声明为准。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type CompatScenarioKey = 'load-asis' | 'convert';

export const COMPAT_SCENARIO_LABELS: Record<CompatScenarioKey, string> = {
  'load-asis': '原样 load',
  convert: '转换后编辑',
};

/** Controls 面板里场景选择器的候选标签（中文）。 */
export const COMPAT_SCENARIO_OPTIONS: string[] = Object.values(
  COMPAT_SCENARIO_LABELS,
);

export function compatScenarioFromLabel(label: string): CompatScenarioKey {
  const match = (
    Object.entries(COMPAT_SCENARIO_LABELS) as Array<[CompatScenarioKey, string]>
  ).find(([, value]) => value === label);
  return match ? match[0] : 'load-asis';
}

/** stories 传入的参数：scenario 是 Controls 选中的中文标签。 */
export interface CompatArgsView {
  scenario: string;
}

// 用 type 而不是 interface：A.from / A.load 的泛型约束是 Record<string, unknown>，
// 接口没有隐式索引签名，无法满足该约束。
export type CompatDoc = {
  /** 文本序列字段：逐字符存储，可 splice */
  note: string;
  /** 标量字符串字段：整段存取，对应 2.x 的 str 标量形态 */
  homepage: A.ImmutableString;
  /** 计数器：与 2.x 同形态 */
  views: A.Counter;
};

export interface CompatSnapshot {
  scenario: CompatScenarioKey;
  /** note 字段读回形态（两场景相同） */
  noteReadback: string;
  /** homepage 字段读回形态（随场景变化） */
  homepageReadback: string;
  /** views 读数 */
  counterValue: string;
  /** convert 场景：转换后 splice 编辑的结果 */
  editedValue: string;
  /** convert 场景：save 往返后再 load，字段仍是序列吗 */
  staysSequence: boolean;
}

export interface DataCompatInstance {
  update(options: CompatArgsView): void;
  dispose(): void;
}

/** 用 3.5.0 构造两种字符串存储形态共存的文档并 save 出字节。 */
export function buildSeedBytes(): Uint8Array {
  const doc = A.from<CompatDoc>({
    note: '会议纪要初稿',
    homepage: new A.ImmutableString('https://automerge.org'),
    views: new A.Counter(3),
  });
  return A.save(doc);
}

function readbackType(value: unknown): string {
  if (value instanceof A.ImmutableString) {
    return 'ImmutableString（标量）';
  }
  if (typeof value === 'string') {
    return 'string（序列）';
  }
  return typeof value;
}

export function measureCompat(args: CompatArgsView): CompatSnapshot {
  const scenario = compatScenarioFromLabel(args.scenario);
  const bytes = buildSeedBytes();

  let homepageReadback = '';
  let editedValue = '';
  let staysSequence = false;

  if (scenario === 'load-asis') {
    const doc = A.load<CompatDoc>(bytes, '0badc0de');
    homepageReadback = readbackType(doc.homepage);
  } else {
    // 隐藏杠杆：load 时把标量字符串转成文本序列（InitOptions.convertImmutableStringsToText）
    const converted = A.load<CompatDoc>(bytes, {
      actor: '0badc0de',
      convertImmutableStringsToText: true,
    });
    homepageReadback = readbackType(converted.homepage);
    const edited = A.change(converted, (d) => {
      A.splice(d, ['homepage'], 0, 0, 'docs.');
    });
    // 转换后该字段运行时已是普通字符串；String() 同时兼容标量的 valueOf
    editedValue = String(edited.homepage);
    const reloaded = A.load<CompatDoc>(A.save(edited), '0badc0de');
    staysSequence = typeof reloaded.homepage === 'string';
  }

  const probe = A.load<CompatDoc>(bytes, '0badc0de');
  return {
    scenario,
    noteReadback: readbackType(probe.note),
    homepageReadback,
    counterValue: `Counter(${probe.views.value})`,
    editedValue,
    staysSequence,
  };
}

export function createDataCompatLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CompatSnapshot) => void,
): DataCompatInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: CompatArgsView = { scenario: COMPAT_SCENARIO_OPTIONS[0] };

  function draw() {
    const snapshot = measureCompat(current);
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    let lines;
    if (snapshot.scenario === 'load-asis') {
      lines = [
        { text: '场景：原样 load（字节含序列字符串 / 标量字符串 / Counter）', color: '#172033', bold: true },
        { text: `note → ${snapshot.noteReadback}；homepage → ${snapshot.homepageReadback}`, color: '#4f7cff', bold: true },
        { text: `views → ${snapshot.counterValue}（与 2.x 同形态）`, color: '#4f7cff' },
        { text: '标量字段不能 splice：直接对它做字符编辑会抛 RangeError', color: '#b45309' },
        { text: '结论：数据能读，但字段的编辑语义由存储形态决定', color: '#64748b' },
      ];
    } else {
      lines = [
        { text: '场景：convertImmutableStringsToText 转换后编辑', color: '#172033', bold: true },
        { text: `load 带选项后 homepage → ${snapshot.homepageReadback}`, color: '#166534', bold: true },
        { text: `splice 编辑结果 → "${snapshot.editedValue}"`, color: '#166534', bold: true },
        { text: `save 往返后再 load 仍是序列：${snapshot.staysSequence ? '是（转换已固化）' : '否'}`, color: '#166534' },
        { text: '结论：想把旧标量变成可逐字编辑的文本，一次转换 load 加 save 即可', color: '#64748b' },
      ];
    }

    let y = 44;
    for (const line of lines) {
      drawingContext.fillStyle = line.color;
      drawingContext.font = `${line.bold ? '600 ' : ''}14px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillText(line.text, 24, y);
      y += 30;
    }

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = { scenario: options.scenario };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
