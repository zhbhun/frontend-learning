/**
 * 范例:tombstone 与垃圾回收(gc)。
 * 演示:删除把 item 变成 tombstone(置 deleted 位 + 记入 delete set),item 仍留在
 *       链上;gc 决定内容去留——开着就把已删 item 的内容换成只剩长度。
 * 输入:初始文本 baseText、从开头删除的字符数 deleteCount、gc 开关。
 * 操作:每次控件变化用相同编辑重建文档,并分别以 gc 开 / 关各建一份作对照。
 * 预期:两种 gc 下剩余文本相同、tombstone 都留在链上;gc 开时被删 item 只剩长度、
 *       update 编码更小;gc 关时删除内容仍在内存,update 更大。
 * 阅读主线:buildDoc() 建文档并执行同一段编辑 → walkChain() 读 item 链 →
 *       draw() 画 tombstone 的两种形态与 update 编码字节对照。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TombstoneGcOptions {
  /** 初始文本 */
  baseText: string;
  /** 从开头删除的字符数 */
  deleteCount: number;
  /** 是否开启垃圾回收(默认行为) */
  gc: boolean;
}

export interface TombstoneGcSnapshot {
  remaining: string;
  deletedText: string;
  tombstones: number;
  tombstoneState: string;
  bytesGcOn: number;
  bytesGcOff: number;
}

export interface TombstoneGcInstance {
  update(options: TombstoneGcOptions): void;
  dispose(): void;
}

/** 文档序的一条 item;deleted 为 true 即 tombstone。 */
interface ChainNode {
  clock: number;
  length: number;
  text: string;
  deleted: boolean;
}

const DEMO_CLIENT = 7;
const FALLBACK_TEXT = 'hello world';

/** 执行同一份「插入 + 删除」编辑;gc 传 true / false 得到两种形态。 */
function buildDoc(text: string, deleteCount: number, gc: boolean): Y.Doc {
  const doc = new Y.Doc({ gc });
  doc.clientID = DEMO_CLIENT;
  const ytext = doc.getText('t');
  ytext.insert(0, text);
  const count = Math.max(0, Math.min(deleteCount, text.length));
  if (count > 0) {
    ytext.delete(0, count);
  }
  return doc;
}

/** 沿 AbstractType._start 读出文档序 item;gc 后被删 item 的 text 为空串。 */
function walkChain(doc: Y.Doc): ChainNode[] {
  const nodes: ChainNode[] = [];
  let node: Y.Item | null = doc.getText('t')._start;
  while (node !== null) {
    nodes.push({
      clock: node.id.clock,
      length: node.length,
      text: node.content
        .getContent()
        .map((part) => String(part))
        .join(''),
      deleted: node.deleted,
    });
    node = node.right;
  }
  return nodes;
}

interface ReplayResult {
  text: string;
  deleteCount: number;
  chain: ChainNode[];
  remaining: string;
  bytesGcOn: number;
  bytesGcOff: number;
}

function replay(options: TombstoneGcOptions): ReplayResult {
  const text = options.baseText.length > 0 ? options.baseText : FALLBACK_TEXT;
  const deleteCount = Math.max(0, Math.min(Math.round(options.deleteCount), text.length));
  // 主文档跟随 gc 开关;另建两份做编码字节对照。
  const doc = buildDoc(text, deleteCount, options.gc);
  return {
    text,
    deleteCount,
    chain: walkChain(doc),
    remaining: doc.getText('t').toString(),
    bytesGcOn: Y.encodeStateAsUpdate(buildDoc(text, deleteCount, true)).byteLength,
    bytesGcOff: Y.encodeStateAsUpdate(buildDoc(text, deleteCount, false)).byteLength,
  };
}

