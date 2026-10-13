/**
 * 范例介绍：同页两个 Repo 经 BroadcastChannel 互连，演示输入指示器的临时消息信道。
 * 输入：scenario 选「实时输入」或「重启对照」；typedText 是输入者 A 键入的文本。
 * 操作：实时输入场景下 A 每次广播一条 typing 消息，B 用 ephemeral-message 事件接收；
 *       重启对照场景下 B 先收到一条消息，随后 shutdown 重建 Repo，再验证旧消息不重放、新消息照常到达。
 * 预期：消息即时到达 B；文档变更次数不因广播增加；重启后旧消息消失，文档内容仍能从 A 同步回来。
 * 阅读主线：临时数据的三条边界（不落盘、不进历史、无重放）在收件箱与日志中一一对应。
 */
import { Repo, type DocHandle, type PeerId } from '@automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// from/create 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type NoteDoc = { text: string };

// 演示用的可读 PeerId：真实应用不必传 peerId，Repo 会随机生成
const WRITER_ID = 'writer-a' as PeerId;
const READER_ID = 'reader-b' as PeerId;
const READER2_ID = 'reader-b-2' as PeerId;
const INITIAL_TEXT = '共享便签';

export type TypingScenario = 'typing' | 'restart';

export const TYPING_SCENARIOS: TypingScenario[] = ['typing', 'restart'];

export interface TypingLabArgs {
  scenario: TypingScenario;
  typedText: string;
}

export interface TypingLabSnapshot {
  rows: Array<[string, string]>;
}

export interface TypingLabInstance {
  update(options: TypingLabArgs): void;
  dispose(): void;
}

interface InboxItem {
  from: PeerId;
  text: string;
}

/** 一轮演示的可复用运行时：A 端固定，B 端在重启场景里会被下一代替换。 */
interface LabRuntime {
  channelName: string;
  repoA: Repo;
  handleA: DocHandle<NoteDoc>;
  repoB: Repo;
  handleB: DocHandle<NoteDoc>;
  inbox: InboxItem[];
}

