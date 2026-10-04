/**
 * 范例介绍：「对象分配」标本——Controls 调整每次分配的对象数量、字段数与字符串数组长度，
 * 点「分配」在页面堆里创建真实的 SnapshotSpecimen 对象并持有引用，点「释放」清空引用
 * 等待 GC；readout 显示当前存活对象数与估算占用。
 * 前置状态：无需环境；在 Storybook 页面打开 DevTools（Command+Option+J / Control+Shift+J）
 *   切到 Memory 面板，选 Heap snapshot 拍快照，Class filter 搜 Snapshot 定位本页对象。
 * 主要操作：拍快照 1 → 点「分配」→ 拍快照 2 → 切 Comparison 看 # New / # Delta /
 *   Alloc. size；点「释放」→ 拍快照 3 → 看 # Deleted / Freed size；Containment 里从
 *   window 顺 allocSpecimens 往下钻；Summary 里点实例看 Retainers 引用链。
 * 预期结果：Summary 里 SnapshotSpecimen 与 SnapshotPayload 两行随滑块设置增减；每个实例
 *   的 Retained size 大于 Shallow size（payload 与 tags 挂在对象下）；释放并重拍快照后
 *   # Deleted 与 Freed size 出现，# Delta 转负。
 * 阅读主线：分配与释放只增减引用——readout 的「存活对象数」立即变化，快照里的增删要等
 *   GC（拍快照会自动触发）之后才体现；估算读数是数量级参照，真实大小以快照列为准。
 */

/** 演示页参数：一次「分配」的形态，三个滑块各对应一项。 */
export interface AllocOptions {
  /** 每次分配创建的 SnapshotSpecimen 实例个数。 */
  count: number;
  /** 每个对象携带的 SnapshotPayload 数值字段个数——决定 Shallow size 估算。 */
  fields: number;
  /** 每个对象携带的 tags 字符串数组长度——决定 Retained size 里的字符串与数组部分。 */
  itemsPerArray: number;
}

export interface AllocInstance {
  update(options: AllocOptions): void;
  dispose(): void;
}

/* ---------- 被观察的对象：类名保持直白，快照 Class filter 里一眼可认 ---------- */

/**
 * 子对象：快照里按 SnapshotPayload 分组。数值字段（小整数）内联在对象存储里，
 * 字段数越多 Shallow size 越大，不产生额外堆对象。
 */
class SnapshotPayload {
  constructor(fields: number) {
    for (let i = 0; i < fields; i += 1) {
      (this as unknown as Record<string, number>)[`field${i}`] = i * 7;
    }
  }
}

/**
 * 主角对象：快照里按 SnapshotSpecimen 分组。Retained size = 自身 Shallow +
 * payload + tags 数组与其中字符串——「小壳retain大子树」的标准形态。
 */
class SnapshotSpecimen {
  readonly payload: SnapshotPayload;
  readonly tags: string[];
  readonly batch: number;
  readonly index: number;

  constructor(options: AllocOptions, batchId: number, index: number) {
    this.payload = new SnapshotPayload(options.fields);
    this.batch = batchId;
    this.index = index;
    this.tags = new Array<string>(options.itemsPerArray);
    for (let i = 0; i < options.itemsPerArray; i += 1) {
      // 运行时拼接的定长字符串，引擎不会去重——快照里 string 分组的增长来自这里。
      this.tags[i] = tagText(batchId, index, i);
    }
  }
}

/** tags 里的定长字符串，共 16 个字符，估算公式按它计。 */
const TAG_CHARS = 16;

function tagText(batchId: number, index: number, slot: number): string {
  return `tag-${String(batchId).padStart(3, '0')}-${String(index).padStart(
    5,
    '0',
  )}-${String(slot).padStart(2, '0')}`;
}

/* ---------- 估算公式：只做数量级对照的粗略上限，真实布局以快照列为准 ---------- */

const OBJECT_SHELL_BYTES = 64; // 对象壳（specimen 与 payload 两个头）
const FIELD_SLOT_BYTES = 8; // 每个数值字段的槽位
const ARRAY_HEADER_BYTES = 24; // tags 数组的头
const STRING_HEADER_BYTES = 40; // 每条字符串的头（保守）
const STRING_CHAR_BYTES = 2; // 每个字符按双字节（保守）

function estimatePerObjectBytes(options: AllocOptions): number {
  return (
    OBJECT_SHELL_BYTES +
    options.fields * FIELD_SLOT_BYTES +
    ARRAY_HEADER_BYTES +
    options.itemsPerArray * (STRING_HEADER_BYTES + TAG_CHARS * STRING_CHAR_BYTES)
  );
}

/* ---------- 引用登记：挂在 window 上，让 Retainers / Containment 有可读的链 ---------- */

/** 一个批次的记录：specimens 数组持有该批全部对象。 */
interface AllocBatch {
  id: number;
  options: AllocOptions;
  specimens: SnapshotSpecimen[];
}

const registryHost = window as unknown as {
  allocSpecimens?: AllocBatch[];
};

/* ---------- 标本外壳：提示、按钮与 readout ---------- */

