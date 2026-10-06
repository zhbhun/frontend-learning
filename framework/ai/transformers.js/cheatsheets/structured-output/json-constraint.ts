/**
 * 范例：JSON schema 约束生成试验场——StructuredOutputProcessor 把每一步的候选
 * token 限制到「能拼出合法 JSON」的集合里，输出语法层必然合法。
 *
 * - 前置状态：首次运行需从 Hugging Face Hub 下载 q8 量化模型（权重约 129 MB，
 *   合计约 135 MB），完成后写入浏览器 Cache，与 2.2.1 / 2.2.2 的实例共享缓存。
 * - 输入：Controls 中的「约束预设」（json_schema 两种 + json_object 一种）与「提示词」。
 * - 操作：等待「状态」变为 就绪；切换预设或修改提示词后自动重新生成——连续调整
 *   合并为一次（约 0.7 秒去抖），生成进行中调整则在完成后按最新参数补跑一次。
 * - 预期结果：「JSON 可解析」读数恒为 是（约束在 token 级生效，不是事后修补）；
 *   「Schema 校验」显示输出是否符合预设结构。把提示词换成与预设语义无关的句子，
 *   语法依然合法：约束保证格式，不保证内容正确。
 * - 阅读主线：load（主库与约束包的 CDN 双加载、warmup）→ run（logits_processor
 *   注入生成调用）→ validate（JSON.parse 与预设校验器）→ render。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，主库按官方 README 的 CDN 用法加载浏览器构建
// （与 2.2.1 / 2.2.2 实例同一 URL，共享浏览器缓存）；npm 项目请改用：
// import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 约束包是独立发布物（v4.3.0 起），其 ESM 入口含一行裸模块引用
// import { LogitsProcessor, LogitsProcessorList } from "@huggingface/transformers"
// ——浏览器无法解析裸模块名。这里取包的 ESM 产物，把该行改写到与 pipeline
// 同一份主库实例上，再以 blob 模块导入；两边共享同一套类，掩码才能进同一
// 条 logits 处理链。npm 项目无此问题：直接 import { StructuredOutputProcessor }
// from '@huggingface/transformers-structured-output' 即可。
const PROCESSOR_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers-structured-output@4.3.0/dist/index.js';

// 本课示例模型：与 2.2.1 / 2.2.2 相同的 SmolLM2-135M-Instruct（q8 约 129.4 MB）；
// tokenizer 的 eos（<|im_end|>，id 2）与 generation_config 的 eos_token_id 一致，
// 满足约束处理器放开 EOS 的前提
const MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX';

// 连续调整参数时合并为一次生成；生成进行中到达的调整在完成后补跑一次
const RERUN_DEBOUNCE_MS = 700;

// 约束未满足前 EOS 不被允许，max_new_tokens 用尽会截断出不完整 JSON：
// 两个预设的完整输出约 15~35 token，128 留足余量
const MAX_NEW_TOKENS = 128;

export type JsonStatus = 'loading' | 'ready' | 'generating' | 'error';

/** ResponseFormat 的最小结构类型（与包的 d.ts 对齐） */
export type ResponseFormat =
  | { type: 'json_object' }
  | { type: 'json_schema'; json_schema: Record<string, unknown> }
  | { type: 'regex'; regex: string };

/** 约束处理器在运行期只被主库按鸭子类型调用，这里保持不透明 */
type ProcessorInstance = object;

type ProcessorConstructor = {
  new (tokenizer: unknown, format: ResponseFormat): ProcessorInstance;
  /** 预热词表结构（trie 与字符串掩码），把开销从首次生成挪到加载期 */
  warmup(tokenizer: unknown): void;
};

export interface JsonArgs {
  preset: string;
  prompt: string;
}

export interface JsonSnapshot {
  status: JsonStatus;
  message: string;
  preset: string;
  prompt: string;
  output: string | null;
  parseable: boolean | null;
  schemaOk: boolean | null;
  seconds: string | null;
}