interface LabResult {
  lines: string[];
  rows: Array<[string, string]>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 轮询直到对方出现在自己的连接名单里（BroadcastChannel 的握手是异步的）。 */
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

// 每个 lab 实例独占一个频道名：同一 Docs 页上还有其他 lab，互不串台
let channelSeq = 0;

function subscribeInbox(handle: DocHandle<NoteDoc>, inbox: InboxItem[]): void {
  // payload 里的 message 就是发送方 broadcast 的原值（CBOR 编解码往返）
  handle.on('ephemeral-message', ({ senderId, message }) => {
    const text =
      typeof (message as { text?: unknown })?.text === 'string'
        ? (message as { text: string }).text
        : JSON.stringify(message);
    inbox.push({ from: senderId, text });
  });
}

async function createRuntime(channelName: string): Promise<LabRuntime> {
  const repoA = new Repo({
    peerId: WRITER_ID,
    network: [new BroadcastChannelNetworkAdapter({ channelName })],
  });
  const handleA = repoA.create<NoteDoc>({ text: INITIAL_TEXT });

  const repoB = new Repo({
    peerId: READER_ID,
    network: [new BroadcastChannelNetworkAdapter({ channelName })],
  });

  // 等 A、B 互认，再让 B 打开同一份文档——对端必须打开文档才能收到广播
  await waitForPeer(repoA, READER_ID);
  await waitForPeer(repoB, WRITER_ID);
  const handleB = await repoB.find<NoteDoc>(handleA.url);

  const inbox: InboxItem[] = [];
  subscribeInbox(handleB, inbox);
  return { channelName, repoA, handleA, repoB, handleB, inbox };
}

/** 只拆一个 Repo：shutdown 会断开自己的网络适配器并清空内存。 */
async function shutdownOne(repo: Repo | undefined): Promise<void> {
  await repo?.shutdown().catch(() => {});
}

function broadcastTyping(runtime: LabRuntime, text: string): void {
  runtime.handleA.broadcast({ type: 'typing', text });
}

async function runTyping(args: TypingLabArgs, runtime: LabRuntime): Promise<LabResult> {
  const lines: string[] = [];
  const text = args.typedText.trim() === '' ? '（未填写）' : args.typedText;

  broadcastTyping(runtime, text);
  // 消息经 BroadcastChannel 异步到达，稍等片刻再核对收件箱
  await delay(100);

  const latest = runtime.inbox[runtime.inbox.length - 1];
  const numChanges = runtime.handleB.metrics().numChanges;

  lines.push(`A（${WRITER_ID}）broadcast({ type: "typing", text: "${text}" })`);
  lines.push(`B（${READER_ID}）收到 ${runtime.inbox.length} 条 ephemeral-message`);
  lines.push(`共享文档变更次数：${numChanges}（create 时 1 次，广播不增加）`);
  lines.push('演示 Repo 没接存储适配器——消息与文档都只活在内存与网络里');

  return {
    lines,
    rows: [
      [
        'B 收到的最新一条',
        latest
          ? `正在输入：「${latest.text}」（来自 ${latest.from}）`
          : '—（还没收到）',
      ],
      ['B 的收件箱消息数', `${runtime.inbox.length} 条——广播一条收一条`],
      ['共享文档的变更次数', `${numChanges} 次——广播不进变更历史`],
      ['这份文档在哪里', '只在内存与网络里（无存储适配器，刷新即消失）'],
    ],
  };
}

async function runRestart(args: TypingLabArgs, runtime: LabRuntime): Promise<LabResult> {
  const lines: string[] = [];
  const text = args.typedText.trim() === '' ? '（未填写）' : args.typedText;

  // 第 1 步：重启前，B 正常收到一条消息
  broadcastTyping(runtime, `重启前的广播（输入「${text}」）`);
  await delay(100);
  const before = runtime.inbox[runtime.inbox.length - 1];
  lines.push(`重启前：B 收到「${before?.text ?? '？'}」（收件箱共 ${runtime.inbox.length} 条）`);

  // 第 2 步：B 端「重启」——shutdown 拆掉网络与内存，换一个新 PeerId 重建
  const url = runtime.handleA.url;
  await shutdownOne(runtime.repoB);
  lines.push('await repoB.shutdown() —— B 端下线，收件箱随内存一起消失');

  const repoB2 = new Repo({
    peerId: READER2_ID,
    network: [
      new BroadcastChannelNetworkAdapter({ channelName: runtime.channelName }),
    ],
  });
  await waitForPeer(repoB2, WRITER_ID);
  const handleB2 = await repoB2.find<NoteDoc>(url);
  lines.push(`新 Repo（${READER2_ID}）find 同一 URL -> 文档内容回来了`);

  const inbox2: InboxItem[] = [];
  subscribeInbox(handleB2, inbox2);

  // 第 3 步：验证旧消息没有重放
  await delay(300);
  const docText = handleB2.doc()?.text ?? '（读取失败）';
  lines.push(`等待片刻后 B2 收件箱：${inbox2.length} 条——旧消息不重放`);

  // 第 4 步：A 再广播一条，新消息照常到达
  broadcastTyping(runtime, `重启后新广播（输入「${text}」）`);
  await delay(100);
  const after = inbox2[inbox2.length - 1];
  lines.push(`A 再 broadcast -> B2 收到「${after?.text ?? '？'}」`);

  // 用下一代替换运行时的 B 端，后续「实时输入」继续在新 B 上观察
  runtime.repoB = repoB2;
  runtime.handleB = handleB2;
  runtime.inbox = inbox2;

  return {
    lines,
    rows: [
      ['重启前 B 收到', `「${before?.text ?? '？'}」`],
      ['重启后 B2 读到的文档', `text = "${docText}"（内容从 A 同步回来了）`],
      [
        '重启后 B2 的收件箱',
        inbox2.length === 0 ? '空——临时消息不重放' : `收到 ${inbox2.length} 条（均为重启后的新消息）`,
      ],
      ['A 再广播后 B2 收到', `「${after?.text ?? '？'}」——新消息照常到达`],
    ],
  };
}

export function createTypingLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TypingLabSnapshot) => void,
): TypingLabInstance {
  const channelName = `ephemeral-typing-lab-${++channelSeq}`;

  let runtime: LabRuntime | null = null;
  let ready: Promise<LabRuntime> | null = null;
  let lastResult: LabResult | null = null;
  let pending: Promise<void> = Promise.resolve();
  let disposed = false;

  function render(): void {
    if (!lastResult) {
      return;
    }
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
    drawingContext.fillText('输入指示器实验台（BroadcastChannel）', 32, 44);

    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillStyle = '#334155';
    let y = 78;
    for (const line of lastResult.lines) {
      drawingContext.fillText(line, 32, y);
      y += 23;
    }
  }

  function ensureReady(): Promise<LabRuntime> {
    if (!ready) {
      ready = createRuntime(channelName).then((created) => {
        runtime = created;
        return created;
      });
    }
    return ready;
  }

  const resizeObserver = createResizeObserver(canvas, render);

  return {
    update(options: TypingLabArgs): void {
      if (typeof BroadcastChannel === 'undefined') {
        lastResult = {
          lines: ['当前环境没有 BroadcastChannel，无法运行本演示。'],
          rows: [['演示频道', '不可用']],
        };
        render();
        emit({ rows: lastResult.rows });
        return;
      }
      // 建连、广播、重启都是异步流程，串行执行避免两轮演示交叉
      pending = pending
        .then(() => ensureReady())
        .then(async (current) => {
          if (disposed) {
            return;
          }
          lastResult =
            options.scenario === 'restart'
              ? await runRestart(options, current)
              : await runTyping(options, current);
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
      const current = runtime;
      void shutdownOne(current?.repoA);
      void shutdownOne(current?.repoB);
      runtime = null;
      ready = null;
    },
  };
}
