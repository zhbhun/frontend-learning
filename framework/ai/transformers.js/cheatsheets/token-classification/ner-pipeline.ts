/**
 * 范例：token 分类（NER）——pipeline 给每个 token 打 BIO 标签，aggregation_strategy
 * 决定输出粒度；画布把输出按 word 在原文中定位后着色高亮。
 *
 * - 前置状态：首次运行从 CDN 加载库（约 1.1 MB）、分词器（约 2.8 MB）与
 *   q8 权重（约 170 MB），完成后写入浏览器 Cache；再次加载显著变快。
 * - 输入：Controls 的「示例文本」（中英文预置句）与「aggregation_strategy」（none / simple）。
 * - 操作：等待「状态」读数变为 就绪；切换文本与 aggregation_strategy，观察画布高亮与实体清单。
 * - 预期结果：simple 输出 { entity_group, score, word } 的实体块；none 输出
 *   { entity, score, index, word } 的 token 级碎片（## 子词前缀可见）。注意 v4.3.0
 *   两种模式都不返回 start/end 字符偏移，高亮由 locateSpans 按 word 自行定位。
 * - 阅读主线：loadPipeline（CDN 导入与加载状态机）→ classify（推理）→
 *   locateSpans（word 定位高亮）→ draw（高亮渲染与读数输出）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，沿用 1.2 课确立的官方 CDN 动态导入；
// npm 项目请改用：import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：v4.3.0 token-classification 的默认模型——多语言 NER（含中文 MSRA 训练），
// q8 权重约 170 MB；纯英文场景可换更小的 Xenova/bert-base-NER（约 104 MB），见课程「模型选择」
const MODEL_ID = 'Xenova/bert-base-multilingual-cased-ner-hrl';

export type NerStatus = 'loading' | 'running' | 'ready' | 'error';

/** v4.3.0 只实现这两档；传 'first' / 'average' / 'max' 会直接抛错（源码核实） */
export type AggregationStrategy = 'none' | 'simple';

export interface NerOptions {
  text: string;
  aggregationStrategy: AggregationStrategy;
}

/** aggregation_strategy: 'none' 的原始输出：每 token 一条，word 可能是 ## 子词碎片 */
export interface RawEntityItem {
  entity: string;
  score: number;
  index: number;
  word: string;
}

/** aggregation_strategy: 'simple' 的聚合输出：相邻同组 token 聚成的实体块 */
export interface GroupedEntityItem {
  entity_group: string;
  score: number;
  word: string;
}

export type EntityItem = RawEntityItem | GroupedEntityItem;

/** 把一条输出定位到原文后得到的高亮片段 */
export interface EntitySpan {
  label: string; // simple：实体组名（如 PER）；none：原始 BIO 标签（如 B-PER）
  word: string;
  score: number;
  start: number; // 未定位成功时为 -1
  end: number;
  matched: boolean; // word 无法在原文找到（如 [UNK]）时只进清单、不高亮
}

export interface NerSnapshot {
  status: NerStatus;
  message: string;
  text: string;
  aggregationStrategy: AggregationStrategy;
  items: EntityItem[];
  spans: EntitySpan[];
}

export interface NerInstance {
  update(options: NerOptions): void;
  dispose(): void;
}

/** token-classification 推理的最小形态：传一句话与聚合策略，Promise 返回输出数组 */
type NerPipe = (
  text: string,
  options?: { aggregation_strategy?: AggregationStrategy },
) => Promise<EntityItem[]>;

// 实体组配色：高亮底色与图例共用；未列出的组回退灰色
const GROUP_COLORS: Record<string, string> = {
  PER: '#2563eb',
  LOC: '#16a34a',
  ORG: '#d97706',
  DATE: '#9333ea',
  MISC: '#db2777',
};
const FALLBACK_COLOR = '#64748b';

