/**
 * 演示内容：两个视图的存储是否共享、重启应用后 Cookie 是否还在，
 * 完全由它们的 partition 字符串决定——同字符串共享一份存储；
 * "persist:" 前缀持久化，裸名字是临时分区（重启即清空）。
 * 输入：视图 B 的 partition（persist:default / persist:account2 / account2）、
 * 观察时机（应用运行中 / 重启应用后）。视图 A 固定为不配置分区时的
 * 默认形态（persist:default）。
 * 操作：在 Controls 中切换视图 B 的 partition 与观察时机。
 * 预期结果：分区槽的连线随 partition 变化——同字符串时两个视图的箭头
 * 汇入同一槽并共享 Cookie；重启时机下裸名字槽清空、persist: 槽保留。
 * 阅读主线：resolveSlots() 是唯一的判定逻辑，draw() 只负责把判定画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ViewBPartition = 'persist:default' | 'persist:account2' | 'account2';
export type IsolationPhase = 'running' | 'restarted';

export interface PartitionIsolationOptions {
  viewBPartition: ViewBPartition;
  phase: IsolationPhase;
}

export interface PartitionIsolationSnapshot {
  viewA: string;
  viewB: string;
  sharing: string;
  afterRestart: string;
}

export interface PartitionIsolationInstance {
  update(options: PartitionIsolationOptions): void;
  dispose(): void;
}

interface PartitionSlot {
  /** 分区名，同时是存储槽的唯一键 */
  name: string;
  /** kindLabel：持久化 / 临时 */
  kindLabel: string;
  /** temporary 为 true 的裸名字分区，重启后清空 */
  temporary: boolean;
  /** 使用该分区的视图标签列表 */
  usedBy: string[];
  /** 槽内展示的 Cookie 条目 */
  cookies: string[];
}

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  plainBorder: '#94a3b8',
  ok: '#4f7cff',
  shared: '#4f7cff',
  viewB: '#7c5cbf',
  skipped: '#94a3b8',
  boxFill: '#ffffff',
  arrow: '#64748b',
};

// 视图 A 固定使用不配置分区时的默认形态；依据是原生层
// partition || "persist:default" 的回落逻辑（见课程正文）
const VIEW_A_PARTITION = 'persist:default';

// 唯一的判定逻辑：由两个视图的 partition 字符串推导出分区槽的使用关系。
// 同字符串 → 同一槽（共享）；"persist:" 前缀 → 持久化；裸名字 → 临时。
function resolveSlots(options: PartitionIsolationOptions): PartitionSlot[] {
  const { viewBPartition, phase } = options;
  const restarted = phase === 'restarted';

  const slots: PartitionSlot[] = [
    {
      name: 'persist:default',
      kindLabel: '持久化 · 默认分区',
      temporary: false,
      usedBy: ['A'],
      cookies: ['token=abc（A 写入）'],
    },
    {
      name: 'persist:account2',
      kindLabel: '持久化',
      temporary: false,
      usedBy: [],
      cookies: [],
    },
    {
      name: 'account2',
      kindLabel: '临时（重启即清空）',
      temporary: true,
      usedBy: [],
      cookies: [],
    },
  ];

  const target = slots.find((slot) => slot.name === viewBPartition);
  if (target) {
    target.usedBy.push('B');
    // 重启时机下，临时分区已被清空，读不到上一次运行写入的 Cookie
    if (!(restarted && target.temporary)) {
      target.cookies.push('theme=dark（B 写入）');
    }
  }

  return slots;
}

