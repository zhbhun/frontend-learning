/**
 * 范例：tokenizer 的编码全景——只加载分词器，观察 tokens、input_ids、attention_mask
 * 与 round-trip 解码，并用截断开关演示 truncation 的效果。
 *
 * - 前置状态：首次运行从 CDN 加载库（约 1.1 MB），再从 Hub 下载 tokenizer.json 与
 *   tokenizer_config.json（合计约 0.7 MB），秒级完成；不加载模型权重。
 * - 输入：Controls 的「示例文本」（中英文预置句）、「特殊 token」「截断」开关与「max_length」。
 * - 操作：等待「状态」读数变为 就绪；切换文本与开关，观察画布 token 块与读数的变化。
 * - 预期结果：readout 展示 tokens 列表、input_ids 数值、attention_mask 与解码文本；
 *   开启截断后序列被砍到 max_length，结尾的 [SEP] 一起消失；中文句大量落入 [UNK]。
 * - 阅读主线：loadTokenizer（CDN 导入与加载状态机）→ encodeNow（调用与参数组合）→
 *   draw（token 块渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，沿用 1.2 课确立的官方 CDN 动态导入；
// npm 项目请改用：import { AutoTokenizer } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：只取它的分词器（tokenizer.json 约 695 KB），不加载 ONNX 权重
const MODEL_ID = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

export type TokenizerStatus = 'loading' | 'ready' | 'error';

export interface EncodingOptions {
  text: string;
  addSpecialTokens: boolean;
  truncation: boolean;
  maxLength: number;
}

export interface EncodingSnapshot {
  status: TokenizerStatus;
  message: string;
  count: number | null;
  tokens: string[] | null;
  ids: number[] | null;
  mask: number[] | null;
  decoded: string | null;
}

export interface EncodingInstance {
  update(options: EncodingOptions): void;
  dispose(): void;
}

/** tokenizer 调用输出的最小形态：张量的 tolist() 返回嵌套 BigInt 数组 */
interface TensorLike {
  dims: number[];
  tolist(): unknown;
}

/** 本课用到的 PreTrainedTokenizer 公开面（完整 API 见官方文档） */
interface TokenizerLike {
  (text: string, options?: Record<string, unknown>): {
    input_ids: TensorLike;
    attention_mask: TensorLike;
  };
  tokenize(text: string, options?: Record<string, unknown>): string[];
  decode(ids: unknown, options?: Record<string, unknown>): string;
}

/** 把 [[101n, 102n]] 拍平成 [101, 102]：BigInt 转 number，便于展示与对比 */
function flattenTensorList(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }
  const flat = Array.isArray(value[0]) ? value[0] : value;
  return flat.map((item) => Number(item));
}