export interface JsonInstance {
  update(args: JsonArgs): void;
  dispose(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 预设 1 校验器：sentiment / topic 必须且只能有这两个字段，取值限枚举 */
function validateFeedback(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== 'sentiment' || keys[1] !== 'topic') {
    return false; // additionalProperties: false → 多字段也算不匹配
  }
  const sentiments = ['positive', 'negative', 'neutral'];
  const topics = ['price', 'quality', 'delivery', 'other'];
  return sentiments.includes(String(value.sentiment)) && topics.includes(String(value.topic));
}

/** 预设 2 校验器：city / country 为字符串，population 为整数，字段恰好三个 */
function validateCityCard(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  if (keys.length !== 3) return false;
  return (
    typeof value.city === 'string' &&
    typeof value.country === 'string' &&
    Number.isInteger(value.population)
  );
}

export interface ConstraintPreset {
  key: string;
  label: string;
  /** 画布上的约束说明（回显唯一真源） */
  schemaNote: string;
  format: ResponseFormat;
  /** 校验输出是否匹配预设结构；null 表示该预设没有 schema 可校验 */
  validate: (value: unknown) => boolean | null;
}

// 预设 1 的 schema 与官方 v4.3.0 Release Notes 的示例一致
export const PRESETS: Record<string, ConstraintPreset> = {
  feedback: {
    key: 'feedback',
    label: '反馈分类（json_schema）',
    schemaNote:
      'sentiment ∈ {positive, negative, neutral} · topic ∈ {price, quality, delivery, other} · 两个字段必填、禁多余',
    format: {
      type: 'json_schema',
      json_schema: {
        type: 'object',
        properties: {
          sentiment: { enum: ['positive', 'negative', 'neutral'] },
          topic: { enum: ['price', 'quality', 'delivery', 'other'] },
        },
        required: ['sentiment', 'topic'],
        additionalProperties: false,
      },
    },
    validate: validateFeedback,
  },
  city: {
    key: 'city',
    label: '城市信息卡（json_schema）',
    schemaNote: 'city: string · country: string · population: integer · 三个字段必填、禁多余',
    format: {
      type: 'json_schema',
      json_schema: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          country: { type: 'string' },
          population: { type: 'integer' },
        },
        required: ['city', 'country', 'population'],
        additionalProperties: false,
      },
    },
    validate: validateCityCard,
  },
  anyJson: {
    key: 'anyJson',
    label: '仅合法 JSON（json_object）',
    schemaNote: '不限定字段——任何合法 JSON 对象都接受，字段校验交给应用层',
    format: { type: 'json_object' },
    validate: () => null,
  },
};

/** text-generation pipeline 的最小形态：对话消息 + 生成参数，返回 [{ generated_text }] */
type GenerateFn = (
  messages: Array<{ role: string; content: string }>,
  options: Record<string, unknown>,
) => Promise<Array<{ generated_text: unknown }>>;

/** pipeline 实例可调用，且带 .tokenizer 供约束处理器读取词表 */
type GeneratorFn = GenerateFn & { tokenizer: unknown };

/** readout 的「校验」两行读数（画布与 readout 共用同源判断结果） */
export function describeValidation(snapshot: JsonSnapshot): Array<[string, string]> {
  const parseable =
    snapshot.parseable === null ? '—' : snapshot.parseable ? '是' : '否';
  const schemaOk =
    snapshot.schemaOk === null ? '—（无 schema）' : snapshot.schemaOk ? '是' : '否';
  return [
    ['JSON 可解析', parseable],
    ['Schema 校验', schemaOk],
  ];
}

