/**
 * 范例介绍：两个成员在同一文档上各跑一个 Presence，从 B 的视角看成员板实时更新。
 * 输入：status 是 A（小张）的状态通道取值；cursor 是 A 的光标位置通道取值。
 * 操作：调整控件会调用 presenceA.broadcast(通道, 值)；B 用 update / snapshot 事件刷新成员板。
 * 预期：B 的成员板显示 A 的昵称、状态与光标；改哪个通道就只广播哪个通道，整板无闪烁重建。
 * 阅读主线：channel 化的状态 + 心跳保活 + 快照补发，构成「持续在线状态」的完整生命周期。
 */
import { Repo, Presence, type PeerId, type PeerState } from '@automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// from/create 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type NoteDoc = { text: string };

const MEMBER_A_ID = 'member-a' as PeerId;
const MEMBER_B_ID = 'member-b' as PeerId;

// 实验台把心跳与遗忘阈值调快（真实默认为 15000ms / 45000ms），便于观察
const HEARTBEAT_MS = 1000;
const PEER_TTL_MS = 3000;

export type MemberStatus = '在线' | '离开';

export const MEMBER_STATUS_OPTIONS: MemberStatus[] = ['在线', '离开'];

export interface MembersLabArgs {
  status: MemberStatus;
  cursor: number;
}

export interface MembersLabSnapshot {
  rows: Array<[string, string]>;
}

export interface MembersLabInstance {
  update(options: MembersLabArgs): void;
  dispose(): void;
}

/** Presence 的状态按通道（channel）组织：每个通道独立更新、独立广播。 */
interface MemberState {
  name: string;
  status: MemberStatus;
  cursor: number;
}

interface LabResult {
  lines: string[];
  rows: Array<[string, string]>;
}

// 每个 lab 实例独占一个频道名：同一 Docs 页上还有其他 lab，互不串台
let channelSeq = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPeer(
  repo: Repo,
  peerId: PeerId,
  timeoutMs = 3000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (repo.peers.includes(peerId)) {
      return true;
    }
    await delay(25);
  }
  return false;
}

