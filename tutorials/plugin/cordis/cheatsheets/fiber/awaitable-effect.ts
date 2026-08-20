/**
 * 范例介绍：把 ctx.effect() 返回值的「可调用 / 可等待」双重身份放进浏览器。
 * 输入：Controls 的「注册 async effect」「await 注册」「体内抛错」「调用 disposer」。
 * 操作：注册开关在宿主插件上注册一个 900ms 后交出 disposer 的 async effect；
 *      await 开关决定注册处是否 await（resolve 到 disposer 本身，而不是撤销）；
 *      抛错开关在下一轮注册的体里生效；调用开关执行手动撤销（优先 await 拿到的
 *      disposer，否则调用注册返回值本身——等体完成后撤销）。
 * 预期结果：三条泳道按时间呈现体的运行 / 记账变化 / 撤销执行；await 完成时拿到
 *          function 且副作用仍在账上；未 await 时体内失败完全静默——「logger 缓冲」
 *          读数保持 0；await 时错误以原错误到达 await 处。
 * 阅读主线：startRegistration（注册与 await 分流）→ revoke / callHeld（两种撤销路径）
 *          → paint（泳道时间线）。
 */
import { Context, type Fiber } from 'cordis';

import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ctx.effect 的返回值：既可调用（() => Promise 等体完成后撤销），
// 又可等待（resolve 到一个新的幂等 disposer）——AsyncDisposable
type EffectHandle = ReturnType<Fiber['effect']>;
type DisposeFn = () => Promise<void>;

type BodyPhase = '未注册' | '体运行中' | 'disposer 已交出' | '体失败';
type TreePhase = '空' | '慢建立 · 等 disposer' | '慢建立 · disposer 已收';

interface LaneEvent {
  at: number;
  lane: 0 | 1 | 2;
  text: string;
}

export interface AwaitableOptions {
  registered: boolean;
  awaitIt: boolean;
  failBody: boolean;
  callDispose: boolean;
}

export interface AwaitableSnapshot {
  bodyPhase: BodyPhase;
  treePhase: TreePhase;
  awaitedType: string;
  disposedCount: number;
  handleTypes: string;
  logBuffer: number;
}

export interface AwaitableInstance {
  update(options: AwaitableOptions): void;
  dispose(): void;
}

