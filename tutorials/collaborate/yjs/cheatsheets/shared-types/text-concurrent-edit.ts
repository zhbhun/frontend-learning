/**
 * 范例：Y.Text 并发编辑合并。
 * 演示：两个离线副本在同一份文本的不同位置并发插入，互换更新后
 *       两处插入都保留，所有副本收敛到同一段文本。
 * 输入：初始文本、A 在开头插入的内容、B 在结尾插入的内容。
 * 操作：每次控件变化都整体重算——A 先写好初始文本并同步给 B，随后双方离线插入，再双向同步。
 * 预期：合并文本 = A 的插入 + 初始文本 + B 的插入；两副本一致；
 *       A 侧收到的合并事件是 delta 形式：[{ retain: 前缀长度 }, { insert: '…' }]。
 * 主线：buildMerge() 建副本与共同起点 → 离线并发 insert → 双向同步 → 读 toString 与 delta。
 */
import * as Y from 'yjs';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TextConcurrentEditOptions {
  base: string;
  insertA: string;
  insertB: string;
}

export interface TextConcurrentEditSnapshot {
  mergedA: string;
  mergedB: string;
  converged: string;
  length: number;
  deltaA: string;
}

export interface TextConcurrentEditInstance {
  update(options: TextConcurrentEditOptions): void;
  dispose(): void;
}

function syncPeers(docA: Y.Doc, docB: Y.Doc): void {
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB)));
  Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA)));
}

interface MergeResult {
  mergedA: string;
  mergedB: string;
  deltaA: string;
}

function buildMerge(options: TextConcurrentEditOptions): MergeResult {
  const docA = new Y.Doc();
  const docB = new Y.Doc();

  // 共同起点：A 写好初始文本，同步给 B。
  docA.getText('body').insert(0, options.base);
  syncPeers(docA, docB);

  // 离线并发编辑：A 在开头插入，B 在结尾插入。
  docA.getText('body').insert(0, options.insertA);
  docB.getText('body').insert(options.base.length, options.insertB);

  let deltaA = '（无）';
  docA.getText('body').observe((event) => {
    deltaA = JSON.stringify(event.changes.delta);
  });

  syncPeers(docA, docB);

  return {
    mergedA: docA.getText('body').toString(),
    mergedB: docB.getText('body').toString(),
    deltaA,
  };
}

export function createTextConcurrentEdit(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TextConcurrentEditSnapshot) => void,
): TextConcurrentEditInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: TextConcurrentEditOptions = {
    base: '世界',
    insertA: '你好，',
    insertB: '！',
  };

  function drawPeerCard(x: number, label: string, line: string) {
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(x, 72, 300, 88, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#172033';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(label, x + 16, 100);
    ctx.fillStyle = '#475569';
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(line, x + 16, 126);
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

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`初始文本「${current.base}」已同步，双方离线并发编辑`, 24, 40);

    drawPeerCard(24, '客户端 A', `ytext.insert(0, '${current.insertA}')`);
    drawPeerCard(348, '客户端 B', `ytext.insert(${current.base.length}, '${current.insertB}')`);

    // 合并结果：分段着色——A 的插入（蓝）、初始文本（灰）、B 的插入（橙）。
    ctx.fillStyle = '#ecfdf5';
    ctx.strokeStyle = '#34d399';
    ctx.beginPath();
    ctx.roundRect(24, 184, 624, 64, 8);
    ctx.fill();
    ctx.stroke();

    let x = 40;
    const segments: Array<[string, string]> = [
      [current.insertA, '#4f7cff'],
      [current.base, '#64748b'],
      [current.insertB, '#f59e0b'],
    ];
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    segments.forEach(([text, color]) => {
      if (text.length === 0) {
        return;
      }
      ctx.fillStyle = color;
      ctx.fillText(text, x, 222);
      x += ctx.measureText(text).width;
    });

    const converged = result.mergedA === result.mergedB;
    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(
      `蓝=A 的插入，灰=初始文本，橙=B 的插入 · 两副本${converged ? '一致' : '不一致！'}`,
      24,
      268,
    );
    ctx.fillText(`A 侧合并事件 delta：${result.deltaA}`, 24, 288);

    emit({
      mergedA: result.mergedA,
      mergedB: result.mergedB,
      converged: converged ? '一致' : '不一致',
      length: result.mergedA.length,
      deltaA: result.deltaA,
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