/** none 模式带 BIO 前缀（B-PER），simple 模式是纯组名（PER），按组取色 */
function labelColor(label: string): string {
  const group = label.includes('-') ? label.slice(2) : label;
  return GROUP_COLORS[group] ?? FALLBACK_COLOR;
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * v4.3.0 的输出不含 start/end 字符偏移（官方类型标注可选，但源码实现是 TODO），
 * 高亮只能自行定位：输出按 token 顺序天然沿原文排列，用 word 逐条向后游标查找。
 * ## 子词碎片去掉前缀后接在上一个命中位置之后；[UNK] 等找不到的 word 只进清单。
 * 局限：重复词依赖游标顺序消歧，word 与原文不一致时放弃高亮——这是演示侧的补救，
 * 不是库的能力。
 */
function locateSpans(text: string, items: EntityItem[]): EntitySpan[] {
  let cursor = 0;
  return items.map((item) => {
    const word = typeof item.word === 'string' ? item.word : '';
    const piece = word.startsWith('##') ? word.slice(2) : word;
    const label = 'entity_group' in item ? item.entity_group : item.entity;
    const start = piece ? text.indexOf(piece, cursor) : -1;
    if (start >= 0) {
      cursor = start + piece.length;
      return {
        label,
        word,
        score: item.score,
        start,
        end: start + piece.length,
        matched: true,
      };
    }
    return { label, word, score: item.score, start: -1, end: -1, matched: false };
  });
}

export function createNerPipeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: NerSnapshot) => void,
): NerInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let currentText = '';
  let currentStrategy: AggregationStrategy = 'simple';
  let status: NerStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let items: EntityItem[] = [];
  let spans: EntitySpan[] = [];
  let pipe: NerPipe | null = null;
  let loading = false;
  let disposed = false;
  let runToken = 0;
  let loadSeconds: string | null = null;
  let lastRun: NerOptions | null = null;

  function snapshot(): NerSnapshot {
    return {
      status,
      message,
      text: currentText,
      aggregationStrategy: currentStrategy,
      items,
      spans,
    };
  }

  // canvas 只画图形状态；readout 表依赖 emit 送出的快照，必须与重绘同步派发
  function draw() {
    render();
    emit(snapshot());
  }

  function render() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const contentWidth = width - 96;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('token-classification：每个 token 打标签 → 聚合成实体', 48, 52);

    // 右上角标注当前模式：none 与 simple 的输出粒度不同
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    const modeLabel = `aggregation_strategy: ${currentStrategy}`;
    drawingContext.fillText(
      modeLabel,
      width - 48 - drawingContext.measureText(modeLabel).width,
      52,
    );

    if (status === 'loading') {
      // 首次运行的主要等待就是这段 q8 权重下载
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 128, contentWidth, 18);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        128,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        18,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 178 + index * 20);
      });
      return;
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 136 + index * 20);
      });
      return;
    }

    // 输入的句子画在第 1~2 行：实体 span 用组色画底色高亮
    const afterText = drawHighlightedText(currentText, spans, 48, 112, contentWidth, 40);

    if (status === 'running') {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, afterText + 18);
      return;
    }

    // 图例：按输出中出现顺序给组配色（none 模式显示原始 BIO 标签）
    const legendY = drawLegend(spans, 48, afterText + 26);

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    wrapText(message, contentWidth).forEach((line, index) => {
      drawingContext.fillText(line, 48, legendY + 8 + index * 18);
    });
  }

  /** 逐字排布并整块高亮：底色矩形按 span 合并连续字形，与文字逐字对齐 */
  function drawHighlightedText(
    text: string,
    entitySpans: EntitySpan[],
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ): number {
    drawingContext.font = '18px ui-sans-serif, system-ui, sans-serif';

    // 按 code point 切字形并记录 UTF-16 偏移，与 indexOf 得到的 span 偏移一致
    const glyphs: Array<{ ch: string; start: number; end: number }> = [];
    let offset = 0;
    for (const ch of text) {
      glyphs.push({ ch, start: offset, end: offset + ch.length });
      offset += ch.length;
    }

    // 贪心换行：中文字符逐字断行，英文按空格优先断行
    const lines: Array<{ items: typeof glyphs; widths: number[]; width: number }> = [];
    let line: { items: typeof glyphs; widths: number[]; width: number } = {
      items: [],
      widths: [],
      width: 0,
    };
    for (const g of glyphs) {
      const w = drawingContext.measureText(g.ch).width;
      if (line.items.length > 0 && line.width + w > maxWidth) {
        lines.push(line);
        line = { items: [], widths: [], width: 0 };
      }
      line.items.push(g);
      line.widths.push(w);
      line.width += w;
    }
    if (line.items.length > 0) {
      lines.push(line);
    }

    function spanAt(g: { start: number; end: number }): EntitySpan | undefined {
      return entitySpans.find((s) => s.matched && s.start <= g.start && g.end <= s.end);
    }

    let cursorY = y;
    for (const l of lines) {
      // 先画底色：同一 span 的连续字形合并成一个矩形
      let cx = x;
      for (let i = 0; i < l.items.length; i++) {
        const span = spanAt(l.items[i]);
        if (span) {
          let j = i;
          let w = l.widths[i];
          while (j + 1 < l.items.length && spanAt(l.items[j + 1]) === span) {
            w += l.widths[j + 1];
            j++;
          }
          drawingContext.fillStyle = withAlpha(labelColor(span.label), 0.22);
          drawingContext.fillRect(cx - 2, cursorY - 17, w + 4, 26);
          cx += w;
          i = j;
        } else {
          cx += l.widths[i];
        }
      }
      // 再画文字：逐字绘制保证与底色完全对齐
      cx = x;
      drawingContext.fillStyle = '#1f2937';
      for (let i = 0; i < l.items.length; i++) {
        drawingContext.fillText(l.items[i].ch, cx, cursorY);
        cx += l.widths[i];
      }
      cursorY += lineHeight;
    }
    return cursorY - lineHeight;
  }

  /** 图例行：彩点 + 标签名；返回下一行基线位置 */
  function drawLegend(entitySpans: EntitySpan[], x: number, y: number): number {
    const labels: string[] = [];
    for (const s of entitySpans) {
      if (!labels.includes(s.label)) {
        labels.push(s.label);
      }
    }
    if (labels.length === 0) {
      return y;
    }
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    let cx = x;
    for (const label of labels) {
      drawingContext.fillStyle = labelColor(label);
      drawingContext.beginPath();
      drawingContext.arc(cx + 5, y - 4, 5, 0, Math.PI * 2);
      drawingContext.fill();
      drawingContext.fillStyle = '#334155';
      drawingContext.fillText(label, cx + 15, y);
      cx += 15 + drawingContext.measureText(label).width + 20;
    }
    return y;
  }

  async function loadPipeline() {
    if (pipe || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
      const { pipeline } = mod;

      // 实例只创建一次：任务 + 模型 ID + options（dtype/device 不传，按环境默认
      // ——浏览器 WASM 下即 q8 档位，对应约 170 MB 的 model_quantized.onnx）
      pipe = await pipeline('token-classification', MODEL_ID, {
        progress_callback: (info: {
          status: string;
          progress?: number;
        }) => {
          if (disposed) {
            return;
          }
          // 事件流：initiate → download → progress（单文件）→ done；
          // v4 另有聚合所有文件的 progress_total；全部就绪后触发一次 ready
          if (info.status === 'progress' || info.status === 'progress_total') {
            const percent = Math.round(info.progress ?? 0);
            if (percent !== lastPercent) {
              lastPercent = percent;
              downloadProgress = percent;
              message = `正在下载模型（q8 约 170 MB，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      });
      if (disposed) {
        return;
      }
      status = 'ready';
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；刷新页面将命中浏览器缓存，加载显著变快`;
      draw();
      void classify();
    } catch (error) {
      if (disposed) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `模型加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；恢复网络后切换「示例文本」即可重试。`;
      draw();
    } finally {
      loading = false;
    }
  }

  async function classify() {
    if (!pipe || disposed) {
      return;
    }
    const runId = ++runToken;
    // 记录本次推理的输入：update 用它判断当前 Controls 状态是否已有对应结果
    lastRun = { text: currentText, aggregationStrategy: currentStrategy };
    // 换输入先清掉上一次的高亮，避免旧 span 画到新句子上
    items = [];
    spans = [];
    status = 'running';
    message = '推理中…';
    draw();
    try {
      const output = await pipe(currentText, {
        aggregation_strategy: currentStrategy,
      });
      if (disposed || runId !== runToken) {
        return;
      }
      items = Array.isArray(output) ? output : [];
      // 输出没有 start/end：按 word 在原文中自行定位出高亮 span
      spans = locateSpans(currentText, items);
      status = 'ready';
      const unmatched = spans.filter((s) => !s.matched).length;
      message =
        `输出 ${items.length} 条` +
        (unmatched > 0 ? `，${unmatched} 条 word 无法在原文定位（如 [UNK]），仅列入清单` : '') +
        '；切换「aggregation_strategy」观察粒度变化';
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `推理失败：${detail}。aggregation_strategy 在 v4.3.0 只接受 none / simple。`;
      draw();
    }
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      const candidate = line + char;
      if (line && drawingContext.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = candidate;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  void loadPipeline();

  return {
    update(options) {
      const changed =
        options.text !== currentText ||
        options.aggregationStrategy !== currentStrategy;
      currentText = options.text;
      currentStrategy = options.aggregationStrategy;
      if (disposed) {
        return;
      }
      if (pipe) {
        // Controls 状态与最近一次推理的输入不同才重新推理，否则只重绘
        if (
          !lastRun ||
          lastRun.text !== currentText ||
          lastRun.aggregationStrategy !== currentStrategy
        ) {
          void classify();
        } else {
          draw();
        }
      } else if (status === 'error' && changed && !loading) {
        // 加载失败后，换输入给一次重试机会
        void loadPipeline();
      } else {
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      pipe = null;
    },
  };
}
