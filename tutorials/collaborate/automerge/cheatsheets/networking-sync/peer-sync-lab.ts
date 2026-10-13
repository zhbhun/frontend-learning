/**
 * 范例介绍：同一页面里用 MessageChannel 互联两个 Repo，观察文档与变更如何自动收敛。
 * 输入：action 选择下一步操作——connect 建立连接、create-a 创建文档、edit-a / edit-b 修改对应副本。
 * 操作：MessageChannel 两端各接一个 Repo -> left 创建文档并自动 announce -> right 不调用任何搬运 API
 * 直接获得 -> 双方交替修改并对比两侧 heads。
 * 预期：握手后互认 peer；文档创建即推送给对端；任意一侧 change 之后约百毫秒，
 * 两侧标题与 heads 完全一致（收敛）；right 触发的 change 事件不区分本地与远端变更。
 * 阅读主线：画布按时间记录握手、推送、变更到达与收敛判定，读数行实时对比两侧副本。
 */
import { Repo, type DocHandle, type PeerId } from '@automerge/automerge-repo';
import { MessageChannelNetworkAdapter } from '@automerge/automerge-repo-network-messagechannel';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// from/create 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type SharedDoc = { title: string };

export type PeerSyncAction = 'connect' | 'create-a' | 'edit-a' | 'edit-b';

export const PEER_SYNC_ACTIONS: PeerSyncAction[] = [
  'connect',
  'create-a',
  'edit-a',
  'edit-b',
];

export interface PeerSyncLabArgs {
  action: PeerSyncAction;
}

export interface PeerSyncLabSnapshot {
  rows: Array<[string, string]>;
}

export interface PeerSyncLabInstance {
  update(options: PeerSyncLabArgs): void;
  dispose(): void;
}

// Repo 发同步消息前有 100ms 防抖，等消息往返完成再读数
const SYNC_SETTLE_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shortUrl(url: string): string {
  const [scheme, docId] = url.split(':');
  return `${scheme}:${docId.slice(0, 8)}…`;
}

function formatHeads(heads: readonly string[]): string {
  return heads.length > 0 ? heads.map((h) => h.slice(0, 8)).join(' + ') : '空';
}

function sameHeads(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  return a !== undefined && b !== undefined && JSON.stringify(a) === JSON.stringify(b);
}

class PeerSyncLab {
  readonly lines: string[] = [];
  leftRepo?: Repo;
  rightRepo?: Repo;
  leftHandle?: DocHandle<SharedDoc>;
  rightHandle?: DocHandle<SharedDoc>;
  #editCount = 0;
  #disposed = false;

  rows(): Array<[string, string]> {
    const connected = (this.leftRepo?.peers.length ?? 0) > 0;
    const leftTitle = this.leftHandle?.doc()?.title ?? '—（尚未创建）';
    const rightTitle = this.rightHandle?.doc()?.title ?? '—（尚未创建）';
    const converged = sameHeads(this.leftHandle?.heads(), this.rightHandle?.heads());
    return [
      [
        '连接状态',
        connected
          ? `left ⇄ right（已连接 ${this.leftRepo?.peers.length} 个 peer）`
          : '未连接',
      ],
      ['副本 left 标题', leftTitle],
      ['副本 right 标题', rightTitle],
      [
        '收敛状态',
        converged === false
          ? 'heads 不一致：同步中'
          : converged
            ? '两侧 heads 一致：已收敛'
            : '—（文档尚未就绪）',
      ],
    ];
  }

