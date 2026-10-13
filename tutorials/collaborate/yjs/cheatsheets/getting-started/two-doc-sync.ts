/**
 * 范例介绍：在同一页面创建两个互不知情的 Y.Doc，用 update 事件手动扮演
 * Provider 的搬运工作——一端写入产生的 update 被转发到另一端 applyUpdate。
 * 输入：Controls 的「文档 A 内容」(text)与「同步中继」(relay)。
 * 预期：中继开启时 B 始终与 A 一致；关闭中继后两端分叉，重新开启时通过
 * 差量 update（encodeStateAsUpdate + state vector）重新收敛。
 * 阅读主线：createTwoDocSync → 两个互为镜像的 update 监听器（origin 防回声）
 * → setText → setRelay / syncNow → draw。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TwoDocSyncOptions {
  text: string;
  relay: boolean;
}

export interface TwoDocSyncSnapshot {
  lenA: number;
  lenB: number;
  consistent: boolean;
  updates: number;
  lastBytes: number;
  relayOn: boolean;
}

export interface TwoDocSyncInstance {
  update(options: TwoDocSyncOptions): void;
  dispose(): void;
}

// origin 标记：转发产生的变更带此标记，监听器遇到就跳过，
// 否则 A→B 的同步会再触发 B→A，形成无限回声。真实 Provider 用的是同一招。
const RELAY_ORIGIN = 'manual-relay';

export function createTwoDocSync(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TwoDocSyncSnapshot) => void,
): TwoDocSyncInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const textA = docA.getText('shared');
  const textB = docB.getText('shared');

  let relayOn = true;
  let relayedUpdates = 0;
  let lastUpdateBytes = 0;

  // 两个监听器互为镜像：只有本地产生的 update 才需要搬运。
  docA.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === RELAY_ORIGIN || !relayOn) {
      return;
    }
    Y.applyUpdate(docB, update, RELAY_ORIGIN);
    relayedUpdates += 1;
    lastUpdateBytes = update.byteLength;
    draw();
  });
  docB.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === RELAY_ORIGIN || !relayOn) {
      return;
    }
    Y.applyUpdate(docA, update, RELAY_ORIGIN);
    relayedUpdates += 1;
    lastUpdateBytes = update.byteLength;
    draw();
  });

  function setText(text: string) {
    if (textA.toString() === text) {
      return;
    }
    // delete + insert 包进一个事务，只产生一条 update。
    docA.transact(() => {
      textA.delete(0, textA.length);
      if (text.length > 0) {
        textA.insert(0, text);
      }
    });
    draw();
  }

  function syncNow() {
    // state vector 描述“对端已有什么”，encodeStateAsUpdate 只编码对端缺失的
    // 部分；两个方向各发一次差量，两端即收敛到同一状态。
    const missingInB = Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB));
    Y.applyUpdate(docB, missingInB, RELAY_ORIGIN);
    lastUpdateBytes = missingInB.byteLength;
    const missingInA = Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA));
    Y.applyUpdate(docA, missingInA, RELAY_ORIGIN);
  }

  function setRelay(next: boolean) {
    if (next === relayOn) {
      return;
    }
    relayOn = next;
    if (relayOn) {
      syncNow();
    }
    draw();
  }

  function snapshot(): TwoDocSyncSnapshot {
    return {
      lenA: textA.length,
      lenB: textB.length,
      consistent: textA.toString() === textB.toString(),
      updates: relayedUpdates,
      lastBytes: lastUpdateBytes,
      relayOn,
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
    g.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
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

  function drawPanel(
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

    const maxLines = Math.max(1, Math.floor((bottom - top - 52) / 20));
    drawWrappedText(text, x + 14, top + 26, width - 28, 20, maxLines);

    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText(`${len} 字符`, x + 14, bottom - 14);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const panelTop = 56;
    const panelBottom = height - 64;
    const panelWidth = width / 2 - 20 - 30;

    drawPanel(20, panelTop, panelWidth, panelBottom, textA.toString(), textA.length);
    drawPanel(
      width / 2 + 30,
      panelTop,
      panelWidth,
      panelBottom,
      textB.toString(),
      textB.length,
    );

    // 中间的箭头代表 update 的搬运：中继断开时变灰变虚线。
    const midY = (panelTop + panelBottom) / 2;
    g.strokeStyle = relayOn ? '#4f7cff' : '#cbd5e1';
    g.lineWidth = 2;
    g.setLineDash(relayOn ? [] : [5, 4]);
    g.beginPath();
    g.moveTo(width / 2 - 22, midY);
    g.lineTo(width / 2 + 14, midY);
    g.stroke();
    g.setLineDash([]);
    if (relayOn) {
      g.fillStyle = '#4f7cff';
      g.beginPath();
      g.moveTo(width / 2 + 22, midY);
      g.lineTo(width / 2 + 12, midY - 5);
      g.lineTo(width / 2 + 12, midY + 5);
      g.closePath();
      g.fill();
    }

    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = relayOn ? '#4f7cff' : '#94a3b8';
    g.textAlign = 'center';
    g.fillText(relayOn ? 'update' : '已断开', width / 2, midY - 10);
    g.textAlign = 'left';

    const { consistent } = snapshot();
    g.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = consistent ? '#059669' : '#d97706';
    g.textAlign = 'center';
    g.fillText(
      consistent
        ? '两端一致'
        : '已分叉 —— 重新开启「同步中继」后自动收敛',
      width / 2,
      height - 26,
    );
    g.textAlign = 'left';

    emit(snapshot());
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      // 先处理中继开关（恢复时先做差量对齐），再应用文本。
      setRelay(options.relay);
      setText(options.text);
    },
    dispose() {
      resizeObserver.disconnect();
      docA.destroy();
      docB.destroy();
    },
  };
}
