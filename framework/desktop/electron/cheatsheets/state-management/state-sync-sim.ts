/**
 * 状态同步沙盘：同一串修改，三种同步方式下窗口 A、B 各自看到的值。
 * 输入：同步方式（渲染端私有 / 广播无快照 / 快照+广播）、窗口 A 已发起的修改次数、
 * 窗口 B 是否在第 2 次修改后刷新。
 * 操作：切换同步方式、增减修改次数、选择 B 的刷新时机。
 * 预期结果：私有模式下 B 永远停在 0；只广播无快照时，B 刷新会丢失之前的历史而落后；
 * 快照 + 广播时 B 任意时刻加入都能追平。
 * 阅读主线：主进程卡片（权威值）→ 两扇窗口卡片（各自看到的值）→ 同步连线与一致性读数。
 * 真实 Electron 无法在浏览器里运行，本沙盘模拟的是同步规则的时序结果。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SyncMode = '渲染端私有' | '广播（无快照）' | '快照 + 广播';

export type ReloadChoice = '从不' | '第 2 次修改后';

export interface SyncSimOptions {
  syncMode: SyncMode;
  changeCount: number;
  reloadAt: ReloadChoice;
}

export interface SyncSimSnapshot {
  aValueLabel: string;
  bValueLabel: string;
  consistentLabel: string;
  sourceLabel: string;
}

export interface SyncInstance {
  update(options: SyncSimOptions): void;
  dispose(): void;
}

interface DerivedState {
  a: number;
  b: number;
  source: string;
  conclusion: string;
}

const RELOAD_OFFSET = 2;

function deriveState(options: SyncSimOptions): DerivedState {
  const changes = Math.max(0, Math.min(4, Math.round(options.changeCount)));
  const reloadHappened =
    options.reloadAt === '第 2 次修改后' && changes >= RELOAD_OFFSET;

  if (options.syncMode === '渲染端私有') {
    return {
      a: changes,
      b: 0,
      source: '无（收不到任何更新）',
      conclusion: 'A 的修改留在窗口 A 自己的页面里，B 无从得知',
    };
  }

  if (options.syncMode === '广播（无快照）') {
    const missed = reloadHappened ? RELOAD_OFFSET : 0;
    return {
      a: changes,
      b: Math.max(0, changes - missed),
      source: reloadHappened ? '仅存活期间的广播' : '启动以来的广播',
      conclusion: reloadHappened
        ? `B 刷新时丢了之前的 ${RELOAD_OFFSET} 次广播：广播不排队、不补发，只带「之后有更新」`
        : 'B 一直在场：每条广播都收到，与 A 保持一致',
    };
  }

  return {
    a: changes,
    b: changes,
    source: reloadHappened ? '刷新后先拉快照，再接广播' : '启动快照 + 后续广播',
    conclusion: reloadHappened
      ? 'B 刷新后先拉到当前快照，再接后续广播，追平 A'
      : 'B 启动时拉快照，之后靠广播保持一致',
  };
}

export function createSyncSim(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SyncSimSnapshot) => void,
): SyncInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: SyncSimOptions = {
    syncMode: '广播（无快照）',
    changeCount: 4,
    reloadAt: '第 2 次修改后',
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

  function drawArrowHead(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
  ) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const size = 8;
    drawingContext.beginPath();
    drawingContext.moveTo(toX, toY);
    drawingContext.lineTo(
      toX - size * Math.cos(angle - Math.PI / 6),
      toY - size * Math.sin(angle - Math.PI / 6),
    );
    drawingContext.lineTo(
      toX - size * Math.cos(angle + Math.PI / 6),
      toY - size * Math.sin(angle + Math.PI / 6),
    );
    drawingContext.closePath();
    drawingContext.fillStyle = color;
    drawingContext.fill();
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(384, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const derived = deriveState(current);
    const mainOwns = current.syncMode !== '渲染端私有';

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('窗口 B 能不能跟窗口 A 看到同一个值', 24, 34);
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '模拟：窗口 A 每发起一次修改，状态值 +1；真实 Electron 无法在浏览器运行',
      24,
      56,
    );

    // 主进程卡片：单一事实源
    const mainWidth = 250;
    const mainHeight = 76;
    const mainX = (width - mainWidth) / 2;
    const mainY = 78;

    drawingContext.fillStyle = mainOwns ? '#e2e8f0' : '#f1f5f9';
    drawingContext.strokeStyle = mainOwns ? '#4f7cff' : '#cbd5e1';
    drawingContext.lineWidth = 1.5;
    roundRect(mainX, mainY, mainWidth, mainHeight, 10);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = mainOwns ? '#172033' : '#94a3b8';
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('主进程 · 单一事实源', mainX + 16, mainY + 26);
    drawingContext.fillStyle = mainOwns ? '#334155' : '#cbd5e1';
    drawingContext.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      mainOwns ? `状态值：${derived.a}` : '（未持有该状态）',
      mainX + 16,
      mainY + 56,
    );

    // 窗口卡片
    const margin = 24;
    const gap = 24;
    const cardWidth = (width - margin * 2 - gap) / 2;
    const cardY = 240;
    const cardHeight = 96;
    const cardAX = margin;
    const cardBX = margin + cardWidth + gap;
    const centerAX = cardAX + cardWidth / 2;
    const centerBX = cardBX + cardWidth / 2;

    const cards = [
      {
        x: cardAX,
        name: '窗口 A',
        value: derived.a,
        note: '发起修改：invoke',
      },
      {
        x: cardBX,
        name: '窗口 B',
        value: derived.b,
        note: `值的来源：${derived.source}`,
      },
    ];

    cards.forEach((card) => {
      drawingContext.fillStyle = '#f1f5f9';
      drawingContext.strokeStyle = '#cbd5e1';
      roundRect(card.x, cardY, cardWidth, cardHeight, 10);
      drawingContext.fill();
      drawingContext.stroke();

      drawingContext.fillStyle = '#172033';
      drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(card.name, card.x + 16, cardY + 26);
      drawingContext.font = '600 17px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillText(`看到的值：${card.value}`, card.x + 16, cardY + 56);
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(card.note, card.x + 16, cardY + 80);
    });

    // 窗口 B 的刷新角标
    if (current.reloadAt === '第 2 次修改后') {
      const badgeText = '第 2 次修改后刷新';
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      const badgeWidth = drawingContext.measureText(badgeText).width + 16;
      const badgeX = cardBX + cardWidth - badgeWidth - 10;
      drawingContext.fillStyle = '#fde68a';
      roundRect(badgeX, cardY - 10, badgeWidth, 20, 10);
      drawingContext.fill();
      drawingContext.fillStyle = '#92400e';
      drawingContext.fillText(badgeText, badgeX + 8, cardY + 4);
    }

    // 连线：窗口 A → 主进程（invoke 修改），主进程 → 窗口 B（同步方式）
    const mainBottomLeft = { x: mainX + 44, y: mainY + mainHeight };
    const mainBottomRight = { x: mainX + mainWidth - 44, y: mainY + mainHeight };

    if (mainOwns) {
      drawingContext.strokeStyle = '#94a3b8';
      drawingContext.lineWidth = 1.5;
      drawingContext.setLineDash([]);
      drawingContext.beginPath();
      drawingContext.moveTo(centerAX, cardY);
      drawingContext.lineTo(mainBottomLeft.x, mainBottomLeft.y);
      drawingContext.stroke();
      drawArrowHead(centerAX, cardY, mainBottomLeft.x, mainBottomLeft.y, '#94a3b8');
      drawingContext.fillStyle = '#64748b';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('invoke 修改', centerAX + 8, 196);
    } else {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('A 直接改自己页面里的值，不经主进程', centerAX - 40, 196);
    }

    const lineColor = current.syncMode === '快照 + 广播' ? '#4f7cff' : '#64748b';
    drawingContext.strokeStyle = current.syncMode === '渲染端私有' ? '#cbd5e1' : lineColor;
    drawingContext.setLineDash(current.syncMode === '渲染端私有' ? [6, 5] : []);
    drawingContext.beginPath();
    drawingContext.moveTo(mainBottomRight.x, mainBottomRight.y);
    drawingContext.lineTo(centerBX, cardY);
    drawingContext.stroke();
    drawingContext.setLineDash([]);
    drawArrowHead(
      mainBottomRight.x,
      mainBottomRight.y,
      centerBX,
      cardY,
      current.syncMode === '渲染端私有' ? '#cbd5e1' : lineColor,
    );

    const lineLabel =
      current.syncMode === '渲染端私有'
        ? '无同步'
        : current.syncMode === '广播（无快照）'
          ? '广播：只发后续变更'
          : '先快照，再广播';
    drawingContext.fillStyle = current.syncMode === '渲染端私有' ? '#94a3b8' : lineColor;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(lineLabel, (mainBottomRight.x + centerBX) / 2 - 40, 196);

    // 底部结论
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(derived.conclusion, 24, height - 24);

    const consistent = derived.a === derived.b;
    emit({
      aValueLabel: String(derived.a),
      bValueLabel: String(derived.b),
      consistentLabel: consistent
        ? `是（都是 ${derived.a}）`
        : `否（B 落后 ${derived.a - derived.b} 次修改）`,
      sourceLabel: derived.source,
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
