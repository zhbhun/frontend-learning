/**
 * 范例介绍：集合规模与文档体积的对照实验。
 * 输入：list 规模（100 / 1000 / 10000 项，内容固定为 "item"）。
 * 操作：构造 list 后在其正中间插入一项 "new"，再 save / load 整份文档。
 * 预期：单次插入的变更字节数几乎不随规模变化（约 123～128 字节），
 *       全文档 save 字节随规模线性增长（约 0.7 KB → 60 KB）。
 * 阅读主线：measureScale 返回的三个读数对应正文「拆分文档的时机」的实测表；
 *           字节数由 automerge 确定性地生成，与正文数字一致，耗时仅作量级参考。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ScaleKey = '100' | '1000' | '10000';

export const SCALE_LABELS: Record<ScaleKey, string> = {
  '100': '100 项',
  '1000': '1000 项',
  '10000': '10000 项',
};

/** Controls 面板里规模选择器的候选标签（中文）。 */
export const SCALE_OPTIONS: string[] = Object.values(SCALE_LABELS);

export function scaleFromLabel(label: string): ScaleKey {
  const match = (Object.entries(SCALE_LABELS) as Array<[ScaleKey, string]>).find(
    ([, value]) => value === label,
  );
  return match ? match[0] : '100';
}

/** stories 传入的参数：size 是 Controls 里选中的中文标签。 */
export interface ScaleArgsView {
  size: string;
}

export interface ScaleSnapshot {
  size: ScaleKey;
  /** 中间插入一项产生的变更字节数 */
  changeBytes: number;
  /** 全文档 save 的字节数 */
  saveBytes: number;
  /** load 同一份字节的耗时（毫秒，量级参考） */
  loadMs: number;
}

export interface ScaleInstance {
  update(options: ScaleArgsView): void;
  dispose(): void;
}

export function measureScale(size: ScaleKey): ScaleSnapshot {
  const n = Number(size);
  let doc = A.from<{ l: string[] }>({ l: Array.from({ length: n }, () => 'item') });
  doc = A.change(doc, (x) => {
    x.l.splice(Math.floor(n / 2), 0, 'new');
  });
  const changeBytes = A.getLastLocalChange(doc)!.byteLength;
  const saved = A.save(doc);
  const t0 = performance.now();
  A.load(saved);
  const loadMs = performance.now() - t0;

  return {
    size,
    changeBytes,
    saveBytes: saved.byteLength,
    loadMs: Math.max(1, Math.round(loadMs * 10) / 10),
  };
}

function formatBytes(n: number): string {
  return n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} 字节`;
}

export function createScaleLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ScaleSnapshot) => void,
): ScaleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ScaleKey = '100';

  function draw() {
    const snapshot = measureScale(current);
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const lines = [
      { text: `list 规模：${SCALE_LABELS[snapshot.size]}，正中间插入一项`, color: '#172033', bold: true },
      { text: `单次插入的变更：${formatBytes(snapshot.changeBytes)}（不随规模增长）`, color: '#4f7cff', bold: true },
      { text: `全文档 save：${formatBytes(snapshot.saveBytes)}（随规模线性增长）`, color: '#b45309', bold: true },
      { text: `全文档 load：约 ${snapshot.loadMs} ms（量级参考）`, color: '#64748b' },
      { text: '结论：编辑代价恒定，整文档体积才是拆分的信号', color: '#166534', bold: true },
    ];

    let y = 48;
    for (const line of lines) {
      drawingContext.fillStyle = line.color;
      drawingContext.font = `${line.bold ? '600 ' : ''}14px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillText(line.text, 24, y);
      y += 32;
    }

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = scaleFromLabel(options.size);
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
