/**
 * 范例核心：在独立 worker 里用五种 wasmPaths 配置真实执行 InferenceSession.create，
 * 回传「实际拉取的工件 URL + 报错原文」。本文件的源码即该课主实例 Show code 展示的内容。
 *
 * 前置状态：浏览器需能访问 jsDelivr 上的 onnxruntime-web@1.30.0 与 MNIST 模型
 * （约 26KB，运行时拉取，不进仓库）。worker 是独立 JS 作用域，env 是 worker 内的单例；
 * 主线程每次尝试都派生全新 worker（见 path-attempt.ts），正是为了绕开「页面 wasm 后端
 * 只能初始化一次、失败粘滞到刷新」的限制，让正确与错误档位都能反复运行，
 * 也不会毒化本页其他课程的推理实例。
 *
 * 操作：主线程发来 { branch }；本文件按档位设置 env.wasm.wasmPaths（none 档刻意不设）
 * 后创建会话，从 worker 自己的 performance 资源记录提取实际请求的 ort-wasm 工件 URL。
 *
 * 预期结果：
 * - cdn / object（配置正确）：create 成功；资源记录里出现同一前缀下的
 *   ort-wasm-simd-threaded.jsep.mjs 与 .wasm——前缀 + 入口内嵌文件名；
 * - none（不设置）：bundle 用内嵌加载器（无需网络取 .mjs），.wasm 按模块自身 URL
 *   推断同目录——打包器产物旁边没有工件，中断在第②阶段；
 * - bad-prefix（前缀不存在）：动态 import .mjs 失败，报错原文包含按前缀拼出的完整 URL；
 * - bad-wasm（.mjs 正确、.wasm 404）：加载器能取到，.wasm 拉取/编译失败。
 * 报错文案各浏览器措辞不同，一律原样回传，不做改写。
 *
 * 阅读主线：BRANCH_PATHS（五档配置的唯一定义处）→ runAttempt（设 env → create →
 * 汇总资源记录与报错）→ onmessage（请求/响应协议）。
 */
import { env, InferenceSession } from 'onnxruntime-web';

/** ONNX Model Zoo 的 MNIST 模型（约 26KB），走 Git LFS 的 media 端点。 */
const MODEL_URL =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN 前缀。 */
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/** 刻意指向不存在的目录，制造 404 失败现场。 */
const WASM_CDN_MISSING =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/missing-dist/';

/** 与 onnxruntime-common 的 WasmPrefixOrFilePaths 同构，避免为类型引入第二个包。 */
type WasmPathsConfig = string | { mjs?: string; wasm?: string };

export type BranchId = 'none' | 'cdn' | 'object' | 'bad-prefix' | 'bad-wasm';

/**
 * 五档 wasmPaths 配置——本课的唯一定义处。默认入口（bundle 构建）内嵌的工件文件名是
 * ort-wasm-simd-threaded.jsep.*，因此无论怎么配，请求的都应该是这一对。
 */
const BRANCH_PATHS: Record<BranchId, { wasmPaths: WasmPathsConfig | undefined }> = {
  // 不设置：.mjs 用 bundle 内嵌副本，.wasm 按模块自身 URL 推断同目录（打包器下不可靠）。
  none: { wasmPaths: undefined },
  // 字符串前缀：.mjs 动态 import 与 .wasm 拉取都落在「前缀 + 内嵌文件名」。
  cdn: { wasmPaths: WASM_CDN },
  // 对象形式：两个文件分别给完整 URL（URL 对象也可以，ort 会取 .href）。
  object: {
    wasmPaths: {
      mjs: `${WASM_CDN}ort-wasm-simd-threaded.jsep.mjs`,
      wasm: `${WASM_CDN}ort-wasm-simd-threaded.jsep.wasm`,
    },
  },
  // 前缀不存在：拼出的 .mjs URL 404，动态 import 直接失败。
  'bad-prefix': { wasmPaths: WASM_CDN_MISSING },
  // 只错 .wasm：加载器取得到，.wasm 拉取/编译失败——与 bad-prefix 是两种失败面。
  'bad-wasm': {
    wasmPaths: {
      mjs: `${WASM_CDN}ort-wasm-simd-threaded.jsep.mjs`,
      wasm: `${WASM_CDN_MISSING}ort-wasm-simd-threaded.jsep.wasm`,
    },
  },
};

export interface AttemptResult {
  ok: boolean;
  /** 捕获到的原始报错（Error.message 或 String(error)），成功时为 null。 */
  errorText: string | null;
  durationMs: number;
  /** worker 资源记录里实际出现的 .mjs / .wasm 完整 URL；未见记录时为 null。 */
  mjsUrl: string | null;
  wasmUrl: string | null;
}

/** 从本 worker 的 performance 资源记录里提取实际请求过的 ort-wasm 工件 URL。 */
function findArtifactUrls(): { mjsUrl: string | null; wasmUrl: string | null } {
  let mjsUrl: string | null = null;
  let wasmUrl: string | null = null;
  for (const entry of performance.getEntriesByType('resource')) {
    if (mjsUrl === null && /ort-wasm-[a-z.-]+\.mjs$/.test(entry.name)) {
      mjsUrl = entry.name;
    }
    if (wasmUrl === null && /ort-wasm-[a-z.-]+\.wasm$/.test(entry.name)) {
      wasmUrl = entry.name;
    }
  }
  return { mjsUrl, wasmUrl };
}

async function runAttempt(branch: BranchId): Promise<AttemptResult> {
  const start = performance.now();
  // 本实验只关心路径：固定单线程，避免嵌套 worker 分散主题（多线程见 3.1.2）。
  env.wasm.numThreads = 1;
  const paths = BRANCH_PATHS[branch].wasmPaths;
  if (paths !== undefined) {
    env.wasm.wasmPaths = paths;
  }
  try {
    await InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
    });
    return {
      ok: true,
      errorText: null,
      durationMs: performance.now() - start,
      ...findArtifactUrls(),
    };
  } catch (error) {
    return {
      ok: false,
      errorText: error instanceof Error ? error.message : String(error),
      durationMs: performance.now() - start,
      ...findArtifactUrls(),
    };
  }
}

interface AttemptRequest {
  branch: BranchId;
}

// worker 作用域没有 DOM 类型，这里收窄出本文件实际用到的两个方法。
const workerScope = self as unknown as {
  postMessage(message: AttemptResult & { branch: BranchId }): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<AttemptRequest>) => void,
  ): void;
};

workerScope.addEventListener('message', (event) => {
  void runAttempt(event.data.branch).then((result) => {
    workerScope.postMessage({ ...result, branch: event.data.branch });
  });
});
