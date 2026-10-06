/**
 * 范例：文本生成的参数试验场——同一提示词在不同生成参数下每步怎么选词。
 *
 * - 前置状态：首次运行需从 Hugging Face Hub 下载 q8 量化模型（权重约 129 MB，
 *   合计约 135 MB），完成后写入浏览器 Cache；再次加载显著变快。
 * - 输入：Controls 中的「提示词」「max_new_tokens」「do_sample」「temperature」
 *   「top_k」「repetition_penalty」。
 * - 操作：等待「状态」变为 就绪；调整任一参数后自动重新生成——连续调整合并为
 *   一次（约 0.7 秒去抖），生成进行中调整则在完成后按最新参数补跑一次。
 * - 预期结果：关闭 do_sample 后多次生成结果一字不差（贪心），且温度与 top_k
 *   读数提示不生效；开启采样后每次运行结果不同，temperature 调小更稳、调大更
 *   发散，top_k=1 等价贪心、0 不截断；repetition_penalty 调大后复读片段减少；
 *   max_new_tokens 调大，「生成用时」读数近似线性变长。
 * - 阅读主线：load（加载与 progress_callback）→ run（参数透传给 generate）→
 *   draw（参数回显与输出渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：SmolLM2-135M-Instruct（decoder-only，带对话模板），
// q8 权重约 129.4 MB，加上分词器与库本体首次合计约 135 MB
const MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX';

// 连续调整参数时合并为一次生成；生成进行中到达的调整在完成后补跑一次
const RERUN_DEBOUNCE_MS = 700;

export type GenerationStatus = 'loading' | 'ready' | 'generating' | 'error';

export interface GenerationParams {
  prompt: string;
  maxNewTokens: number;
  doSample: boolean;
  temperature: number;
  topK: number;
  repetitionPenalty: number;
}

export interface GenerationSnapshot {
  status: GenerationStatus;
  message: string;
  prompt: string;
  params: GenerationParams;
  output: string | null;
  seconds: string | null;
}

export interface GenerationInstance {
  update(params: GenerationParams): void;
  dispose(): void;
}

/** text-generation pipeline 的最小形态：对话消息 + 生成参数，返回 [{ generated_text }] */
type GenerateFn = (
  messages: Array<{ role: string; content: string }>,
  options: Record<string, unknown>,
) => Promise<Array<{ generated_text: unknown }>>;

/**
 * 参数回显的唯一真源：画布与 readout 的「当前参数」都来自这里。
 * 贪心（do_sample 关）下 temperature 与 top_k 不参与选词，回显里直接说明。
 */
export function describeParams(params: GenerationParams): string {
  const mode = params.doSample
    ? `采样 开 · 温度 ${params.temperature.toFixed(1)} · top_k ${params.topK}`
    : '采样 关（贪心）· 温度/top_k 不生效';
  return `${mode} · max_new_tokens ${params.maxNewTokens} · 重复惩罚 ${params.repetitionPenalty}`;
}

