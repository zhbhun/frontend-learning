/**
 * 范例:两个 Y.Doc 共享一段历史后各自离线编辑,再用三步握手重新同步——
 * 互换 state vector → 互发差量 update → applyUpdate 收敛;同步阶段由输入逐档驱动。
 * 输入:共享历史编辑次数 history(0–50)、离线编辑次数 editsA / editsB(0–5)、
 *      同步阶段 phase(diverged 分叉中 / exchange-sv / exchange-diff / converged)。
 * 预期:两步协议条上标注的是该步真实编码的字节数(sv / 差量);拨到「收敛完成」
 *      后两端面板内容一致;读数给出「差量方案合计」与「互发全量」的对照,
 *      共享历史越长,全量方案越亏。
 * 阅读主线:update() → replay() 重建两份文档并算出 sv / 差量 / 全量三类字节数
 *      → draw() 画两个文档面板、两步协议条与底部对照行。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SyncPhase =
  | 'diverged'
  | 'exchange-sv'
  | 'exchange-diff'
  | 'converged';

export interface SyncHandshakeOptions {
  /** 两端分叉前共享的历史编辑次数 */
  history: number;
  /** 文档 A 离线期间的编辑次数 */
  editsA: number;
  /** 文档 B 离线期间的编辑次数 */
  editsB: number;
  /** 握手进行到哪一步;只有 converged 才真正互发并合入差量 */
  phase: SyncPhase;
}

export interface SyncHandshakeSnapshot {
  svA: number;
  svB: number;
  diffAB: number;
  diffBA: number;
  diffTotal: number;
  fullTotal: number;
  consistent: boolean;
}

export interface SyncHandshakeInstance {
  update(options: SyncHandshakeOptions): void;
  dispose(): void;
}

interface ReplayResult {
  textA: string;
  textB: string;
  lenA: number;
  lenB: number;
  clientsA: number;
  clientsB: number;
  svA: number;
  svB: number;
  diffAB: number;
  diffBA: number;
  fullTotal: number;
  consistent: boolean;
}

type StepState = 'pending' | 'active' | 'done';

const STEP_COLORS: Record<StepState, { bg: string; border: string; text: string }> = {
  pending: { bg: '#ffffff', border: '#cbd5e1', text: '#94a3b8' },
  active: { bg: '#eef4ff', border: '#4f7cff', text: '#1d4ed8' },
  done: { bg: '#ecfdf5', border: '#10b981', text: '#047857' },
};

function stepStates(phase: SyncPhase): [StepState, StepState] {
  switch (phase) {
    case 'diverged':
      return ['pending', 'pending'];
    case 'exchange-sv':
      return ['active', 'pending'];
    case 'exchange-diff':
      return ['done', 'active'];
    case 'converged':
      return ['done', 'done'];
  }
}

