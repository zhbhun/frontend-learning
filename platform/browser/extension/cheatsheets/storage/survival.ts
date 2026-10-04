/**
 * 范例介绍：同一个状态写在不同位置，随 service worker 与浏览器生命周期存活多久。
 * 前置状态：演示值 42 已写入所选位置；全局变量场景对应 sw.js 顶层的 let count = 0，
 * 由某次事件累加到 42。
 * 主要操作：切换「写入位置」与「观察时刻」，存活地图高亮对应行列。
 * 预期结果：全局变量活不过 SW 空闲终止，唤醒后回到初始值 0；storage.session
 * 活过 SW 重启、死在浏览器重启；storage.local / storage.sync 全程存活。
 * 阅读主线：四行是写入位置，四列是生命周期时刻；蓝格读到 42，灰格回到初始值，红格丢失。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type StorageLocation = 'global' | 'session' | 'local' | 'sync';
export type LifeMoment = 'written' | 'terminated' | 'awakened' | 'restart';

export interface SurvivalOptions {
  location: StorageLocation;
  moment: LifeMoment;
}

export interface SurvivalSnapshot {
  locationLabel: string;
  momentLabel: string;
  readback: string;
}

export interface SurvivalInstance {
  update(options: SurvivalOptions): void;
  dispose(): void;
}

const LOCATIONS: StorageLocation[] = ['global', 'session', 'local', 'sync'];
const MOMENTS: LifeMoment[] = ['written', 'terminated', 'awakened', 'restart'];

const LOCATION_LABEL: Record<StorageLocation, string> = {
  global: '全局变量',
  session: 'storage.session',
  local: 'storage.local',
  sync: 'storage.sync',
};

const MOMENT_LABEL: Record<LifeMoment, string> = {
  written: '写入后',
  terminated: 'SW 空闲终止',
  awakened: '事件唤醒',
  restart: '重启浏览器',
};

// 单元格状态：alive 读到 42；initial 顶层脚本重跑后回到初始值；lost 数据已不存在
type Cell = 'alive' | 'initial' | 'lost';

// 四行写入位置 × 四列生命周期时刻的存活结果。
// local 与 sync 的寿命相同，二者差别在跨设备同步与写入配额。
const SURVIVAL: Record<StorageLocation, Cell[]> = {
  global: ['alive', 'lost', 'initial', 'initial'],
  session: ['alive', 'alive', 'alive', 'lost'],
  local: ['alive', 'alive', 'alive', 'alive'],
  sync: ['alive', 'alive', 'alive', 'alive'],
};

const CELL_TEXT: Record<Cell, string> = {
  alive: '读到 42',
  initial: '读到 0（初始值）',
  lost: '丢失',
};

const CELL_FILL: Record<Cell, string> = {
  alive: '#dbe7ff',
  initial: '#e8edf5',
  lost: '#fee2e2',
};

const CELL_STROKE: Record<Cell, string> = {
  alive: '#93b4ff',
  initial: '#e8edf5',
  lost: '#fca5a5',
};

const CELL_INK: Record<Cell, string> = {
  alive: '#1e40af',
  initial: '#64748b',
  lost: '#b91c1c',
};

const MOMENT_NOTE: Record<LifeMoment, string> = {
  written: '写入刚完成，此刻放哪都读得到。',
  terminated: 'SW 空闲 30 秒被终止，全局作用域清空。',
  awakened: '新事件唤醒 SW，顶层脚本重新执行。',
  restart: '浏览器整个重启，内存数据不再保留。',
};

const LOCATION_NOTE: Record<StorageLocation, string> = {
  global: 'sw.js 顶层的 let count = 0，由事件累加到 42',
  session: '内存态：SW 重启不清零，扩展重载或浏览器重启时清空',
  local: '本机落盘持久，卸载扩展才清除',
  sync: '落盘持久并随账号同步，寿命与 local 相同',
};

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function snapshotFor(options: SurvivalOptions): SurvivalSnapshot {
  const cell = SURVIVAL[options.location][MOMENTS.indexOf(options.moment)];
  return {
    locationLabel: LOCATION_LABEL[options.location],
    momentLabel: MOMENT_LABEL[options.moment],
    readback: CELL_TEXT[cell],
  };
}

export function createSurvivalExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SurvivalSnapshot) => void,
): SurvivalInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: SurvivalOptions = { location: 'session', moment: 'terminated' };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(340, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const x0 = 12;
    const rowLabelW = 130;
    const colW = (width - x0 - rowLabelW - 12) / 4;
    const top = 36;
    const rowH = Math.min(62, Math.max(48, (height - top - 82) / 4));

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // 列标题：生命周期时刻；当前观察时刻加粗高亮
    MOMENTS.forEach((moment, col) => {
      const active = moment === current.moment;
      ctx.font = active
        ? '600 12px ui-sans-serif, system-ui, sans-serif'
        : '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = active ? '#1d4ed8' : '#475569';
      ctx.fillText(
        MOMENT_LABEL[moment],
        x0 + rowLabelW + col * colW + colW / 2,
        top - 16,
        colW - 6,
      );
    });

    LOCATIONS.forEach((location, row) => {
      const y = top + row * rowH;
      const rowActive = location === current.location;

      // 行标题：写入位置；当前行加粗高亮
      ctx.textAlign = 'left';
      ctx.font = rowActive
        ? '600 12px ui-monospace, SFMono-Regular, Menlo, monospace'
        : '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = rowActive ? '#1d4ed8' : '#334155';
      ctx.fillText(LOCATION_LABEL[location], x0, y + rowH / 2, rowLabelW - 12);

      MOMENTS.forEach((moment, col) => {
        const cell = SURVIVAL[location][col];
        const cx = x0 + rowLabelW + col * colW + 2;
        const cy = y + 2;
        const cw = colW - 4;
        const ch = rowH - 4;
        const isCurrent = rowActive && moment === current.moment;

        ctx.fillStyle = CELL_FILL[cell];
        roundedRect(ctx, cx, cy, cw, ch, 6);
        ctx.fill();
        if (cell !== 'initial') {
          ctx.strokeStyle = CELL_STROKE[cell];
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (isCurrent) {
          ctx.strokeStyle = '#1d4ed8';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        ctx.fillStyle = CELL_INK[cell];
        ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(CELL_TEXT[cell], cx + cw / 2, cy + ch / 2, cw - 8);
      });
    });

    // 底部说明：解释当前选中的行与列
    const noteY = top + rowH * 4 + 20;
    ctx.textAlign = 'left';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(
      `「${LOCATION_LABEL[current.location]}」${LOCATION_NOTE[current.location]}`,
      x0,
      noteY,
      width - x0 * 2,
    );
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      `「${MOMENT_LABEL[current.moment]}」${MOMENT_NOTE[current.moment]}`,
      x0,
      noteY + 20,
      width - x0 * 2,
    );

    emit(snapshotFor(current));
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
