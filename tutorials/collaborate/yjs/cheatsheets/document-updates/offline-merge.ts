/**
 * 范例:两个 Y.Doc 共享历史后各自离线编辑,重连时把各自累积的增量 update
 * 按所选模式投递到对端——正常顺序 / 完全逆序 / 每条重复 3 次;
 * 验证 update 的幂等性:乱序与重复投递都不破坏最终收敛。
 * 输入:离线编辑次数 editsA / editsB(0–5)、投递模式 delivery
 *      (in-order 正常顺序 / reversed 完全逆序 / duplicated 每条重复投递 3 次)。
 * 预期:任何模式下两端最终一致;投递总数 = 模式决定,重复投递的 update 灰显并被
 *      静默忽略;update 事件只在真正合入新内容时触发——逆序时缺失依赖的 update
 *      先挂起,缺口补齐时一次性合入,只触发一次事件。
 * 阅读主线:update() → replay() 重建分叉、按模式投递并统计事件与忽略数
 *      → draw() 画两个文档面板与两条投递泳道(方块序号 = update 在源端的产生顺序)。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type DeliveryMode = 'in-order' | 'reversed' | 'duplicated';

export interface OfflineMergeOptions {
  /** 文档 A 离线期间的编辑次数 */
  editsA: number;
  /** 文档 B 离线期间的编辑次数 */
  editsB: number;
  /** 离线累积的 update 投递到对端的方式 */
  delivery: DeliveryMode;
}

export interface OfflineMergeSnapshot {
  delivered: number;
  events: number;
  ignored: number;
  lenA: number;
  lenB: number;
  consistent: boolean;
}

export interface OfflineMergeInstance {
  update(options: OfflineMergeOptions): void;
  dispose(): void;
}

interface LaneBlock {
  /** 该 update 在源端的产生顺序(1 起) */
  seq: number;
  /** true 表示是对端已合入的重复投递,将被静默忽略 */
  duplicate: boolean;
}

interface ReplayResult {
  textA: string;
  textB: string;
  lenA: number;
  lenB: number;
  laneAB: LaneBlock[];
  laneBA: LaneBlock[];
  delivered: number;
  events: number;
  ignored: number;
  consistent: boolean;
}

function buildQueue(updates: Uint8Array[], mode: DeliveryMode): Uint8Array[] {
  if (mode === 'reversed') {
    return [...updates].reverse();
  }
  if (mode === 'duplicated') {
    return updates.flatMap((update) => [update, update, update]);
  }
  return updates;
}

