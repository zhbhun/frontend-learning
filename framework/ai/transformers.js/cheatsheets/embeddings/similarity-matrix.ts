/**
 * 范例：feature-extraction 句向量 + 余弦相似度矩阵。
 *
 * - 前置状态：首次运行需从 Hugging Face Hub 下载 q8 量化模型（约 23 MB），
 *   完成后写入浏览器 Cache；刷新页面或再次进入时加载明显变快。
 * - 输入：Controls 中的「句子组」（每组 5 句：同主题 3 句 + 无关 2 句）与
 *   「pooling」（mean / cls / none）。
 * - 操作：等待「状态」从 加载中 变为 就绪，再切换 pooling 或句子组触发重新编码。
 * - 预期结果：mean / cls 下画布渲染 5×5 余弦相似度矩阵——同主题句两两之间明显
 *   更深（接近 1），跨主题接近 0；cls 的矩阵整体比 mean 更浅、区分度更差。
 *   切到 none 时输出保持词级形状 [5, seq, 384]，不产生句级矩阵。
 * - 阅读主线：load（加载 pipeline 与 progress_callback）→ compute（批量编码 +
 *   手写余弦相似度）→ draw（矩阵着色渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline, cos_sim } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：sentence-transformers/all-MiniLM-L6-v2 的浏览器转换版。
// hidden_size 384，6 层 BERT；q8 对应 onnx/model_quantized.onnx，约 23 MB
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

export type PoolingMode = 'mean' | 'cls' | 'none';

export type MatrixStatus = 'loading' | 'running' | 'ready' | 'error';

export interface SimilarityMatrixOptions {
  sentences: string[];
  pooling: PoolingMode;
}

export interface SimilarityMatrixSnapshot {
  status: MatrixStatus;
  message: string;
  pooling: PoolingMode;
  /** 输出张量的 dims 文本，如 "[5, 384]" 或词级 "[5, 9, 384]" */
  dimsText: string | null;
  /** 除对角线外相似度最高的句对，如 "B · D（0.78）" */
  bestPair: string | null;
  loadSeconds: string | null;
}

export interface SimilarityMatrixInstance {
  update(options: SimilarityMatrixOptions): void;
  dispose(): void;
}

/** feature-extraction 输出 Tensor 的最小读取面：dims 给形状，tolist() 转嵌套数组 */
interface TensorLike {
  dims?: number[];
  tolist: () => unknown;
}

/** extractor 的最小形态：文本数组 + 池化选项，Promise 返回输出 Tensor */
type ExtractorFn = (
  texts: string[],
  options: { pooling: PoolingMode; normalize: boolean },
) => Promise<TensorLike>;

// 预置句子组：同主题 3 句 + 无关 2 句；模型词表为英文 wordpiece，预置句不用中文
export const PRESETS: Record<string, { label: string; sentences: string[] }> = {
  coffee: {
    label: '咖啡与作息',
    sentences: [
      'I drink coffee every morning.',
      'She starts her day with a fresh cup of coffee.',
      'Coffee keeps me focused during long meetings.',
      'The stock market dropped sharply yesterday.',
      'My cat sleeps on the sofa all day.',
    ],
  },
  weather: {
    label: '天气与出行',
    sentences: [
      'Heavy rain is expected in Tokyo tonight.',
      'The storm will bring strong winds this weekend.',
      "It's raining again, take an umbrella with you.",
      'Python is a popular language for data science.',
      'The train to Osaka leaves from platform nine.',
    ],
  },
};

