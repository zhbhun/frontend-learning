/**
 * 范例介绍：浏览器里的一组事件监听站——root 与插件站 A、站 B 各自注册 spark 监听器，
 * 展示注册形态（prepend / global / 手动 off / 随作用域撤销）与分发范围（广播 / thisArg 过滤）。
 * 输入：Controls 的「信号强度」「触发方式」「站 A 在线」「撤销 a-manual」「b-error 抛错」。
 * 操作：点击画布按当前触发方式分发一次 spark（定向模式用 root.extend + Context.filter 载体）；
 *      开关销毁/重建站 A 插件；「撤销 a-manual」单独 off 一个监听器。
 * 预期结果：广播到达全部监听器且 a-prepend 最先；定向只到达站 A 与 global 监听器；
 *          站 A 销毁后其监听器全部消失；手动 off 只移除 a-manual；b-error 抛错中断后续监听器。
 * 阅读主线：root / stationA / stationB 的注册 → carrier 定向载体 → dispatch → paint。
 */
import { Context, type Fiber } from 'cordis';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 声明本范例的自定义事件名：事件签名就是监听器类型（参数、this、返回值都由它确定）
declare module 'cordis' {
  interface Events {
    spark(strength: number): void;
  }
}

export interface StationOptions {
  strength: number;
  mode: 'broadcast' | 'directed';
  stationA: boolean;
  manualOff: boolean;
  bThrows: boolean;
}

export interface StationSnapshot {
  dispatches: number;
  lastOrder: string;
  tap: string;
  manual: string;
}

export interface StationInstance {
  update(options: StationOptions): void;
  dispose(): void;
}

