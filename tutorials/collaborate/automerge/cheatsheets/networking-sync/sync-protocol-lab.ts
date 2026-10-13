/**
 * 范例介绍：绕开 Repo，直接用 automerge 的低层同步函数跑完整协议，看清收敛如何发生。
 * 输入：scenario 选择同步场景——first-sync 单侧修改、concurrent 双方并发修改、resync 收敛后空转。
 * 操作：用 clone 造出共享历史的两份文档 -> 按场景注入本地变更 ->
 * generateSyncMessage / receiveSyncMessage 交替执行，直到双方都无话可说。
 * 预期：每条消息可解码为 heads / need / have / changes 四个字段；同步结束的判据是
 * generateSyncMessage 返回 null；收敛后再跑一轮不产生任何消息（幂等），两侧内容完全一致。
 * 阅读主线：消息逐条解码并标注职责，展示协议从「交换进度」到「补发变更」再到「无话可说」的全过程。
 */
import * as A from '@automerge/automerge';
import type { DecodedSyncMessage } from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// from/clone 的类型参数要求索引签名兼容，这里用 type 而不是 interface
type SyncDoc = { title: string; items: string[] };

export type SyncScenario = 'first-sync' | 'concurrent' | 'resync';

export const SYNC_SCENARIOS: SyncScenario[] = ['first-sync', 'concurrent', 'resync'];

export interface SyncProtocolLabArgs {
  scenario: SyncScenario;
}

export interface SyncProtocolLabSnapshot {
  rows: Array<[string, string]>;
}

export interface SyncProtocolLabInstance {
  update(options: SyncProtocolLabArgs): void;
  dispose(): void;
}

function describeMessage(message: DecodedSyncMessage): string {
  if (message.changes.length > 0) {
    return `—— 携带 ${message.changes.length} 条变更`;
  }
  if (message.need.length > 0) {
    return '—— 声明还缺哪些变更';
  }
  return '—— 交换同步进度';
}

function run(scenario: SyncScenario): { lines: string[]; rows: Array<[string, string]> } {
  const lines: string[] = [];

  // 两份文档共享历史：docB 是 docA 的 clone，历史相同、actorId 不同
  let docA = A.from<SyncDoc>({ title: '协议演示', items: [] });
  let docB = A.clone(docA);
  // 协议是有状态的：每个对端一份 SyncState，记住同步进行到哪里
  let syncA = A.initSyncState();
  let syncB = A.initSyncState();

  lines.push('docB = A.clone(docA)：同一份文档的两个副本，SyncState 各自从空白开始');

  if (scenario === 'first-sync') {
    docA = A.change(docA, (d) => {
      d.items.push('left 写的一条');
    });
    lines.push('同步前：left 追加一条 items，right 一无所知');
  } else if (scenario === 'concurrent') {
    docA = A.change(docA, (d) => {
      d.items.push('left 并发写的一条');
    });
    docB = A.change(docB, (d) => {
      d.items.push('right 并发写的一条');
    });
    lines.push('同步前：双方各自追加一条，互不知道对方的修改');
  } else {
    lines.push('文档已收敛（首轮同步早已完成），现在直接再跑一轮同步');
  }

  let messageCount = 0;
  let changesAToB = 0;
  let changesBToA = 0;
  let quiet = false;

  // 每个轮次里双方各尝试生成一条消息；双双返回 null 即协议安静（已收敛）
  for (let pass = 0; pass < 20 && !quiet; pass += 1) {
    let sentThisPass = 0;

    // left 生成消息交给 right；receiveSyncMessage 应用消息并更新文档与同步状态
    let msg: Uint8Array | null;
    [syncA, msg] = A.generateSyncMessage(docA, syncA);
    if (msg) {
      sentThisPass += 1;
      messageCount += 1;
      const decoded = A.decodeSyncMessage(msg);
      changesAToB += decoded.changes.length;
      lines.push(
        `#${messageCount} left→right  heads=${decoded.heads.length} need=${decoded.need.length}` +
          ` have=${decoded.have.length} changes=${decoded.changes.length} ${describeMessage(decoded)}`,
      );
      [docB, syncB] = A.receiveSyncMessage(docB, syncB, msg);
    }

    // right 同样处理
    [syncB, msg] = A.generateSyncMessage(docB, syncB);
    if (msg) {
      sentThisPass += 1;
      messageCount += 1;
      const decoded = A.decodeSyncMessage(msg);
      changesBToA += decoded.changes.length;
      lines.push(
        `#${messageCount} right→left  heads=${decoded.heads.length} need=${decoded.need.length}` +
          ` have=${decoded.have.length} changes=${decoded.changes.length} ${describeMessage(decoded)}`,
      );
      [docA, syncA] = A.receiveSyncMessage(docA, syncA, msg);
    }

    if (sentThisPass === 0) {
      quiet = true;
    }
  }

  const identical = JSON.stringify(docA) === JSON.stringify(docB);
  lines.push(
    `同步结束：两侧各 ${A.getHeads(docA).length} 个 heads，items ${docA.items.length} 条，` +
      `内容${identical ? '完全一致' : '不一致'}`,
  );
  if (scenario === 'resync') {
    lines.push('双方 generateSyncMessage 都返回 null：重复运行不产生任何消息，这就是幂等');
  }

  const rows: Array<[string, string]> = [
    [
      '同步往返',
      quiet ? `${messageCount} 条消息后协议安静` : '20 个轮次内未安静（异常）',
    ],
    ['left→right / right→left 变更', `${changesAToB} 条 / ${changesBToA} 条`],
    ['两侧内容', identical ? '完全一致' : '不一致'],
    [
      '同步判据',
      quiet ? 'generateSyncMessage -> null：已收敛' : '仍有消息待发',
    ],
  ];

  return { lines, rows };
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
  drawingContext.fillText('同步协议实验台（低层函数）', 32, 44);

  drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
  drawingContext.fillStyle = '#334155';
  let y = 78;
  for (const line of lines.slice(-12)) {
    drawingContext.fillText(line, 32, y);
    y += 23;
  }
}

export function createSyncProtocolLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SyncProtocolLabSnapshot) => void,
): SyncProtocolLabInstance {
  let lastResult: { lines: string[]; rows: Array<[string, string]> } | null = null;
  let disposed = false;

  function render(): void {
    if (lastResult) {
      renderLab(canvas, lastResult.lines);
    }
  }

  const resizeObserver = createResizeObserver(canvas, render);

  return {
    update(options: SyncProtocolLabArgs): void {
      if (disposed) {
        return;
      }
      lastResult = run(options.scenario);
      render();
      emit({ rows: lastResult.rows });
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
    },
  };
}
