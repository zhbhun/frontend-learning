/**
 * 范例介绍：「算法对比」标本——Controls 选择算法组（排序 / 斐波那契）与数据规模，
 * 点「运行基准」后对同一份输入各跑一次慢实现与快实现，readout 显示 performance.now()
 * 实测耗时、倍数与结果校验。
 * 前置状态：无需环境；先打开 DevTools 的 Performance 面板（Capture settings 里的
 *   JavaScript samples 保持默认开启），再录制或剖析。
 * 主要操作：点「运行基准」；录制后在 Overview 圈选运行区间，读 Bottom-up / Call tree /
 *   Event log 三张表；或在 Console 用 profile('bench') → window.runCpuBenchmark() →
 *   profileEnd('bench') 精确圈定剖析区间。
 * 预期结果：Bottom-up 按 Self Time 排序的榜首是慢实现的函数名（bubbleSort / fibNaive），
 *   其 Self Time 与 readout 实测毫秒互相印证；Call tree 里能看到
 *   Event (click) → runBenchmark → 慢实现的责任链。
 * 阅读主线：慢实现故意保持最朴素的写法——bubbleSort 的热循环与 fibNaive 的自递归把
 *   时间都花在函数自身（Self Time 热点的教科书形态）；nativeSort 把工作交给 V8 内建，
 *   传入的比较器回调自己也会被采成帧；fibMemo 让每个 n 只算一次，Self Time 趋近于零。
 */

/** 演示页参数：算法组选择 + 两种数据规模（各自只在自己那组里生效）。 */
export type BenchmarkSuite = 'sort' | 'fib';

export interface BenchmarkOptions {
  suite: BenchmarkSuite;
  /** 排序对比的数组元素个数。 */
  sortSize: number;
  /** 斐波那契对比的 n。 */
  fibN: number;
}

export interface BenchmarkInstance {
  update(options: BenchmarkOptions): void;
  dispose(): void;
}

/** 一次基准运行的完整实测结果，readout 与 window.runCpuBenchmark() 都返回它。 */
export interface BenchmarkResult {
  suite: BenchmarkSuite;
  /** 数据规模说明，如「数组 20,000 个元素」。 */
  detail: string;
  slowLabel: string;
  slowMs: number;
  fastLabel: string;
  fastMs: number;
  /** 慢实现除以快实现的倍数。 */
  ratio: number;
  /** 两种实现的输出是否一致（证明比的是同一件事）。 */
  verified: boolean;
}

/** 算法组在界面上的中文标签。 */
export const SUITE_LABELS: Record<BenchmarkSuite, string> = {
  sort: '排序对比：bubbleSort vs 内置 sort',
  fib: '斐波那契对比：fibNaive vs fibMemo',
};

/* ---------- 基准实现：函数名保持直白，剖析器里看到的名字就是它们 ---------- */

/** 确定性伪随机（mulberry32）：同一种子生成同一数组，两次运行比的是同一份输入。 */
function randomArray(size: number, seed: number): number[] {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = new Array<number>(size);
  for (let i = 0; i < size; i += 1) {
    arr[i] = Math.floor(next() * size * 10);
  }
  return arr;
}

/**
 * 慢实现：冒泡排序。热循环就在函数自身——Self Time 几乎等于总耗时，
 * 这是采样剖析里最典型的热点形态。
 */
