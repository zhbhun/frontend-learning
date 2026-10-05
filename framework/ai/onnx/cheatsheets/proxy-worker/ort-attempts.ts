/**
 * 范例核心：在相同输入、相同模型（mnist-8）、相同后端（wasm 单线程）条件下，
 * 用三种线程形态各跑一轮连续推理，回传真实计时与模型输出。
 * 本文件的源码即该课主实例 Show code 展示的内容；三档共用的推理核心在
 * inference-shared.ts（runSessionBurst），worker 档的宿主端在 inference-attempt.worker.ts。
 *
 * 三档线程形态：
 * - main（主线程直跑）：session.run 在主线程同步执行——run 之间的衔接发生在微任务里，
 *   不把事件循环让给渲染，N 次连跑≈一个 N 倍时长的长任务，动画帧被整段吞掉（问题现场）。
 * - proxy（ort proxy）：env.wasm.proxy = true，首次 create 时 ort 自行创建
 *   ort-wasm-proxy-worker 并把整个 wasm 运行时搬进去，主线程只收发消息。
 * - own-worker（自建 worker）：应用自己派生 worker 宿主会话，协议与生命周期由应用掌控，
 *   与 proxy 是同一思想的两种落地。
 *
 * 前置状态：浏览器需能访问 jsDelivr（onnxruntime-web@1.30.0）与 MNIST 模型
 * （约 26KB，运行时拉取，不进仓库）。无跨域隔离头，三档都显式 numThreads=1 单线程。
 *
 * 演示专用技巧：env 是页面级单例、wasm 初始化粘滞到刷新，同一个 JS 环境里无法在
 * 「主线程直跑」与「proxy」之间切换。每次尝试用查询参数从 CDN 取一份全新的 ort 模块
 * （main / proxy 档），自建 worker 档每次派生全新 worker（worker 有独立的模块与 env）。
 * 真实应用不需要这些——直接 import 包，在第一个会话创建前设置 env.wasm.proxy 即可。
 *
 * 阅读主线：runInferenceAttempt（按档分发）→ runWithMainThreadOrt（取新模块 → 设 env →
 * 推理）→ runInOwnWorker（spawn + 消息协议 + 过期结果丢弃）。
 */
import { WASM_CDN, runSessionBurst, type AttemptOutcome } from './inference-shared';

/** 纯 wasm 入口（约 50KB）：内嵌的工件名是 ort-wasm-simd-threaded.mjs/.wasm（纯 CPU 对）。 */
const ORT_ENTRY_URL = `${WASM_CDN}ort.wasm.min.mjs`;

/** 三档线程形态。 */
export type ProbeMode = 'main' | 'proxy' | 'own-worker';

type OrtModule = typeof import('onnxruntime-web/wasm');

let attemptSeq = 0;

async function runWithMainThreadOrt(mode: 'main' | 'proxy', runs: number): Promise<AttemptOutcome> {
  try {
    // 查询参数让每次尝试拿到全新的模块实例——全新的 env、未初始化的 wasm 后端，
    // 两档才能反复切换（见文件头「演示专用技巧」）。
    attemptSeq += 1;
    const ort: OrtModule = await import(/* @vite-ignore */ `${ORT_ENTRY_URL}?attempt=${attemptSeq}`);
    ort.env.wasm.numThreads = 1; // 本工作区无跨域隔离头，固定单线程
    ort.env.wasm.wasmPaths = WASM_CDN; // 工件与 JS 同版本（1.30.0）
    if (mode === 'proxy') {
      // 必须在第一个会话创建之前设置：首次初始化定档，之后翻转不可靠。
      ort.env.wasm.proxy = true;
    }
    const burst = await runSessionBurst(ort, runs);
    return { ok: true, errorText: null, ...burst };
  } catch (error) {
    return {
      ok: false,
      errorText: error instanceof Error ? error.message : String(error),
      createMs: 0,
      runMs: [],
      digit: null,
      confidence: null,
    };
  }
}

let ownWorker: Worker | null = null;
let ownWorkerSeq = 0;

function runInOwnWorker(runs: number): Promise<AttemptOutcome> {
  // 换档时终止旧 worker：worker 内的模块、env 与 wasm 后端随之销毁，下次派生即是全新环境。
  ownWorker?.terminate();
  ownWorkerSeq += 1;
  const seq = ownWorkerSeq;
  const worker = new Worker(new URL('./inference-attempt.worker.ts', import.meta.url), {
    type: 'module',
  });
  ownWorker = worker;
  return new Promise<AttemptOutcome>((resolve) => {
    worker.onmessage = (event: MessageEvent<AttemptOutcome>) => {
      if (seq !== ownWorkerSeq || worker !== ownWorker) {
        return; // 丢弃已被取代的旧尝试的结果
      }
      resolve(event.data);
    };
    worker.onerror = (event: ErrorEvent) => {
      if (seq !== ownWorkerSeq) {
        return;
      }
      resolve({
        ok: false,
        errorText: event.message || 'worker 加载失败',
        createMs: 0,
        runMs: [],
        digit: null,
        confidence: null,
      });
    };
    worker.postMessage({ runs });
  });
}

/** 一轮尝试入口：按档分发。取消语义由「序号比对 + 终止旧 worker」实现。 */
export function runInferenceAttempt(mode: ProbeMode, runs: number): Promise<AttemptOutcome> {
  if (mode === 'own-worker') {
    return runInOwnWorker(runs);
  }
  return runWithMainThreadOrt(mode, runs);
}

/** 实例销毁时终止在跑的自建 worker，不留长驻任务。 */
export function disposeOwnWorker(): void {
  ownWorkerSeq += 1;
  ownWorker?.terminate();
  ownWorker = null;
}
