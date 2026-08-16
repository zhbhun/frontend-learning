/**
 * 范例介绍：undo/redo 实验台——真实交互画布 + 指针式历史栈，两种记录模式同台对照。
 * 1. 自建命令栈（fabric 7.4.0 无内置 History 的替代方案）：
 *    record() 入栈并截断待重做段，undo()/redo() 移动指针并应用逆 / 正命令。
 * 2. 事件桥接：object:added / object:removed / object:modified 自动记账（来源标「事件」）；
 *    「随机改色」按钮走 obj.set（不发 object:modified），handler 手工记账（来源标「手工」）——
 *    证明"程序化修改不进事件通道，必须自己记账"。
 * 3. 粒度对照：「记录模式」命令 vs 快照。命令只存 before / after 属性 pick；
 *    快照存整画布 toObject() 的 JSON 字符串——同样操作下「记录体积」差一个数量级，
 *    且快照的 undo 走 loadFromJSON 全场景替换（v6+ Promise，完成后手动刷帧）。
 * 4. 合并策略：IText 连续输入在「合并文本输入」开启时并成一条命令
 *    （text:editing:exited 后另起一条）；关闭后逐键一条。
 *    快照模式下合并推迟到 editing:exited 才落一条。
 * 5. 栈语义：入栈截断 redo 段；「栈上限」超出丢最旧（丢掉的是最深的可撤销步）；
 *    应用历史时 applying 守卫拦截 fabric 再发的 object:added / removed，
 *    防止"撤销本身被记账"。
 * 输入：记录模式 / 合并文本输入 / 栈上限；画布上拖动、缩放、旋转、双击编辑文本；
 *       舞台按钮：撤销 Ctrl+Z / 重做 Ctrl+Shift+Z / 加矩形 / 随机改色 / 删除选中 / 重置场景。
 * 预期结果：readout 的记录模式、栈深度、指针位置、可重做、最近命令、记录体积
 *       与右侧命令日志逐项对应正文断言；灰色条目 = 指针右侧的待重做段。
 * 阅读主线：record() 的截断 → applyEntry() 的正逆向 → wireEvents() 的事件桥接
 *       → restoreSnapshot() 的快照通道 → update() 的模式切换复位。
 */
import {
  Canvas,
  Circle,
  IText,
  Rect,
  type FabricObject,
} from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 读者输入：对应 Controls 面板 */
export interface HistoryOptions {
  /** 记录模式：command = 可逆命令；snapshot = 整画布 JSON 快照 */
  recordMode: 'command' | 'snapshot';
  /** 合并文本输入：连续 text:changed 并成一条命令 */
  mergeText: boolean;
  /** 栈上限：超出丢最旧 */
  stackLimit: number;
}

/** 派生读数：由 readout 显示 */
export interface HistorySnapshot {
  /** 当前记录模式 */
  modeLabel: string;
  /** 栈内条目总数 */
  depthLabel: string;
  /** 指针位置：已应用 / 总数 */
  pointerLabel: string;
  /** 待重做条目数 */
  redoLabel: string;
  /** 最近一条已应用命令的描述 */
  lastLabel: string;
  /** 全部条目的载荷体积（近似累计） */
  sizeLabel: string;
}