export function createJsonConstraint(
  canvas: HTMLCanvasElement,
  emit: (snapshot: JsonSnapshot) => void,
): JsonInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: JsonArgs = {
    preset: 'feedback',
    prompt: 'Classify this feedback: The product is way too expensive.',
  };
  let status: JsonStatus = 'loading';
  let message = '首次运行：正在从 CDN 加载库与模型…';
  let downloadProgress = 0;
  let lastPercent = -1;
  let output: string | null = null;
  let parseable: boolean | null = null;
  let schemaOk: boolean | null = null;
  let seconds: string | null = null;
  let generator: GeneratorFn | null = null;
  let StructuredOutputProcessor: ProcessorConstructor | null = null;
  const processors = new Map<string, ProcessorInstance>();
  let loading = false;
  let running = false;
  let disposed = false;
  let runToken = 0;
  let rerunTimer: number | null = null;
  let staleArgs = false;

  function snapshot(): JsonSnapshot {
    return {
      status,
      message,
      preset: current.preset,
      prompt: current.prompt,
      output,
      parseable,
      schemaOk,
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
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const contentWidth = width - 96;
    const preset = PRESETS[current.preset] ?? PRESETS.feedback;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('结构化输出：每步只允许合法 token', 48, 46);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`预设：${preset.label}`, 48, 74);
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    wrapText(`约束：${preset.schemaNote}`, contentWidth).forEach((line, index) => {
      drawingContext.fillText(line, 48, 96 + index * 18);
    });
    drawingContext.fillText(`输入：${truncate(current.prompt, contentWidth)}`, 48, 132);

    const bodyTop = 156;
    if (status === 'loading') {
      // 首次运行的主要等待就是这段下载；不传 progress_callback 时它是完全静默的
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, bodyTop, contentWidth, 16);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        bodyTop,
        (contentWidth * Math.min(100, downloadProgress)) / 100,
        16,
      );
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, bodyTop + 40 + index * 20);
      });
      return;
    }

    if (status === 'error') {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(message, contentWidth).forEach((line, index) => {
        drawingContext.fillText(line, 48, bodyTop + 12 + index * 20);
      });
      return;
    }

    // ready / generating：画约束生成的 JSON 文本
    if (output === null) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(message, 48, bodyTop + 20);
      return;
    }

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('输出：', 48, bodyTop + 8);

    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    const maxLines = Math.max(1, Math.floor((height - bodyTop - 60) / 20));
    const lines = wrapText(output, contentWidth);
    const shown =
      lines.length > maxLines
        ? lines.slice(0, maxLines).map((line, index) =>
            index === maxLines - 1 ? `${line} …` : line,
          )
        : lines;
    shown.forEach((line, index) => {
      drawingContext.fillText(line, 48, bodyTop + 32 + index * 20);
    });
  }

  async function load() {
    if (generator || loading || disposed) {
      return;
    }
    loading = true;
    try {
      const startedAt = performance.now();
      // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
      const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
      const { pipeline } = mod as {
        pipeline: (
          task: string,
          model: string,
          options: Record<string, unknown>,
        ) => Promise<GenerateFn & { tokenizer: unknown }>;
      };

      // 约束包的裸模块引用改写后以 blob 导入（原因见 PROCESSOR_CDN 处注释）
      const raw = await (await fetch(PROCESSOR_CDN)).text();
      const patched = raw.replace(
        /from\s*["']@huggingface\/transformers["']/,
        `from "${TRANSFORMERS_CDN}"`,
      );
      const blobUrl = URL.createObjectURL(
        new Blob([patched], { type: 'text/javascript' }),
      );
      const processorMod = (await import(/* @vite-ignore */ blobUrl)) as {
        StructuredOutputProcessor: ProcessorConstructor;
      };
      StructuredOutputProcessor = processorMod.StructuredOutputProcessor;

      // 实例只创建一次；dtype/device 不传，浏览器 WASM 下默认即 q8 档位
      const pipe = (await pipeline('text-generation', MODEL_ID, {
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
      })) as GenerateFn & { tokenizer: unknown };
      if (disposed) {
        return;
      }

      // 预热词表结构：首个 processor 构造本要付数百毫秒，加载期一次付清
      StructuredOutputProcessor.warmup(pipe.tokenizer);

      generator = pipe as GeneratorFn;
      status = 'ready';
      message = `模型就绪，用时 ${((performance.now() - startedAt) / 1000).toFixed(1)} 秒；刷新页面将命中浏览器缓存`;
      draw();
      void run();
    } catch (error) {
      if (disposed) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；恢复网络后调整任一参数即可重试。`;
      draw();
    } finally {
      loading = false;
    }
  }

  async function run() {
    if (!generator || !StructuredOutputProcessor || running || disposed) {
      return;
    }
    const runId = ++runToken;
    const runArgs = { ...current };
    if (rerunTimer !== null) {
      window.clearTimeout(rerunTimer);
      rerunTimer = null;
      staleArgs = true;
    }
    running = true;
    status = 'generating';
    message = '生成中…';
    draw();
    const startedAt = performance.now();
    try {
      const preset = PRESETS[runArgs.preset] ?? PRESETS.feedback;
      // 每种约束一个 processor 实例（生成期间它持有约束状态机）；按预设缓存复用
      let processor = processors.get(preset.key);
      if (!processor) {
        processor = new StructuredOutputProcessor(generator.tokenizer, preset.format);
        processors.set(preset.key, processor);
      }

      // logits_processor 与 do_sample / max_new_tokens 并列，随调用透传给
      // model.generate()，在生成参数改写 logits 之后执行——掩码是最后一道闸
      const result = await generator([{ role: 'user', content: runArgs.prompt }], {
        max_new_tokens: MAX_NEW_TOKENS,
        do_sample: false,
        logits_processor: [processor],
      });
      const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
      if (disposed || runId !== runToken) {
        return;
      }
      const generated = result[0]?.generated_text;
      let text = '';
      if (typeof generated === 'string') {
        text = generated;
      } else if (Array.isArray(generated)) {
        const last = generated.at(-1) as { content?: unknown } | undefined;
        text = typeof last?.content === 'string' ? last.content : '';
      }
      output = text;

      // 可观察证据：先 JSON.parse，再跑预设校验器（仅覆盖本课示例的固定 schema；
      // 生产请用真正的 JSON Schema 校验器，如 Ajv）
      try {
        const parsed: unknown = JSON.parse(text);
        parseable = true;
        schemaOk = preset.validate(parsed);
      } catch {
        parseable = false;
        schemaOk = false;
      }

      seconds = elapsed;
      status = 'ready';
      message = `生成完成（用时 ${elapsed} 秒）；调整预设或提示词会自动重新生成`;
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
      if (!disposed && staleArgs) {
        staleArgs = false;
        rerunTimer = window.setTimeout(() => {
          rerunTimer = null;
          void run();
        }, 50);
      }
    }
  }

  function argsChanged(next: JsonArgs): boolean {
    return next.preset !== current.preset || next.prompt !== current.prompt;
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
    update(args) {
      const changed = argsChanged(args);
      current = { ...current, ...args };
      if (disposed) {
        return;
      }
      draw(); // 约束回显立即更新
      if (!changed) {
        return;
      }
      if (!generator) {
        // 模型未就绪或加载失败：记下参数；加载完成后会按最新参数跑首次生成
        if (status === 'error' && !loading) {
          void load();
        }
        return;
      }
      if (running) {
        // 生成进行中：只标记待补跑，本轮结束后按最新参数执行
        staleArgs = true;
        return;
      }
      // 连续调整合并为一次生成（去抖）
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
      generator = null;
      processors.clear();
    },
  };
}