export function createTombstoneGc(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TombstoneGcSnapshot) => void,
): TombstoneGcInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  let current: TombstoneGcOptions = {
    baseText: FALLBACK_TEXT,
    deleteCount: 5,
    gc: true,
  };
  let result: ReplayResult = replay(current);

  function drawChainNode(x: number, y: number, node: ChainNode): number {
    const shown = node.deleted && current.gc
      ? `len ${node.length} 已回收`
      : node.text.length > 8
        ? `${node.text.slice(0, 7)}…`
        : node.text;
    const boxWidth = Math.max(56, shown.length * 11 + 34);
    g.fillStyle = node.deleted ? '#f8fafc' : '#ecfdf5';
    g.strokeStyle = node.deleted ? '#94a3b8' : '#34d399';
    g.setLineDash(node.deleted ? [5, 4] : []);
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(x, y, boxWidth, 48, 7);
    g.fill();
    g.stroke();
    g.setLineDash([]);

    const textFont = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.font = textFont;
    const textWidth = g.measureText(shown).width;
    const cx = x + boxWidth / 2;
    if (node.deleted && !current.gc) {
      // gc 关:tombstone 的内容还在内存,画删除线示意「对用户不可见」。
      g.fillStyle = '#64748b';
      g.textAlign = 'center';
      g.fillText(shown, cx, y + 21);
      g.strokeStyle = '#ef4444';
      g.beginPath();
      g.moveTo(cx - textWidth / 2 - 2, y + 16.5);
      g.lineTo(cx + textWidth / 2 + 2, y + 16.5);
      g.stroke();
    } else {
      g.fillStyle = node.deleted ? '#94a3b8' : '#065f46';
      g.textAlign = 'center';
      g.fillText(shown, cx, y + 21);
    }
    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = node.deleted ? '#94a3b8' : '#64748b';
    g.fillText(node.deleted ? `tombstone(${DEMO_CLIENT},${node.clock})` : `(${DEMO_CLIENT},${node.clock})`, cx, y + 38);
    g.textAlign = 'left';
    return boxWidth;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = 340;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    g.fillStyle = '#172033';
    g.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    g.fillText('删除把 item 变成 tombstone;gc 决定内容去留', 24, 32);

    // item 链:绿色是存活内容,虚线灰框是 tombstone。
    g.fillStyle = '#475569';
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillText(`item 链(文档序,clientID ${DEMO_CLIENT};删除前 ${result.deleteCount} 个字符)`, 24, 66);
    let cursor = 24;
    result.chain.forEach((node, index) => {
      cursor += drawChainNode(cursor, 78, node);
      if (index < result.chain.length - 1) {
        g.fillStyle = '#94a3b8';
        g.fillText('→', cursor + 3, 106);
        cursor += 20;
      }
    });

    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#475569';
    g.fillText(
      current.gc
        ? 'gc 开:事务清理时,已删 item 的内容被换成只剩长度(ContentDeleted),ID 与位置保留'
        : 'gc 关:删除内容留在内存中,undo、历史与快照仍可引用,代价是 update 编码更大',
      24,
      152,
    );

    // 编码字节对照:差值就是 tombstone 内容的体积。
    const maxBytes = Math.max(result.bytesGcOn, result.bytesGcOff, 1);
    const barMaxWidth = width - 240;
    const bars: Array<{ label: string; bytes: number; color: string }> = [
      { label: `gc 开 ${result.bytesGcOn} B`, bytes: result.bytesGcOn, color: '#4f7cff' },
      { label: `gc 关 ${result.bytesGcOff} B`, bytes: result.bytesGcOff, color: '#f59e0b' },
    ];
    g.fillText('同一次编辑的 update 编码体积:', 24, 192);
    bars.forEach((bar, index) => {
      const y = 208 + index * 30;
      g.fillStyle = '#e2e8f0';
      g.beginPath();
      g.roundRect(24, y, barMaxWidth, 18, 5);
      g.fill();
      g.fillStyle = bar.color;
      g.beginPath();
      g.roundRect(24, y, Math.max(10, (bar.bytes / maxBytes) * barMaxWidth), 18, 5);
      g.fill();
      g.fillStyle = '#334155';
      g.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(bar.label, 24 + barMaxWidth + 12, y + 13);
    });
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#475569';
    g.fillText('两档差值 = tombstone 内容的体积;插入 200 字符再全删的实测是 16 B ↔ 216 B', 24, 282);

    const tombstones = result.chain.filter((node) => node.deleted).length;
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#059669';
    g.fillText(
      `剩余文本 '${result.remaining}' · tombstone ${tombstones} 条(内容${current.gc ? '已回收,只剩长度' : '仍在内存'})`,
      24,
      318,
    );

    emit({
      remaining: result.remaining,
      deletedText: result.deleteCount > 0 ? `'${result.text.slice(0, result.deleteCount)}'(${result.deleteCount} 字符)` : '无',
      tombstones,
      tombstoneState: current.gc ? '已回收,只剩长度' : '仍保留在内存',
      bytesGcOn: result.bytesGcOn,
      bytesGcOff: result.bytesGcOff,
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