export function createOfflineMerge(
  canvas: HTMLCanvasElement,
  emit: (snapshot: OfflineMergeSnapshot) => void,
): OfflineMergeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  let current: OfflineMergeOptions = { editsA: 3, editsB: 2, delivery: 'duplicated' };
  let result: ReplayResult = replay(current);

  function replay(options: OfflineMergeOptions): ReplayResult {
    // 每次输入变化都用全新文档重放,保证计数干净、结果确定。
    // 共同历史 10 次编辑,灌给两端后再挂监听——队列只收集离线期间的增量。
    const base = new Y.Doc();
    const baseText = base.getText('t');
    for (let i = 0; i < 10; i += 1) {
      baseText.insert(baseText.length, `记录${i} `);
    }
    const baseUpdate = Y.encodeStateAsUpdate(base);

    const docA = new Y.Doc();
    const docB = new Y.Doc();
    Y.applyUpdate(docA, baseUpdate);
    Y.applyUpdate(docB, baseUpdate);

    // 收集阶段:update 事件存进离线队列;投递阶段:同一监听改为统计事件次数。
    let collecting = true;
    let events = 0;
    const updatesA: Uint8Array[] = [];
    const updatesB: Uint8Array[] = [];
    docA.on('update', (update: Uint8Array) => {
      if (collecting) {
        updatesA.push(update);
      } else {
        events += 1;
      }
    });
    docB.on('update', (update: Uint8Array) => {
      if (collecting) {
        updatesB.push(update);
      } else {
        events += 1;
      }
    });

    // 离线分叉:两端互不知情地各自追加编辑,每次编辑产生一条增量 update。
    const textA = docA.getText('t');
    const textB = docB.getText('t');
    for (let i = 0; i < options.editsA; i += 1) {
      textA.insert(textA.length, `甲${i} `);
    }
    for (let i = 0; i < options.editsB; i += 1) {
      textB.insert(textB.length, `乙${i} `);
    }
    collecting = false;

    // 重连投递:队列按投递模式构造;duplicate 标记借 Set 的引用相等判断——
    // 对端已合入的同一条 update 再 apply 会被静默忽略(不触发事件、不改状态)。
    const deliver = (updates: Uint8Array[], target: Y.Doc): LaneBlock[] => {
      const seen = new Set<Uint8Array>();
      return buildQueue(updates, options.delivery).map((update) => {
        const duplicate = seen.has(update);
        seen.add(update);
        Y.applyUpdate(target, update, 'relay');
        return { seq: updates.indexOf(update) + 1, duplicate };
      });
    };
    const laneAB = deliver(updatesA, docB);
    const laneBA = deliver(updatesB, docA);

    const blocks = [...laneAB, ...laneBA];
    const finalA = docA.getText('t');
    const finalB = docB.getText('t');
    return {
      textA: finalA.toString(),
      textB: finalB.toString(),
      lenA: finalA.length,
      lenB: finalB.length,
      laneAB,
      laneBA,
      delivered: blocks.length,
      events,
      ignored: blocks.filter((block) => block.duplicate).length,
      consistent: finalA.toString() === finalB.toString(),
    };
  }

  function drawWrappedText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ) {
    g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#172033';
    let line = '';
    let cy = y;
    let drawn = 0;
    const flush = (content: string) => {
      g.fillText(content, x, cy);
      cy += lineHeight;
      drawn += 1;
    };
    for (const ch of text) {
      if (g.measureText(line + ch).width > maxWidth && line !== '') {
        if (drawn === maxLines - 1) {
          flush(`${line} …`);
          return;
        }
        flush(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line !== '' || drawn === 0) {
      flush(line === '' ? '(空)' : line);
    }
  }

  function drawDocPanel(
    x: number,
    top: number,
    width: number,
    bottom: number,
    text: string,
    len: number,
  ) {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#cbd5e1';
    g.beginPath();
    g.rect(x, top, width, bottom - top);
    g.fill();
    g.stroke();

    const maxLines = Math.max(1, Math.floor((bottom - top - 48) / 19));
    drawWrappedText(text, x + 12, top + 22, width - 24, 19, maxLines);

    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText(`${len} 字符`, x + 12, bottom - 12);
  }

  // 一条投递泳道:按投递顺序画方块,蓝 = 合入新内容,灰 = 重复被忽略;
  // 方块内数字是该 update 在源端的产生顺序,逆序与重复模式直接可见。
  function drawLane(top: number, label: string, blocks: LaneBlock[]) {
    const y = top + 20;
    g.fillStyle = '#475569';
    g.font = '13px ui-sans-serif, system-ui, sans-serif';
    g.fillText(label, 20, y + 4);

    if (blocks.length === 0) {
      g.fillStyle = '#94a3b8';
      g.font = '12px ui-sans-serif, system-ui, sans-serif';
      g.fillText('(无离线编辑)', 130, y + 4);
      return;
    }
    blocks.forEach((block, index) => {
      const x = 130 + index * 22;
      g.fillStyle = block.duplicate ? '#e2e8f0' : '#4f7cff';
      g.beginPath();
      g.rect(x, top + 8, 18, 24);
      g.fill();
      g.fillStyle = block.duplicate ? '#94a3b8' : '#ffffff';
      g.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.textAlign = 'center';
      g.fillText(String(block.seq), x + 9, top + 24);
      g.textAlign = 'left';
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(480, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const panelTop = 40;
    const panelBottom = 132;
    const panelWidth = width / 2 - 20 - 28;

    drawDocPanel(20, panelTop, panelWidth, panelBottom, result.textA, result.lenA);
    drawDocPanel(
      width / 2 + 28,
      panelTop,
      panelWidth,
      panelBottom,
      result.textB,
      result.lenB,
    );

    // 面板间的连线表示重连投递。
    const midY = (panelTop + panelBottom) / 2;
    const linkLeft = 20 + panelWidth + 6;
    const linkRight = width / 2 + 28 - 6;
    g.strokeStyle = '#4f7cff';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(linkLeft, midY);
    g.lineTo(linkRight, midY);
    g.stroke();
    g.fillStyle = '#4f7cff';
    g.beginPath();
    g.moveTo(linkRight, midY);
    g.lineTo(linkRight - 7, midY - 4);
    g.lineTo(linkRight - 7, midY + 4);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(linkLeft, midY);
    g.lineTo(linkLeft + 7, midY - 4);
    g.lineTo(linkLeft + 7, midY + 4);
    g.closePath();
    g.fill();

    drawLane(panelBottom + 20, 'A→B 投递', result.laneAB);
    drawLane(panelBottom + 20 + 48, 'B→A 投递', result.laneBA);

    // 图例:方块颜色的含义。
    const legendY = panelBottom + 20 + 48 + 44;
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#4f7cff';
    g.fillRect(130, legendY - 8, 9, 9);
    g.fillStyle = '#64748b';
    g.fillText('合入新内容', 144, legendY);
    g.fillStyle = '#e2e8f0';
    g.fillRect(228, legendY - 8, 9, 9);
    g.fillStyle = '#64748b';
    g.fillText('重复被忽略', 242, legendY);

    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = result.consistent ? '#059669' : '#d97706';
    g.textAlign = 'center';
    g.fillText(
      result.consistent
        ? '两端一致 ✓ —— 乱序与重复投递不影响最终状态'
        : '两端不一致',
      width / 2,
      Math.max(268, height - 18),
    );
    g.textAlign = 'left';

    emit({
      delivered: result.delivered,
      events: result.events,
      ignored: result.ignored,
      lenA: result.lenA,
      lenB: result.lenB,
      consistent: result.consistent,
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
