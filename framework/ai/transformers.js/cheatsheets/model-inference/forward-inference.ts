/**
 * 范例：绕过 pipeline 的手工链路——tokenizer 编码 → model 前向 → 手工 softmax 解读 logits。
 *
 * - 前置状态：首次运行需从 Hugging Face Hub 下载 q8 量化模型（约 67.6 MB），
 *   完成后写入浏览器 Cache；与「第一个 pipeline」课共用同一模型文件，命中缓存时加载很快。
 * - 输入：Controls 中的「示例文本」（五句中英文预置值）。
 * - 操作：等待「状态」读数从 加载中 变为 就绪，再切换示例文本触发推理。
 * - 预期结果：读数依次给出编码后 token 数、2 维 logits、softmax 后两条概率与最终
 *   label；数值与 1.2 课 pipeline 输出的 score 一致。
 * - 阅读主线：load（加载与 progress_callback）→ infer（编码 / 前向 / softmax 三步）→ draw（状态渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { AutoTokenizer, AutoModelForSequenceClassification } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：DistilBERT 情感分类（与 1.2 课同款），q8 权重约 67.6 MB
const MODEL_ID = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

// 标签映射来自模型仓库 config.json 的 id2label 字段：{ "0": "NEGATIVE", "1": "POSITIVE" }
export const ID2LABEL: Record<number, string> = { 0: 'NEGATIVE', 1: 'POSITIVE' };

export type InferenceStatus = 'loading' | 'running' | 'ready' | 'error';

export interface ForwardInferenceOptions {
  text: string;
}

export interface ForwardInferenceSnapshot {
  status: InferenceStatus;
  message: string;
  text: string;
  seqLen: number | null;
  logits: number[] | null;
  probs: number[] | null;
  label: string | null;
  loadSeconds: string | null;
}

export interface ForwardInferenceInstance {
  update(options: ForwardInferenceOptions): void;
  dispose(): void;
}

/** 手工链路用到的 Tensor 最小读取面：dims 给形状，tolist() 转嵌套 JS 数组 */
export interface TensorLike {
  dims?: number[];
  tolist: () => unknown;
}

/**
 * 手工 softmax：把一组原始分数变成和为 1 的概率。
 * 先减去最大值再取指数（数值稳定），避免 logits 量级大时 Math.exp 溢出。
 */
function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map((value) => value / sum);
}