export function createSyncHandshake(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SyncHandshakeSnapshot) => void,
): SyncHandshakeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  let current: SyncHandshakeOptions = {
    history: 20,
    editsA: 3,
    editsB: 2,
    phase: 'converged',
  };
  let result: ReplayResult = replay(current);

  function replay(options: SyncHandshakeOptions): ReplayResult {
    // 每次输入变化都用全新文档重放,保证字节数干净、结果确定。
    // 共同历史:独立客户端做 history 次编辑,全量编码后灌给两端,
    // 模拟「两端此前已同步过同一份文档」。
    const base = new Y.Doc();
    const baseText = base.getText('t');
    for (let i = 0; i < options.history; i += 1) {
      baseText.insert(baseText.length, `记录${i} `);
    }
    const baseUpdate = Y.encodeStateAsUpdate(base);

    const docA = new Y.Doc();
    const docB = new Y.Doc();
    Y.applyUpdate(docA, baseUpdate);
    Y.applyUpdate(docB, baseUpdate);

    // 离线分叉:两端互不知情地各自追加编辑。
    const textA = docA.getText('t');
    const textB = docB.getText('t');
    for (let i = 0; i < options.editsA; i += 1) {
      textA.insert(textA.length, `甲${i} `);
    }
    for (let i = 0; i < options.editsB; i += 1) {
      textB.insert(textB.length, `乙${i} `);
    }

    // 第①步:互换 state vector——只说「我有什么」,不含内容。
    const svA = Y.encodeStateVector(docA);
    const svB = Y.encodeStateVector(docB);
    // 第②步:各自按对方的 sv 编码差量——只装对方缺失的部分。
    const diffAB = Y.encodeStateAsUpdate(docA, svB);
    const diffBA = Y.encodeStateAsUpdate(docB, svA);
    // 对照组:不做 sv 比较、直接互发全量所需的字节数。
    const fullTotal =
      Y.encodeStateAsUpdate(docA).byteLength +
      Y.encodeStateAsUpdate(docB).byteLength;

    // 第③步:互发差量并合入;只有拨到「收敛完成」才真正 apply。
    if (options.phase === 'converged') {
      Y.applyUpdate(docB, diffAB);
      Y.applyUpdate(docA, diffBA);
    }

    const finalA = docA.getText('t');
    const finalB = docB.getText('t');
    return {
      textA: finalA.toString(),
      textB: finalB.toString(),
      lenA: finalA.length,
      lenB: finalB.length,
      clientsA: Y.decodeStateVector(svA).size,
      clientsB: Y.decodeStateVector(svB).size,
      svA: svA.byteLength,
      svB: svB.byteLength,
      diffAB: diffAB.byteLength,
      diffBA: diffBA.byteLength,
      fullTotal,
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
    clients: number,
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
    g.fillText(`${len} 字符 · sv 含 ${clients} 个客户端`, x + 12, bottom - 12);
  }

  function drawStepBar(
    width: number,
    top: number,
    state: StepState,
    title: string,
    detail: string,
  ) {
    const x = 20;
    const w = width - 40;
    const h = 44;
    const colors = STEP_COLORS[state];
    const cy = top + h / 2;

    g.fillStyle = colors.bg;
    g.strokeStyle = colors.border;
    g.lineWidth = state === 'active' ? 2 : 1;
    g.setLineDash(state === 'pending' ? [5, 4] : []);
    g.beginPath();
    g.rect(x, top, w, h);
    g.fill();
    g.stroke();
    g.setLineDash([]);

    // 左侧状态圆:pending 空心 / active 蓝点 / done 绿勾。
    const cx = x + 24;
    g.beginPath();
    g.arc(cx, cy, 8, 0, Math.PI * 2);
    if (state === 'done') {
      g.fillStyle = '#10b981';
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx - 3.5, cy);
      g.lineTo(cx - 1, cy + 2.5);
      g.lineTo(cx + 3.5, cy - 2.5);
      g.stroke();
    } else if (state === 'active') {
      g.fillStyle = '#4f7cff';
      g.fill();
    } else {
      g.strokeStyle = '#cbd5e1';
      g.lineWidth = 1.5;
      g.stroke();
    }

    g.fillStyle = colors.text;
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillText(title, x + 42, cy + 4);

    g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.textAlign = 'right';
    g.fillText(detail, x + w - 16, cy + 4);
    g.textAlign = 'left';
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

    drawDocPanel(20, panelTop, panelWidth, panelBottom, result.textA, result.lenA, result.clientsA);
    drawDocPanel(
      width / 2 + 28,
      panelTop,
      panelWidth,
      panelBottom,
      result.textB,
      result.lenB,
      result.clientsB,
    );

    // 面板间的连线:收敛后画蓝色双向箭头,分叉时画灰色虚线。
    const midY = (panelTop + panelBottom) / 2;
    const linkLeft = 20 + panelWidth + 6;
    const linkRight = width / 2 + 28 - 6;
    const converged = current.phase === 'converged';
    g.strokeStyle = converged ? '#4f7cff' : '#cbd5e1';
    g.lineWidth = 2;
    g.setLineDash(converged ? [] : [4, 4]);
    g.beginPath();
    g.moveTo(linkLeft, midY);
    g.lineTo(linkRight, midY);
    g.stroke();
    g.setLineDash([]);
    if (converged) {
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
    }

    // 两步协议条:高亮到当前阶段,字节数是该步真实编码的大小。
    const [state1, state2] = stepStates(current.phase);
    drawStepBar(
      width,
      panelBottom + 18,
      state1,
      '① 互换 state vector',
      `A 端 ${result.svA} B ↔ B 端 ${result.svB} B`,
    );
    drawStepBar(
      width,
      panelBottom + 18 + 44 + 12,
      state2,
      '② 互发差量 update',
      `A→B ${result.diffAB} B · B→A ${result.diffBA} B`,
    );

    // 底部对照行:差量方案(含 sv 开销)与互发全量的总字节对比。
    const diffTotal =
      result.svA + result.svB + result.diffAB + result.diffBA;
    let statusText: string;
    let statusColor: string;
    if (current.phase === 'diverged') {
      statusText = '已分叉 —— 拨动「同步阶段」开始握手';
      statusColor = '#d97706';
    } else if (converged) {
      statusText = `两端一致 ✓ —— 差量方案共 ${diffTotal} B,互发全量需 ${result.fullTotal} B`;
      statusColor = '#059669';
    } else {
      statusText = `握手进行中 —— 差量方案共 ${diffTotal} B(对照全量 ${result.fullTotal} B)`;
      statusColor = '#1d4ed8';
    }
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = statusColor;
    g.textAlign = 'center';
    g.fillText(statusText, width / 2, Math.max(268, height - 18));
    g.textAlign = 'left';

    emit({
      svA: result.svA,
      svB: result.svB,
      diffAB: result.diffAB,
      diffBA: result.diffBA,
      diffTotal,
      fullTotal: result.fullTotal,
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
