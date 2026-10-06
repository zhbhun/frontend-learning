/**
 * 范例（Web Worker 线程侧）：库与模型的加载、推理全部发生在本文件所在的
 * worker 线程，主线程只见消息、不承担阻塞。
 *
 * - 前置状态：首次运行需从 Hub 下载 q8 模型（约 68 MB）；v4 中 worker 属于
 *   web 环境，env 默认值与主线程一致，且与页面共用同源浏览器缓存。
 * - 输入：主线程发来的消息——{ type: 'load' } 开始加载；
 *   { type: 'classify', id, text } 请求推理。
 * - 主要操作：动态 import CDN 构建 → pipeline()（把 progress_callback 的
 *   progress_total 聚合事件转发为 progress 消息）→ 推理 → 回传结果消息。
 * - 预期结果：主线程收到 ready / result / error 消息；推理期间主线程帧率不受影响。
 * - 阅读主线：runLoad（worker 内加载）→ classify（推理）→ 消息监听（协议入口）。
 */

// 免构建场景在 worker 内动态 import 官方 CDN 构建（与主线程兄弟课同款）；
// npm + 打包项目请改回静态 import：import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 与 first-pipeline / model-inference 课同一份模型：命中同源浏览器缓存，不必重复下载
const MODEL_ID = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

/* worker 全局对象 self 的最小类型（标准 lib 把 self 写成 window，这里收窄成线程作用域） */
interface WorkerScope {
  postMessage(message: WorkerToMain): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent) => void,
  ): void;
}
const scope = self as unknown as WorkerScope;

/* ---------- 消息协议：worker → 主线程 ---------- */

type WorkerToMain =
  | { type: 'progress'; progress: number }
  | { type: 'ready'; loadSeconds: number }
  | { type: 'result'; id: number; label: string; score: number; elapsedMs: number }
  | { type: 'error'; stage: 'load' | 'classify'; message: string };

/** pipeline 推理函数的最小形态：传一句话，Promise 返回 [{ label, score }] */
type SentimentPipe = (text: string) => Promise<unknown>;

let pipe: SentimentPipe | null = null;
let loading: Promise<void> | null = null;
let loadSeconds: number | null = null;
let lastPercent = -1;

/* ---------- 加载：库与模型在 worker 内各自执行一遍，不与主线程共享 ---------- */

function ensureLoaded(): Promise<void> {
  if (pipe) {
    return Promise.resolve();
  }
  // 幂等：加载进行中的重复 load 消息复用同一次加载
  loading ??= runLoad();
  return loading;
}

async function runLoad(): Promise<void> {
  try {
    const startedAt = performance.now();
    const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
    pipe = await mod.pipeline('sentiment-analysis', MODEL_ID, {
      progress_callback: (info: { status: string; progress?: number }) => {
        // 事件在 worker 线程触发，必须 postMessage 转发主线程才看得见。
        // 只转发 v4 的 progress_total 聚合事件：所有文件折成一个 0~100 的数，
        // 整数百分比没变化就不发，避免消息风暴。
        if (info.status === 'progress_total') {
          const percent = Math.round(info.progress ?? 0);
          if (percent !== lastPercent) {
            lastPercent = percent;
            scope.postMessage({ type: 'progress', progress: percent });
          }
        }
      },
    });
    loadSeconds = (performance.now() - startedAt) / 1000;
    scope.postMessage({ type: 'ready', loadSeconds: loadSeconds });
  } catch (error) {
    loading = null; // 失败后允许下次 load 消息重试
    const detail = error instanceof Error ? error.message : String(error);
    scope.postMessage({ type: 'error', stage: 'load', message: detail });
  }
}

/* ---------- 推理：结果带上请求 id 回传，供主线程配对 ---------- */

async function classify(id: number, text: string): Promise<void> {
  await ensureLoaded();
  if (!pipe) {
    return; // 加载失败已通过 error 消息回报
  }
  const startedAt = performance.now();
  try {
    const output = await pipe(text);
    const results = (Array.isArray(output) ? output : [output]) as Array<{
      label?: unknown;
      score?: unknown;
    }>;
    const best = results[0] ?? {};
    scope.postMessage({
      type: 'result',
      id,
      label: typeof best.label === 'string' ? best.label : '未知',
      score: typeof best.score === 'number' ? best.score : 0,
      elapsedMs: Math.round(performance.now() - startedAt),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    scope.postMessage({ type: 'error', stage: 'classify', message: detail });
  }
}

/* ---------- 协议入口：主线程的两类请求 ---------- */

scope.addEventListener('message', (event) => {
  const data = event.data as { type?: string; id?: number; text?: string };
  if (data.type === 'load') {
    void ensureLoaded();
  } else if (data.type === 'classify') {
    void classify(data.id ?? 0, data.text ?? '');
  }
});