export function createGenerationParams(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GenerationSnapshot) => void,
): GenerationInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: GenerationParams = {
    prompt: 'What is the capital of France?',
    maxNewTokens: 48,
    doSample: true,
    temperature: 0.7,
    topK: 50,
    repetitionPenalty: 1,
  };
  let status: GenerationStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let output: string | null = null;
  let seconds: string | null = null;
  let generate: GenerateFn | null = null;
  let loading = false;
  let running = false;
  let disposed = false;
  let runToken = 0;
  let loadSeconds: string | null = null;
  let rerunTimer: number | null = null;
  let staleParams = false;

  function snapshot(): GenerationSnapshot {
    return {
      status,
      message,
      prompt: current.prompt,
      params: { ...current },
      output,
      seconds,
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
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const contentWidth = width - 96;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('text-generation：参数改变每一步的选词', 48, 46);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`输入：${truncate(current.prompt, contentWidth)}`, 48, 78);

    // 参数回显：与 readout 的「当前参数」同源，贪心下温度与 top_k 直接标注不生效
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(describeParams(current), 48, 104);

    if (status === 'loading') {
      // 首次运行的主要等待就是这段下载；不传 progress_callback 时它是完全静默的
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 124, contentWidth, 16);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        124,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        16,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, 164 + index * 20);
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

    // ready / generating：参数已回显，这里画生成输出
    if (output === null) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, 150);
      return;
    }

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('输出：', 48, 134);

    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    const maxLines = Math.max(1, Math.floor((height - 158 - 40) / 20));
    const lines = wrapText(output, contentWidth);
    const shown =
      lines.length > maxLines
        ? lines.slice(0, maxLines).map((line, index) =>
            index === maxLines - 1 ? `${line} …` : line,
          )
        : lines;
    shown.forEach((line, index) => {
      drawingContext.fillText(line, 48, 158 + index * 20);
    });
  }

  async function load() {
    if (generate || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
      const { pipeline } = mod;

      // 实例只创建一次：任务名 + 模型 ID + options（dtype/device 不传，
      // 按环境默认——浏览器 WASM 下即 q8 档位）
      generate = (await pipeline('text-generation', MODEL_ID, {
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
              message = `正在下载模型（q8 约 135 MB，仅首次）：${percent}%`;
              draw();
            }
          }
        },
      })) as GenerateFn;
      if (disposed) {
        return;
      }
      status = 'ready';
      loadSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `模型就绪，用时 ${loadSeconds} 秒；刷新页面将命中浏览器缓存，加载显著变快`;
      draw();
      void run();
    } catch (error) {
      if (disposed) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `模型加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；恢复网络后调整任一参数即可重试。`;
      draw();
    } finally {
      loading = false;
    }
  }

  async function run() {
    if (!generate || running || disposed) {
      return;
    }
    const runId = ++runToken;
    // 记录本轮使用的参数快照；生成期间到达的调整通过 staleParams 在结束后补跑
    const runParams = { ...current };
    // 补跑抢先于去抖计时器触发时，把计时器里攒下的调整转成本轮之后的补跑，
    // 避免最后一次参数调整被静默丢弃
    if (rerunTimer !== null) {
      window.clearTimeout(rerunTimer);
      rerunTimer = null;
      staleParams = true;
    }
    running = true;
    status = 'generating';
    message = '生成中…';
    draw();
    const startedAt = performance.now();
    try {
      // 生成参数作为第二个参数传入，原样透传给 model.generate()；
      // 各键的生效条件不同，不满足时库会静默忽略：
      // - max_new_tokens：总是生效，设了就换算覆盖 max_length
      // - temperature：仅 do_sample: true 且 ≠ 1.0 时注入
      // - top_k：仅采样路径生效（在采样器内截候选），贪心下无效
      // - repetition_penalty：≠ 1.0 时生效，贪心与采样都适用
      const result = await generate(
        [{ role: 'user', content: runParams.prompt }],
        {
          max_new_tokens: runParams.maxNewTokens,
          do_sample: runParams.doSample,
          temperature: runParams.temperature,
          top_k: runParams.topK,
          repetition_penalty: runParams.repetitionPenalty,
        },
      );
      const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
      if (disposed || runId !== runToken) {
        return;
      }
      // chat 输入默认 return_full_text: false：generated_text 是完整消息数组，
      // 最后一条 assistant 就是新生成的内容；字符串输入时则是含提示词的全文
      const generated = result[0]?.generated_text;
      if (typeof generated === 'string') {
        output = generated;
      } else if (Array.isArray(generated)) {
        const last = generated.at(-1) as { content?: unknown } | undefined;
        output = typeof last?.content === 'string' ? last.content : '';
      } else {
        output = '';
      }
      seconds = elapsed;
      status = 'ready';
      message = `生成完成（用时 ${elapsed} 秒）；调整参数会自动重新生成`;
      draw();
    } catch (error) {
      if (disposed || runId !== runToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `生成失败：${detail}`;
      draw();
    } finally {
      running = false;
      if (!disposed && staleParams) {
        staleParams = false;
        rerunTimer = window.setTimeout(() => {
          rerunTimer = null;
          void run();
        }, 50);
      }
    }
  }

  function paramsChanged(next: GenerationParams): boolean {
    return (
      next.prompt !== current.prompt ||
      next.maxNewTokens !== current.maxNewTokens ||
      next.doSample !== current.doSample ||
      next.temperature !== current.temperature ||
      next.topK !== current.topK ||
      next.repetitionPenalty !== current.repetitionPenalty
    );
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
    update(params) {
      const changed = paramsChanged(params);
      current = { ...current, ...params };
      if (disposed) {
        return;
      }
      draw(); // 参数回显立即更新
      if (!changed) {
        return;
      }
      if (!generate) {
        // 模型未就绪或加载失败：记下参数；加载完成后会按最新参数跑首次生成
        if (status === 'error' && !loading) {
          void load();
        }
        return;
      }
      if (running) {
        // 生成进行中：只标记待补跑，本轮结束后按最新参数执行
        staleParams = true;
        return;
      }
      // 连续拖动滑块合并为一次生成（去抖）
      if (rerunTimer !== null) {
        window.clearTimeout(rerunTimer);
      }
      rerunTimer = window.setTimeout(() => {
        rerunTimer = null;
        void run();
      }, RERUN_DEBOUNCE_MS);
    },
    dispose() {
      disposed = true;
      if (rerunTimer !== null) {
        window.clearTimeout(rerunTimer);
        rerunTimer = null;
      }
      resizeObserver.disconnect();
      generate = null;
    },
  };
}
