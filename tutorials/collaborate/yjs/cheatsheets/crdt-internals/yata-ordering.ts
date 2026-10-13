/**
 * 范例:YATA 并发插入定序推演。
 * 演示:两个客户端从共同基线 'ab' 分叉,都在 a|b 之间并发插入一段文本,互换
 *       update 后排出同一条 item 链——同锚点并发按 clientID 升序决胜。
 * 输入:客户端 A / B 各自插入的文本;「交换 clientID」对调两端的固定 clientID。
 * 操作:每次控件变化整体重算:重建基线 → 双端离线并发插入 → 互换 update → 读链。
 * 预期:两副本文本一致;分叉时两条新 item 的 origin / rightOrigin 完全相同;
 *       合并后 clientID 小者的 item 在前,交换 clientID 后顺序反转。
 * 阅读主线:replay() 建基线与两个副本 → 离线插入 → 互换 → walkChain() 沿
 *       `_start` 链读出文档序 item → draw() 画基线、分叉、合并三条链。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface YataOrderingOptions {
  /** 客户端 A 并发插入的文本 */
  insertA: string;
  /** 客户端 B 并发插入的文本 */
  insertB: string;
  /** 对调 A / B 的固定 clientID,观察定序随之反转 */
  swapIds: boolean;
}

export interface YataOrderingSnapshot {
  idA: number;
  idB: number;
  textA: string;
  textB: string;
  converged: string;
  verdict: string;
}

export interface YataOrderingInstance {
  update(options: YataOrderingOptions): void;
  dispose(): void;
}

type Owner = 'base' | 'a' | 'b';

/** 文档序的一条 item;origin 是它声称的「插入点左侧 item」的 ID。 */
interface ChainNode {
  client: number;
  clock: number;
  length: number;
  text: string;
  owner: Owner;
  origin: { client: number; clock: number } | null;
}

const BASE_CLIENT = 1;
const BASE_TEXT = 'ab';

const PALETTE: Record<Owner, { bg: string; border: string; text: string }> = {
  base: { bg: '#f1f5f9', border: '#94a3b8', text: '#334155' },
  a: { bg: '#eef4ff', border: '#4f7cff', text: '#1d4ed8' },
  b: { bg: '#fff7ed', border: '#f59e0b', text: '#b45309' },
};

/**
 * 沿 AbstractType._start 把文档序的 item 链读出来。
 * Item / _start 就是本课讲解的内部结构(见 INTERNALS.md),这里只读取不修改。
 */
function walkChain(doc: Y.Doc, owners: Map<number, Owner>): ChainNode[] {
  const nodes: ChainNode[] = [];
  let node: Y.Item | null = doc.getText('t')._start;
  while (node !== null) {
    const origin = node.origin;
    nodes.push({
      client: node.id.client,
      clock: node.id.clock,
      length: node.length,
      text: node.content
        .getContent()
        .map((part) => String(part))
        .join(''),
      owner: owners.get(node.id.client) ?? 'base',
      origin: origin ? { client: origin.client, clock: origin.clock } : null,
    });
    node = node.right;
  }
  return nodes;
}

interface ReplayResult {
  idA: number;
  idB: number;
  beforeA: ChainNode[];
  beforeB: ChainNode[];
  merged: ChainNode[];
  textA: string;
  textB: string;
  winner: Owner | null;
}

function replay(options: YataOrderingOptions): ReplayResult {
  const textA = options.insertA.trim().length > 0 ? options.insertA : 'X';
  const textB = options.insertB.trim().length > 0 ? options.insertB : 'Y';
  const idA = options.swapIds ? 200 : 100;
  const idB = options.swapIds ? 100 : 200;

  // 共同基线:第三方客户端一次写入 'ab',全量同步给 A、B,模拟此前已同步。
  const base = new Y.Doc();
  base.clientID = BASE_CLIENT;
  base.getText('t').insert(0, BASE_TEXT);
  const baseUpdate = Y.encodeStateAsUpdate(base);

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  docA.clientID = idA;
  docB.clientID = idB;
  Y.applyUpdate(docA, baseUpdate);
  Y.applyUpdate(docB, baseUpdate);

  const owners = new Map<number, Owner>([
    [BASE_CLIENT, 'base'],
    [idA, 'a'],
    [idB, 'b'],
  ]);

  // 离线并发:两端都在 a|b 之间(索引 1)插入,产生的 item 锚点完全相同。
  docA.getText('t').insert(1, textA);
  docB.getText('t').insert(1, textB);
  const beforeA = walkChain(docA, owners);
  const beforeB = walkChain(docB, owners);

  // 互换 update:YATA 在 Item#integrate 里定序,两个副本得到同一条链。
  Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

  const merged = walkChain(docA, owners);
  const winner =
    merged.find((node) => node.owner === 'a' || node.owner === 'b')?.owner ??
    null;

  return {
    idA,
    idB,
    beforeA,
    beforeB,
    merged,
    textA: docA.getText('t').toString(),
    textB: docB.getText('t').toString(),
    winner,
  };
}

