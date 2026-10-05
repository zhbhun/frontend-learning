/**
 * 范例核心（自建 worker 档）：应用自己的 worker 宿主会话与 run。
 * 每次 spawn 都是全新的 JS 环境——模块、env、wasm 后端都是独立的，无需任何隔离技巧
 * 即可反复重跑。与 ort proxy 的差别只在「谁拥有这个 worker」：消息协议、张量传输与
 * 生命周期由应用自己定义。推理核心与主线程档共用 runSessionBurst（inference-shared.ts）。
 *
 * 前置状态：需能访问 jsDelivr（wasmPaths 指向 onnxruntime-web@1.30.0）与 MNIST 模型。
 * 操作：主线程发来 { runs }；一轮推理完成后回传 AttemptOutcome。
 */
import * as ort from 'onnxruntime-web/wasm';

import { WASM_CDN, runSessionBurst, type AttemptOutcome } from './inference-shared';

interface WorkerRequest {
  runs: number;
}

// worker 作用域没有 DOM 类型，这里收窄出本文件实际用到的两个方法。
const workerScope = self as unknown as {
  postMessage(message: AttemptOutcome): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<WorkerRequest>) => void,
  ): void;
};

async function runAll(runs: number): Promise<AttemptOutcome> {
  try {
    ort.env.wasm.numThreads = 1; // 本工作区无跨域隔离头，固定单线程
    ort.env.wasm.wasmPaths = WASM_CDN; // 工件与 JS 同版本（1.30.0）
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

workerScope.addEventListener('message', (event) => {
  void runAll(event.data.runs).then((outcome) => {
    workerScope.postMessage(outcome);
  });
});