export function createEventStation(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StationSnapshot) => void,
): StationInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: StationOptions = {
    strength: 3,
    mode: 'broadcast',
    stationA: true,
    manualOff: false,
    bThrows: false,
  };

  const root = new Context();
  // 各监听器的命中计数与最近一次分发的调用顺序——分发语义的直接证据
  const hits: Record<string, number> = {};
  let lastOrder: string[] = [];
  let dispatches = 0;
  let tapCount = 0;
  let failure = '';
  const log: Array<{ head: string; body: string; bad: boolean }> = [];

  // 站 A 的当前上下文：定向过滤按「监听器注册时的 ctx」匹配，重建后要跟上新 ctx
  let stationACtx: Context | null = null;
  let fiberA: Fiber | undefined;
  let stationAlive = false;
  let manualRegistered = true;
  let offManual: (() => boolean) | undefined;
  // 串行执行注册与销毁，避免快速切换开关时两者竞争
  let chain: Promise<void> = Promise.resolve();

  function bump(id: string) {
    hits[id] = (hits[id] ?? 0) + 1;
    lastOrder.push(id);
  }

  // root 作用域自己的监听器：不随任何插件开关消失
  root.on('spark', () => {
    bump('root-obs');
  });
  // 观察窗：任意非 internal/* 事件分发前会先触发 internal/dispatch
  root.on('internal/dispatch', () => {
    tapCount += 1;
  });

  // 站 A 插件：四个监听器演示四种注册形态
  function stationA(ctx: Context) {
    stationACtx = ctx;
    ctx.on('spark', () => {
      bump('a-plain');
    });
    if (!current.manualOff) {
      offManual = ctx.on('spark', () => {
        bump('a-manual');
      });
      manualRegistered = true;
    }
    ctx.on(
      'spark',
      () => {
        bump('a-prepend');
      },
      { prepend: true },
    );
    ctx.on(
      'spark',
      () => {
        bump('a-global');
      },
      { global: true },
    );
  }

  // 站 B 插件：b-error 可抛错（演示同步分发在抛错处中断），b-global 演示 global 免疫过滤
  function stationB(ctx: Context) {
    ctx.on('spark', () => {
      if (current.bThrows) {
        throw new Error('b-error 演示错误');
      }
      bump('b-error');
    });
    ctx.on(
      'spark',
      () => {
        bump('b-global');
      },
      { global: true },
    );
    ctx.on('spark', () => {
      bump('b-tail');
    });
  }

  // 定向分发载体：extend 派生一个携带 Context.filter 的上下文，
  // emit(carrier, ...) 时只有 filter 通过（注册 ctx 命中站 A）与 global 的监听器会被调用
  const carrier = root.extend({
    [Context.filter]: (target: Context) => target === stationACtx,
  });

  function dispatch() {
    lastOrder = [];
    failure = '';
    try {
      if (current.mode === 'broadcast') {
        // 广播：不带 thisArg——全树所有同名监听器都会被调用
        root.emit('spark', current.strength);
      } else {
        // 定向：带 thisArg——按 Context.filter 过滤监听器
        root.emit(carrier, 'spark', current.strength);
      }
    } catch (error) {
      // emit 是同步顺序调用：抛错的监听器中断分发，错误原样到达触发方
      failure = `${
        error instanceof Error ? error.message : String(error)
      }（后续监听器未执行）`;
    }
    dispatches += 1;
    log.unshift({
      head: `#${dispatches} ${
        current.mode === 'broadcast' ? '广播' : '定向'
      } spark(${current.strength})`,
      body: failure || lastOrder.join(' → ') || '（无监听器响应）',
      bad: Boolean(failure),
    });
    if (log.length > 6) {
      log.length = 6;
    }
    paint();
  }

  function handleClick() {
    dispatch();
  }

  function paint() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const wide = width >= 680;
    const logCount = wide ? 6 : 4;
    const pad = 24;
    const cardGap = 12;

    const stationAListeners = [
      { id: 'a-plain', badge: '', alive: stationAlive },
      {
        id: 'a-manual',
        badge: '手动 off',
        alive: stationAlive && manualRegistered,
      },
      { id: 'a-prepend', badge: '前置', alive: stationAlive },
      { id: 'a-global', badge: '全局', alive: stationAlive },
    ];
    const stationBListeners = [
      { id: 'b-error', badge: current.bThrows ? '抛错中' : '', alive: true },
      { id: 'b-global', badge: '全局', alive: true },
      { id: 'b-tail', badge: '', alive: true },
    ];

    // 先按卡片行数推演高度，再落笔——提示行必须排在所有面板之下
    const rows = (count: number) => (wide ? 30 + count * 20 + 10 : 26 + count * 18 + 10);
    const logHeight = wide ? 280 : 158;
    let contentBottom: number;
    if (wide) {
      contentBottom = 72 + rows(1) + cardGap + rows(4) + cardGap + rows(3);
    } else {
      // 窄屏把日志面板放到最前——它是本范例的主证据
      contentBottom =
        66 + logHeight + cardGap + rows(1) + cardGap + rows(4) + cardGap + rows(3);
    }
    const hintY = contentBottom + 24;
    const height = hintY + 14;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('事件监听站：注册形态与分发范围', 24, 44);

    if (wide) {
      const leftWidth = Math.round((width - pad * 2 - 20) * 0.47);
      const rightX = pad + leftWidth + 20;
      const rightWidth = width - rightX - pad;
      let y = 72;
      y = drawStation(
        drawingContext,
        pad,
        y,
        leftWidth,
        'root（根作用域）',
        '常驻',
        [{ id: 'root-obs', badge: '', alive: true }],
      );
      y += cardGap;
      y = drawStation(
        drawingContext,
        pad,
        y,
        leftWidth,
        '站 A（插件作用域）',
        stationAlive ? '运行中' : '已销毁',
        stationAListeners,
      );
      y += cardGap;
      drawStation(
        drawingContext,
        pad,
        y,
        leftWidth,
        '站 B（插件作用域）',
        '运行中',
        stationBListeners,
      );
      drawLog(drawingContext, rightX, 72, rightWidth, logHeight, logCount);
    } else {
      const cardWidth = width - pad * 2;
      // 窄屏：日志面板在前（主证据优先可见），监听站卡片在后
      drawLog(drawingContext, pad, 66, cardWidth, logHeight, logCount);
      let y = 66 + logHeight + cardGap;
      y = drawStation(
        drawingContext,
        pad,
        y,
        cardWidth,
        'root（根作用域）',
        '常驻',
        [{ id: 'root-obs', badge: '', alive: true }],
        true,
      );
      y += cardGap;
      y = drawStation(
        drawingContext,
        pad,
        y,
        cardWidth,
        '站 A（插件作用域）',
        stationAlive ? '运行中' : '已销毁',
        stationAListeners,
        true,
      );
      y += cardGap;
      drawStation(
        drawingContext,
        pad,
        y,
        cardWidth,
        '站 B（插件作用域）',
        '运行中',
        stationBListeners,
        true,
      );
    }
    drawHint(drawingContext, width, hintY);

    emit({
      dispatches,
      lastOrder: lastOrder.length ? lastOrder.join(' → ') : '—',
      tap: `emit spark ×${tapCount}`,
      manual: manualRegistered ? '已注册' : '已撤销',
    });
  }

  function drawStation(
    target: CanvasRenderingContext2D,
    x: number,
    y: number,
    cardWidth: number,
    title: string,
    state: string,
    listeners: Array<{ id: string; badge: string; alive: boolean }>,
    compact = false,
  ) {
    const headerHeight = compact ? 26 : 30;
    const rowHeight = compact ? 18 : 20;
    const cardHeight = headerHeight + listeners.length * rowHeight + 10;

    target.fillStyle = state === '已销毁' ? '#f1f5f9' : '#ffffff';
    target.strokeStyle = state === '已销毁' ? '#cbd5e1' : '#cbd5e1';
    target.lineWidth = 1.5;
    target.setLineDash(state === '已销毁' ? [4, 3] : []);
    roundRect(target, x, y, cardWidth, cardHeight, 8);
    target.fill();
    target.stroke();
    target.setLineDash([]);

    target.fillStyle = '#172033';
    target.font = `600 ${compact ? 12 : 13}px ui-sans-serif, system-ui, sans-serif`;
    target.fillText(title, x + 12, y + headerHeight - 9);

    target.fillStyle = state === '已销毁' ? '#ef4444' : '#16a34a';
    target.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    target.textAlign = 'right';
    target.fillText(state, x + cardWidth - 12, y + headerHeight - 9);
    target.textAlign = 'left';

    listeners.forEach((listener, index) => {
      const rowY = y + headerHeight + 10 + index * rowHeight;
      target.fillStyle = listener.alive ? '#475569' : '#94a3b8';
      target.font = `11px ui-monospace, SFMono-Regular, Menlo, monospace`;
      const suffix = listener.badge ? `（${listener.badge}）` : '';
      const label = `${listener.id}${suffix}`;
      target.fillText(label, x + 14, rowY, cardWidth - 88);

      target.textAlign = 'right';
      if (listener.alive) {
        target.fillStyle = '#4f7cff';
        target.fillText(`×${hits[listener.id] ?? 0}`, x + cardWidth - 12, rowY);
      } else {
        target.fillText('已撤销', x + cardWidth - 12, rowY);
      }
      target.textAlign = 'left';
    });

    return y + cardHeight;
  }

  function drawLog(
    target: CanvasRenderingContext2D,
    x: number,
    y: number,
    panelWidth: number,
    panelHeight: number,
    logCount: number,
  ) {
    target.fillStyle = '#ffffff';
    target.strokeStyle = '#cbd5e1';
    target.lineWidth = 1.5;
    roundRect(target, x, y, panelWidth, panelHeight, 8);
    target.fill();
    target.stroke();

    target.fillStyle = '#172033';
    target.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    target.fillText(`分发日志（最近 ${logCount} 次）`, x + 12, y + 24);

    if (!log.length) {
      target.fillStyle = '#94a3b8';
      target.font = '12px ui-sans-serif, system-ui, sans-serif';
      target.fillText('（点击画布，按当前触发方式分发一次 spark）', x + 12, y + 48);
      return;
    }

    const rowHeight = panelHeight > 200 ? 38 : 30;
    log.slice(0, logCount).forEach((entry, index) => {
      const rowY = y + 44 + index * rowHeight;
      if (rowY > y + panelHeight - 10) {
        return;
      }
      target.fillStyle = entry.bad ? '#ef4444' : '#172033';
      target.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      target.fillText(entry.head, x + 12, rowY, panelWidth - 24);

      target.fillStyle = entry.bad ? '#ef4444' : '#475569';
      target.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      target.fillText(
        entry.bad ? `✖ ${entry.body}` : entry.body,
        x + 12,
        rowY + 15,
        panelWidth - 24,
      );
    });
  }

  function drawHint(target: CanvasRenderingContext2D, width: number, y: number) {
    target.fillStyle = '#94a3b8';
    target.font = '12px ui-sans-serif, system-ui, sans-serif';
    target.fillText(
      '点击画布 → 按当前「触发方式」分发一次 spark；开关改变的是注册侧，到达名单看日志',
      24,
      y,
      width - 48,
    );
  }

  function setStationA(next: boolean) {
    chain = chain.then(async () => {
      if (next && !stationAlive) {
        fiberA = root.plugin(stationA);
        await fiberA;
        stationAlive = true;
      } else if (!next && stationAlive) {
        offManual = undefined;
        manualRegistered = false;
        await fiberA?.dispose();
        stationAlive = false;
        stationACtx = null;
      }
      paint();
    });
  }

  function setManualOff(next: boolean) {
    if (next && manualRegistered) {
      // 手动撤销：off 只移除这一次注册，插件与其余监听器不受影响
      offManual?.();
      offManual = undefined;
      manualRegistered = false;
    } else if (!next && !manualRegistered) {
      if (stationAlive && stationACtx) {
        offManual = stationACtx.on('spark', () => {
          bump('a-manual');
        });
        manualRegistered = true;
      } else {
        // 站 A 不在线时只记录意图，重建时由插件体按当前开关补注册
        manualRegistered = false;
      }
    }
    paint();
  }

  canvas.addEventListener('click', handleClick);
  const resizeObserver = createResizeObserver(canvas, paint);
  setStationA(true);
  root.plugin(stationB);
  paint();

  return {
    update(options) {
      current = options;
      if (options.stationA !== stationAlive) {
        setStationA(options.stationA);
      }
      setManualOff(options.manualOff);
    },
    dispose() {
      canvas.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
      // 根 fiber 的 dispose 回收全部副作用，等效回到 new Context()
      chain = chain.then(async () => {
        await root.fiber.dispose();
      });
    },
  };
}

function roundRect(
  target: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  target.beginPath();
  target.moveTo(x + radius, y);
  target.arcTo(x + width, y, x + width, y + height, radius);
  target.arcTo(x + width, y + height, x, y + height, radius);
  target.arcTo(x, y + height, x, y, radius);
  target.arcTo(x, y, x + width, y, radius);
  target.closePath();
}
