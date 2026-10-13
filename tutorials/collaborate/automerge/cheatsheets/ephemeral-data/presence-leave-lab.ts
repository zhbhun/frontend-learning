/**
 * 范例介绍：成员离场的两种样子——stop() 告别（goodbye）与断网不告别（超时修剪）。
 * 输入：leaveWay 选「stop 告别」或「断网不告别（模拟断电）」。
 * 操作：A（小张）与 B（小李）互见后，A 按所选方式离场；B 依据 goodbye 事件或 pruning 修剪把 A 移出成员板。
 * 预期：goodbye 让 B 立即移除 A；断网没有 goodbye，B 要等 peerTtlMs 超时才把 A 修剪掉。
 * 阅读主线：优雅离场靠 goodbye，异常离场靠 TTL——这是 Presence 成员生命周期的两条退出路径。
 */
import {
  Repo,
  Presence,
  type PeerId,
} from '@automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// from/create 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type NoteDoc = { text: string };

const LEAVER_ID = 'leaver-a' as PeerId;
const OBSERVER_ID = 'observer-b' as PeerId;

// 实验台把心跳与遗忘阈值调快（真实默认为 15000ms / 45000ms），修剪约 1.2 秒内可见
const HEARTBEAT_MS = 300;
const PEER_TTL_MS = 1200;

export type LeaveWay = 'goodbye' | 'crash';

export const LEAVE_WAY_OPTIONS: LeaveWay[] = ['goodbye', 'crash'];

export interface LeaveLabArgs {
  leaveWay: LeaveWay;
}

export interface LeaveLabSnapshot {
  rows: Array<[string, string]>;
}

export interface LeaveLabInstance {
  update(options: LeaveLabArgs): void;
  dispose(): void;
}

