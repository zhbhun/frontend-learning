/**
 * 范例：Y.Array 并发插入顺序。
 * 演示：两个离线副本在同一个空数组的同一位置（0）并发插入一段条目，互换更新后
 *       两边内容都保留，所有副本收敛到同一个顺序。
 * 输入：客户端 A / B 各自插入的条目（逗号分隔）；「交换 clientID」对调固定 clientID。
 * 操作：每次控件变化都整体重算——重建副本、离线并发插入、双向同步。
 * 预期：合并结果中两个插入块都完整保留；块间顺序由 clientID 决定（较小者的块在前）；
 *       应用远端更新的一侧收到 delta 形式的插入事件。
 * 主线：buildMerge() 建副本 → 离线 insert → 双向同步 → 读 toArray 与 A 侧 delta。
 */
import * as Y from 'yjs';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ArrayConcurrentInsertOptions {
  itemsA: string;
  itemsB: string;
  swapIds: boolean;
}

export interface ArrayConcurrentInsertSnapshot {
  idA: number;
  idB: number;
  merged: string;
  converged: string;
  firstBlock: string;
  deltaA: string;
}

export interface ArrayConcurrentInsertInstance {
  update(options: ArrayConcurrentInsertOptions): void;
  dispose(): void;
}

function parseItems(text: string): string[] {
  const items = text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : ['（空）'];
}

function syncPeers(docA: Y.Doc, docB: Y.Doc): void {
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB)));
  Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA)));
}

function summarizeDelta(
  delta: Array<{ insert?: unknown; delete?: number; retain?: number }>,
): string {
  return JSON.stringify(
    delta.map((op) => {
      if (Array.isArray(op.insert)) {
        return { insert: op.insert.map(String) };
      }
      return op;
    }),
  );
}

interface MergeResult {
  idA: number;
  idB: number;
  listA: string[];
  listB: string[];
  deltaA: string;
}

function buildMerge(options: ArrayConcurrentInsertOptions): MergeResult {
  const idA = options.swapIds ? 2000 : 1000;
  const idB = options.swapIds ? 1000 : 2000;
  const docA = new Y.Doc();
  const docB = new Y.Doc();
  docA.clientID = idA;
  docB.clientID = idB;

  // 共同起点：空数组。
  syncPeers(docA, docB);

  // 离线并发：都在索引 0 插入自己的一段条目。
  docA.getArray('list').insert(0, parseItems(options.itemsA));
  docB.getArray('list').insert(0, parseItems(options.itemsB));

  let deltaA = '（无）';
  docA.getArray('list').observe((event) => {
    deltaA = summarizeDelta(event.changes.delta);
  });

  syncPeers(docA, docB);

  return {
    idA,
    idB,
    listA: docA.getArray('list').toArray().map(String),
    listB: docB.getArray('list').toArray().map(String),
    deltaA,
  };
}

export function createArrayConcurrentInsert(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ArrayConcurrentInsertSnapshot) => void,
): ArrayConcurrentInsertInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: ArrayConcurrentInsertOptions = {
    itemsA: 'A1, A2',
    itemsB: 'B1, B2',
    swapIds: false,
  };

  function drawPeerCard(x: number, label: string, clientID: number, items: string[]) {
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(x, 72, 300, 88, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#172033';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`${label} · clientID ${clientID}`, x + 16, 100);
    ctx.fillStyle = '#475569';
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`yarray.insert(0, [${items.map((i) => `'${i}'`).join(', ')}])`, x + 16, 126);
    ctx.fillText(`${items.length} 个条目`, x + 16, 148);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = 300;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const result = buildMerge(current);
    const itemsA = parseItems(current.itemsA);
    const itemsB = parseItems(current.itemsB);

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('两个离线副本在同一位置并发插入，互换更新后合并', 24, 40);

    drawPeerCard(24, '客户端 A', result.idA, itemsA);
    drawPeerCard(348, '客户端 B', result.idB, itemsB);

    // 合并结果：给每个条目标注来源块，直观看出块间顺序。
    const setA = new Set(itemsA);
    const converged =
      result.listA.join('') === result.listB.join('');
    ctx.fillStyle = '#ecfdf5';
    ctx.strokeStyle = '#34d399';
    ctx.beginPath();
    ctx.roundRect(24, 184, 624, 56, 8);
    ctx.fill();
    ctx.stroke();

    let x = 40;
    result.listA.forEach((item, index) => {
      const fromA = setA.has(item);
      ctx.fillStyle = fromA ? '#4f7cff' : '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(x, 200, Math.max(44, item.length * 14 + 20), 24, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(item, x + 10, 216);
      x += Math.max(44, item.length * 14 + 20) + 8;
      if (index < result.listA.length - 1) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('→', x, 216);
        x += 18;
      }
    });

    // 块间顺序由 clientID 决定：较小者的块在前（与条目标注相互印证）。
    const firstBlock = result.idA < result.idB ? 'A' : 'B';
    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(
      `蓝=客户端 A 的块，橙=客户端 B 的块 · 块间顺序：clientID 较小者在前（当前 ${firstBlock} 在前）`,
      24,
      268,
    );
    ctx.fillText(`A 侧合并事件 delta：${result.deltaA}`, 24, 288);

    emit({
      idA: result.idA,
      idB: result.idB,
      merged: result.listA.join(' → '),
      converged: converged ? '一致' : '不一致',
      firstBlock: `客户端 ${firstBlock} 的块在前`,
      deltaA: result.deltaA,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
