/**
 * 范例介绍：「泄漏对照」标本——同一个「收到一条消息」操作提供泄漏 / 修复两种实现。
 * 泄漏实现每次操作新增一个不再移除的事件监听器、新开一个不清的 interval、往缓存数组
 * 只进不出地推消息、并把被挤出 feed 的卡片留在数组里（从此 detached 但可达）；
 * 修复实现完成同样的功能，但监听器只注册一次、不开消息级 interval、缓存设上限、
 * 卡片移除后不留引用。
 * 前置状态：无需环境；在 Storybook 页面打开 DevTools（Command+Option+J / Control+Shift+J）
 *   切到 Memory 面板排查。本页状态挂在 window.leakSpecimen，Console 可核对。
 * 主要操作：泄漏模式点「执行一次操作」若干次 → 拍配对快照看 Comparison 的 # Delta；
 *   用 Allocation instrumentation on timeline 录制几次操作，看 MessageEnvelope 的蓝条与
 *   Retainers；用 Detached elements profile 确认游离卡片；切「修复模式」重复对照；
 *   点「清理已积累」修复已发生的泄漏。
 * 预期结果：泄漏模式 readout 四项计数随操作只涨不跌；修复模式监听器恒为 1（共享）、
 *   interval 恒为 0、缓存不超过 8、detached 恒为 0；「清理已积累」后各计数回落到基线。
 * 阅读主线：泄漏 = 该注销的资源没有注销——监听器、定时器、缓存、节点引用四张「登记表」
 *   只进不出；修复永远是给引用方补注销，而不是想办法删对象。
 */

/** 演示页参数：Controls 的两项输入。 */
export interface LeakOptions {
  /** 实现模式：leak 每次操作登记资源且不注销；fixed 完成同样功能但随手清理。 */
  mode: LeakMode;
  /** 每条消息携带的负载字符串条数，决定单条消息在快照里的大小贡献。点操作时生效。 */
  payloadSize: number;
}

export type LeakMode = 'leak' | 'fixed';

export interface LeakInstance {
  update(options: LeakOptions): void;
  dispose(): void;
}

/** 泄漏模式参数：修复模式缓存的上限、feed 可见卡片数、泄漏 interval 的轮询周期。 */
const CACHE_CAP = 8;
const FEED_VISIBLE = 3;
const TICK_MS = 4000;
/** 泄漏监听器注册的事件类型：页面内没有任何代码派发它——监听器纯粹「登记了没注销」。 */
const EVENT_TYPE = 'specimen:sync';

/* ---------- 被观察的对象：类名直白，快照 Class filter 里一眼可认 ---------- */

/**
 * 消息信封：缓存里的主角，快照按 MessageEnvelope 分组。body 是运行时拼接的定长
 * 字符串，快照里 (string) 组的同步上涨来自这里；ticks 只被泄漏 interval 原地自增，
 * 不产生新分配。
 */
class MessageEnvelope {
  readonly id: number;
  readonly body: string[];
  ticks = 0;

  constructor(id: number, payloadSize: number) {
    this.id = id;
    this.body = [];
    for (let i = 0; i < payloadSize; i += 1) {
      this.body.push(
        `msg-${String(id).padStart(4, '0')}-${String(i).padStart(3, '0')}`,
      );
    }
  }
}

/* ---------- 状态登记：挂在 window 上，让 Retainers / Console 有可读的链 ---------- */

/** 一条已注册监听器的记录：清理时按原目标、原类型、原引用反注册。 */
interface RegisteredListener {
  target: EventTarget;
  type: string;
  handler: EventListener;
}

interface SpecimenRegistry {
  listeners: RegisteredListener[];
  intervals: number[];
  cache: MessageEnvelope[];
  detachedNodes: HTMLElement[];
}

const registryHost = window as unknown as {
  leakSpecimen?: SpecimenRegistry;
};

/* ---------- 标本外壳：提示、按钮、feed 与 readout ---------- */

