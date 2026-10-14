/**
 * 范例介绍：用已安装的 @hocuspocus/transformer 与 yjs 真实跑通三组转换证据。
 * 前置状态：无需网络与服务器——transformer 是同构库，浏览器里可直接运行；
 * 三个实例各带一段 ProseMirror 兼容的 Tiptap JSON 作为输入。
 * 操作与预期结果：
 * ① 双向转换——修改「Tiptap JSON」，观察 TiptapTransformer.toYdoc 转出的字段、
 *    Y.encodeStateAsUpdate 编出的 update 字节数，以及 fromYdoc 回读后是否与输入一致；
 * ② schema 过滤——切换「转换样本」，观察 schema 不认识的属性被静默丢弃、
 *    不认识的节点类型让 toYdoc 抛 RangeError；
 * ③ 底稿重放——打开「重放到已有内容」，观察把转换产物 applyUpdate 到已有同样
 *    内容的文档时内容重复（出现两次），关闭后空文档导入则只有一份。
 * 阅读主线：toYdoc → Y.encodeStateAsUpdate → Y.applyUpdate → fromYdoc 的调用链
 * （实例①），Node.fromJSON 的 schema 校验（实例②），重放产生新插入历史（实例③）。
 * 与真实链路的差异：真实部署里 toYdoc 发生在 onLoadDocument、fromYdoc 发生在
 * onChange / webhook 出参；这里省去服务器，直接调用同一批 API，行为一致。
 */
import { TiptapTransformer } from '@hocuspocus/transformer';
import { getSchema, type Extensions } from '@tiptap/core';
import { Node, type Schema } from '@tiptap/pm/model';
import { StarterKit } from '@tiptap/starter-kit';
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 与 TiptapTransformer 默认 extensions（[StarterKit]）一致的 schema，用于回读比对。 */
const SCHEMA: Schema = getSchema([StarterKit] as Extensions);

/** 统一的字段名：Tiptap Collaboration 扩展默认读写的字段。 */
const FIELD = 'default';

