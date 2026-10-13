/**
 * 范例:看板的规范化模型 + fractional-indexing 排序键(rank)。
 * 演示:实体收进以 id 为键的 Y.Map,顺序降级为卡片上的 rank 字符串;
 *       两副本并发拖拽后互换更新,顺序必然收敛。
 * 输入:客户端 A / B 各自的拖拽动作(控件选择)。
 * 操作:每次控件变化,两副本从同一基线克隆,各自离线执行拖拽(rank 由本端
 *       视图算出),再互换 update 模拟 Provider 同步。
 * 预期:两副本顺序完全一致;不同卡拖到同一缝隙会算出同一个 rank,读数标出
 *       冲突与 (rank, id) tiebreak 的裁决;同一张卡两端同拖时 rank 键按
 *       clientID 大者覆盖(last-writer-wins)。
 * 阅读主线:createBaseline() 建实体表 → applyDrag() 写 rank → syncReplicas()
 *       互换 update → readView() 按列过滤并按 (rank, id) 排序 → draw()。
 */
import * as Y from 'yjs';
import { generateKeyBetween } from 'fractional-indexing';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 客户端 A 可选的拖拽动作。 */
export type DragActionA = 'none' | 'dev-to-end' | 'test-between' | 'dev-to-done';

/** 客户端 B 可选的拖拽动作。 */
export type DragActionB = 'none' | 'design-to-end' | 'test-to-front' | 'test-to-done';

export interface KanbanOptions {
  actionA: DragActionA;
  actionB: DragActionB;
}

export interface CardView {
  id: string;
  title: string;
  rank: string;
  /** 该卡被谁拖动过:A / B / 两端都拖(AB)/ 没人拖(null) */
  movedBy: 'A' | 'B' | 'AB' | null;
}

export interface ReplicaView {
  todo: CardView[];
  done: CardView[];
}

export interface KanbanSnapshot {
  /** A 副本的待办列顺序(标题) */
  orderA: string;
  /** B 副本的待办列顺序(标题) */
  orderB: string;
  /** 「收敛」或「不一致」 */
  converged: string;
  /** 同 rank 冲突描述;无冲突时为「无」 */
  conflict: string;
  viewA: ReplicaView;
  viewB: ReplicaView;
}

export interface KanbanInstance {
  update(options: KanbanOptions): void;
  dispose(): void;
}

/** 基线看板:待办列 设计(a0)/ 开发(a1)/ 测试(a2),已完成列 上线(a0)。 */
const BASELINE: Array<{ id: string; title: string; column: 'todo' | 'done'; rank: string }> = [
  { id: 't1', title: '设计', column: 'todo', rank: 'a0' },
  { id: 't2', title: '开发', column: 'todo', rank: 'a1' },
  { id: 't3', title: '测试', column: 'todo', rank: 'a2' },
  { id: 'd1', title: '上线', column: 'done', rank: 'a0' },
];

const TITLE_BY_ID = new Map(BASELINE.map((card) => [card.id, card.title]));

const CLIENT_A = 1001;
const CLIENT_B = 2002;

interface Replica {
  doc: Y.Doc;
  cards: Y.Map<Y.Map<unknown>>;
}

/** 基线文档:实体表(Y.Map: id → 卡片 Y.Map) + 每张卡的 rank 键,一个事务写入。 */
function createBaseline(): Y.Doc {
  const doc = new Y.Doc();
  const cards = doc.getMap<Y.Map<unknown>>('cards');
  doc.transact(() => {
    for (const card of BASELINE) {
      const entity = new Y.Map<unknown>();
      entity.set('title', card.title);
      entity.set('column', card.column);
      entity.set('rank', card.rank);
      cards.set(card.id, entity);
    }
  });
  return doc;
}

/** 两副本从同一基线克隆——模拟 Provider 完成初始同步后的状态。 */
function cloneReplica(origin: Y.Doc, clientID: number): Replica {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(origin));
  // 演示用固定 clientID;真实项目由 yjs 随机分配,不要依赖大小
  doc.clientID = clientID;
  return { doc, cards: doc.getMap<Y.Map<unknown>>('cards') };
}

/** 某一列的卡片,按 (rank, id) 排序——tiebreak 让顺序与 Y.Map 遍历序无关。 */
function sortedColumn(replica: Replica, column: string): Array<{ id: string; rank: string }> {
  const out: Array<{ id: string; rank: string }> = [];
  replica.cards.forEach((entity, id) => {
    if (entity.get('column') === column) {
      out.push({ id, rank: entity.get('rank') as string });
    }
  });
  return out.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank < b.rank ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
}

