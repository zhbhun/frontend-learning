/**
 * 范例：TextStreamer 流式生成——生成进行中把文本逐段画上画布。
 *
 * - 前置状态：首次运行需从 Hugging Face Hub 下载 q8 量化模型（约 129 MB），
 *   完成后写入浏览器 Cache；再次加载显著变快。
 * - 输入：Controls 中的「提示词」「max_new_tokens」「skip_prompt」。
 * - 操作：等待「状态」读数从 加载中 变为 就绪，再调整控件触发新一轮生成。
 * - 预期结果：生成文本逐段出现在画布（英文按词、中文逐字），生成结束前
 *   最后半词才冲出；读数给出 token 数、片段数与速度，「片段数」小于
 *   「token 数」是词边界启发式的直接证据；关闭 skip_prompt 时整段提示先被回显。
 * - 阅读主线：loadPipeline（加载）→ runGeneration（新建 streamer 并接入两个回调）
 *   → scheduleDraw（rAF 合帧渲染）→ draw（状态渲染与读数输出）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline, TextStreamer } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：SmolLM2-135M-Instruct 的 ONNX 转换版（decoder-only 聊天模型，
// ChatML 模板），q8 权重约 129 MB；skip_prompt 的回显行为只在 decoder-only 上可见
const MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX';

export type StreamerStatus = 'loading' | 'ready' | 'running' | 'error';

export interface StreamerOptions {
  prompt: string;
  maxNewTokens: number;
  skipPrompt: boolean;
}

export interface StreamerSnapshot {
  status: StreamerStatus;
  message: string;
  prompt: string;
  /** token_callback_function 累计的生成 token 数（含最后采到的 EOS） */
  tokenCount: number | null;
  /** callback_function 的调用次数：一段「成形文本」计一次 */
  pieceCount: number | null;
  /** 生成中的实时速度或结束后的平均速度 */
  speed: string | null;
  /** 最近一次 callback_function 收到的文本片段 */
  latestPiece: string | null;
}

