/**
 * 范例核心：在全新 worker 里按档位注入一种故障，真实执行「取工件 → create → run →
 * 输出检查」链路，回传「断在哪个阶段 + 报错原文 + 控制台警告 + 实际拉取的工件 URL」。
 * 本文件的源码是该课主实例 Show code 展示的内容。
 *
 * 前置状态：浏览器需能访问 jsDelivr（onnxruntime-web@1.30.0）与 ONNX Model Zoo 的
 * media 端点（mnist-8 约 26KB、mnist-12-int8 约 11KB，运行时拉取，不进仓库）。
 * worker 是独立 JS 作用域：env 是 worker 内的单例，wasm 初始化失败粘滞不会毒化主线程；
 * 主线程每次尝试都派生全新 worker（见 fault-lab.ts），正是为了绕开粘滞、让故障可反复注入。
 *
 * 操作：主线程发来 { fault }；本文件按档位覆盖 wasmPaths / executionProviders / feeds /
 * fetches / 模型 URL 后走一遍真实链路。报错用 try/catch 原样捕获（同步 throw 与
 * Promise reject 都落进 catch），并临时包裹 console.warn 收集警告原文——EP 静默回退
 * 的唯一主动信号。
 *
 * 预期结果（报错关键字均核验自 1.30.0 dist 源码，现场以读数实际输出为准）：
 * - wasm-mjs-404 / wasm-wasm-404：create reject，原文含按前缀拼出的 .mjs URL 或 .wasm 拉取失败；
 * - ep-missing：create reject `no available backend found. ERR: [webgl] backend not found.`
 *   （后端解析在模型下载之前，耗时接近 0）；
 * - ep-fallback：console.warn 移除警告 + create / run 照常成功——「静默回退」的现场；
 * - feeds / fetches / shape 各档：run 抛对应的名字、形状类错误；
 * - int8-zero：create 与 run 全程零报错，但输出最大绝对值为 0——「不抛错的故障」。
 * 报错文案各浏览器措辞可能不同，一律原样回传，不做改写。
 *
 * 阅读主线：FAULT 标签与 runFault（十档故障的唯一定义处）→ InjectedFault（把报错
 * 和它发生的阶段绑在一起）→ captureWarnings → onmessage（请求/响应协议）。
 */
import { env, InferenceSession, Tensor } from 'onnxruntime-web';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN 前缀。 */
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/** 刻意指向不存在的目录，制造 404 失败现场。 */
const WASM_CDN_MISSING =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/missing-dist/';

const ZOO =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification';

/** 正确的 MNIST 模型（约 26KB）；int8 档换官方量化变体（约 11KB）。 */
const MODEL_URL = `${ZOO}/mnist/model/mnist-8.onnx`;
const INT8_MODEL_URL = `${ZOO}/mnist/model/mnist-12-int8.onnx`;

/** 故障注入的阶段：加载（工件）→ create（会话）→ run（推理）→ result（输出）。 */
export type StageId = 'load' | 'create' | 'run' | 'result';

/** 十档故障：每档对应一种真实报错或一种「不抛错的异常」。 */
export type FaultId =
  | 'wasm-mjs-404'
  | 'wasm-wasm-404'
  | 'ep-missing'
  | 'ep-fallback'
  | 'feeds-missing'
  | 'feeds-extra'
  | 'feeds-not-tensor'
  | 'fetches-invalid'
  | 'shape-rank'
  | 'int8-zero';

/** 结局三类：抛错中断 / 无报错但走了兜底 / 无报错但结果不对。 */
export type OutcomeKind = 'error' | 'fallback-ok' | 'wrong-result';

export interface AttemptResult {
  fault: FaultId;
  /** error 时为中断点；fallback-ok 指向 create（警告出处）；wrong-result 指向 result。 */
  stage: StageId;
  outcome: OutcomeKind;
  /** 捕获到的原始报错（Error.message 或 String(error)），无报错时为 null。 */
  errorText: string | null;
  /** 链路期间 ort 发出的 console.warn 原文（静默回退的唯一主动信号）。 */
  warnings: string[];
  durationMs: number;
  /** worker 资源记录里实际出现的 ort-wasm 工件 URL；未见记录时为 null。 */
  mjsUrl: string | null;
  wasmUrl: string | null;
  /** run 成功时的输出 dims；未跑到输出时为 null。 */
  outputDims: number[] | null;
  /** run 成功时输出的最大绝对值——「输出恒零」探针；未跑到时为 null。 */
  outputMaxAbs: number | null;
}