  #log(line: string): void {
    this.lines.push(`[${this.lines.length + 1}] ${line}`);
  }

  async runAction(action: PeerSyncAction): Promise<void> {
    if (this.#disposed) {
      return;
    }
    switch (action) {
      case 'connect':
        await this.#connect();
        break;
      case 'create-a':
        await this.#createOnLeft();
        break;
      case 'edit-a':
        await this.#edit('left');
        break;
      case 'edit-b':
        await this.#edit('right');
        break;
    }
  }

  async #connect(): Promise<void> {
    if (this.leftRepo) {
      this.#log('连接已建立：connect 只执行一次，重复选择被忽略');
      return;
    }
    this.#log('new MessageChannel()：两个 port 分别接到 left 与 right 的适配器上');
    const channel = new MessageChannel();
    const leftAdapter = new MessageChannelNetworkAdapter(channel.port1);
    const rightAdapter = new MessageChannelNetworkAdapter(channel.port2);
    this.leftRepo = new Repo({ peerId: 'left' as PeerId, network: [leftAdapter] });
    this.rightRepo = new Repo({ peerId: 'right' as PeerId, network: [rightAdapter] });
    // 握手：适配器互发 arrive / welcome，Repo 随之收到 peer-candidate
    await delay(200);
    const peers = this.leftRepo.peers;
    this.#log(
      peers.length > 0
        ? `握手完成（arrive → welcome）：left 看到 peer ${peers.join('、')}`
        : '握手仍在进行（适配器最多等 100ms 就标记就绪）',
    );
    this.#log('默认共享策略对同伴慷慨：此后所有文档自动互通，无需逐份搬运');
  }

  async #createOnLeft(): Promise<void> {
    if (!this.leftRepo || !this.rightRepo) {
      this.#log('请先执行 connect 建立连接');
      return;
    }
    if (this.leftHandle) {
      this.#log('文档已存在，URL 不变（create 不重复执行）');
      return;
    }
    const handle = this.leftRepo.create<SharedDoc>({ title: '共享待办' });
    this.leftHandle = handle;
    this.#log(`left.create() -> ${shortUrl(handle.url)}：新文档 announce 给所有 peer`);
    await delay(SYNC_SETTLE_MS);
    const arrived = Boolean(this.rightRepo.handles[handle.documentId]);
    this.#log(
      arrived
        ? 'right 未调用任何搬运 API，handles 里已出现同一 documentId（announce 主动推送）'
        : 'right 尚未收到文档（同步仍在进行）',
    );
    // 文档已被推送就绪，find 立即兑现；它是按 URL 找回文档的正式入口
    this.rightHandle = await this.rightRepo.find<SharedDoc>(handle.url);
    this.#log('right.find(url) -> 立即就绪：文档已在本地');
    // change 事件对本地与远端变更一视同仁（见 2.1 课程）
    this.rightHandle.on('change', () => {
      this.#log('right 触发 change 事件（远端变更同样触发，不区分来源）');
    });
  }

  async #edit(side: 'left' | 'right'): Promise<void> {
    const handle = side === 'left' ? this.leftHandle : this.rightHandle;
    const other = side === 'left' ? this.rightHandle : this.leftHandle;
    if (!handle || !other) {
      this.#log('请先执行 create-a 创建文档');
      return;
    }
    this.#editCount += 1;
    const title = `改自 ${side} · 第 ${this.#editCount} 次`;
    handle.change((d) => {
      d.title = title;
    });
    this.#log(`${side}.change() -> "${title}"`);
    await delay(SYNC_SETTLE_MS);
    const converged = sameHeads(handle.heads(), other.heads());
    this.#log(
      converged
        ? `两侧 heads 相等（${formatHeads(handle.heads())}）-> 已收敛`
        : '两侧 heads 尚不一致，同步仍在进行',
    );
  }

  dispose(): void {
    this.#disposed = true;
    this.leftRepo?.shutdown().catch(() => {});
    this.rightRepo?.shutdown().catch(() => {});
  }
}

function renderLab(canvas: HTMLCanvasElement, lines: string[]): void {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;
  const size = readCanvasSize(canvas);
  const width = Math.max(320, size.width);
  const height = Math.max(240, size.height);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawingContext.clearRect(0, 0, width, height);

  drawingContext.fillStyle = '#172033';
  drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
  drawingContext.fillText('同页双副本实验台（MessageChannel）', 32, 44);

  drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawingContext.fillStyle = '#334155';
  let y = 78;
  for (const line of lines.slice(-14)) {
    drawingContext.fillText(line, 32, y);
    y += 23;
  }
}

export function createPeerSyncLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PeerSyncLabSnapshot) => void,
): PeerSyncLabInstance {
  const lab = new PeerSyncLab();
  let pending: Promise<void> = Promise.resolve();
  let disposed = false;

  function render(): void {
    if (lab.lines.length > 0) {
      renderLab(canvas, lab.lines);
    }
  }

  const resizeObserver = createResizeObserver(canvas, render);

  return {
    update(options: PeerSyncLabArgs): void {
      // 每个操作含异步等待，串行执行避免两次调整交叉
      pending = pending.then(async () => {
        if (disposed) {
          return;
        }
        await lab.runAction(options.action);
        render();
        emit({ rows: lab.rows() });
      });
    },
    dispose() {
      disposed = true;
      lab.dispose();
      resizeObserver.disconnect();
    },
  };
}