export function createPartitionIsolation(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PartitionIsolationSnapshot) => void,
): PartitionIsolationInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: PartitionIsolationOptions = {
    viewBPartition: 'persist:default',
    phase: 'running',
  };

  function drawViewCard(
    x: number,
    y: number,
    width: number,
    label: string,
    partition: string,
    accent: string,
    note: string,
  ) {
    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = accent;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, 72, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(label, x + 12, y + 21);
    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(partition, x + 12, y + 40);
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(note, x + 12, y + 59);
  }

  function drawArrow(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) {
    drawingContext.strokeStyle = COLORS.arrow;
    drawingContext.fillStyle = COLORS.arrow;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.moveTo(fromX, fromY);
    drawingContext.lineTo(toX, toY - 6);
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.moveTo(toX, toY);
    drawingContext.lineTo(toX - 4.5, toY - 9);
    drawingContext.lineTo(toX + 4.5, toY - 9);
    drawingContext.closePath();
    drawingContext.fill();
  }

  function drawSlot(
    x: number,
    y: number,
    width: number,
    slot: PartitionSlot,
    sharedSlot: boolean,
    restarted: boolean,
  ) {
    const active = slot.usedBy.length > 0;

    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = active
      ? sharedSlot
        ? COLORS.shared
        : COLORS.plainBorder
      : COLORS.skipped;
    drawingContext.lineWidth = active ? 1.5 : 1;
    drawingContext.setLineDash(active ? [] : [4, 3]);
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, 76, 8);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.setLineDash([]);

    drawingContext.fillStyle = active ? COLORS.heading : COLORS.skipped;
    drawingContext.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`"${slot.name}"`, x + 12, y + 21);

    drawingContext.fillStyle = active ? COLORS.muted : COLORS.skipped;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    const users = slot.usedBy.length
      ? `使用者：${slot.usedBy.join('、')}`
      : '未使用';
    drawingContext.fillText(`${slot.kindLabel} · ${users}`, x + 12, y + 39);

    // Cookie 条目：临时分区在重启时机下为空
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    if (slot.cookies.length) {
      drawingContext.fillStyle = COLORS.heading;
      drawingContext.fillText(slot.cookies.join('  '), x + 12, y + 58);
    } else if (active) {
      drawingContext.fillStyle = COLORS.skipped;
      drawingContext.fillText(
        restarted ? '（重启后已清空）' : '（空）',
        x + 12,
        y + 58,
      );
    }

    // 重启时机下的存留标注
    if (restarted) {
      drawingContext.fillStyle = slot.temporary ? COLORS.skipped : COLORS.ok;
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        slot.temporary ? '重启后清空' : '重启后保留',
        x + width - 74,
        y + 21,
      );
    }
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(560, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const slots = resolveSlots(current);
    const restarted = current.phase === 'restarted';
    const shared = current.viewBPartition === VIEW_A_PARTITION;

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('分区判定：视图 B 的 partition 决定存储关系', 24, 34);
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      restarted
        ? '观察时机：重启应用后——裸名字分区已清空，persist: 分区保留'
        : '观察时机：应用运行中——同 partition 字符串的视图共享同一份存储',
      24,
      56,
    );

    // 顶部：两个视图卡片
    const margin = 24;
    const cardGap = 20;
    const cardWidth = (width - margin * 2 - cardGap) / 2;
    const cardTop = 76;
    drawViewCard(
      margin,
      cardTop,
      cardWidth,
      '视图 A（窗口自带 webview / 未配置分区的 BrowserView）',
      'partition: "persist:default"',
      COLORS.ok,
      '不配置分区时的默认形态',
    );
    drawViewCard(
      margin + cardWidth + cardGap,
      cardTop,
      cardWidth,
      '视图 B（partition 可配置）',
      `partition: "${current.viewBPartition}"`,
      COLORS.viewB,
      shared ? '与视图 A 同字符串 → 共享存储' : '与视图 A 不同字符串 → 独立存储',
    );

    // 分区槽：每个 partition 字符串对应一份存储
    const slotTop = cardTop + 72 + 44;
    const slotHeight = 76;
    const slotGap = 16;
    const slotWidth = width - margin * 2 - 56;

    slots.forEach((slot, index) => {
      const y = slotTop + index * (slotHeight + slotGap);
      drawSlot(
        margin + 56,
        y,
        slotWidth,
        slot,
        shared && slot.usedBy.length > 1,
        restarted,
      );

      // 从使用该槽的视图画连线：A 从左卡片，B 从右卡片
      if (slot.usedBy.includes('A')) {
        drawArrow(
          margin + cardWidth / 2,
          cardTop + 72,
          margin + 56 + 28,
          y,
        );
      }
      if (slot.usedBy.includes('B')) {
        drawArrow(
          margin + cardWidth + cardGap + cardWidth / 2,
          cardTop + 72,
          margin + 56 + 28,
          y,
        );
      }
    });

    // 底部事实条：窗口自带 webview 无法自定义分区
    const noteTop = slotTop + 3 * slotHeight + 2 * slotGap + 16;
    drawingContext.fillStyle = '#f1f5f9';
    drawingContext.strokeStyle = COLORS.plainBorder;
    drawingContext.lineWidth = 1;
    drawingContext.beginPath();
    drawingContext.roundRect(margin, noteTop, width - margin * 2, 44, 8);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '窗口自带 webview 不接受 partition（BrowserWindow 构造时固定落到 persist:default）；',
      margin + 12,
      noteTop + 19,
    );
    drawingContext.fillText(
      '要自定义分区，用 BrowserView 的 partition 选项或 <electrobun-webview> 的 partition 属性。',
      margin + 12,
      noteTop + 35,
    );

    emit({
      viewA: `"${VIEW_A_PARTITION}"`,
      viewB: `"${current.viewBPartition}"`,
      sharing: shared ? '共享（同一 partition 字符串）' : '独立（不同字符串）',
      afterRestart:
        current.viewBPartition === 'account2'
          ? '清空（裸名字 = 临时分区）'
          : '保留（persist: = 持久化分区）',
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = {
        viewBPartition: options.viewBPartition,
        phase: options.phase,
      };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