export function createMembersLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MembersLabSnapshot) => void,
): MembersLabInstance {
  const channelName = `ephemeral-members-lab-${++channelSeq}`;

  let presenceA: Presence<MemberState> | null = null;
  let presenceB: Presence<MemberState> | null = null;
  let repoA: Repo | null = null;
  let repoB: Repo | null = null;
  let lastApplied: MembersLabArgs | null = null;
  let lastEvent = '—';
  let board: string | null = null;
  let pending: Promise<void> = Promise.resolve();
  let disposed = false;

  function describeBoard(): string {
    const states: Record<string, PeerState<MemberState>> =
      presenceB?.getPeerStates().getStates() ?? {};
    const entries = Object.entries(states);
    if (entries.length === 0) {
      return '（还没看到其他成员）';
    }
    return entries
      .map(
        ([peerId, state]) =>
          `${state.value.name}（${peerId}）· ${state.value.status} · 光标 ${state.value.cursor}`,
      )
      .join('　｜　');
  }

  function refreshRows(): void {
    board = describeBoard();
    emit({
      rows: [
        ['B 视角的成员板', board ?? '（尚未启动）'],
        ['最近收到的事件', lastEvent],
        ['B 自己的本地状态', `小李 · ${presenceB?.getLocalState().status ?? '—'}`],
        ['心跳与遗忘阈值', `${HEARTBEAT_MS}ms / ${PEER_TTL_MS}ms（真实默认 15000 / 45000）`],
      ],
    });
  }

  function render(): void {
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
    drawingContext.fillText('成员板实验台（Presence）', 32, 44);

    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillStyle = '#334155';
    const lines = [
      `A（小张，${MEMBER_A_ID}）与 B（小李，${MEMBER_B_ID}）在同一文档上各跑一个 Presence`,
      'A.start 后立即广播全量快照（snapshot）；B 迟到，A 看到新 peer 会补发一次快照',
      '之后 A 每次改一个通道，B 只收到该通道的 update 消息',
      `B 的成员板：${board ?? '（等待中…）'}`,
    ];
    let y = 78;
    for (const line of lines) {
      drawingContext.fillText(line, 32, y);
      y += 23;
    }
  }

  async function setup(args: MembersLabArgs): Promise<void> {
    repoA = new Repo({
      peerId: MEMBER_A_ID,
      network: [new BroadcastChannelNetworkAdapter({ channelName })],
    });
    const handleA = repoA.create<NoteDoc>({ text: '协同文稿' });

    repoB = new Repo({
      peerId: MEMBER_B_ID,
      network: [new BroadcastChannelNetworkAdapter({ channelName })],
    });
    await waitForPeer(repoA, MEMBER_B_ID);
    await waitForPeer(repoB, MEMBER_A_ID);
    const handleB = await repoB.find<NoteDoc>(handleA.url);

    // Presence 创建后不活动，start() 才开始收发与心跳
    presenceA = new Presence<MemberState>({ handle: handleA });
    presenceA.start({
      initialState: { name: '小张', status: args.status, cursor: args.cursor },
      heartbeatMs: HEARTBEAT_MS,
      peerTtlMs: PEER_TTL_MS,
    });

    presenceB = new Presence<MemberState>({ handle: handleB });
    presenceB.start({
      initialState: { name: '小李', status: '在线', cursor: 0 },
      heartbeatMs: HEARTBEAT_MS,
      peerTtlMs: PEER_TTL_MS,
    });

    // B 视角逐条感知 A 的变化：snapshot 是全量，update 是单通道
    presenceB.on('snapshot', ({ peerId }) => {
      lastEvent = `snapshot（${peerId} 全量快照）`;
      refreshRows();
      render();
    });
    presenceB.on('update', ({ peerId, channel, value }) => {
      lastEvent = `update（${peerId} 的 ${String(channel)} 通道 -> ${String(value)}）`;
      refreshRows();
      render();
    });
    presenceB.on('heartbeat', ({ peerId }) => {
      lastEvent = `heartbeat（${peerId} 报平安）`;
      refreshRows();
    });
    presenceB.on('goodbye', ({ peerId }) => {
      lastEvent = `goodbye（${peerId} 告别下线）`;
      refreshRows();
      render();
    });
    presenceB.on('pruning', ({ pruned }) => {
      lastEvent = `pruning（${pruned.join(', ')} 超时被遗忘）`;
      refreshRows();
      render();
    });

    if (disposed) {
      // dispose 发生在 setup 过程中：立即收尾，避免泄漏频道与定时器
      teardown();
      return;
    }
    lastApplied = { ...args };
    refreshRows();
    render();
  }

  function teardown(): void {
    // stop 会广播 goodbye（对端立即移除自己）并停掉心跳与监听
    presenceA?.stop();
    presenceB?.stop();
    void repoA?.shutdown().catch(() => {});
    void repoB?.shutdown().catch(() => {});
    presenceA = null;
    presenceB = null;
    repoA = null;
    repoB = null;
  }

  const resizeObserver = createResizeObserver(canvas, render);

  return {
    update(options: MembersLabArgs): void {
      if (typeof BroadcastChannel === 'undefined') {
        board = null;
        emit({
          rows: [['B 视角的成员板', '当前环境没有 BroadcastChannel，无法运行本演示。']],
        });
        render();
        return;
      }
      pending = pending
        .then(async () => {
          if (disposed) {
            return;
          }
          if (!presenceA || !lastApplied) {
            await setup(options);
            return;
          }
          // 改哪个通道就只广播哪个通道：这是 presence.broadcast 与整包状态的区别
          if (options.status !== lastApplied.status) {
            presenceA.broadcast('status', options.status);
          }
          if (options.cursor !== lastApplied.cursor) {
            presenceA.broadcast('cursor', options.cursor);
          }
          lastApplied = { ...options };
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          board = `演示出错：${message}`;
          refreshRows();
        });
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      teardown();
    },
  };
}