function bubbleSort(input: number[]): number[] {
  const arr = input.slice();
  for (let i = 0; i < arr.length - 1; i += 1) {
    for (let j = 0; j < arr.length - 1 - i; j += 1) {
      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}

/**
 * 快实现：内置 sort。排序本体在 V8 内建里；传入的 JS 比较器回调
 * 也会被采样剖析录成帧，在 Bottom-up 里能看到它。
 */
function nativeSort(input: number[]): number[] {
  return input.slice().sort((a, b) => a - b);
}

/**
 * 慢实现：朴素递归斐波那契。自递归让 Call tree 的栈深不见底，
 * 而 Bottom-up 把所有出现的 Self Time 聚合成一行——热点立现。
 */
function fibNaive(n: number): number {
  return n < 2 ? n : fibNaive(n - 1) + fibNaive(n - 2);
}

/** 快实现：记忆化。每个 n 只算一次，Self Time 趋近于零，正好做对照。 */
function fibMemo(n: number, cache: Map<number, number> = new Map()): number {
  if (n < 2) {
    return n;
  }
  const cached = cache.get(n);
  if (cached !== undefined) {
    return cached;
  }
  const value = fibMemo(n - 1, cache) + fibMemo(n - 2, cache);
  cache.set(n, value);
  return value;
}

/** 运行当前算法组：慢实现先跑，快实现后跑，各测一次。 */
function runBenchmark(options: BenchmarkOptions): BenchmarkResult {
  if (options.suite === 'fib') {
    const n = Math.round(options.fibN);
    const slowStart = performance.now();
    const naiveValue = fibNaive(n);
    const slowMs = performance.now() - slowStart;
    const fastStart = performance.now();
    const memoValue = fibMemo(n);
    const fastMs = performance.now() - fastStart;
    return {
      suite: 'fib',
      detail: `n = ${n}`,
      slowLabel: 'fibNaive（朴素递归）',
      slowMs,
      fastLabel: 'fibMemo（记忆化）',
      fastMs,
      ratio: slowMs / Math.max(fastMs, 0.005),
      verified: naiveValue === memoValue,
    };
  }

  const size = Math.round(options.sortSize);
  const source = randomArray(size, 20261003);
  const slowStart = performance.now();
  const bubbleResult = bubbleSort(source);
  const slowMs = performance.now() - slowStart;
  const fastStart = performance.now();
  const nativeResult = nativeSort(source);
  const fastMs = performance.now() - fastStart;

  let verified = bubbleResult.length === nativeResult.length;
  if (verified) {
    for (let i = 0; i < bubbleResult.length; i += 1) {
      if (bubbleResult[i] !== nativeResult[i]) {
        verified = false;
        break;
      }
    }
  }

  return {
    suite: 'sort',
    detail: `数组 ${size.toLocaleString()} 个元素`,
    slowLabel: 'bubbleSort（冒泡排序）',
    slowMs,
    fastLabel: 'nativeSort（内置 sort）',
    fastMs,
    ratio: slowMs / Math.max(fastMs, 0.005),
    verified,
  };
}

/* ---------- 标本外壳：提示、按钮与 readout ---------- */

const SPECIMEN_STYLES = `
.cpu-benchmark {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #e9eef4;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.cpu-benchmark__main {
  flex: 1 1 300px;
  min-width: 0;
}
.cpu-benchmark__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.cpu-benchmark__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.cpu-benchmark__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.cpu-benchmark__run {
  padding: 6px 14px;
  border: 1px solid #4f7cff;
  border-radius: 6px;
  background: #4f7cff;
  color: #fff;
  font: 600 13px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.cpu-benchmark__run:disabled {
  opacity: 0.55;
  cursor: default;
}
.cpu-benchmark__suite {
  font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.cpu-benchmark__readout {
  flex: 1 1 240px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-content: start;
  margin: 0;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.cpu-benchmark__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.cpu-benchmark__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

export function createBenchmarkSpecimen(
  root: HTMLElement,
): BenchmarkInstance {
  root.classList.add('cpu-benchmark');
  root.innerHTML = `
    <div class="cpu-benchmark__main">
      <p class="cpu-benchmark__hint">先按 <code>Command+Option+J</code>（macOS）或 <code>Control+Shift+J</code>（Windows、Linux）打开 DevTools 并切到 <b>Performance</b> 面板。点 <b>Record</b> 后再点下方按钮，<b>Stop</b> 后拖选运行区间、在 <b>Bottom-up</b> 表按 Self Time 排序找热点；或在 <b>Console</b> 里执行 <code>profile('bench')</code> → <code>runCpuBenchmark()</code> → <code>profileEnd('bench')</code> 精确圈定。运行期间页面冻结属正常现象——那正是被剖析的长任务。</p>
      <div class="cpu-benchmark__row">
        <button type="button" class="cpu-benchmark__run">运行基准</button>
        <code class="cpu-benchmark__suite"></code>
      </div>
    </div>
    <dl class="cpu-benchmark__readout">
      <dt>数据规模</dt><dd class="cpu-benchmark__cell-detail">—</dd>
      <dt class="cpu-benchmark__cell-slow-label">慢实现</dt><dd class="cpu-benchmark__cell-slow">—</dd>
      <dt class="cpu-benchmark__cell-fast-label">快实现</dt><dd class="cpu-benchmark__cell-fast">—</dd>
      <dt>慢 / 快</dt><dd class="cpu-benchmark__cell-ratio">—</dd>
      <dt>结果校验</dt><dd class="cpu-benchmark__cell-verified">—</dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const runButton = root.querySelector(
    '.cpu-benchmark__run',
  ) as HTMLButtonElement;
  const suiteLabel = root.querySelector(
    '.cpu-benchmark__suite',
  ) as HTMLElement;
  const cellDetail = root.querySelector(
    '.cpu-benchmark__cell-detail',
  ) as HTMLElement;
  const slowLabelEl = root.querySelector(
    '.cpu-benchmark__cell-slow-label',
  ) as HTMLElement;
  const slowEl = root.querySelector('.cpu-benchmark__cell-slow') as HTMLElement;
  const fastLabelEl = root.querySelector(
    '.cpu-benchmark__cell-fast-label',
  ) as HTMLElement;
  const fastEl = root.querySelector('.cpu-benchmark__cell-fast') as HTMLElement;
  const ratioEl = root.querySelector('.cpu-benchmark__cell-ratio') as HTMLElement;
  const verifiedEl = root.querySelector(
    '.cpu-benchmark__cell-verified',
  ) as HTMLElement;

  let current: BenchmarkOptions = { suite: 'sort', sortSize: 20000, fibN: 36 };
  let last: BenchmarkResult | undefined;

  function formatMs(ms: number): string {
    if (ms >= 100) {
      return `${Math.round(ms).toLocaleString()} ms`;
    }
    return `${ms.toFixed(ms < 1 ? 3 : 1)} ms`;
  }

  function suiteLabels(suite: BenchmarkSuite): [string, string] {
    return suite === 'fib'
      ? ['慢：fibNaive', '快：fibMemo']
      : ['慢：bubbleSort', '快：nativeSort'];
  }

  function paint() {
    /* 行标签跟随最近一次实测所属的算法组，避免与旧数值错位。 */
    const [slowText, fastText] = suiteLabels(last ? last.suite : current.suite);
    slowLabelEl.textContent = slowText;
    fastLabelEl.textContent = fastText;
    suiteLabel.textContent = SUITE_LABELS[current.suite];
    if (!last) {
      cellDetail.textContent = '—';
      slowEl.textContent = '—';
      fastEl.textContent = '—';
      ratioEl.textContent = '—';
      verifiedEl.textContent = '—';
      return;
    }
    cellDetail.textContent = last.detail;
    slowEl.textContent = formatMs(last.slowMs);
    fastEl.textContent = formatMs(last.fastMs);
    ratioEl.textContent = `≈ ${Math.max(1, Math.round(last.ratio)).toLocaleString()} 倍`;
    verifiedEl.textContent = last.verified ? '✓ 两种实现输出一致' : '✗ 输出不一致';
  }

  function run() {
    /*
     * 同步执行：点下去主线程立刻被占满——Call tree 里它挂在 Event (click)
     * 之下，正好演示根活动 → Function Call → runBenchmark → 热点函数的责任链。
     * 冻结持续到计算结束，那正是被剖析的长任务。
     */
    last = runBenchmark(current);
    paint();
  }

  runButton.addEventListener('click', run);
  paint();

  /*
   * 把基准入口挂到 window 上，供 Console 里的 profile() 工作流调用：
   * profile('bench'); runCpuBenchmark(); profileEnd('bench');
   */
  const benchmarkHost = window as unknown as {
    runCpuBenchmark?: () => BenchmarkResult;
  };
  benchmarkHost.runCpuBenchmark = () => runBenchmark(current);

  return {
    update(options) {
      current = options;
      paint();
    },
    dispose() {
      runButton.removeEventListener('click', run);
      delete benchmarkHost.runCpuBenchmark;
    },
  };
}
