/**
 * 范例介绍：演示「注册插件 → 销毁插件」的完整往返，观察副作用是否被完全撤销。
 * 输入：Controls 的「注册插件」开关；点击画布触发一次 'ping' 事件。
 * 操作：开关切换时在根上下文上调用 ctx.plugin() 或 fiber.dispose()；
 *      点击画布时向根上下文分发一次 'ping' 事件。
 * 预期结果：销毁插件后，「活动副作用」归零、心跳停止、ping 不再被响应；
 *          重新注册后行为完全恢复。阅读主线：demoPlugin → setEnabled → paint。
 */
import { Context, type Fiber } from 'cordis';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 声明本范例用到的自定义事件名，让 ctx.on / ctx.emit 获得类型检查
declare module 'cordis' {
  interface Events {
    ping(): void;
  }
}

export interface LifecycleOptions {
  enabled: boolean;
}

export interface LifecycleSnapshot {
  state: string;
  effects: number;
  ticks: number;
  pings: number;
}

export interface LifecycleInstance {
  update(options: LifecycleOptions): void;
  dispose(): void;
}

export function createPluginLifecycle(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LifecycleSnapshot) => void,
): LifecycleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  // 演示插件：注册一个定时器副作用和一个事件监听器。
  // 关键在于两处都不保存返回的撤销函数——撤销由 cordis 在插件销毁时自动执行，
  // 这正是本范例要观察的「时间可组合性」。
  function demoPlugin(ctx: Context) {
    ctx.on('ping', () => {
      stats.pings += 1;
      paint();
    });
    ctx.effect(() => {
      // 副作用：每秒跳动一次的心跳定时器
      stats.effects += 1;
      const timer = setInterval(() => {
        stats.ticks += 1;
        paint();
      }, 1000);
      // 撤销函数：清掉定时器并归零计数，由框架在销毁时调用
      return () => {
        stats.effects -= 1;
        clearInterval(timer);
      };
    });
  }

  const root = new Context();
  const stats = { effects: 0, ticks: 0, pings: 0 };
  let fiber: Fiber | undefined;
  let enabled = false;
  let transitioning = false;
  // 串行执行注册与销毁，避免快速切换开关时两者竞争
  let chain: Promise<void> = Promise.resolve();

  function stateText(): string {
    if (transitioning) return '切换中';
    return fiber ? '运行中' : '已销毁';
  }

  function paint() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const running = Boolean(fiber);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('一个插件的注册与销毁', 48, 72);

    // 状态徽章
    const badgeText = stateText();
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    const badgeWidth = drawingContext.measureText(badgeText).width + 28;
    drawingContext.fillStyle = running ? '#4f7cff' : '#94a3b8';
    roundRect(drawingContext, 48, 96, badgeWidth, 28, 14);
    drawingContext.fill();
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fillText(badgeText, 62, 115);

    // 三行读数
    const rows: Array<[string, string, boolean]> = [
      ['活动副作用 ctx.effect()', String(stats.effects), stats.effects > 0],
      ['心跳次数（每秒 +1）', String(stats.ticks), running],
      ['已响应 ping 事件', String(stats.pings), stats.pings > 0],
    ];
    rows.forEach(([label, value, lit], index) => {
      const top = 156 + index * 40;
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(label, 48, top + 12);

      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(300, top, 20, 20);
      drawingContext.fillStyle = lit ? '#4f7cff' : '#e2e8f0';
      drawingContext.fillRect(300, top, 20, 20);

      drawingContext.fillStyle = '#172033';
      drawingContext.font = '600 16px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(value, 336, top + 16);
    });

    // 已销毁时的提示
    if (!running && !transitioning) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('插件已销毁——再点击画布，「已响应 ping」不会增长', 48, height - 28);
    } else {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('点击画布 → 分发一次 ping 事件', 48, height - 28);
    }

    emit({
      state: stateText(),
      effects: stats.effects,
      ticks: stats.ticks,
      pings: stats.pings,
    });
  }

  function setEnabled(next: boolean) {
    if (next === enabled && !transitioning) {
      return;
    }
    enabled = next;
    transitioning = true;
    paint();
    chain = chain.then(async () => {
      if (next && !fiber) {
        fiber = root.plugin(demoPlugin);
        await fiber;
      } else if (!next && fiber) {
        const current = fiber;
        fiber = undefined;
        await current.dispose();
      }
      transitioning = false;
      paint();
    });
  }

  function handleClick() {
    // 无论插件是否存在都分发事件：监听器是否还在，由「已响应 ping」回答
    root.emit('ping');
  }

  canvas.addEventListener('click', handleClick);
  const resizeObserver = createResizeObserver(canvas, paint);
  setEnabled(true);

  return {
    update(options) {
      setEnabled(options.enabled);
    },
    dispose() {
      canvas.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
      chain = chain.then(async () => {
        if (fiber) {
          const current = fiber;
          fiber = undefined;
          await current.dispose();
        }
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
