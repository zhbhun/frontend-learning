/**
 * 范例核心：在独立 worker 里读取隔离状态、按设置值走一次真实 create，
 * 回传「归一化后的 numThreads + 捕获到的回落警告」。本文件的源码即该课
 * 主实例 Show code 展示的内容。
 *
 * 前置状态：本 Storybook 工作区的页面没有 COOP/COEP 响应头
 * （crossOriginIsolated === false），是「未隔离分支」的现场；已隔离分支
 * 无法在 Storybook 里伪造，课程正文用明确标注的概念示意呈现。
 * env 是 worker 内的单例、wasm 后端初始化粘滞，主线程每次尝试都派生
 * 全新 worker（见 isolation-probe.ts）：auto / 1 / 4 三档才能各自观察到
 * 「首次初始化」的归一化结果，也不会毒化本页其他课程的推理实例。
 *
 * 操作：主线程发来 { setting }；本文件先读 worker 作用域的隔离状态
 * （worker 继承创建它的文档的隔离状态），再按档位设置 env.wasm.numThreads
 * （auto 档刻意不设），临时包装 console.warn 捕获回落警告，然后对 MNIST
 * 模型执行真实 create 并回读 env.wasm.numThreads。
 *
 * 预期结果（未隔离页面）：三档归一化结果都是 1——auto 档静默归一、
 * 1 档无警告、4 档连发两条警告（设置未生效 + 多线程不支持）。
 * 已隔离页面：auto 档将得到 min(4, ⌈硬件线程数÷2⌉)，1 档保持 1，
 * 4 档按设置生效——该分支本页无法演示，读数变化就是隔离生效的判据。
 *
 * 阅读主线：readIsolation()（worker 也继承页面隔离状态）→ runProbe()
 * （设值 → 捕获警告 → create → 回读）→ onmessage（请求/响应协议）。
 */
import { env, InferenceSession } from 'onnxruntime-web';

/** ONNX Model Zoo 的 MNIST 模型（约 26KB），走 Git LFS 的 media 端点。 */
const MODEL_URL =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN 前缀。 */
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/** numThreads 设置值：auto 表示刻意不设，交给 ort 的「系统决定」分支。 */
export type ThreadsSetting = 'auto' | 'one' | 'four';

export interface ProbeRequest {
  setting: ThreadsSetting;
}

export interface ProbeResult {
  setting: ThreadsSetting;
  ok: boolean;
  /** 捕获到的原始报错（Error.message 或 String(error)），成功时为 null。 */
  errorText: string | null;
  durationMs: number;
  /** worker 作用域的隔离读数：worker 继承页面的隔离状态。 */
  isolated: boolean;
  hasIsolationApi: boolean;
  sabType: string;
  cores: number;
  /** 设置后的 env.wasm.numThreads（创建前）；auto 档为 undefined。 */
  threadsBefore: number | undefined;
  /** create 之后的 env.wasm.numThreads——ort 归一化的最终结果。 */
  threadsAfter: number | undefined;
  /** create 期间捕获的 console.warn 原文，未隔离 + 显式 >1 时出现两条。 */
  warnings: string[];
}

/** 读取 worker 作用域的隔离状态；worker 与创建它的页面共享同一判定结果。 */
function readIsolation() {
  const scope = self as unknown as {
    crossOriginIsolated?: boolean;
    SharedArrayBuffer?: unknown;
    navigator: { hardwareConcurrency?: number };
  };
  return {
    isolated: scope.crossOriginIsolated === true,
    hasIsolationApi: 'crossOriginIsolated' in scope,
    sabType: typeof scope.SharedArrayBuffer,
    cores: scope.navigator.hardwareConcurrency ?? 0,
  };
}

async function runProbe(setting: ThreadsSetting): Promise<ProbeResult> {
  const start = performance.now();
  const readings = readIsolation();

  // 伺服位置固定为 CDN（正确配置是「WASM 资源伺服」课程的主题，这里不留变量）。
  env.wasm.wasmPaths = WASM_CDN;

  // auto 档刻意不设，让 ort 走「系统决定」分支，观察静默归一化。
  if (setting !== 'auto') {
    env.wasm.numThreads = setting === 'one' ? 1 : 4;
  }
  const threadsBefore = env.wasm.numThreads;

  // 临时包装 console.warn：ort 的回落警告是「设置未生效」的第一手证据。
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((item) => String(item)).join(' '));
  };

  try {
    const session = await InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
    });
    await session.release();
    return {
      setting,
      ok: true,
      errorText: null,
      durationMs: performance.now() - start,
      ...readings,
      threadsBefore,
      threadsAfter: env.wasm.numThreads,
      warnings,
    };
  } catch (error) {
    return {
      setting,
      ok: false,
      errorText: error instanceof Error ? error.message : String(error),
      durationMs: performance.now() - start,
      ...readings,
      threadsBefore,
      threadsAfter: env.wasm.numThreads,
      warnings,
    };
  } finally {
    console.warn = originalWarn;
  }
}

// worker 作用域没有 DOM 类型，这里收窄出本文件实际用到的两个方法。
const workerScope = self as unknown as {
  postMessage(message: ProbeResult): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<ProbeRequest>) => void,
  ): void;
};

workerScope.addEventListener('message', (event) => {
  void runProbe(event.data.setting).then((result) => {
    workerScope.postMessage(result);
  });
});