/**
 * 手写余弦相似度：点积除以两个向量的模长。
 * 与库公开导出的 cos_sim（utils/maths.js）算法一致；当向量已做
 * normalize: true 的 L2 归一化时，模长为 1，余弦相似度退化为点积。
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; ++i) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export function createSimilarityMatrix(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SimilarityMatrixSnapshot) => void,
): SimilarityMatrixInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let currentSentences = PRESETS.coffee.sentences;
  let currentPooling: PoolingMode = 'mean';
  let status: MatrixStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let dimsText: string | null = null;
  let bestPair: string | null = null;
  let matrix: number[][] | null = null;
  let extractor: ExtractorFn | null = null;
  let loading = false;
  let disposed = false;
  let runToken = 0;
  let loadSeconds: string | null = null;

  function snapshot(): SimilarityMatrixSnapshot {
    return {
      status,
      message,
      pooling: currentPooling,
      dimsText,
      bestPair,
      loadSeconds,
    };
  }

  function draw() {
    emit(snapshot());

    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const contentWidth = width - 48;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('余弦相似度矩阵：5 句两两比对', 24, 32);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `Xenova/all-MiniLM-L6-v2（384 维） · pooling: '${currentPooling}' · normalize: true`,
      24,
      54,
    );

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 24, 88 + index * 20);
      });
      return;
    }

    if (status === 'loading') {
      // 首次运行的主要等待就是模型下载；不传 progress_callback 时它是完全静默的
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(24, 76, contentWidth, 14);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        24,
        76,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        14,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 24, 112 + index * 20);
      });
      return;
    }

    if (!matrix && currentPooling !== 'none') {
      // running 且还没有第一次结果
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 24, 120);
      return;
    }

    drawMatrix(width, height);
  }

  function drawMatrix(width: number, height: number) {
    const n = currentSentences.length;
    const letters = 'ABCDEFGHIJ'.slice(0, n).split('');

    // 左栏句子图例；窄画布只保留字母（完整句子见 Controls 下拉框）
    const legendX = 24;
    const matrixX = width >= 640 ? 316 : 168;
    const matrixY = 88;
    const cell = Math.floor(
      Math.min(64, (width - matrixX - 20) / n, (height - matrixY - 16) / n),
    );

    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    currentSentences.forEach((sentence, index) => {
      const top = matrixY + 4 + index * 30;
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(letters[index], legendX, top + 4);
      drawingContext.fillStyle = '#334155';
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      const maxWidth = matrixX - legendX - 32;
      const clipped = clipText(sentence, maxWidth);
      drawingContext.fillText(clipped, legendX + 16, top + 4);
    });

    // 行列表头字母
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    letters.forEach((letter, index) => {
      const center = matrixX + index * cell + cell / 2;
      drawingContext.fillText(letter, center - 3, matrixY - 8);
      drawingContext.fillText(letter, matrixX - 14, matrixY + index * cell + cell / 2 + 4);
    });

    if (currentPooling === 'none') {
      // pooling: 'none' 时不聚合，输出仍是词级 [n, seq, 384]，句级矩阵无从谈起
      drawingContext.fillStyle = '#fdf2f8';
      drawingContext.fillRect(matrixX, matrixY, cell * n, cell * n);
      drawingContext.strokeStyle = '#dbe3f0';
      drawingContext.strokeRect(matrixX, matrixY, cell * n, cell * n);
      drawingContext.fillStyle = '#9f1239';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      const lines = [
        `输出保持词级形状 ${dimsText ?? '…'}`,
        '（未聚合成句向量）',
        "句级矩阵请切到 'mean' 或 'cls'",
      ];
      lines.forEach((line, index) => {
        drawingContext.fillText(
          line,
          matrixX + 16,
          matrixY + cell * n / 2 - 24 + index * 22,
        );
      });
      return;
    }

    if (!matrix) {
      return;
    }

    // 找除对角线外相似度最高的一对，用深色描边标出
    let best: { i: number; j: number } | null = null;
    for (let i = 0; i < n; ++i) {
      for (let j = 0; j < n; ++j) {
        if (i === j) {
          continue;
        }
        if (!best || matrix[i][j] > matrix[best.i][best.j]) {
          best = { i, j };
        }
      }
    }

    matrix.forEach((row, i) => {
      row.forEach((value, j) => {
        const x = matrixX + j * cell;
        const y = matrixY + i * cell;
        // 相似度 [-1, 1] 映射到 [0, 1]：越接近 1 越蓝，跨主题的低值接近底色
        const t = Math.max(0, Math.min(1, value));
        const r = Math.round(241 + (37 - 241) * t);
        const g = Math.round(245 + (99 - 245) * t);
        const b = Math.round(249 + (235 - 249) * t);
        drawingContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
        drawingContext.fillRect(x, y, cell - 1, cell - 1);

        drawingContext.fillStyle = t > 0.6 ? '#ffffff' : '#334155';
        drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        const text = value.toFixed(2);
        drawingContext.fillText(
          text,
          x + cell / 2 - text.length * 3.3,
          y + cell / 2 + 4,
        );
      });
    });

    if (best) {
      drawingContext.strokeStyle = '#172033';
      drawingContext.lineWidth = 2;
      drawingContext.strokeRect(
        matrixX + best.j * cell + 1,
        matrixY + best.i * cell + 1,
        cell - 2,
        cell - 2,
      );
      drawingContext.strokeRect(
        matrixX + best.i * cell + 1,
        matrixY + best.j * cell + 1,
        cell - 2,
        cell - 2,
      );
      drawingContext.lineWidth = 1;
    }
  }

  async function load() {
    if (extractor || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);

      // 显式指定 q8：下载 onnx/model_quantized.onnx（约 23 MB），行为可复现；
      // 浏览器 WASM 下不指定 dtype 时默认也是 q8（4.3.0 源码核实），但会多一条警告
      extractor = (await mod.pipeline('feature-extraction', MODEL_ID, {
        dtype: 'q8',
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
              message = `正在下载模型（q8 约 23 MB，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      })) as ExtractorFn;

      if (disposed) {
        return;
      }
      status = 'ready';
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；切换 pooling 与句子组只需重新编码，不再下载`;
      draw();
      void compute();
    } catch (error) {
      if (disposed) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `模型加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；恢复网络后切换「pooling」即可重试。`;
      draw();
    } finally {
      loading = false;
    }
  }

  async function compute() {
    if (!extractor || disposed) {
      return;
    }
    const runId = ++runToken;
    status = 'running';
    message = `编码 ${currentSentences.length} 句并计算相似度…`;
    dimsText = null;
    bestPair = null;
    draw();
    try {
      // 批量编码：一次调用吃进 5 句；pipeline 内部固定开启 padding 与截断。
      // pooling: 'mean'（或 'cls'）后输出 [n, 384] 句向量；'none' 保持 [n, seq, 384] 词级
      const output = await extractor(currentSentences, {
        pooling: currentPooling,
        normalize: true, // L2 归一化：句向量模长为 1，余弦相似度直接等于点积
      });
      if (disposed || runId !== runToken) {
        return; // 等待期间用户又切换了 pooling / 句子组：丢弃过期结果
      }

      const dims = output.dims ?? [];
      dimsText = `[${dims.join(', ')}]`;

      if (currentPooling === 'none') {
        matrix = null;
        bestPair = null;
      } else {
        const vectors = output.tolist() as number[][];
        matrix = vectors.map((a) =>
          vectors.map((b) => cosineSimilarity(a, b)),
        );
        // 读出最相似句对，作为 readout 的可核对证据
        const letters = 'ABCDEFGHIJ'.split('');
        let bestI = -1;
        let bestJ = -1;
        let bestScore = -Infinity;
        for (let i = 0; i < matrix.length; ++i) {
          for (let j = 0; j < matrix.length; ++j) {
            if (i !== j && matrix[i][j] > bestScore) {
              bestScore = matrix[i][j];
              bestI = i;
              bestJ = j;
            }
          }
        }
        bestPair =
          bestI >= 0
            ? `${letters[bestI]} · ${letters[bestJ]}（${bestScore.toFixed(2)}）`
            : null;
      }

      status = 'ready';
      message =
        currentPooling === 'none'
          ? "pooling: 'none' 输出词级向量，未聚合成句向量"
          : `mean / cls 对同一组句子给出的相似度结构不同——对比两种 pooling 的矩阵`;
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `编码失败：${detail}`;
      draw();
    }
  }

  function clipText(text: string, maxWidth: number): string {
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
      const needsCompute =
        options.pooling !== currentPooling ||
        options.sentences !== currentSentences;
      currentSentences = options.sentences;
      currentPooling = options.pooling;
      if (disposed) {
        return;
      }
      if (extractor && needsCompute) {
        // 换 pooling 或句子组只触发一次批量编码，不重新加载模型
        void compute();
      } else {
        draw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      extractor = null;
    },
  };
}