export function createTokenizerEncoding(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EncodingSnapshot) => void,
): EncodingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: EncodingOptions = {
    text: '',
    addSpecialTokens: true,
    truncation: false,
    maxLength: 8,
  };
  let tokenizer: TokenizerLike | null = null;
  let loading = false;
  let disposed = false;
  let snapshot: EncodingSnapshot = {
    status: 'loading',
    message: '正在从 CDN 加载库与 tokenizer（约 1.8 MB，秒级）…',
    count: null,
    tokens: null,
    ids: null,
    mask: null,
    decoded: null,
  };

  function publish(next: Partial<EncodingSnapshot>) {
    snapshot = { ...snapshot, ...next };
    emit(snapshot);
    draw();
  }

  /** 核心调用：tokenizer(text, options) 的参数组合与输出读取 */
  function encodeNow() {
    if (!tokenizer || disposed) {
      return;
    }
    const { text, addSpecialTokens, truncation, maxLength } = current;
    // 调用默认已自动加特殊 token、返回 int64 张量；max_length 必须搭配
    // truncation: true，否则库会打警告并按 model_max_length 处理
    const options: Record<string, unknown> = {
      add_special_tokens: addSpecialTokens,
    };
    if (truncation) {
      options.truncation = true;
      options.max_length = maxLength;
    }
    const encoding = tokenizer(text, options);
    const ids = flattenTensorList(encoding.input_ids.tolist());
    const mask = flattenTensorList(encoding.attention_mask.tolist());
    // tokens 与 ids 一一对应：tokenize 不受截断控制，按截断后的长度手动对齐
    const tokens = tokenizer
      .tokenize(text, { add_special_tokens: addSpecialTokens })
      .slice(0, ids.length);
    const decoded = tokenizer.decode(encoding.input_ids, {
      // 与 Python transformers 相反：transformers.js 的 decode 默认保留特殊 token
      skip_special_tokens: true,
    });
    publish({ count: ids.length, tokens, ids, mask, decoded });
  }

  async function loadTokenizer() {
    if (tokenizer || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
      const loaded: TokenizerLike = await mod.AutoTokenizer.from_pretrained(
        MODEL_ID,
      );
      if (disposed) {
        return;
      }
      tokenizer = loaded;
      const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      publish({
        status: 'ready',
        message: `就绪（加载用时 ${seconds} 秒）：切换示例文本或开关立即重新编码`,
      });
      encodeNow();
    } catch (error) {
      if (disposed) {
        return;
      }
      const detail = error instanceof Error ? error.message : String(error);
      publish({
        status: 'error',
        message: `tokenizer 加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；切换任意控件即可重试。`,
      });
    } finally {
      loading = false;
    }
  }

  /** 当前调用形态：readout 与画布同步展示读者的操作对应哪个公开参数 */
  function describeCall(): string {
    const parts = [`add_special_tokens: ${current.addSpecialTokens}`];
    if (current.truncation) {
      parts.push('truncation: true', `max_length: ${current.maxLength}`);
    }
    return `tokenizer(text, { ${parts.join(', ')} })`;
  }

  function fitLabel(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text;
    while (cut.length > 1 && drawingContext.measureText(`${cut}…`).width > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return `${cut}…`;
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    if (typeof drawingContext.roundRect === 'function') {
      drawingContext.beginPath();
      drawingContext.roundRect(x, y, w, h, r);
      drawingContext.fill();
    } else {
      drawingContext.fillRect(x, y, w, h);
    }
  }

  /** token 块：琥珀色 = [CLS]/[SEP] 等特殊 token，红色 = [UNK]，灰蓝 = 普通词块 */
  function drawBlocks(contentWidth: number, height: number) {
    const tokens = snapshot.tokens ?? [];
    const ids = snapshot.ids ?? [];
    const mask = snapshot.mask ?? [];
    if (tokens.length === 0) {
      return;
    }

    const gap = 6;
    const marginTop = 88;
    const bottomReserve = 148; // 给左下角 readout 面板留白
    const available = Math.max(52, height - marginTop - bottomReserve);
    const maxRows = Math.max(1, Math.floor(available / 52));
    const cols = Math.max(1, Math.ceil(tokens.length / maxRows));
    const blockW = Math.min(76, Math.floor((contentWidth - (cols - 1) * gap) / cols));
    const blockH = 46;

    for (let index = 0; index < tokens.length; ++index) {
      const token = tokens[index];
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = 48 + col * (blockW + gap);
      const y = marginTop + row * (blockH + gap);

      let background = '#e0e7ff';
      let textColor = '#3730a3';
      if (token === '[CLS]' || token === '[SEP]') {
        background = '#fde68a';
        textColor = '#92400e';
      } else if (token === '[UNK]') {
        background = '#fee2e2';
        textColor = '#991b1b';
      } else if (mask[index] === 0) {
        background = '#e2e8f0';
        textColor = '#94a3b8';
      }

      drawingContext.fillStyle = background;
      roundRect(x, y, blockW, blockH, 4);

      drawingContext.textAlign = 'center';
      drawingContext.fillStyle = textColor;
      drawingContext.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(
        fitLabel(token, blockW - 6),
        x + blockW / 2,
        y + 19,
      );
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(String(ids[index]), x + blockW / 2, y + 37);
      drawingContext.textAlign = 'left';
    }
  }

  function draw() {
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
    drawingContext.fillText('AutoTokenizer 编码全景', 48, 42);

    if (snapshot.status === 'ready') {
      drawingContext.textAlign = 'right';
      drawingContext.fillStyle = '#92400e';
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('琥珀 = 特殊 token　红 = [UNK]', width - 48, 42);
      drawingContext.textAlign = 'left';
    }

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(describeCall(), 48, 68);

    if (snapshot.status === 'ready') {
      drawBlocks(contentWidth, height);
      return;
    }

    // 加载中 / 出错：readout 的「状态」行同步显示同一信息
    drawingContext.fillStyle = snapshot.status === 'error' ? '#b91c1c' : '#475569';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    const lines: string[] = [];
    let line = '';
    for (const char of snapshot.message) {
      if (drawingContext.measureText(line + char).width > contentWidth) {
        lines.push(line);
        line = char;
      } else {
        line += char;
      }
    }
    if (line) {
      lines.push(line);
    }
    lines.slice(0, 5).forEach((text, index) => {
      drawingContext.fillText(text, 48, 130 + index * 22);
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  void loadTokenizer();

  return {
    update(options) {
      current = options;
      if (disposed) {
        return;
      }
      if (tokenizer) {
        encodeNow();
      } else if (!loading && snapshot.status === 'error') {
        // 加载失败后，切换任意控件给一次重试机会
        void loadTokenizer();
      } else {
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      tokenizer = null;
    },
  };
}