export interface HistoryInstance {
  update(options: HistoryOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
/** 日志面板最多保留的行数（新在上） */
const MAX_ROWS = 14;
const COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#a855f7',
  '#14b8a6',
];
/** 属性命令的记录集：几何 + 外观（v5 的 stateProperties 是现成参考，可按需增删） */
const TRACKED = [
  'left',
  'top',
  'scaleX',
  'scaleY',
  'angle',
  'opacity',
  'fill',
] as const;
type TrackedProps = Partial<Record<(typeof TRACKED)[number], unknown>>;

const ACTION_LABELS: Record<string, string> = {
  drag: '移动',
  scale: '缩放',
  rotate: '旋转',
  skew: '倾斜',
};
const KEY_LABELS: Record<string, string> = {
  left: '位置',
  top: '位置',
  scaleX: '缩放',
  scaleY: '缩放',
  angle: '角度',
  opacity: '透明度',
  fill: '填充',
};
const TYPE_LABELS: Record<string, string> = {
  rect: '矩形',
  circle: '圆',
  'i-text': '文本',
};

/** 一条历史记录：命令模式存正 / 逆载荷，快照模式存整画布 JSON */
interface Entry {
  kind: 'add' | 'remove' | 'modify' | 'text' | 'snapshot';
  label: string;
  source: '事件' | '手工' | '快照';
  size: number;
  obj?: FabricObject;
  index?: number;
  before?: TrackedProps;
  after?: TrackedProps;
  beforeText?: string;
  afterText?: string;
  /** 文本命令的合并闸：editing:exited 后不再并入 */
  closed?: boolean;
  snapshot?: string;
}

export function createHistoryLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: HistorySnapshot) => void,
): HistoryInstance {
  const stage = canvasEl.parentElement ?? canvasEl;
  const fabricCanvas = new Canvas(canvasEl, { ...INITIAL_SIZE });

  // ---- 历史栈状态：logStack 左侧（[0, logPointer)）已应用，右侧待重做
  const logStack: Entry[] = [];
  let logPointer = 0;
  let mode: HistoryOptions['recordMode'] = 'command';
  let mergeText = true;
  let limit = 10;
  /** 应用历史 / 重建场景时的免战牌：拦截 fabric 再发的增删事件 */
  let applying = false;
  /** 快照恢复（loadFromJSON 异步）进行中：按钮全禁用，事件不记账 */
  let busy = false;
  /** 快照模式的底快照：撤销第一条命令时恢复的初始状态（对应 states[0]） */
  let baseSnapshot: string | null = null;
  let counter = 0;
  let colorIdx = 0;
  let pendingTextSnap = false;
  let canvasW = INITIAL_SIZE.width;
  let canvasH = INITIAL_SIZE.height;

  /** 手势前基线：object:modified 的 before 从这里取 */
  const baselines = new WeakMap<FabricObject, TrackedProps>();
  /** 文本编辑前基线 */
  const textBase = new WeakMap<FabricObject, string>();
  /** 删除前由按钮侧捕获的层级索引：object:removed 时对象已离开数组 */
  const pendingRemove = new WeakMap<FabricObject, number>();
  const names = new WeakMap<FabricObject, string>();

  let rect: Rect | undefined;
  let circle: Circle | undefined;
  let textObj: IText | undefined;

  const pick = (obj: FabricObject): TrackedProps =>
    Object.fromEntries(TRACKED.map((k) => [k, obj[k]]));
  const pickSubset = (props: TrackedProps, keys: readonly string[]) =>
    Object.fromEntries(keys.map((k) => [k, props[k]]));
  const describe = (obj: FabricObject) =>
    names.get(obj) ?? TYPE_LABELS[obj.type] ?? obj.type;

  /** 条目体积的近似：只算载荷（label 是界面糖，不计入） */
  function entrySize(e: Entry): number {
    if (e.snapshot) {
      return e.snapshot.length;
    }
    switch (e.kind) {
      case 'add':
      case 'remove':
        return JSON.stringify({ kind: e.kind, index: e.index }).length;
      case 'modify':
        return JSON.stringify({
          kind: 'modify',
          before: e.before,
          after: e.after,
        }).length;
      case 'text':
        return JSON.stringify({
          kind: 'text',
          before: e.beforeText,
          after: e.afterText,
        }).length;
      default:
        return 0;
    }
  }

  function seedBaselines() {
    fabricCanvas.getObjects().forEach((obj) => {
      baselines.set(obj, pick(obj));
      if (obj instanceof IText) {
        textBase.set(obj, obj.text);
      }
    });
  }

  // ---- 核心一：入栈。截断待重做段是 undo/redo 的指针不变式
  function record(e: Entry) {
    e.size = entrySize(e);
    logStack.length = logPointer;
    logStack.push(e);
    while (logStack.length > limit) {
      logStack.shift();
    }
    logPointer = logStack.length;
    refreshAll();
  }

  function pushSnapshot(label: string, source: Entry['source'] = '快照') {
    // 自定义属性要落快照必须走白名单：toObject(['taskId', ...])（见序列化课）
    record({
      kind: 'snapshot',
      label,
      source,
      snapshot: JSON.stringify(fabricCanvas.toObject()),
    });
  }

  // ---- 核心二：应用。命令模式走 set / add / remove，快照模式整场景替换
  async function applyEntry(e: Entry, dir: 'undo' | 'redo') {
    applying = true;
    try {
      if (e.kind === 'snapshot') {
        await restoreSnapshot(e.snapshot!);
      } else if (e.kind === 'add') {
        if (dir === 'undo') {
          fabricCanvas.remove(e.obj!);
        } else {
          fabricCanvas.add(e.obj!);
        }
      } else if (e.kind === 'remove') {
        if (dir === 'undo') {
          // insertAt(index, ...objects)：v6+ 索引在第一位
          fabricCanvas.insertAt(
            Math.min(e.index!, fabricCanvas.getObjects().length),
            e.obj!,
          );
        } else {
          fabricCanvas.remove(e.obj!);
        }
      } else if (e.kind === 'modify') {
        e.obj!.set(dir === 'undo' ? e.before! : e.after!);
        baselines.set(e.obj!, pick(e.obj!));
      } else if (e.kind === 'text') {
        const text = dir === 'undo' ? e.beforeText! : e.afterText!;
        // Text.set('text') 属 textLayoutProperties，会自动重算尺寸与坐标
        (e.obj as IText).set({ text });
        textBase.set(e.obj!, text);
      }
    } finally {
      applying = false;
    }
    fabricCanvas.requestRenderAll();
  }

  async function restoreSnapshot(json: string) {
    fabricCanvas.discardActiveObject();
    // loadFromJSON：先 clear() 替换全场景，v6+ 返回 Promise，不自动渲染
    await fabricCanvas.loadFromJSON(json);
    fabricCanvas.requestRenderAll();
    // 实例全部换新：旧的基线 / 名字失效，按新对象重建
    seedBaselines();
  }

  async function handleUndo() {
    if (busy || logPointer === 0) {
      return;
    }
    busy = true;
    refreshControls();
    logPointer -= 1;
    if (mode === 'snapshot' && logPointer === 0 && baseSnapshot) {
      // 撤销第一条快照命令 = 回到初始状态（底快照单独存，不占栈深度）
      await restoreSnapshot(baseSnapshot);
    } else {
      await applyEntry(logStack[logPointer], 'undo');
    }
    busy = false;
    refreshAll();
  }

  async function handleRedo() {
    if (busy || logPointer === logStack.length) {
      return;
    }
    busy = true;
    refreshControls();
    await applyEntry(logStack[logPointer++], 'redo');
    busy = false;
    refreshAll();
  }

  // ---- 核心三：事件桥接。交互路径自动记账，程序化路径手工记账
  function wireEvents() {
    fabricCanvas.on('object:added', ({ target }) => {
      if (applying || busy) {
        return;
      }
      baselines.set(target, pick(target));
      if (target instanceof IText) {
        textBase.set(target, target.text);
      }
      if (mode === 'snapshot') {
        pushSnapshot(`添加·${describe(target)}`);
        return;
      }
      record({
        kind: 'add',
        source: '事件',
        label: `添加·${describe(target)}`,
        obj: target,
        index: fabricCanvas.getObjects().indexOf(target),
      });
    });

    fabricCanvas.on('object:removed', ({ target }) => {
      if (applying || busy) {
        return;
      }
      // 事件到达时对象已离开 _objects，层级索引由删除入口预先捕获
      const index = pendingRemove.get(target) ?? fabricCanvas.getObjects().length;
      pendingRemove.delete(target);
      if (mode === 'snapshot') {
        pushSnapshot(`删除·${describe(target)}`);
        return;
      }
      record({
        kind: 'remove',
        source: '事件',
        label: `删除·${describe(target)}`,
        obj: target,
        index,
      });
    });

    fabricCanvas.on('object:modified', (opt) => {
      if (applying || busy) {
        return;
      }
      const obj = opt.target;
      const after = pick(obj);
      const before = baselines.get(obj) ?? after;
      baselines.set(obj, after);
      const changed = TRACKED.filter((k) => before[k] !== after[k]);
      if (changed.length === 0) {
        return;
      }
      const action =
        ACTION_LABELS[opt.action ?? ''] ??
        [...new Set(changed.map((k) => KEY_LABELS[k] ?? k))].join('/');
      const label = `${describe(obj)}·${action}`;
      if (mode === 'snapshot') {
        pushSnapshot(label);
        return;
      }
      record({
        kind: 'modify',
        source: '事件',
        label,
        obj,
        before: pickSubset(before, changed),
        after: pickSubset(after, changed),
      });
    });

    fabricCanvas.on('text:changed', ({ target }) => {
      if (applying || busy) {
        return;
      }
      if (mode === 'snapshot') {
        if (mergeText) {
          pendingTextSnap = true; // 推迟到 editing:exited 落一条
        } else {
          pushSnapshot(`文本·${describe(target)}`);
        }
        return;
      }
      const top = logStack[logPointer - 1];
      if (
        mergeText &&
        top &&
        top.kind === 'text' &&
        top.obj === target &&
        !top.closed
      ) {
        top.afterText = target.text;
        top.size = entrySize(top);
        refreshAll();
        return;
      }
      record({
        kind: 'text',
        source: '事件',
        label: `文本·${describe(target)}`,
        obj: target,
        beforeText: textBase.get(target) ?? '',
        afterText: target.text,
      });
    });

    fabricCanvas.on('text:editing:exited', () => {
      const top = logStack[logPointer - 1];
      if (top && top.kind === 'text') {
        top.closed = true;
      }
      if (mode === 'snapshot' && pendingTextSnap) {
        pendingTextSnap = false;
        pushSnapshot('文本输入（合并）');
      }
    });
  }

  // ---- 舞台按钮：撤销 / 重做 / 加矩形 / 随机改色 / 删除选中 / 重置场景
  const toolbar = document.createElement('div');
  toolbar.className = 'hstbar';
  const styleEl = document.createElement('style');
  styleEl.textContent = `
.hstbar { position: absolute; top: 0; left: 0; right: 0; z-index: 2; display: flex;
  gap: 6px; align-items: center; padding: 6px 8px; background: rgba(248,250,252,0.94);
  border-bottom: 1px solid #dbe3f0; }
.hstbar__btn { padding: 4px 10px; border: 1px solid #c7d2e4; border-radius: 5px;
  background: #fff; color: #1d2939; font: 600 12px/1.4 ui-sans-serif, system-ui, sans-serif;
  cursor: pointer; }
.hstbar__btn:hover:not(:disabled) { background: #eef3fb; }
.hstbar__btn:disabled { opacity: 0.45; cursor: default; }
.hstbar__hint { margin-left: auto; color: #b45309;
  font: 11px/1.4 ui-sans-serif, system-ui, sans-serif; }
.hstlog { position: absolute; top: 38px; right: 0; bottom: 0; display: flex;
  flex-direction: column; background: rgba(255,255,255,0.94);
  border-left: 1px solid #dbe3f0; pointer-events: none;
  font: 11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; color: #334155; }
.hstlog__title { padding: 8px 10px 4px; font-weight: 600; color: #0f172a;
  border-bottom: 1px solid #eef2f7; }
.hstlog__hint { padding: 3px 10px 6px; color: #64748b; font-size: 10px;
  border-bottom: 1px solid #eef2f7; }
.hstlog__rows { flex: 1; overflow: hidden; padding: 6px 8px;
  display: flex; flex-direction: column; gap: 3px; }
.hstlog__row { display: flex; gap: 6px; align-items: baseline; white-space: nowrap; }
.hstlog__row--redo { opacity: 0.45; }
.hstlog__kind { flex: none; padding: 0 4px; border-radius: 3px; font-size: 10px; }
.hstlog__kind--add { background: #d1fae5; color: #047857; }
.hstlog__kind--remove { background: #fee2e2; color: #b91c1c; }
.hstlog__kind--modify { background: #dbeafe; color: #1d4ed8; }
.hstlog__kind--text { background: #fef3c7; color: #b45309; }
.hstlog__kind--snapshot { background: #ede9fe; color: #6d28d9; }
.hstlog__label { flex: none; font-weight: 600; max-width: 52%; overflow: hidden;
  text-overflow: ellipsis; }
.hstlog__meta { color: #64748b; font-size: 10px; overflow: hidden;
  text-overflow: ellipsis; }`;

  const KIND_LABELS: Record<Entry['kind'], string> = {
    add: '添加',
    remove: '删除',
    modify: '修改',
    text: '文本',
    snapshot: '快照',
  };

  const hintEl = document.createElement('span');
  hintEl.className = 'hstbar__hint';
  let hintTimer = 0;
  function hint(message: string) {
    hintEl.textContent = message;
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => {
      hintEl.textContent = '';
    }, 2000);
  }

  let undoBtn: HTMLButtonElement;
  let redoBtn: HTMLButtonElement;
  function bindButton(label: string, onClick: () => void) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hstbar__btn';
    btn.textContent = label;
    btn.addEventListener('click', () => onClick());
    toolbar.append(btn);
    return btn;
  }

  undoBtn = bindButton('撤销 Ctrl+Z', () => void handleUndo());
  redoBtn = bindButton('重做 Ctrl+Shift+Z', () => void handleRedo());
  bindButton('加矩形', onAddRect);
  bindButton('随机改色', onRecolor);
  bindButton('删除选中', onDelete);
  bindButton('重置场景', () => rebuild());

  // ---- 右侧命令日志：新 → 旧，指针右侧（待重做）灰显
  const panel = document.createElement('div');
  panel.className = 'hstlog';
  panel.style.width = '280px';
  const title = document.createElement('div');
  title.className = 'hstlog__title';
  title.textContent = '历史栈（新 → 旧）';
  const panelHint = document.createElement('div');
  panelHint.className = 'hstlog__hint';
  panelHint.textContent = '灰 = 待重做 · 来源：事件 / 手工 / 快照';
  const rowsRoot = document.createElement('div');
  rowsRoot.className = 'hstlog__rows';
  panel.append(title, panelHint, rowsRoot);

  interface RowRefs {
    root: HTMLDivElement;
    kind: HTMLSpanElement;
    label: HTMLSpanElement;
    meta: HTMLSpanElement;
  }
  const rowEls: RowRefs[] = [];
  for (let i = 0; i < MAX_ROWS; i++) {
    const root = document.createElement('div');
    root.className = 'hstlog__row';
    const kind = document.createElement('span');
    kind.className = 'hstlog__kind';
    const label = document.createElement('span');
    label.className = 'hstlog__label';
    const meta = document.createElement('span');
    meta.className = 'hstlog__meta';
    root.append(kind, label, meta);
    rowsRoot.append(root);
    rowEls.push({ root, kind, label, meta });
  }

  function refreshLog() {
    // 顺序反转：最新条目在最上；序号 >= logPointer 的属于待重做段
    for (let row = 0; row < rowEls.length; row++) {
      const index = logStack.length - 1 - row;
      const refs = rowEls[row];
      const entry = logStack[index];
      if (!entry) {
        refs.root.style.visibility = 'hidden';
        continue;
      }
      refs.root.style.visibility = 'visible';
      refs.root.className =
        index >= logPointer ? 'hstlog__row hstlog__row--redo' : 'hstlog__row';
      refs.kind.className = `hstlog__kind hstlog__kind--${entry.kind}`;
      refs.kind.textContent = KIND_LABELS[entry.kind];
      refs.label.textContent = entry.label;
      refs.meta.textContent = `${entry.source}${
        index >= logPointer ? ' · 待重做' : ''
      }`;
    }
  }

  function refreshControls() {
    undoBtn.disabled = busy || logPointer === 0;
    redoBtn.disabled = busy || logPointer === logStack.length;
  }

  function refreshAll() {
    refreshLog();
    refreshControls();
    emitSnapshot();
  }

  function emitSnapshot() {
    const total = logStack.reduce((sum, e) => sum + e.size, 0);
    const top = logStack[logPointer - 1];
    emit({
      modeLabel: mode === 'command' ? '命令' : '快照',
      depthLabel: `${logStack.length} 条`,
      pointerLabel: `${logPointer} / ${logStack.length}`,
      redoLabel: `${logStack.length - logPointer} 条`,
      lastLabel: top ? top.label : '—',
      sizeLabel:
        total >= 1024 ? `${(total / 1024).toFixed(2)} KB` : `${total} B`,
    });
  }

  // ---- 场景操作入口
  function onAddRect() {
    if (busy) {
      return;
    }
    counter += 1;
    const added = new Rect({
      left: 40 + ((counter * 53) % Math.max(60, canvasW - 160)),
      top: 40 + ((counter * 37) % Math.max(60, canvasH - 140)),
      width: 56 + ((counter * 11) % 36),
      height: 44 + ((counter * 7) % 26),
      fill: COLORS[counter % COLORS.length],
    });
    names.set(added, `新矩形${counter}`);
    fabricCanvas.add(added); // object:added 自动记账（来源：事件）
  }

  function onRecolor() {
    if (busy) {
      return;
    }
    const targets = fabricCanvas.getActiveObjects().slice();
    if (!targets.length) {
      hint('先在画布上选中一个对象');
      return;
    }
    targets.forEach((obj) => {
      const before = { fill: obj.fill };
      colorIdx = (colorIdx + 1) % COLORS.length;
      const next = COLORS[colorIdx];
      obj.set('fill', next); // 程序化 set 不发 object:modified —— 手工记账
      if (mode === 'command') {
        record({
          kind: 'modify',
          source: '手工',
          label: `改色·${describe(obj)} ${String(before.fill)}→${next}`,
          obj,
          before,
          after: { fill: next },
        });
        baselines.set(obj, pick(obj));
      }
    });
    if (mode === 'snapshot') {
      pushSnapshot(`改色·${targets.map(describe).join('、')}`, '手工');
    }
    fabricCanvas.requestRenderAll();
  }

  function onDelete() {
    if (busy) {
      return;
    }
    const targets = fabricCanvas.getActiveObjects().slice();
    if (!targets.length) {
      hint('先在画布上选中一个对象');
      return;
    }
    // object:removed 到达时对象已离开数组，先捕获层级索引供撤销恢复
    targets.forEach((obj) =>
      pendingRemove.set(obj, fabricCanvas.getObjects().indexOf(obj)),
    );
    fabricCanvas.discardActiveObject();
    fabricCanvas.remove(...targets);
  }

  function rebuild() {
    applying = true;
    fabricCanvas.discardActiveObject();
    fabricCanvas.remove(...fabricCanvas.getObjects());
    counter = 0;
    rect = new Rect({
      width: 132,
      height: 96,
      fill: '#ef4444',
      opacity: 0.92,
    });
    circle = new Circle({ radius: 54, fill: '#3b82f6', opacity: 0.92 });
    textObj = new IText('双击编辑我', {
      fontSize: 22,
      fill: '#0f172a',
      opacity: 0.92,
    });
    names.set(rect, '矩形');
    names.set(circle, '圆');
    names.set(textObj, '文本');
    fabricCanvas.add(rect, circle, textObj);
    logStack.length = 0;
    logPointer = 0;
    pendingTextSnap = false;
    applying = false;
    // 底快照在事件桥接就位后采集（rebuild 内部无监听触发，直接序列化即可）
    baseSnapshot = mode === 'snapshot' ? JSON.stringify(fabricCanvas.toObject()) : null;
    seedBaselines();
    applyLayout(canvasW, canvasH);
    fabricCanvas.requestRenderAll();
    refreshAll();
  }

  // ---- 布局与尺寸：工具条占顶部一行，日志占右侧一列
  function applyLayout(width: number, height: number) {
    // 快照恢复后旧引用失效，set 不产生可见影响（此时尺寸同步不再搬移初始三件）
    rect?.set({ left: width * 0.08, top: height * 0.3 });
    circle?.set({ left: width * 0.32, top: height * 0.2 });
    textObj?.set({ left: width * 0.1, top: height * 0.72 });
  }

  function syncSize() {
    if (!stage.isConnected) {
      return;
    }
    const stageWidth = Math.floor(stage.clientWidth);
    const stageHeight = Math.floor(stage.clientHeight);
    const panelWidth = Math.max(200, Math.min(330, Math.round(stageWidth * 0.34)));
    panel.style.width = `${panelWidth}px`;
    canvasW = Math.max(240, stageWidth - panelWidth - 14);
    canvasH = Math.max(200, stageHeight - 52);
    applyLayout(canvasW, canvasH);
    fabricCanvas.wrapperEl.style.margin = '45px 7px 7px 7px';
    // setDimensions 自动 requestRenderAll；位置改动由它一并带回画面
    fabricCanvas.setDimensions({ width: canvasW, height: canvasH });
  }

  function update(options: HistoryOptions) {
    const modeChanged = options.recordMode !== mode;
    mode = options.recordMode;
    mergeText = options.mergeText;
    if (options.stackLimit !== limit) {
      limit = options.stackLimit;
      while (logStack.length > limit) {
        logStack.shift();
        logPointer = Math.min(logPointer, logStack.length);
      }
      refreshAll();
    }
    if (modeChanged) {
      rebuild();
      hint(mode === 'snapshot' ? '快照模式：历史已重置' : '命令模式：历史已重置');
    }
  }

  // ---- 初始化：先搭场景（不记账），再挂事件桥接
  toolbar.append(styleEl, hintEl);
  rebuild();
  wireEvents();
  if (stage !== canvasEl) {
    stage.append(toolbar, panel);
  }
  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );
  syncSize();
  emitSnapshot();

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      window.clearTimeout(hintTimer);
      toolbar.remove();
      panel.remove();
      void fabricCanvas.dispose();
    },
  };
}