/** 合成数字「0」：黑底白字圆环，值域 [0,1]——MNIST 系模型的同分布输入。 */
function makeDigit(): Float32Array {
  const data = new Float32Array(28 * 28);
  for (let y = 0; y < 28; y += 1) {
    for (let x = 0; x < 28; x += 1) {
      if (Math.abs(Math.hypot(x - 13.5, y - 13.5) - 9) < 2.6) {
        data[y * 28 + x] = 1.0;
      }
    }
  }
  return data;
}

function maxAbsOf(data: Float32Array): number {
  let maxAbs = 0;
  for (const value of data) {
    maxAbs = Math.max(maxAbs, Math.abs(value));
  }
  return maxAbs;
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

/**
 * ort 表达「EP 不可用但已兜底」的方式是 console.warn，不是异常。这里临时包裹
 * console.warn 把警告原文收集起来，同时照常输出，不吞不改。
 */
async function captureWarnings<T>(
  task: () => Promise<T>,
): Promise<{ result: T; warnings: string[] }> {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((item) => String(item)).join(' '));
    original(...args);
  };
  try {
    return { result: await task(), warnings };
  } finally {
    console.warn = original;
  }
}

/** 把报错和它发生的阶段绑在一起，让主线程能画出中断点。 */
class InjectedFault extends Error {
  constructor(
    readonly stage: StageId,
    readonly raw: unknown,
  ) {
    super(raw instanceof Error ? raw.message : String(raw));
  }
}

/** 标记 stage 阶段的注入点：任务抛错（同步或异步）都算故障命中。 */
async function injected(stage: StageId, task: () => unknown): Promise<never> {
  try {
    await task();
  } catch (raw) {
    throw new InjectedFault(stage, raw);
  }
  // 走到这里说明故障没有命中：如实回传「链路意外成功」，不预设结论。
  throw new InjectedFault(stage, new Error('故障未命中：链路意外成功'));
}

/** 无注入的基线会话：mnist-8 + wasm 后端。 */
function standardSession(): Promise<InferenceSession> {
  return InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] });
}

/** 按会话签名组 feeds 并跑一次，返回第一个输出张量。 */
async function runBaseline(session: InferenceSession, data: Float32Array): Promise<Tensor> {
  const feeds: InferenceSession.FeedsType = {
    [session.inputNames[0]]: new Tensor('float32', data, [1, 1, 28, 28]),
  };
  const outputs = await session.run(feeds);
  return outputs[session.outputNames[0]];
}

type FaultOutcome =
  | { outcome: 'error'; stage: StageId; errorText: string }
  | { outcome: 'fallback-ok' }
  | { outcome: 'wrong-result'; outputMaxAbs: number; outputDims: number[] };

