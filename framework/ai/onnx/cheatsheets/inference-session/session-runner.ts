/**
 * 本课共享层：两个内嵌实例复用同一个会话，并把所有推理调用收进一条 promise 队列。
 * 前置状态：浏览器需能访问模型文件与 ort wasm 的 CDN；模型不进仓库，运行时拉取。
 * 为什么需要队列：默认入口的 ort wasm 运行时同一时刻只允许一个 run 在飞，并发调用
 * 会直接报错（见 run-concurrency.ts 的实测演示）；队列让所有调用按发起顺序串行执行。
 * 阅读主线：loadSession（配置 env → create → 缓存）→ runQueued（promise 链串行）。
 */
import { env, InferenceSession } from 'onnxruntime-web';

/**
 * ONNX Model Zoo 的 MNIST 模型（约 26KB）。
 * 模型文件走 Git LFS：浏览器 fetch 要用 GitHub 的 media 端点（响应带 CORS 头），
 * raw.githubusercontent.com 只返回 LFS 指针文本。
 */
export const MODEL_URL =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN。 */
export const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

let sessionPromise: Promise<InferenceSession> | undefined;

/**
 * 创建并缓存会话。env 的 wasm 标志必须在第一个会话创建之前设置；create 是重操作
 * （下载、解析、初始化后端都发生在这一步），只做一次，后续所有 run 复用同一个会话。
 */
export function loadSession(): Promise<InferenceSession> {
  if (!sessionPromise) {
    env.wasm.wasmPaths = WASM_CDN;
    // 工作区没有 COOP/COEP 响应头（跨域隔离），保持单线程基线。
    env.wasm.numThreads = 1;
    sessionPromise = InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
    }).catch((error: unknown) => {
      // 失败后清空缓存，让下一次交互可以重新创建会话。
      sessionPromise = undefined;
      throw error;
    });
  }
  return sessionPromise;
}

let tail: Promise<unknown> = Promise.resolve();

/**
 * 把推理调用串成 promise 链：task 只有在前一个调用结束后才会开始。
 * 失败不会阻断队列（tail 吞掉本次失败），后续调用照常执行。
 */
export function runQueued<T>(task: () => Promise<T>): Promise<T> {
  const result = tail.then(task);
  tail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