interface MemberState {
  name: string;
  status: string;
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

export function createLeaveLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LeaveLabSnapshot) => void,
): LeaveLabInstance {
  const baseChannel = `ephemeral-leave-lab-${++channelSeq}`;
  // 离场实验每换一次参数就完整重跑一轮，用独立频道避免上一轮的成员残留
  let runSeq = 0;

  let pending: Promise<void> = Promise.resolve();
  let disposed = false;
  let lastResult: LabResult | null = null;

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
    drawingContext.fillText('离场方式实验台（goodbye 与超时修剪）', 32, 44);

    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillStyle = '#334155';
    let y = 78;
    for (const line of lastResult?.lines ?? ['正在准备演示…']) {
      drawingContext.fillText(line, 32, y);
      y += 23;
    }
  }

  /** 跑一轮完整生命周期：互见 -> A 离场 -> B 移除 A。 */
  async function runOnce(args: LeaveLabArgs): Promise<LabResult> {
    const lines: string[] = [];
    const channelName = `${baseChannel}-${++runSeq}`;

    const repoA = new Repo({
      peerId: LEAVER_ID,
      network: [new BroadcastChannelNetworkAdapter({ channelName })],
    });
    const handleA = repoA.create<NoteDoc>({ text: '协同文稿' });
    const repoB = new Repo({
      peerId: OBSERVER_ID,
      network: [new BroadcastChannelNetworkAdapter({ channelName })],
    });

    const teardown = async (leaver: Presence<MemberState>, observer: Presence<MemberState>): Promise<void> => {
      leaver.stop(); // 收尾时正常告别（goodbye），不影响已经得出的观察
      observer.stop();
      await repoA.shutdown().catch(() => {});
      await repoB.shutdown().catch(() => {});
    };

    await waitForPeer(repoA, OBSERVER_ID);
    await waitForPeer(repoB, LEAVER_ID);
    const handleB = await repoB.find<NoteDoc>(handleA.url);

    const presenceA = new Presence<MemberState>({ handle: handleA });
    presenceA.start({
      initialState: { name: '小张', status: '在线' },
      heartbeatMs: HEARTBEAT_MS,
      peerTtlMs: PEER_TTL_MS,
    });
    const presenceB = new Presence<MemberState>({ handle: handleB });
    presenceB.start({
      initialState: { name: '小李', status: '在线' },
      heartbeatMs: HEARTBEAT_MS,
      peerTtlMs: PEER_TTL_MS,
    });

    // 记录 B 是怎么得知 A 离场的：goodbye 事件或 pruning 修剪
    let sawGoodbye: string | null = null;
    let sawPruning: string[] | null = null;
    presenceB.on('goodbye', ({ peerId }) => {
      sawGoodbye = peerId;
    });
    presenceB.on('pruning', ({ pruned }) => {
      sawPruning = pruned;
    });

    // 等两边成员板互见（快照与补发到位）
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      const seen = Object.keys(presenceB.getPeerStates().getStates());
      if (seen.includes(LEAVER_ID) && Object.keys(presenceA.getPeerStates().getStates()).includes(OBSERVER_ID)) {
        break;
      }
      await delay(50);
    }
    lines.push('互见完成：B 的成员板上有 A（小张）');
    lines.push(`参数：heartbeatMs ${HEARTBEAT_MS}，peerTtlMs ${PEER_TTL_MS}（真实默认 15000 / 45000）`);

    // A 离场
    const leaveStart = Date.now();
    if (args.leaveWay === 'goodbye') {
      presenceA.stop(); // 发 goodbye 告别，随后停掉心跳与监听
      lines.push('presenceA.stop() —— 广播 goodbye 后下线');
    } else {
      // 模拟断电：直接断开网络适配器，发不出 goodbye，心跳也停了
      repoA.networkSubsystem.adapters.forEach((adapter) => adapter.disconnect());
      lines.push('adapterA.disconnect() —— 直接断网，没有 goodbye');
    }

    // 等 B 把 A 移出成员板
    const removeDeadline = Date.now() + 5000;
    while (Date.now() < removeDeadline) {
      const seen = Object.keys(presenceB.getPeerStates().getStates());
      if (!seen.includes(LEAVER_ID)) {
        break;
      }
      await delay(50);
    }
    const elapsed = Date.now() - leaveStart;
    const removed = !Object.keys(presenceB.getPeerStates().getStates()).includes(LEAVER_ID);

    let removal: string;
    if (sawGoodbye !== null) {
      removal = 'goodbye 事件——收到告别立即移除';
    } else if (sawPruning !== null && sawPruning.includes(LEAVER_ID)) {
      removal = `pruning 超时修剪——约 ${elapsed}ms 后才被遗忘`;
    } else if (removed) {
      removal = `已移除（约 ${elapsed}ms）`;
    } else {
      removal = `尚未移除——TTL 未到，最多再等 ${PEER_TTL_MS}ms`;
    }
    lines.push(`B 移除 A 的依据：${removal}`);

    await teardown(presenceA, presenceB);

    return {
      lines,
      rows: [
        ['B 视角的成员板', removed ? '（A 已移除）' : '（A 还在——等待超时修剪）'],
        [
          'A 的离场方式',
          args.leaveWay === 'goodbye'
            ? 'presenceA.stop()——先发 goodbye 再停'
            : 'adapterA.disconnect()——直接断网，不发 goodbye',
        ],
        ['B 移除 A 的依据', removal],
        ['真实默认值', '心跳 15000ms，遗忘阈值 45000ms（3 倍心跳）'],
      ],
    };
  }

  const resizeObserver = createResizeObserver(canvas, render);

  return {
    update(options: LeaveLabArgs): void {
      if (typeof BroadcastChannel === 'undefined') {
        lastResult = {
          lines: ['当前环境没有 BroadcastChannel，无法运行本演示。'],
          rows: [['演示状态', '不可用']],
        };
        render();
        emit({ rows: lastResult.rows });
        return;
      }
      pending = pending
        .then(async () => {
          if (disposed) {
            return;
          }
          lastResult = await runOnce(options);
          render();
          emit({ rows: lastResult.rows });
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          lastResult = {
            lines: [`演示出错：${message}`],
            rows: [['演示状态', '出错（刷新页面后重试）']],
          };
          render();
          emit({ rows: lastResult.rows });
        });
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
    },
  };
}