const SPECIMEN_STYLES = `
.ls-specimen {
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
.ls-specimen__main {
  flex: 1 1 300px;
  min-width: 0;
}
.ls-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.ls-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ls-specimen__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.ls-specimen__button {
  padding: 6px 14px;
  border: 1px solid #4f7cff;
  border-radius: 6px;
  background: #4f7cff;
  color: #fff;
  font: 600 13px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.ls-specimen__button--cleanup {
  background: #fff;
  color: #4f7cff;
}
.ls-specimen__button:disabled {
  opacity: 0.55;
  cursor: default;
}
.ls-specimen__settings {
  font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.ls-specimen__feed {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  min-height: 108px;
}
.ls-specimen__card {
  padding: 4px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  background: #fff;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.ls-specimen__readout {
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
.ls-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.ls-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

export function createLeakSpecimen(root: HTMLElement): LeakInstance {
  root.classList.add('ls-specimen');
  root.innerHTML = `
    <div class="ls-specimen__main">
      <p class="ls-specimen__hint">Controls 切换「泄漏 / 修复」两种实现；每点一次 <b>执行一次操作</b>，实现收到一条新消息。泄漏实现登记监听器、interval、缓存与游离节点且从不注销；修复实现完成同样功能但随手清理。打开 DevTools 切到 <b>Memory</b> 面板排查；页面状态挂在 <code>window.leakSpecimen</code>，Console 里可执行 <code>getEventListeners(window)</code> 核对监听器（仅 Console 可用）。</p>
      <div class="ls-specimen__row">
        <button type="button" class="ls-specimen__button">执行一次操作</button>
        <button type="button" class="ls-specimen__button ls-specimen__button--cleanup">清理已积累</button>
        <code class="ls-specimen__settings"></code>
      </div>
      <div class="ls-specimen__feed"></div>
    </div>
    <dl class="ls-specimen__readout">
      <dt>累计操作</dt><dd class="ls-specimen__cell-ops">0</dd>
      <dt>window 上的监听器</dt><dd class="ls-specimen__cell-listeners">0</dd>
      <dt>存活 interval</dt><dd class="ls-specimen__cell-intervals">0</dd>
      <dt>缓存数组长度</dt><dd class="ls-specimen__cell-cache">0</dd>
      <dt>detached 节点</dt><dd class="ls-specimen__cell-detached">0</dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const executeButton = root.querySelector(
    '.ls-specimen__button:not(.ls-specimen__button--cleanup)',
  ) as HTMLButtonElement;
  const cleanupButton = root.querySelector(
    '.ls-specimen__button--cleanup',
  ) as HTMLButtonElement;
  const settingsEl = root.querySelector(
    '.ls-specimen__settings',
  ) as HTMLElement;
  const feed = root.querySelector('.ls-specimen__feed') as HTMLElement;
  const opsEl = root.querySelector('.ls-specimen__cell-ops') as HTMLElement;
  const listenersEl = root.querySelector(
    '.ls-specimen__cell-listeners',
  ) as HTMLElement;
  const intervalsEl = root.querySelector(
    '.ls-specimen__cell-intervals',
  ) as HTMLElement;
  const cacheEl = root.querySelector('.ls-specimen__cell-cache') as HTMLElement;
  const detachedEl = root.querySelector(
    '.ls-specimen__cell-detached',
  ) as HTMLElement;

  let current: LeakOptions = { mode: 'leak', payloadSize: 64 };
  let totalOps = 0;
  let nextMessageId = 1;
  let sharedListenerRegistered = false;

  // 四张「登记表」：数组只原地增减（length 置零），保证 window.leakSpecimen 里的引用链稳定。
  const listeners: RegisteredListener[] = [];
  const intervals: number[] = [];
  const cache: MessageEnvelope[] = [];
  const detachedNodes: HTMLElement[] = [];

  registryHost.leakSpecimen = { listeners, intervals, cache, detachedNodes };

  /** 修复实现的全局监听器：整个标本只注册一次，数据从 cache 现读，不闭包持有单条消息。 */
  function ensureSharedListener() {
    if (sharedListenerRegistered) {
      return;
    }
    const sharedHandler: EventListener = () => {
      if (cache.length > 0) {
        void cache[cache.length - 1].id;
      }
    };
    window.addEventListener(EVENT_TYPE, sharedHandler);
    listeners.push({ target: window, type: EVENT_TYPE, handler: sharedHandler });
    sharedListenerRegistered = true;
  }

  function executeOperation() {
    totalOps += 1;
    const envelope = new MessageEnvelope(nextMessageId, current.payloadSize);
    nextMessageId += 1;

    // 登记表 1：缓存。泄漏实现只进不出；修复实现保持上限，被淘汰者失去引用交给 GC。
    cache.push(envelope);
    if (current.mode === 'fixed') {
      while (cache.length > CACHE_CAP) {
        cache.shift();
      }
    }

    // 登记表 2：feed 卡片。超出可见数量就从文档移除；泄漏实现把移除后的节点留在
    // 数组里——它们从此 detached（isConnected === false）但仍可达，GC 无法回收。
    const card = document.createElement('div');
    card.className = 'ls-card';
    card.textContent = `消息 #${envelope.id} · 负载 ${envelope.body.length} 条`;
    feed.prepend(card);
    while (feed.children.length > FEED_VISIBLE) {
      const oldest = feed.lastElementChild;
      if (!oldest) {
        break;
      }
      oldest.remove();
      if (current.mode === 'leak') {
        detachedNodes.push(oldest as HTMLElement);
      }
    }

    if (current.mode === 'leak') {
      // 登记表 3：事件监听器。每条消息一个专属处理器，闭包持有信封，从不移除。
      const handler: EventListener = () => {
        envelope.ticks += 1;
      };
      window.addEventListener(EVENT_TYPE, handler);
      listeners.push({ target: window, type: EVENT_TYPE, handler });

      // 登记表 4：定时器。每条消息一个轮询 interval，同样闭包持有信封，从不清理。
      const intervalId = window.setInterval(() => {
        envelope.ticks += 1;
      }, TICK_MS);
      intervals.push(intervalId);
    } else {
      ensureSharedListener();
    }
    paint();
  }

  /** 修复已发生的泄漏：把四张登记表一次性注销。两种模式下都可以调用。 */
  function cleanupAccumulated() {
    for (const { target, type, handler } of listeners) {
      target.removeEventListener(type, handler);
    }
    listeners.length = 0;
    sharedListenerRegistered = false;
    for (const intervalId of intervals) {
      window.clearInterval(intervalId);
    }
    intervals.length = 0;
    cache.length = 0;
    detachedNodes.length = 0;
    paint();
  }

  function paint() {
    settingsEl.textContent = `${current.mode === 'leak' ? '泄漏模式' : '修复模式'} · 负载 ${current.payloadSize} 条/消息`;
    opsEl.textContent = totalOps.toLocaleString();
    listenersEl.textContent = String(listeners.length);
    intervalsEl.textContent = String(intervals.length);
    cacheEl.textContent = String(cache.length);
    detachedEl.textContent = String(
      detachedNodes.filter((node) => !node.isConnected).length,
    );
    cleanupButton.disabled =
      listeners.length +
        intervals.length +
        cache.length +
        detachedNodes.length ===
      0;
  }

  executeButton.addEventListener('click', executeOperation);
  cleanupButton.addEventListener('click', cleanupAccumulated);
  paint();

  return {
    update(options) {
      // 切模式 / 调负载只影响后续操作；已积累的泄漏用「清理已积累」修复。
      current = options;
      paint();
    },
    dispose() {
      // 离开页面时把标本自己登记的资源全部注销，不留真实泄漏在 Storybook 里。
      cleanupAccumulated();
      executeButton.removeEventListener('click', executeOperation);
      cleanupButton.removeEventListener('click', cleanupAccumulated);
      feed.replaceChildren();
    },
  };
}