/** 十档故障的唯一定义处：每档覆盖链路的一个输入面，再走一遍真实执行。 */
async function runFault(fault: FaultId): Promise<FaultOutcome> {
  // env 是 worker 内的单例；每次尝试都在全新 worker 里发生，设置不怕残留。
  env.wasm.numThreads = 1; // 本工作区页面无跨域隔离响应头，保持单线程
  env.wasm.wasmPaths = WASM_CDN; // 默认前缀，故障档位再覆盖

  switch (fault) {
    // ── 加载阶段：wasmPaths 指错，create 在取工件时 reject ──
    case 'wasm-mjs-404':
      env.wasm.wasmPaths = WASM_CDN_MISSING;
      return injected('load', () =>
        InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] }),
      );
    case 'wasm-wasm-404':
      env.wasm.wasmPaths = {
        mjs: `${WASM_CDN}ort-wasm-simd-threaded.jsep.mjs`,
        wasm: `${WASM_CDN_MISSING}ort-wasm-simd-threaded.jsep.wasm`,
      };
      return injected('load', () =>
        InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] }),
      );

    // ── 初始化阶段：工件正常，后端解析失败 / 静默回退 ──
    case 'ep-missing':
      // 默认入口没有注册 webgl：后端解析在模型下载之前完成，失败耗时接近 0。
      return injected('create', () =>
        InferenceSession.create(MODEL_URL, { executionProviders: ['webgl'] }),
      );
    case 'ep-fallback': {
      // 有兜底时 ort 只发 console.warn：会话照建，真实跑一次证明兜底可用。
      const session = await InferenceSession.create(MODEL_URL, {
        executionProviders: ['webnn', 'wasm'],
      });
      await runBaseline(session, makeDigit());
      return { outcome: 'fallback-ok' };
    }

    // ── run 阶段：签名与类型校验抛错 ──
    case 'feeds-missing': {
      const session = await standardSession();
      return injected('run', () => session.run({}));
    }
    case 'feeds-extra': {
      const session = await standardSession();
      return injected('run', async () => {
        const tensor = new Tensor('float32', makeDigit(), [1, 1, 28, 28]);
        return session.run({
          [session.inputNames[0]]: tensor,
          wrong: tensor, // 多余的键不会被静默忽略
        });
      });
    }
    case 'feeds-not-tensor': {
      const session = await standardSession();
      return injected('run', () =>
        session.run({
          [session.inputNames[0]]: [1, 2, 3], // 普通数组不是 Tensor
        } as unknown as InferenceSession.FeedsType),
      );
    }
    case 'fetches-invalid': {
      const session = await standardSession();
      return injected('run', () => {
        const feeds: InferenceSession.FeedsType = {
          [session.inputNames[0]]: new Tensor('float32', makeDigit(), [1, 1, 28, 28]),
        };
        return session.run(feeds, ['not_an_output']);
      });
    }
    case 'shape-rank': {
      const session = await standardSession();
      return injected('run', () => {
        // 展平成 [784]：元素个数没错，但与签名 [1,1,28,28] 的秩不符。
        const flat = new Tensor('float32', makeDigit(), [784]);
        return session.run({ [session.inputNames[0]]: flat });
      });
    }

    // ── 结果阶段：全程零报错，但输出不对——最难发现的一类 ──
    case 'int8-zero': {
      // Model Zoo 官方量化变体：加载成功、run 成功，输出恒为全零（量化课的实测反例）。
      const session = await InferenceSession.create(INT8_MODEL_URL, {
        executionProviders: ['wasm'],
      });
      const output = await runBaseline(session, makeDigit());
      const data = output.data as Float32Array;
      return {
        outcome: 'wrong-result',
        outputMaxAbs: maxAbsOf(data),
        outputDims: [...output.dims],
      };
    }
  }
}

async function runAttempt(fault: FaultId): Promise<AttemptResult> {
  const start = performance.now();
  const { result, warnings } = await captureWarnings(() => runFault(fault));
  const error =
    result.outcome === 'error'
      ? { stage: result.stage, errorText: result.errorText }
      : null;
  return {
    fault,
    // error 时是中断点；fallback-ok 的信号在 create 的警告里；wrong-result 的信号在输出。
    stage: result.outcome === 'error' ? result.stage : result.outcome === 'wrong-result' ? 'result' : 'create',
    outcome: result.outcome,
    errorText: error?.errorText ?? null,
    warnings,
    durationMs: performance.now() - start,
    ...findArtifactUrls(),
    outputDims: result.outcome === 'wrong-result' ? result.outputDims : null,
    outputMaxAbs: result.outcome === 'wrong-result' ? result.outputMaxAbs : null,
  };
}

interface FaultRequest {
  fault: FaultId;
}

// worker 作用域没有 DOM 类型，这里收窄出本文件实际用到的两个方法。
const workerScope = self as unknown as {
  postMessage(message: AttemptResult): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<FaultRequest>) => void,
  ): void;
};

workerScope.addEventListener('message', (event) => {
  void runAttempt(event.data.fault).then((result) => {
    workerScope.postMessage(result);
  });
});