function rankOf(replica: Replica, cardId: string): string | null {
  const entity = replica.cards.get(cardId);
  return entity ? (entity.get('rank') as string) : null;
}

/**
 * 拖拽落点:取目标缝隙前后邻居的 rank,generateKeyBetween 生成新键;
 * 跨列时连同 column 一起改,一个事务完成一次「拖拽」。
 */
function applyDrag(
  replica: Replica,
  cardId: string,
  prevRank: string | null,
  nextRank: string | null,
  column: string,
): void {
  const entity = replica.cards.get(cardId);
  if (!entity) return;
  replica.doc.transact(() => {
    entity.set('rank', generateKeyBetween(prevRank, nextRank));
    entity.set('column', column);
  });
}

/** 拖到某列末尾(含跨列):前邻居从本副本当前视图计算,null 表示空列。 */
function dragToEnd(replica: Replica, cardId: string, column: string): void {
  const rest = sortedColumn(replica, column).filter((card) => card.id !== cardId);
  const prev = rest.length > 0 ? rest[rest.length - 1].rank : null;
  applyDrag(replica, cardId, prev, null, column);
}

/** 拖到某列最前。 */
function dragToFront(replica: Replica, cardId: string, column: string): void {
  const rest = sortedColumn(replica, column).filter((card) => card.id !== cardId);
  const next = rest.length > 0 ? rest[0].rank : null;
  applyDrag(replica, cardId, null, next, column);
}

function applyActionA(replica: Replica, action: DragActionA): string | null {
  switch (action) {
    case 'dev-to-end':
      dragToEnd(replica, 't2', 'todo');
      return 't2';
    case 'test-between':
      // 测试插到「设计与开发之间」:取两张邻居卡当前的 rank 求中点
      applyDrag(replica, 't3', rankOf(replica, 't1'), rankOf(replica, 't2'), 'todo');
      return 't3';
    case 'dev-to-done':
      dragToEnd(replica, 't2', 'done');
      return 't2';
    default:
      return null;
  }
}

function applyActionB(replica: Replica, action: DragActionB): string | null {
  switch (action) {
    case 'design-to-end':
      dragToEnd(replica, 't1', 'todo');
      return 't1';
    case 'test-to-front':
      dragToFront(replica, 't3', 'todo');
      return 't3';
    case 'test-to-done':
      dragToEnd(replica, 't3', 'done');
      return 't3';
    default:
      return null;
  }
}

/** 双向互换 update,模拟实时同步完成后的状态。 */
function syncReplicas(a: Replica, b: Replica): void {
  Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
  Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc));
}

function readView(replica: Replica, movedA: string | null, movedB: string | null): ReplicaView {
  const movedBy = (id: string): CardView['movedBy'] => {
    if (id === movedA && id === movedB) return 'AB';
    if (id === movedA) return 'A';
    if (id === movedB) return 'B';
    return null;
  };
  const build = (column: string): CardView[] =>
    sortedColumn(replica, column).map(({ id, rank }) => ({
      id,
      rank,
      title: TITLE_BY_ID.get(id) ?? id,
      movedBy: movedBy(id),
    }));
  return { todo: build('todo'), done: build('done') };
}

function viewSignature(view: ReplicaView): string {
  return JSON.stringify([
    view.todo.map((card) => card.id),
    view.done.map((card) => card.id),
  ]);
}

/** 找同列内 rank 相同的卡片组,给出冲突与裁决说明。 */
function describeConflict(view: ReplicaView): string {
  const parts: string[] = [];
  for (const [column, label] of [
    ['todo', '待办'],
    ['done', '已完成'],
  ] as const) {
    const byRank = new Map<string, string[]>();
    for (const card of view[column]) {
      const list = byRank.get(card.rank) ?? [];
      list.push(card.title);
      byRank.set(card.rank, list);
    }
    for (const [rank, titles] of byRank) {
      if (titles.length > 1) {
        parts.push(`${label}列:${titles.map((t) => `「${t}」`).join('')}同为 ${rank},按 id 决出先后`);
      }
    }
  }
  return parts.length > 0 ? parts.join(';') : '无';
}

