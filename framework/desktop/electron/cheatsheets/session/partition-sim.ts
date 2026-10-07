/**
 * 分区沙盘：模拟 webPreferences.partition 的会话身份与落盘规则。
 * 输入：两个窗口各自选择的分区（默认会话 / persist:work / persist:play / temp）。
 * 操作：切换任一窗口的分区。
 * 预期结果：同名分区共享同一个会话罐；带 persist: 前缀的罐落盘（重启仍在），
 * 无前缀的罐仅存内存（退出即清）；不设分区的窗口进入全应用共享的默认会话。
 * 阅读主线：窗口卡片 → 按分区名归组的会话罐 → 落盘标记与共享读数。
 * 真实 Electron 无法在浏览器里运行，本沙盘只呈现分区身份与落盘规则。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type PartitionChoice =
  | '默认会话'
  | 'persist:work'
  | 'persist:play'
  | 'temp';

export interface PartitionOptions {
  partitionA: PartitionChoice;
  partitionB: PartitionChoice;
}

export interface PartitionSnapshot {
  partitionALabel: string;
  sessionALabel: string;
  aPersistLabel: string;
  partitionBLabel: string;
  sessionBLabel: string;
  sharedLabel: string;
}

export interface PartitionInstance {
  update(options: PartitionOptions): void;
  dispose(): void;
}

interface SessionJar {
  key: string;
  title: string;
  kind: 'default' | 'persist' | 'memory';
  badge: string;
  storageLabel: string;
}

function partitionValue(choice: PartitionChoice): string {
  return choice === '默认会话' ? '' : choice;
}

function sessionLabel(value: string): string {
  return value === '' ? 'defaultSession' : `Session("${value}")`;
}

function jarFor(value: string): SessionJar {
  if (value === '') {
    return {
      key: '',
      title: 'defaultSession',
      kind: 'default',
      badge: '磁盘',
      storageLabel: '落盘 userData · 全应用共享',
    };
  }

  if (value.startsWith('persist:')) {
    return {
      key: value,
      title: `Session("${value}")`,
      kind: 'persist',
      badge: '磁盘',
      storageLabel: '落盘独立目录 · 重启仍在',
    };
  }

  return {
    key: value,
    title: `Session("${value}")`,
    kind: 'memory',
    badge: '内存',
    storageLabel: '仅存内存 · 退出即清',
  };
}

function partitionLabel(choice: PartitionChoice): string {
  return choice === '默认会话' ? "partition: (不设)" : `partition: '${choice}'`;
}

const PERSIST_READOUT = '是 · userData 或独立目录';
const MEMORY_READOUT = '否 · 仅内存';

export function createPartitionSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PartitionSnapshot) => void,
): PartitionInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: PartitionOptions = {
    partitionA: 'persist:work',
    partitionB: 'temp',
  };

  function roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) {
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + width, y, x + width, y + height, radius);
    drawingContext.arcTo(x + width, y + height, x, y + height, radius);
    drawingContext.arcTo(x, y + height, x, y, radius);
    drawingContext.arcTo(x, y, x + width, y, radius);
    drawingContext.closePath();
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(360, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const valueA = partitionValue(current.partitionA);
    const valueB = partitionValue(current.partitionB);
    const jarA = jarFor(valueA);
    const jarB = jarFor(valueB);
    const jars: SessionJar[] = [jarA];
    if (jarB.key !== jarA.key) {
      jars.push(jarB);
    }

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('同名分区共享同一份档案；persist: 前缀决定是否落盘', 24, 36);
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '真实 Electron 无法在浏览器运行：这里模拟的是分区身份与落盘规则',
      24,
      60,
    );

    const margin = 24;
    const gap = 20;
    const cardWidth = (width - margin * 2 - gap) / 2;
    const cardY = 88;
    const cardHeight = 64;

    const windows = [
      { name: '窗口 A', choice: current.partitionA, jar: jarA },
      { name: '窗口 B', choice: current.partitionB, jar: jarB },
    ];
    const centers: number[] = [];

    windows.forEach((item, index) => {
      const x = margin + index * (cardWidth + gap);
      centers.push(x + cardWidth / 2);

      drawingContext.fillStyle = '#f1f5f9';
      drawingContext.strokeStyle = '#cbd5e1';
      roundRect(x, cardY, cardWidth, cardHeight, 10);
      drawingContext.fill();
      drawingContext.stroke();

      drawingContext.fillStyle = '#172033';
      drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(item.name, x + 18, cardY + 26);
      drawingContext.fillStyle = '#334155';
      drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(partitionLabel(item.choice), x + 18, cardY + 48);
    });

    const jarY = cardY + cardHeight + 84;
    const jarWidth = Math.min(
      300,
      (width - margin * 2 - gap * (jars.length - 1)) / jars.length,
    );
    const jarHeight = 92;
    const totalWidth = jars.length * jarWidth + (jars.length - 1) * gap;
    const startX = (width - totalWidth) / 2;
    const jarCenters = jars.map(
      (_jar, index) => startX + index * (jarWidth + gap) + jarWidth / 2,
    );

    // 连线：窗口卡片 → 所属会话罐
    drawingContext.strokeStyle = '#94a3b8';
    drawingContext.lineWidth = 1.5;
    windows.forEach((item, index) => {
      drawingContext.beginPath();
      drawingContext.moveTo(centers[index], cardY + cardHeight);
      drawingContext.lineTo(jarCenters[jars.indexOf(item.jar)], jarY);
      drawingContext.stroke();
    });

    const headerColors = {
      default: '#4f7cff',
      persist: '#4f7cff',
      memory: '#d97706',
    };

    jars.forEach((jar, index) => {
      const x = startX + index * (jarWidth + gap);

      drawingContext.fillStyle = '#e2e8f0';
      roundRect(x, jarY, jarWidth, jarHeight, 10);
      drawingContext.fill();

      drawingContext.fillStyle = headerColors[jar.kind];
      roundRect(x, jarY, jarWidth, 26, 10);
      drawingContext.fill();
      drawingContext.fillRect(x, jarY + 16, jarWidth, 10);

      drawingContext.fillStyle = '#ffffff';
      drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(jar.title, x + 14, jarY + 18);

      const badgeText = jar.badge;
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      const badgeWidth = drawingContext.measureText(badgeText).width + 16;
      const badgeX = x + jarWidth - badgeWidth - 10;
      drawingContext.fillStyle = 'rgba(255, 255, 255, 0.25)';
      roundRect(badgeX, jarY + 6, badgeWidth, 15, 7);
      drawingContext.fill();
      drawingContext.fillStyle = '#ffffff';
      drawingContext.fillText(badgeText, badgeX + 8, jarY + 17);

      drawingContext.fillStyle = '#172033';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(jar.storageLabel, x + 14, jarY + 48);

      drawingContext.fillStyle = '#475569';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('cookie 罐 · 缓存 · 站点数据', x + 14, jarY + 70);
    });

    emit({
      partitionALabel: current.partitionA,
      sessionALabel: sessionLabel(valueA),
      aPersistLabel: jarA.kind === 'memory' ? MEMORY_READOUT : PERSIST_READOUT,
      partitionBLabel: current.partitionB,
      sessionBLabel: sessionLabel(valueB),
      sharedLabel:
        jarA.key === jarB.key
          ? '是（同名分区即同一会话）'
          : '否（不同分区互不相通）',
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