export function createForwardInference(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ForwardInferenceSnapshot) => void,
): ForwardInferenceInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let currentText = 'I love transformers!';
  let status: InferenceStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let seqLen: number | null = null;
  let logits: number[] | null = null;
  let probs: number[] | null = null;
  let label: string | null = null;
  // tokenizer / model 的最小形态：tokenizer 编码文本；model 接收编码对象，返回含 logits 的输出对象
  type TokenizerFn = (text: string) => Promise<unknown>;
  type ModelFn = (inputs: unknown) => Promise<{ logits?: unknown }>;
  let tokenizer: TokenizerFn | null = null;
  let model: ModelFn | null = null;
  let loading = false;
  let disposed = false;
  let runToken = 0;
  let loadSeconds: string | null = null;

  function snapshot(): ForwardInferenceSnapshot {
    return {
      status,
      message,
      text: currentText,
      seqLen,
      logits,
      probs,
      label,
      loadSeconds,
    };
  }

  function draw() {
    // 每次 repaint 都同步一次 readout（canvasStory 内部按 100ms 节流）
    emit(snapshot());

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
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '手工链路：tokenizer 编码 → model 前向 → softmax 解读',
      48,
      58,
    );

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`输入：${truncate(currentText, contentWidth)}`, 48, 96);

    if (status === 'loading') {
      // 首次运行的主要等待就是这段下载；不传 progress_callback 时它是完全静默的
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 118, contentWidth, 16);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        118,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        16,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 156 + index * 20);
      });
      return;
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 126 + index * 20);
      });
      return;
    }

    if (logits === null || probs === null) {
      // running 且还没有结果
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 150);
      return;
    }

    // ① 编码结果：input_ids 的 dims 是 [1, 序列长度]，第 0 维是 batch（单条输入恒为 1）
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `input_ids.dims = [1, ${seqLen}]　（${seqLen} 个 token，含 [CLS] / [SEP]）`,
      48,
      118,
    );

    // ② 前向输出：logits 是 2 维原始分数（softmax 之前），顺序由 id2label 决定
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `logits：${logits
        .map((value, index) => `${ID2LABEL[index]} ${value >= 0 ? '+' : ''}${value.toFixed(4)}`)
        .join('　')}`,
      48,
      148,
    );

    // ③ 手工 softmax：两条概率，条形长度即占比
    const trackWidth = contentWidth - 122 - 84;
    probs.forEach((prob, index) => {
      const top = 172 + index * 30;
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(`P(${ID2LABEL[index]})`, 48, top + 11);

      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(170, top, trackWidth, 14);
      drawingContext.fillStyle = index === 0 ? '#b91c1c' : '#15803d';
      drawingContext.fillRect(170, top, trackWidth * prob, 14);

      drawingContext.fillText(
        `${(prob * 100).toFixed(2)}%`,
        170 + trackWidth + 8,
        top + 11,
      );
    });

    // ④ 最终预测：概率最大的一类
    const resultColor = label === 'NEGATIVE' ? '#b91c1c' : '#15803d';
    drawingContext.fillStyle = resultColor;
    drawingContext.font = '600 22px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`预测 label：${label}`, 48, 250);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    wrapText(message, contentWidth).forEach((line, index) => {
      drawingContext.fillText(line, 48, 278 + index * 20);
    });
  }

  async function load() {
    if (model || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);

      // 分词器与模型分别加载；dtype/device 不传，按环境默认——浏览器 WASM 下即 q8 档位
      const loadedTokenizer = await mod.AutoTokenizer.from_pretrained(MODEL_ID);
      const loadedModel = await mod.AutoModelForSequenceClassification.from_pretrained(
        MODEL_ID,
        {
          progress_callback: (info: { status: string; progress?: number }) => {
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
                message = `正在下载模型（q8 约 67.6 MB，仅首次）：${percent}%`;
                draw();
              }
            }
          },
        },
      );
      if (disposed) {
        return;
      }
      tokenizer = loadedTokenizer as TokenizerFn;
      model = loadedModel as ModelFn;
      status = 'ready';
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；与 1.2 课共用同一份缓存文件，刷新页面加载更快`;
      draw();
      void infer();
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

  async function infer() {
    if (!tokenizer || !model || disposed) {
      return;
    }
    const runId = ++runToken;
    status = 'running';
    message = '前向推理中…';
    draw();
    try {
      // ① 编码：文本 → 张量（input_ids / attention_mask 等）
      const inputs = (await tokenizer(currentText)) as {
        input_ids?: { dims?: number[] };
      };

      // ② 前向：编码对象直接传入；模型实例可像函数一样调用，返回含 logits 的输出对象
      const output = (await model(inputs)) as { logits?: TensorLike };
      const logitsTensor = output.logits;
      if (!logitsTensor) {
        throw new Error('输出对象中没有 logits 字段——请确认加载的是带分类任务头的模型类。');
      }

      // ③ 解读：dims 给出形状（第 0 维是 batch）；tolist() 转成嵌套 JS 数组后手工 softmax
      const dims = logitsTensor.dims ?? [];
      seqLen = dims.length === 2 ? dims[1] : null;
      const rows = logitsTensor.tolist() as number[][] | number[];
      const scores = (Array.isArray(rows[0]) ? rows[0] : rows) as number[];
      probs = softmax(scores);
      logits = scores;
      const bestIndex = probs.indexOf(Math.max(...probs));
      label = ID2LABEL[bestIndex] ?? `LABEL_${bestIndex}`;
      status = 'ready';
      message = `前向完成；1.2 课 pipeline 的 score 就是这里 softmax 后的最大概率`;
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `前向推理失败：${detail}`;
      draw();
    }
  }

  function truncate(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text;
    while (cut.length > 0 && drawingContext.measureText(`${cut}…`).width > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return `${cut}…`;
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
  draw(); // 先画一帧加载状态，避免首个下载事件到来前画布空白
  void load();

  return {
    update(options) {
      const textChanged = options.text !== currentText;
      currentText = options.text;
      if (disposed) {
        return;
      }
      if (model) {
        // 换文本只触发一次编码 + 前向，不重新加载模型
        if (textChanged) {
          void infer();
        } else {
          draw();
        }
      } else if (status === 'error' && textChanged && !loading) {
        // 加载失败后，换文本给一次重试机会
        void load();
      } else {
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      tokenizer = null;
      model = null;
    },
  };
}