function replay(options: KanbanOptions): KanbanSnapshot {
  const origin = createBaseline();
  const replicaA = cloneReplica(origin, CLIENT_A);
  const replicaB = cloneReplica(origin, CLIENT_B);

  const movedA = applyActionA(replicaA, options.actionA);
  const movedB = applyActionB(replicaB, options.actionB);
  syncReplicas(replicaA, replicaB);

  const viewA = readView(replicaA, movedA, movedB);
  const viewB = readView(replicaB, movedA, movedB);
  const joined = (column: CardView[]): string => column.map((card) => card.title).join(' → ');

  return {
    orderA: joined(viewA.todo) || '空',
    orderB: joined(viewB.todo) || '空',
    converged: viewSignature(viewA) === viewSignature(viewB) ? '收敛' : '不一致',
    conflict: describeConflict(viewA),
    viewA,
    viewB,
  };
}

const MOVED_STYLE: Record<NonNullable<CardView['movedBy']>, { border: string; fill: string; text: string }> = {
  A: { border: '#4f7cff', fill: '#eef4ff', text: '#1d4ed8' },
  B: { border: '#f59e0b', fill: '#fff7e8', text: '#b45309' },
  AB: { border: '#8b5cf6', fill: '#f3efff', text: '#6d28d9' },
};

export function createKanbanRank(
  canvas: HTMLCanvasElement,
  emit: (snapshot: KanbanSnapshot) => void,
): KanbanInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  let current: KanbanOptions = { actionA: 'dev-to-end', actionB: 'design-to-end' };
  let snapshot: KanbanSnapshot = replay(current);

  function drawColumn(
    x: number,
    y: number,
    columnWidth: number,
    label: string,
    cards: CardView[],
  ): number {
    const headerHeight = 24;
    const cardHeight = 34;
    const cardGap = 7;
    const bodyHeight = Math.max(cards.length, 1) * (cardHeight + cardGap) + 6;

    g.fillStyle = '#eef2f7';
    g.beginPath();
    g.roundRect(x, y, columnWidth, headerHeight + bodyHeight, 8);
    g.fill();

    g.fillStyle = '#334155';
    g.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    g.fillText(label, x + 10, y + 16);

    cards.forEach((card, index) => {
      const cardY = y + headerHeight + 6 + index * (cardHeight + cardGap);
      const style = card.movedBy ? MOVED_STYLE[card.movedBy] : { border: '#cbd5e1', fill: '#ffffff', text: '#172033' };
      g.fillStyle = style.fill;
      g.strokeStyle = style.border;
      g.lineWidth = card.movedBy ? 1.8 : 1.2;
      g.beginPath();
      g.roundRect(x + 6, cardY, columnWidth - 12, cardHeight, 6);
      g.fill();
      g.stroke();

      g.fillStyle = style.text;
      g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      g.fillText(card.title, x + 16, cardY + 22);

      g.fillStyle = '#94a3b8';
      g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.textAlign = 'right';
      g.fillText(card.rank, x + columnWidth - 14, cardY + 21);
      g.textAlign = 'left';
    });

    if (cards.length === 0) {
      g.fillStyle = '#94a3b8';
      g.font = '12px ui-sans-serif, system-ui, sans-serif';
      g.fillText('空', x + 16, y + headerHeight + 26);
    }

    return headerHeight + bodyHeight;
  }

  function drawReplica(panelX: number, panelWidth: number, view: ReplicaView): void {
    const columnWidth = (panelWidth - 12) / 2;
    drawColumn(panelX, 72, columnWidth, '待办', view.todo);
    drawColumn(panelX + columnWidth + 12, 72, columnWidth, '已完成', view.done);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = 330;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    g.fillStyle = '#172033';
    g.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    g.fillText('两副本各自离线拖拽,互换更新后顺序收敛', 24, 32);

    g.fillStyle = '#475569';
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillText(
      '蓝框 = A 拖动 · 橙框 = B 拖动 · 紫框 = 两端都拖 · 卡片右侧灰字为 rank(列内字典序)',
      24,
      56,
    );

    const panelWidth = width / 2 - 36;
    drawReplica(24, panelWidth, snapshot.viewA);
    drawReplica(width / 2 + 12, panelWidth, snapshot.viewB);

    g.fillStyle = snapshot.conflict === '无' ? '#475569' : '#b45309';
    g.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    g.fillText(
      snapshot.conflict === '无'
        ? '本场景无同 rank 冲突:各卡 rank 互不相同,顺序直接由字典序决定'
        : `同缝隙并发撞键 —— ${snapshot.conflict}`,
      24,
      height - 16,
    );

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      snapshot = replay(options);
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