function errorText(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

/**
 * 把 JSON 经 schema 规范化后做深度稳定序列化：属性按 key 排序、marks 按 type
 * 排序、空值属性两侧统一忽略。prosemirrorJSONToYDoc / fromYdoc 会补齐 schema
 * 默认属性，直接字符串对比会误报；规范化后比较才反映「schema 语义层是否一致」。
 */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const raw = record[key];
      if (raw === null || raw === undefined) {
        continue;
      }
      let child = raw;
      if (key === 'marks' && Array.isArray(child)) {
        child = [...child].sort((left, right) => {
          const leftType = markType(left);
          const rightType = markType(right);
          return leftType < rightType ? -1 : leftType > rightType ? 1 : 0;
        });
      }
      parts.push(`${JSON.stringify(key)}:${canonicalJson(child)}`);
    }
    return `{${parts.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function markType(mark: unknown): string {
  if (mark && typeof mark === 'object' && 'type' in mark) {
    return String((mark as { type: unknown }).type);
  }
  return '';
}

/** schema 语义层的往返比较：两侧都先经 Node.fromJSON 规范化。 */
function roundtripMatches(input: unknown, roundtrip: unknown): boolean {
  try {
    const left = Node.fromJSON(SCHEMA, input as Record<string, unknown>);
    const right = Node.fromJSON(SCHEMA, roundtrip as Record<string, unknown>);
    return canonicalJson(left.toJSON()) === canonicalJson(right.toJSON());
  } catch {
    return false;
  }
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

// ---------- 实例①：双向转换 ----------

export interface RoundtripOptions {
  /** 读者编辑的 Tiptap / ProseMirror 文档 JSON。 */
  json: unknown;
}

export interface RoundtripSnapshot {
  ok: boolean;
  /** toYdoc 抛错时的错误消息。 */
  error: string;
  jsonBytes: number;
  field: string;
  /** 转出 Y.Doc 的顶层块数（XmlFragment 的直接子节点数）。 */
  topBlocks: number;
  updateBytes: number;
  roundtripPreview: string;
  matches: boolean;
}

export interface TransformerInstance<Options> {
  update(options: Options): void;
  dispose(): void;
}

/** 单次 JSON → Y.Doc 转换：失败时返回错误消息而不是中断渲染。 */
function toYdocSafe(json: unknown): { doc?: Y.Doc; error?: string } {
  try {
    return { doc: TiptapTransformer.toYdoc(json, FIELD) };
  } catch (error) {
    return { error: errorText(error) };
  }
}

function jsonBytes(json: unknown): number {
  try {
    return JSON.stringify(json)?.length ?? 0;
  } catch {
    return 0;
  }
}

export function createRoundtrip(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RoundtripSnapshot) => void,
): TransformerInstance<RoundtripOptions> {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: RoundtripOptions = { json: null };

  function run(): RoundtripSnapshot {
    const input = options.json;
    const { doc, error } = toYdocSafe(input);

    if (!doc) {
      return {
        ok: false,
        error: error ?? '未知错误',
        jsonBytes: jsonBytes(input),
        field: FIELD,
        topBlocks: 0,
        updateBytes: 0,
        roundtripPreview: '—',
        matches: false,
      };
    }

    // 转换产物就是普通 Y.Doc：整份状态可编码为一条 update，按 2.4 课任一方式落库
    const update = Y.encodeStateAsUpdate(doc);
    const restored = new Y.Doc();
    Y.applyUpdate(restored, update);

    let roundtrip: unknown = null;
    let matches = false;
    try {
      roundtrip = TiptapTransformer.fromYdoc(restored, FIELD);
      matches = roundtripMatches(input, roundtrip);
    } catch (error) {
      roundtrip = errorText(error);
    }

    const snapshot: RoundtripSnapshot = {
      ok: true,
      error: '',
      jsonBytes: jsonBytes(input),
      field: FIELD,
      topBlocks: doc.getXmlFragment(FIELD).length,
      updateBytes: update.length,
      roundtripPreview: truncate(JSON.stringify(roundtrip) ?? '', 160),
      matches,
    };
    doc.destroy();
    restored.destroy();
    return snapshot;
  }

  function draw(data: RoundtripSnapshot): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(420, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const margin = 20;
    const leftWidth = Math.round((width - margin * 3) * 0.42);
    const rightLeft = margin + leftWidth + margin;
    const rightWidth = width - rightLeft - margin;
    const halfHeight = Math.round((height - 92) / 2);

    drawPanel(
      drawingContext,
      margin,
      30,
      leftWidth,
      height - 76,
      '① Tiptap JSON（输入）',
      data.ok ? truncate(JSON.stringify(options.json) ?? '', 240) : '',
    );
    if (!data.ok) {
      drawErrorBox(drawingContext, margin + 14, 118, leftWidth - 28, data.error);
    }

    drawPanel(
      drawingContext,
      rightLeft,
      30,
      rightWidth,
      halfHeight,
      '② toYdoc → Y.Doc',
      '',
    );
    drawBlock(
      drawingContext,
      rightLeft + 14,
      76,
      Math.min(230, rightWidth - 28),
      24,
      `字段「${data.field}」· 顶层 ${data.topBlocks} 块`,
      '#eef2ff',
      '#c7d2fe',
      '#3f4dbf',
    );
    drawLabel(
      drawingContext,
      `Y.encodeStateAsUpdate → ${data.updateBytes} 字节 update`,
      rightLeft + 14,
      118,
    );

    drawPanel(
      drawingContext,
      rightLeft,
      30 + halfHeight + 14,
      rightWidth,
      halfHeight,
      '③ applyUpdate → fromYdoc（回读）',
      data.ok ? data.roundtripPreview : '—',
    );

    const footer = !data.ok
      ? 'toYdoc 转换失败：schema 不认识这份 JSON（详见下一节实例）'
      : data.matches
        ? '回读 JSON 与输入在 schema 语义层一致（默认属性由 schema 补齐）'
        : '回读 JSON 与输入不一致';
    drawFooter(drawingContext, width, height, footer, data.ok && data.matches);
  }

  const resizeObserver = createResizeObserver(canvas, () => draw(run()));

  return {
    update(next) {
      options = next;
      const data = run();
      draw(data);
      emit(data);
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}

// ---------- 实例②：schema 过滤 ----------

export type FilterSample = 'standard' | 'unknown-attr' | 'unknown-node';

export const FILTER_SAMPLE_LABELS: Record<FilterSample, string> = {
  standard: '标准内容',
  'unknown-attr': '未知属性',
  'unknown-node': '未知节点',
};

function paragraphDoc(
  linkAttrs?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'schema 认识的普通段落，' },
          {
            type: 'text',
            marks: [{ type: 'link', attrs: linkAttrs ?? { href: 'https://tiptap.dev' } }],
            text: '链接片段',
          },
        ],
      },
    ],
  };
}

/** 三种样本输入：标准内容、带未声明属性的 link、带未声明节点类型的文档。 */
export function buildFilterSample(sample: FilterSample): Record<string, unknown> {
  switch (sample) {
    case 'unknown-attr':
      return paragraphDoc({
        href: 'https://tiptap.dev',
        'data-note': '审计备注',
      });
    case 'unknown-node':
      return { type: 'doc', content: [{ type: 'callout' }] };
    default:
      return paragraphDoc();
  }
}

export interface FilterSnapshot {
  sample: FilterSample;
  ok: boolean;
  error: string;
  /** 回读后首个 mark 的 attrs（JSON 文本）。 */
  readbackAttrs: string;
  conclusion: string;
}

/** 从回读 JSON 里取首个 mark 的 attrs，供读数对照。 */
function firstMarkAttrs(
  json: { content?: Array<{ content?: Array<{ marks?: Array<{ attrs?: Record<string, unknown> }> }> }> },
): string {
  const paragraph = json.content?.[0];
  const child = paragraph?.content?.find(
    (item) => Array.isArray(item.marks) && item.marks.length > 0,
  );
  return JSON.stringify(child?.marks?.[0]?.attrs ?? {});
}

export function createSchemaFilter(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FilterSnapshot) => void,
): TransformerInstance<{ sample: FilterSample }> {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let sample: FilterSample = 'standard';

  function run(): FilterSnapshot {
    const input = buildFilterSample(sample);
    const { doc, error } = toYdocSafe(input);

    if (!doc) {
      return {
        sample,
        ok: false,
        error: error ?? '未知错误',
        readbackAttrs: '—',
        conclusion: '转换失败：toYdoc 会在 schema 校验阶段直接抛错',
      };
    }

    let readbackAttrs = '{}';
    try {
      const json = TiptapTransformer.fromYdoc(doc, FIELD) as Parameters<
        typeof firstMarkAttrs
      >[0];
      readbackAttrs = firstMarkAttrs(json);
    } catch (error) {
      readbackAttrs = errorText(error);
    }
    doc.destroy();

    return {
      sample,
      ok: true,
      error: '',
      readbackAttrs,
      conclusion:
        sample === 'unknown-attr'
          ? 'schema 未声明 data-note：转换成功，但该属性被静默丢弃'
          : 'schema 声明过的 href 原样保留，缺省属性由 schema 默认值补齐',
    };
  }

  function draw(data: FilterSnapshot): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(420, size.width);
    const height = Math.max(250, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const margin = 20;
    const panelWidth = Math.round((width - margin * 3) / 2);
    const rightLeft = margin + panelWidth + margin;

    drawPanel(
      drawingContext,
      margin,
      30,
      panelWidth,
      height - 76,
      `输入 JSON（${FILTER_SAMPLE_LABELS[data.sample]}）`,
      truncate(JSON.stringify(buildFilterSample(data.sample)) ?? '', 200),
    );
    drawPanel(
      drawingContext,
      rightLeft,
      30,
      panelWidth,
      height - 76,
      'toYdoc 结果与回读 attrs',
      '',
    );

    if (data.ok) {
      drawBlock(
        drawingContext,
        rightLeft + 14,
        76,
        Math.min(200, panelWidth - 28),
        24,
        '转换成功 → Y.Doc',
        '#ecfdf5',
        '#a7f3d0',
        '#065f46',
      );
      drawLabel(
        drawingContext,
        `回读首个 mark attrs：${truncate(data.readbackAttrs, 36)}`,
        rightLeft + 14,
        124,
      );
      drawLabel(
        drawingContext,
        '（link 的 target / rel 由 schema 默认值补齐）',
        rightLeft + 14,
        146,
      );
    } else {
      drawErrorBox(
        drawingContext,
        rightLeft + 14,
        76,
        panelWidth - 28,
        data.error,
      );
    }

    drawFooter(
      drawingContext,
      width,
      height,
      data.conclusion,
      data.ok && data.sample !== 'unknown-attr',
    );
  }

  const resizeObserver = createResizeObserver(canvas, () => draw(run()));

  return {
    update(next) {
      sample = next.sample;
      const data = run();
      draw(data);
      emit(data);
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}

// ---------- 实例③：底稿重放 ----------

export interface ReplayOptions {
  /** 底稿文字：转成 Tiptap JSON 后再进 transformer。 */
  seedText: string;
  /** 打开后：把底稿 update 重放到已有同样内容的在线文档。 */
  replay: boolean;
}

export interface ReplaySnapshot {
  seedText: string;
  replay: boolean;
  seedBytes: number;
  finalText: string;
  occurrences: number;
  verdict: string;
}

/** 一段文字 → 底稿 Y.Doc 的 update：模拟 onLoadDocument 里的 toYdoc 产物。 */
function seedUpdate(text: string): Uint8Array {
  const json = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
  const doc = toYdocSafe(json);
  if (!doc.doc) {
    throw new Error(doc.error ?? '底稿转换失败');
  }
  const update = Y.encodeStateAsUpdate(doc.doc);
  doc.doc.destroy();
  return update;
}

/** 读出 XmlFragment 的纯文本：每个顶层块一行。 */
function fragmentText(fragment: Y.XmlFragment): string {
  const lines: string[] = [];
  fragment.toArray().forEach((child) => {
    if (child instanceof Y.XmlText) {
      lines.push(child.toString());
    } else if (child instanceof Y.XmlElement) {
      const runs: string[] = [];
      child.toArray().forEach((inner) => {
        if (inner instanceof Y.XmlText) {
          runs.push(inner.toString());
        }
      });
      lines.push(runs.join(''));
    }
  });
  return lines.join('\n');
}

export function createSeedReplay(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ReplaySnapshot) => void,
): TransformerInstance<ReplayOptions> {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: ReplayOptions = { seedText: '', replay: false };

  function run(): ReplaySnapshot {
    const text = options.seedText;
    if (text.length === 0) {
      return {
        seedText: '',
        replay: options.replay,
        seedBytes: 0,
        finalText: '',
        occurrences: 0,
        verdict: '输入底稿文字后观察结果',
      };
    }

    const update = seedUpdate(text);
    const live = new Y.Doc();
    if (options.replay) {
      // 模拟线上文档已由用户历史写出同一段内容：底稿 update 与它互不相识
      Y.applyUpdate(live, seedUpdate(text));
    }
    // onLoadDocument 的底稿注入：replay 打开时它成为第二次插入
    Y.applyUpdate(live, update);

    const finalText = fragmentText(live.getXmlFragment(FIELD));
    const occurrences = finalText.split(text).length - 1;
    live.destroy();

    return {
      seedText: text,
      replay: options.replay,
      seedBytes: update.length,
      finalText,
      occurrences,
      verdict:
        occurrences <= 1
          ? '空文档导入：只有一份底稿内容（正确用法）'
          : `重放使内容重复：底稿出现 ${occurrences} 次`,
    };
  }

  function draw(data: ReplaySnapshot): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(420, size.width);
    const height = Math.max(260, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const margin = 20;
    const leftWidth = Math.round((width - margin * 3) * 0.4);
    const rightLeft = margin + leftWidth + margin;
    const rightWidth = width - rightLeft - margin;

    drawPanel(
      drawingContext,
      margin,
      30,
      leftWidth,
      height - 76,
      '底稿 JSON → toYdoc → update',
      data.seedText ? truncate(JSON.stringify(data.seedText), 120) : '（空）',
    );
    drawLabel(
      drawingContext,
      `${data.seedBytes} 字节 update`,
      margin + 14,
      118,
    );
    drawLabel(
      drawingContext,
      data.replay ? '在线文档已有同样内容' : '在线文档为空',
      margin + 14,
      140,
    );

    drawPanel(
      drawingContext,
      rightLeft,
      30,
      rightWidth,
      height - 76,
      'onLoadDocument 后的在线文档',
      data.finalText || '（空）',
    );

    drawFooter(drawingContext, width, height, data.verdict, data.occurrences <= 1);
  }

  const resizeObserver = createResizeObserver(canvas, () => draw(run()));

  return {
    update(next) {
      options = next;
      const data = run();
      draw(data);
      emit(data);
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}

// ---------- 以下为绘制外壳：说明性视图，无动画循环 ----------

const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_LABEL = '12px ui-sans-serif, system-ui, sans-serif';

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  body: string,
): void {
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#dbe3f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#172033';
  ctx.font = FONT_TITLE;
  ctx.fillText(title, x + 14, y + 26);

  ctx.strokeStyle = '#edf1f8';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 38);
  ctx.lineTo(x + w - 10, y + 38);
  ctx.stroke();

  if (!body) {
    return;
  }

  const maxLines = Math.max(1, Math.floor((h - 66) / 18));
  ctx.font = FONT_LABEL;
  ctx.fillStyle = '#334155';
  const lines = wrapText(ctx, body, w - 28, maxLines);
  if (lines.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('（空文档）', x + 14, y + 62);
    return;
  }
  lines.forEach((line, index) => {
    ctx.fillText(line, x + 14, y + 60 + index * 18);
  });
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  fill: string,
  stroke: string,
  textColor: string,
): void {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 5);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = FONT_LABEL;
  ctx.fillText(label, x + 8, y + h / 2 + 4);
  ctx.restore();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
): void {
  ctx.font = FONT_LABEL;
  ctx.fillStyle = '#64748b';
  ctx.fillText(text, x, y);
}

function drawErrorBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  message: string,
): void {
  ctx.save();
  roundRectPath(ctx, x, y, w, 52, 5);
  ctx.fillStyle = '#fff7ed';
  ctx.fill();
  ctx.strokeStyle = '#fed7aa';
  ctx.stroke();
  ctx.fillStyle = '#9a3412';
  ctx.font = FONT_LABEL;
  wrapText(ctx, message, w - 20, 3).forEach((line, index) => {
    ctx.fillText(line, x + 10, y + 20 + index * 15);
  });
  ctx.restore();
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  positive: boolean,
): void {
  ctx.font = FONT_TITLE;
  ctx.fillStyle = positive ? '#166534' : '#9a3412';
  ctx.fillText(
    text,
    (width - ctx.measureText(text).width) / 2,
    height - 16,
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of Array.from(text)) {
    const candidate = current + char;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = char;
      if (lines.length >= maxLines) {
        return lines;
      }
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}