export function createAwaitableEffect(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AwaitableSnapshot) => void,
): AwaitableInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  const startedAt = performance.now();
  const events: LaneEvent[] = [];
  const WINDOW_MS = 12000;

  const root = new Context();
  let options: AwaitableOptions = {
    registered: true,
    awaitIt: true,
    failBody: false,
    callDispose: false,
  };
  let chain: Promise<void> = Promise.resolve();

  let wrapper: EffectHandle | undefined;
  let held: DisposeFn | undefined;
  let bodyPhase: BodyPhase = '未注册';
  let treePhase: TreePhase = '空';
  let disposedCount = 0;
  let logBuffer = 0;

  // 静默证据：框架对未 await 的 async 体失败不做任何记录（回滚后吞错），
  // 这里给 logger 挂一个 exporter 计数——体失败后它应保持 0
  root.logger.exporter({
    export: () => {
      logBuffer += 1;
    },
  });

  function pushEvent(lane: 0 | 1 | 2, text: string) {
    events.push({ at: performance.now() - startedAt, lane, text });
    paint();
  }

  function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  // 宿主插件：常驻的作用域，async effect 注册在它的 fiber 上
  const host = (ctx: Context) => {
    void ctx;
  };

  function startRegistration() {
    enqueue(async () => {
      if (!hostCtx) return;
      if (wrapper) {
        pushEvent(0, '提示：已有注册，先关闭「注册 async effect」再开启');
        return;
      }
      held = undefined;
      bodyPhase = '体运行中';
      pushEvent(0, '注册：async 体开始运行');
      wrapper = hostCtx.effect(async () => {
        await sleep(900);
        if (options.failBody) {
          bodyPhase = '体失败';
          // 框架对未 await 的失败体静默回滚：wrapper 离账，错误不进 logger
          treePhase = '空';
          pushEvent(0, '体失败：Error(\'体内失败\')');
          throw new Error('体内失败');
        }
        bodyPhase = 'disposer 已交出';
        treePhase = '慢建立 · disposer 已收';
        pushEvent(0, '体完成：disposer 交出（收集完成）');
        return () => {
          disposedCount += 1;
          bodyPhase = '未注册';
          treePhase = '空';
          pushEvent(2, '撤销执行：慢建立');
        };
      }, '慢建立');
      treePhase = '慢建立 · 等 disposer';
      pushEvent(1, '注册返回：wrapper 已入账（label「慢建立」），体未完成');
      if (options.awaitIt) {
        try {
          // await 不撤销：Promise.resolve(task).then(() => disposeAsync)
          // resolve 出的是 disposer 本身
          held = await wrapper;
          pushEvent(0, 'await 完成：resolve 到 disposer（function），副作用仍在账上');
        } catch (error) {
          bodyPhase = '体失败';
          treePhase = '空';
          pushEvent(0, `await 拒绝：${describe(error)}（唯一暴露通道）`);
        }
      }
    });
  }

  function revoke() {
    enqueue(async () => {
      const current = wrapper;
      if (!current) return;
      pushEvent(2, '调用注册返回值：等体完成后撤销');
      try {
        await current();
        pushEvent(2, '撤销完成（再次调用是 no-op）');
      } catch (error) {
        // 体曾失败时 task 已拒绝：这条调用链以原错误拒绝（框架已回滚过，这里只是重放）
        pushEvent(2, `撤销调用以原错误拒绝：${describe(error)}`);
      }
      wrapper = undefined;
      held = undefined;
      if (bodyPhase !== '体失败') bodyPhase = '未注册';
      treePhase = '空';
    });
  }

  function callHeld() {
    enqueue(async () => {
      if (held) {
        pushEvent(2, '调用 await 拿到的 disposer');
        await held();
        pushEvent(2, '撤销完成（幂等）');
        wrapper = undefined;
        held = undefined;
      } else if (wrapper) {
        await revoke();
      } else {
        pushEvent(2, '提示：没有可调用的 disposer，先注册');
      }
    });
  }

  function enqueue(operation: () => Promise<unknown>) {
    chain = chain
      .then(operation)
      .then(() => undefined)
      .catch((error: unknown) => {
        pushEvent(2, `调用异常：${describe(error)}`);
      });
  }

  const renderLoop = createRenderLoop(canvas, () => paint());

  function paint() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('ctx.effect() 返回值：调用即撤销，await 即对齐', 48, 40);

    // 状态行：体的阶段 + wrapper 的成员类型（then 存在、catch 不存在）
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillStyle = '#475569';
    drawingContext.fillText(`effect 体：${bodyPhase}`, 48, 66);
    const catchType = wrapper
      ? typeof (wrapper as unknown as { catch?: unknown }).catch
      : '—';
    const thenType = wrapper ? typeof wrapper.then : '—';
    drawingContext.fillText(
      `注册返回值成员：.then ${thenType} / .catch ${catchType}`,
      48,
      84,
    );

    // 三条泳道：effect 体 / 记账 / 撤销，时间窗滚动最近 12 秒
    const laneNames = ['effect 体', '记账', '撤销'];
    const laneColors = ['#4f7cff', '#f59e0b', '#ef4444'];
    const laneY = [140, 200, 260];
    const axisLeft = 140;
    const axisRight = width - 48;
    const trackWidth = Math.max(80, axisRight - axisLeft);
    const now = performance.now() - startedAt;
    const windowStart = now - WINDOW_MS;

    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    laneNames.forEach((name, index) => {
      drawingContext.fillStyle = laneColors[index];
      drawingContext.fillText(name, 48, laneY[index] + 4);
      drawingContext.strokeStyle = '#e2e8f0';
      drawingContext.lineWidth = 1;
      drawingContext.beginPath();
      drawingContext.moveTo(axisLeft, laneY[index]);
      drawingContext.lineTo(axisRight, laneY[index]);
      drawingContext.stroke();
    });
    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('-12s', axisLeft, laneY[2] + 26);
    drawingContext.fillText('now', axisRight - 22, laneY[2] + 26);

    const laneCounters = [0, 0, 0];
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    for (const event of events) {
      if (event.at < windowStart) continue;
      const x = axisLeft + ((event.at - windowStart) / WINDOW_MS) * trackWidth;
      const y = laneY[event.lane];
      drawingContext.fillStyle = laneColors[event.lane];
      drawingContext.beginPath();
      drawingContext.arc(x, y, 4, 0, Math.PI * 2);
      drawingContext.fill();
      // 标签在点的上下交替，避免同泳道重叠
      const above = laneCounters[event.lane]++ % 2 === 0;
      drawingContext.textAlign = x > axisLeft + trackWidth * 0.7 ? 'right' : 'left';
      drawingContext.fillText(
        event.text,
        x + (drawingContext.textAlign === 'left' ? 8 : -8),
        above ? y - 10 : y + 20,
        trackWidth * 0.55,
      );
      drawingContext.textAlign = 'left';
    }

    emit({
      bodyPhase,
      treePhase,
      awaitedType: held ? 'function' : '—',
      disposedCount,
      handleTypes: wrapper ? `${thenType} / ${catchType}` : '— / —',
      logBuffer,
    });
  }

  // 宿主插件先就绪，再按初始开关注册
  let hostCtx: Context | undefined;
  enqueue(async () => {
    const fiber = await root.plugin(host);
    hostCtx = fiber.ctx;
    pushEvent(0, '宿主插件就绪（async effect 将注册在它的 fiber 上）');
    if (options.registered) startRegistration();
  });

  const resizeObserver = createResizeObserver(canvas, () => renderLoop.renderOnce());
  renderLoop.renderOnce();

  return {
    update(next) {
      const prev = options;
      options = next;
      if (next.registered !== prev.registered) {
        if (next.registered) startRegistration();
        else revoke();
        return;
      }
      if (next.callDispose !== prev.callDispose && next.callDispose) {
        callHeld();
        return;
      }
      if (next.awaitIt !== prev.awaitIt || next.failBody !== prev.failBody) {
        enqueue(async () => {
          pushEvent(0, '提示：await / 抛错开关将在下一次注册时生效');
        });
      }
    },
    dispose() {
      resizeObserver.disconnect();
      renderLoop.dispose();
      enqueue(async () => {
        await root.fiber.dispose();
      });
    },
  };
}