export interface StreamerInstance {
  update(options: StreamerOptions): void;
  dispose(): void;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** pipeline 推理函数的最小形态：chat 输入 + generate 选项（含 streamer） */
type GeneratorPipe = ((
  messages: ChatMessage[],
  options: Record<string, unknown>,
) => Promise<unknown>) & {
  tokenizer?: unknown;
};

/** 只示例需要的最小类型；npm 项目可直接使用库导出的 TextStreamer 类 */
type StreamerCtor = new (
  tokenizer: unknown,
  options: {
    skip_prompt?: boolean;
    /** 每当一段文本「成形」（词/行/CJK 字）时调用，参数是字符串片段 */
    callback_function?: (piece: string) => void;
    /** 每个生成步调用一次，参数是本步新 token 的 id */
    token_callback_function?: (ids: bigint[]) => void;
  },
) => unknown;

export function createStreamerDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StreamerSnapshot) => void,
): StreamerInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: StreamerOptions = {
    prompt: 'Tell me a joke about JavaScript.',
    maxNewTokens: 48,
    skipPrompt: true,
  };
  let status: StreamerStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let loadSeconds: string | null = null;
  let pipe: GeneratorPipe | null = null;
  let TextStreamerCtor: StreamerCtor | null = null;
  let loading = false;
  let disposed = false;

  // 生成侧状态：runToken 过滤过期回调；running/rerunQueued 串行化多轮生成
  let runToken = 0;
  let running = false;
  let rerunQueued = false;
  let generatedText = '';
  let tokenCount: number | null = null;
  let pieceCount: number | null = null;
  let latestPiece: string | null = null;
  let startedAt = 0;
  let finalSeconds: number | null = null;

  let framePending = false;

  // 回调可能一秒触发几十次：只置脏标记，每帧最多重绘一次（rAF 合帧）。
  // readout 读数在共享支架里还有一层 100ms 节流，两层合帧消化高频回调。
  function scheduleDraw() {
    if (framePending || disposed) {
      return;
    }
    framePending = true;
    requestAnimationFrame(() => {
      framePending = false;
      draw();
    });
  }

  function snapshot(): StreamerSnapshot {
    let seconds: number | null = null;
    if (status === 'running' && startedAt > 0) {
      seconds = (performance.now() - startedAt) / 1000;
    } else if (finalSeconds !== null) {
      seconds = finalSeconds;
    }
    const speed =
      seconds !== null && seconds > 0 && tokenCount
        ? `${(tokenCount / seconds).toFixed(1)} token/s`
        : null;
    return {
      status,
      message,
      prompt: current.prompt,
      tokenCount,
      pieceCount,
      speed,
      latestPiece,
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
    drawingContext.fillText('TextStreamer：边生成边显示', 48, 40);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`提示词：${truncate(current.prompt, contentWidth)}`, 48, 66);

    if (status === 'loading') {
      // 首次运行的主要等待就是这段下载；不传 progress_callback 时它是完全静默的
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 92, contentWidth, 16);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        92,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        16,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 136 + index * 20);
      });
      return;
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 104 + index * 20);
      });
      return;
    }

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(message, 48, 92);

    // 生成文本区：显示尾部若干行，生成中在末尾带光标
    const text = generatedText + (status === 'running' ? ' ▌' : '');
    if (text.length > 0) {
      const areaTop = 112;
      const areaBottom = height - 44;
      const lineHeight = 20;
      const maxLines = Math.max(1, Math.floor((areaBottom - areaTop) / lineHeight));
      const lines = wrapText(text, contentWidth).slice(-maxLines);
      drawingContext.fillStyle = '#172033';
      drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
      lines.forEach((line, index) => {
        drawingContext.fillText(line, 48, areaTop + 14 + index * lineHeight);
      });
    }

    if (latestPiece) {
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.textAlign = 'right';
      drawingContext.fillText(
        `最新片段：${truncate(`「${latestPiece}」`, width / 2)}`,
        width - 16,
        height - 16,
      );
      drawingContext.textAlign = 'left';
    }
  }

  async function loadPipeline() {
    if (pipe || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const started = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
      const { pipeline, TextStreamer } = mod as {
        pipeline: unknown;
        TextStreamer: StreamerCtor;
      };
      TextStreamerCtor = TextStreamer;

      const pipelineFactory = pipeline as (
        task: string,
        model: string,
        options?: Record<string, unknown>,
      ) => Promise<unknown>;

      // 实例只创建一次：dtype/device 不传，按环境默认——浏览器 WASM 下即 q8 档位
      pipe = (await pipelineFactory('text-generation', MODEL_ID, {
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
              message = `正在下载模型（q8 约 129 MB，仅首次）：${percent}%`;
              scheduleDraw();
            }
          }
        },
      })) as GeneratorPipe;
      if (disposed) {
        return;
      }
      status = 'ready';
      loadSeconds = ((performance.now() - started) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；刷新页面将命中浏览器缓存`;
      draw();
      void runGeneration();
    } catch (error) {
      if (disposed) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `模型加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；恢复网络后调整「提示词」即可重试。`;
      draw();
    } finally {
      loading = false;
    }
  }

  async function runGeneration() {
    if (!pipe || !TextStreamerCtor || disposed) {
      return;
    }
    if (running) {
      // 上一轮还在生成：记下诉求，等它结束后用最新参数再跑
      rerunQueued = true;
      return;
    }
    running = true;
    const runId = ++runToken;
    const options = { ...current };

    // 重置流式状态：token 数由 token_callback_function 计，片段数由 callback_function 计
    generatedText = '';
    tokenCount = 0;
    pieceCount = 0;
    latestPiece = null;
    startedAt = performance.now();
    finalSeconds = null;
    status = 'running';
    message = `生成中…（max_new_tokens = ${options.maxNewTokens}）`;

    // 每个 run 用全新 streamer：回调闭包校验 runId，丢弃过期生成的迟到回调。
    // 生成循环同步调用回调、不会 await 它们返回的 Promise，回调里只做同步工作。
    const tokenizer = pipe.tokenizer;
    const streamer = new TextStreamerCtor(tokenizer, {
      skip_prompt: options.skipPrompt,
      callback_function: (piece: string) => {
        if (disposed || runId !== runToken) {
          return;
        }
        pieceCount = (pieceCount ?? 0) + 1;
        generatedText += piece;
        latestPiece = piece;
        scheduleDraw();
      },
      token_callback_function: (ids: bigint[]) => {
        if (disposed || runId !== runToken) {
          return;
        }
        // 单条输入每步 1 个新 token；批量时 ids 是整行新 token
        tokenCount = (tokenCount ?? 0) + ids.length;
        scheduleDraw();
      },
    });

    scheduleDraw();
    try {
      // await 期间 streamer 的回调已被多次触发；resolve 后拿到的是完整结果，
      // output[0].generated_text 是权威全文（chat 输入时末位是 assistant 消息）
      await pipe([{ role: 'user', content: options.prompt }], {
        max_new_tokens: options.maxNewTokens,
        do_sample: false,
        streamer,
      });
      if (disposed || runId !== runToken) {
        return;
      }
      finalSeconds = (performance.now() - startedAt) / 1000;
      const speed = tokenCount
        ? `${((tokenCount ?? 0) / finalSeconds).toFixed(1)} token/s`
        : '—';
      status = 'ready';
      message = `生成完成：${tokenCount ?? 0} token / ${pieceCount ?? 0} 段 / ${finalSeconds.toFixed(1)} 秒（${speed}）——调整控件可再次生成`;
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `生成失败：${detail}`;
    } finally {
      running = false;
    }
    draw();
    if (rerunQueued && !disposed) {
      rerunQueued = false;
      void runGeneration();
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

  const resizeObserver = createResizeObserver(canvas, scheduleDraw);
  void loadPipeline();

  return {
    update(options) {
      const changed =
        options.prompt !== current.prompt ||
        options.maxNewTokens !== current.maxNewTokens ||
        options.skipPrompt !== current.skipPrompt;
      current = options;
      if (disposed) {
        return;
      }
      if (pipe) {
        // 换参数只触发新一轮生成，不重建实例
        if (changed) {
          void runGeneration();
        } else {
          scheduleDraw();
        }
      } else if (status === 'error' && changed && !loading) {
        // 加载失败后，调整控件给一次重试机会
        void loadPipeline();
      } else {
        scheduleDraw();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      pipe = null;
      TextStreamerCtor = null;
    },
  };
}