const SPECIMEN_STYLES = `
.ms-specimen {
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
.ms-specimen__main {
  flex: 1 1 300px;
  min-width: 0;
}
.ms-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.ms-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ms-specimen__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.ms-specimen__button {
  padding: 6px 14px;
  border: 1px solid #4f7cff;
  border-radius: 6px;
  background: #4f7cff;
  color: #fff;
  font: 600 13px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.ms-specimen__button--release {
  background: #fff;
  color: #4f7cff;
}
.ms-specimen__button:disabled {
  opacity: 0.55;
  cursor: default;
}
.ms-specimen__settings {
  font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.ms-specimen__readout {
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
.ms-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.ms-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

export function createAllocSpecimen(root: HTMLElement): AllocInstance {
  root.classList.add('ms-specimen');
  root.innerHTML = `
    <div class="ms-specimen__main">
      <p class="ms-specimen__hint">打开 DevTools 切到 <b>Memory</b> 面板，选 <b>Heap snapshot</b> 点 <b>Take snapshot</b>；Class filter 输入 <code>Snapshot</code> 找本页对象。比较快照前先点工具栏的 <b>Collect garbage</b>（扫帚图标）并清空 Console。本页批次挂在 <code>window.allocSpecimens</code>，Console 里可执行 <code>allocSpecimens.length</code> 查看批次数。</p>
      <div class="ms-specimen__row">
        <button type="button" class="ms-specimen__button">分配</button>
        <button type="button" class="ms-specimen__button ms-specimen__button--release">释放</button>
        <code class="ms-specimen__settings"></code>
      </div>
    </div>
    <dl class="ms-specimen__readout">
      <dt>存活对象数</dt><dd class="ms-specimen__cell-live">0</dd>
      <dt>估算总占用</dt><dd class="ms-specimen__cell-total">0 B</dd>
      <dt>每对象估算（下次分配）</dt><dd class="ms-specimen__cell-per">—</dd>
      <dt>累计分配</dt><dd class="ms-specimen__cell-alloc">0</dd>
      <dt>累计释放</dt><dd class="ms-specimen__cell-release">0</dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const allocateButton = root.querySelector(
    '.ms-specimen__button:not(.ms-specimen__button--release)',
  ) as HTMLButtonElement;
  const releaseButton = root.querySelector(
    '.ms-specimen__button--release',
  ) as HTMLButtonElement;
  const settingsEl = root.querySelector(
    '.ms-specimen__settings',
  ) as HTMLElement;
  const liveEl = root.querySelector('.ms-specimen__cell-live') as HTMLElement;
  const totalEl = root.querySelector(
    '.ms-specimen__cell-total',
  ) as HTMLElement;
  const perEl = root.querySelector('.ms-specimen__cell-per') as HTMLElement;
  const allocEl = root.querySelector(
    '.ms-specimen__cell-alloc',
  ) as HTMLElement;
  const releaseEl = root.querySelector(
    '.ms-specimen__cell-release',
  ) as HTMLElement;

  let current: AllocOptions = { count: 1000, fields: 8, itemsPerArray: 8 };
  let batches: AllocBatch[] = [];
  let nextBatchId = 1;
  let totalAllocated = 0;
  let totalReleased = 0;

  registryHost.allocSpecimens = batches;

  function liveCount(): number {
    return batches.reduce((sum, batch) => sum + batch.specimens.length, 0);
  }

  function estimatedTotalBytes(): number {
    return batches.reduce(
      (sum, batch) =>
        sum + batch.specimens.length * estimatePerObjectBytes(batch.options),
      0,
    );
  }

  function allocate() {
    const batch: AllocBatch = {
      id: nextBatchId,
      options: { ...current },
      specimens: [],
    };
    for (let i = 0; i < current.count; i += 1) {
      batch.specimens.push(new SnapshotSpecimen(current, nextBatchId, i));
    }
    batches.push(batch);
    nextBatchId += 1;
    totalAllocated += current.count;
    /*
     * 只增引用：对象此刻全部可达。readout 立即更新；快照里的 # New
     * 要等你拍下一张快照（拍摄自带 GC，不影响这里新建对象的存活）。
     */
    registryHost.allocSpecimens = batches;
    paint();
  }

  function release() {
    if (!batches.length) {
      return;
    }
    totalReleased += liveCount();
    batches = [];
    /*
     * 只清引用：对象逻辑上已「死」，但 GC 是异步的——readout 归零后它们
     * 可能仍在堆里；拍快照会自动先 GC，那时 Comparison 才给出 # Deleted。
     */
    registryHost.allocSpecimens = batches;
    paint();
  }

  function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${bytes} B`;
  }

  function paint() {
    settingsEl.textContent = `${current.count.toLocaleString()} 个/批 · 字段 ${current.fields} · 数组 ${current.itemsPerArray}`;
    liveEl.textContent = liveCount().toLocaleString();
    totalEl.textContent = formatBytes(estimatedTotalBytes());
    perEl.textContent = formatBytes(estimatePerObjectBytes(current));
    allocEl.textContent = totalAllocated.toLocaleString();
    releaseEl.textContent = totalReleased.toLocaleString();
    releaseButton.disabled = !batches.length;
  }

  allocateButton.addEventListener('click', allocate);
  releaseButton.addEventListener('click', release);
  paint();

  return {
    update(options) {
      current = options;
      paint();
    },
    dispose() {
      allocateButton.removeEventListener('click', allocate);
      releaseButton.removeEventListener('click', release);
      batches = [];
      registryHost.allocSpecimens = batches;
    },
  };
}