export function createYataOrdering(
  canvas: HTMLCanvasElement,
  emit: (snapshot: YataOrderingSnapshot) => void,
): YataOrderingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  let current: YataOrderingOptions = {
    insertA: 'X',
    insertB: 'Y',
    swapIds: false,
  };
  let result: ReplayResult = replay(current);

  /** 画一条 item 链;withOrigin 为 true 时给非基线 item 标注 origin。 */
  function drawChain(x: number, y: number, nodes: ChainNode[], withOrigin: boolean): number {
    let cursor = x;
    nodes.forEach((node, index) => {
      const palette = PALETTE[node.owner];
      const label = `(${node.client},${node.clock})`;
      const shown = node.text.length > 6 ? `${node.text.slice(0, 5)}…` : node.text;
      const boxWidth = Math.max(46, shown.length * 16 + 22);
      g.fillStyle = palette.bg;
      g.strokeStyle = palette.border;
      g.lineWidth = node.owner === 'base' ? 1 : 2;
      g.beginPath();
      g.roundRect(cursor, y, boxWidth, 48, 7);
      g.fill();
      g.stroke();

      const text = shown;
      g.fillStyle = palette.text;
      g.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.textAlign = 'center';
      g.fillText(text, cursor + boxWidth / 2, y + 21);
      g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(label, cursor + boxWidth / 2, y + 38);

      if (withOrigin && node.owner !== 'base' && node.origin) {
        g.fillStyle = '#64748b';
        g.fillText(`origin→(${node.origin.client},${node.origin.clock})`, cursor + boxWidth / 2, y + 62);
      }
      g.textAlign = 'left';

      cursor += boxWidth;
      if (index < nodes.length - 1) {
        g.fillStyle = '#94a3b8';
        g.fillText('→', cursor + 3, y + 27);
        cursor += 20;
      }
    });
    return cursor;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = 450;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);
    g.lineWidth = 1;

    g.fillStyle = '#172033';
    g.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    g.fillText('同位并发插入:分叉 → 互换 update → 排出同一条链', 24, 32);

    // 第 1 行:共同基线。插入发生前,'ab' 是一条 item。
    g.fillStyle = '#475569';
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillText('共同基线(client 1 一次写入)', 24, 68);
    g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText('一次插入 = 一条 item(clock 0,长度 2)', 300, 68);
    drawChain(24, 78, [
      { client: BASE_CLIENT, clock: 0, length: BASE_TEXT.length, text: BASE_TEXT, owner: 'base', origin: null },
    ], false);

    // 第 2 行:分叉。两端在索引 1 各插一段,锚点完全相同。
    const halfWidth = width / 2;
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#1d4ed8';
    g.fillText(`客户端 A 离线插入(clientID ${result.idA})`, 24, 172);
    g.fillStyle = '#b45309';
    g.fillText(`客户端 B 离线插入(clientID ${result.idB})`, halfWidth + 8, 172);
    drawChain(24, 182, result.beforeA, true);
    drawChain(halfWidth + 8, 182, result.beforeB, true);

    g.fillStyle = '#475569';
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillText(
      '两条新 item 的 origin 都指向 a(1,0)、rightOrigin 都指向 b(1,1)——插入意图相同 → 需要 clientID 决胜',
      24,
      262,
    );

    // 第 3 行:互换后,两副本视角相同(只画 A 视角,链与 B 一致)。
    g.fillStyle = '#475569';
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillText('互换 update 后(A 与 B 视角相同)', 24, 306);
    drawChain(24, 316, result.merged, false);

    const winnerOwner = result.winner;
    const winnerName = winnerOwner === 'a' ? 'A' : winnerOwner === 'b' ? 'B' : '—';
    const winnerId = winnerOwner === 'a' ? result.idA : winnerOwner === 'b' ? result.idB : 0;
    g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#475569';
    g.fillText(
      `同锚点并发 → clientID 小者在前:客户端 ${winnerName}(${winnerId})的 item 排在前面`,
      24,
      392,
    );

    const converged = result.textA === result.textB;
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = converged ? '#059669' : '#dc2626';
    g.fillText(
      `A 视角 '${result.textA}' · B 视角 '${result.textB}' → 两副本${converged ? '收敛一致' : '不一致!'}`,
      24,
      426,
    );

    emit({
      idA: result.idA,
      idB: result.idB,
      textA: result.textA,
      textB: result.textB,
      converged: converged ? '一致' : '不一致',
      verdict: `clientID 小者在前:客户端 ${winnerName}(${winnerId})`,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      result = replay(options);
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
