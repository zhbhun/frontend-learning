/**
 * 范例：Y.Map 键冲突合并。
 * 演示：两个离线副本并发写同一个键，互换更新后所有副本收敛到同一个值。
 * 输入：客户端 A / B 各自写入的值；「交换 clientID」对调两边固定的 clientID。
 * 操作：每次控件变化都整体重算——重建两个 Y.Doc，离线并发写，再双向同步。
 * 预期：两副本读数始终一致；胜者固定是 clientID 较大的一方；
 *       值被改写的一侧收到 update 事件并带 oldValue，胜出的一侧 observe 触发但无净变化。
 * 主线：buildMerge() 建副本与观察 → 离线并发写 → applyUpdate 双向同步 → 读收敛结果。
 */
import * as Y from 'yjs';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface MapKeyConflictOptions {
  valueA: string;
  valueB: string;
  swapIds: boolean;
}

export interface MapKeyConflictSnapshot {
  idA: number;
  idB: number;
  mergedA: string;
  mergedB: string;
  converged: string;
  winner: string;
  eventA: string;
  eventB: string;
}

export interface MapKeyConflictInstance {
  update(options: MapKeyConflictOptions): void;
  dispose(): void;
}

const KEY = 'title';

interface MergeOutcome {
  merged: string;
  eventSummary: string;
}

interface MergeResult {
  a: MergeOutcome;
  b: MergeOutcome;
  idA: number;
  idB: number;
}

/** 把两个副本互换一次更新，等价于 Provider 做的双向同步。 */
function syncPeers(docA: Y.Doc, docB: Y.Doc): void {
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB)));
  Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA)));
}

/** 读取一次合并事件的载荷：键级 action 与 oldValue。 */
function summarizeEvent(event: Y.YMapEvent<unknown>): string {
  const parts: string[] = [];
  event.changes.keys.forEach((change, key) => {
    parts.push(`${key}: ${change.action}, oldValue=${JSON.stringify(change.oldValue)}`);
  });
  if (parts.length === 0) {
    return 'observe 触发，changes.keys 为空（本侧值未变）';
  }
  return parts.join('；');
}

function buildMerge(options: MapKeyConflictOptions): MergeResult {
  // 为让结果可核对，两个副本使用固定 clientID；「交换 clientID」只是对调它们。
  // 真实应用里 clientID 由 yjs 随机分配，不要依赖谁来赢。
  const idA = options.swapIds ? 2000 : 1000;
  const idB = options.swapIds ? 1000 : 2000;
  const docA = new Y.Doc();
  const docB = new Y.Doc();
  docA.clientID = idA;
  docB.clientID = idB;

  // 先同步一次空状态，让两个副本拥有共同起点，之后的写入才算并发。
  syncPeers(docA, docB);

  const outcomes: { a: MergeOutcome; b: MergeOutcome } = {
    a: { merged: '', eventSummary: '（未收到远端更新）' },
    b: { merged: '', eventSummary: '（未收到远端更新）' },
  };

  // 离线并发写同一个键。
  docA.getMap('card').set(KEY, options.valueA);
  docB.getMap('card').set(KEY, options.valueB);

  // 本地写入之后再挂观察，捕获到的就是「应用远端更新」那一刻的合并事件。
  docA.getMap('card').observe((event) => {
    outcomes.a.eventSummary = summarizeEvent(event);
  });
  docB.getMap('card').observe((event) => {
    outcomes.b.eventSummary = summarizeEvent(event);
  });

  syncPeers(docA, docB);

  outcomes.a.merged = String(docA.getMap('card').get(KEY));
  outcomes.b.merged = String(docB.getMap('card').get(KEY));
  return { ...outcomes, idA, idB };
}

export function createMapKeyConflict(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MapKeyConflictSnapshot) => void,
): MapKeyConflictInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: MapKeyConflictOptions = {
    valueA: '披萨',
    valueB: '面条',
    swapIds: false,
  };

  function drawPeerCard(
    x: number,
    label: string,
    clientID: number,
    value: string,
    isWinner: boolean,
  ) {
    ctx.fillStyle = isWinner ? '#eef2ff' : '#f8fafc';
    ctx.strokeStyle = isWinner ? '#4f7cff' : '#cbd5e1';
    ctx.lineWidth = isWinner ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x, 72, 300, 88, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#172033';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`${label} · clientID ${clientID}`, x + 16, 100);
    ctx.fillStyle = '#475569';
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`ymap.set('${KEY}', ${JSON.stringify(value)})`, x + 16, 126);
    if (isWinner) {
      ctx.fillStyle = '#4f7cff';
      ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('✓ 胜出（clientID 较大）', x + 16, 148);
    }
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
    const aWins = result.idA > result.idB;

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('两个离线副本并发写同一个键，互换更新后合并', 24, 40);

    drawPeerCard(24, '客户端 A', result.idA, current.valueA, aWins);
    drawPeerCard(348, '客户端 B', result.idB, current.valueB, !aWins);

    ctx.fillStyle = '#ecfdf5';
    ctx.strokeStyle = '#34d399';
    ctx.beginPath();
    ctx.roundRect(24, 184, 624, 56, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#065f46';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    const converged = result.a.merged === result.b.merged;
    ctx.fillText(
      `合并后：A 看到 ${JSON.stringify(result.a.merged)}，B 看到 ${JSON.stringify(result.b.merged)} · ${converged ? '两副本一致' : '不一致！'}`,
      40,
      218,
    );

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`A 侧合并事件：${result.a.eventSummary}`, 24, 268);
    ctx.fillText(`B 侧合并事件：${result.b.eventSummary}`, 24, 288);

    emit({
      idA: result.idA,
      idB: result.idB,
      mergedA: result.a.merged,
      mergedB: result.b.merged,
      converged: converged ? '一致' : '不一致',
      winner: `客户端 ${aWins ? 'A' : 'B'}（clientID ${Math.max(result.idA, result.idB)} 较大）`,
      eventA: result.a.eventSummary,
      eventB: result.b.eventSummary,
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
