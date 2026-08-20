/**
 * 范例介绍：在浏览器里运行一个最小 cordis 应用，观察「应用 = 根上下文 + 插件」的运行时形状。
 * 输入（Controls）：loaded（是否加载插件）、message / interval（插件配置）。
 * 操作：关闭 loaded 触发 fiber.dispose（卸载）；已加载时改配置触发 fiber.update（新配置重启）。
 * 预期结果：插件状态、fiber.uid、ctx.registry.size、心跳计数与日志流同步变化；
 * 卸载时「插件已停止」与「心跳定时器已撤销」两条 disposer 日志先后出现，计数随即冻结。
 * 阅读主线：createMinimalApp → heartbeat 插件函数 → update() 的加载 / 更新 / 卸载三条分支。
 */
import { Context, type Fiber } from 'cordis';

/** Controls 提供的读者输入 */
export interface MinimalAppArgs {
  loaded: boolean;
  message: string;
  interval: number;
}

/** 插件收到的配置：ctx.plugin(fn, config) 的第二个参数 */
export interface HeartbeatConfig {
  message: string;
  interval: number;
}

/** 供读数与绘图消费的运行时快照 */
export interface MinimalAppSnapshot {
  /** 插件 fiber 的状态名；从未加载时为「未加载」 */
  state: string;
  /** 插件 fiber 的 uid；未加载时为 null */
  uid: number | null;
  /** ctx.registry.size：当前注册的插件运行时数量 */
  registry: number;
  /** 心跳定时器累计触发次数 */
  ticks: number;
}

export interface MinimalAppLog {
  time: string;
  tag: '插件' | 'effect' | '应用';
  text: string;
}

export interface MinimalAppInstance {
  update(args: MinimalAppArgs): void;
  dispose(): void;
}

// 与 cordis 导出的 FiberState 数值一一对应（4.0.0-rc.8：0-5）。
// 不直接引用 FiberState 是因为它是 const enum，按数值镜像更稳妥。
const STATE_LABELS: Record<number, string> = {
  0: 'PENDING',
  1: 'LOADING',
  2: 'ACTIVE',
  3: 'FAILED',
  4: 'DISPOSED',
  5: 'UNLOADING',
};

export function createMinimalApp(
  onUpdate: (snapshot: MinimalAppSnapshot, logs: MinimalAppLog[]) => void,
): MinimalAppInstance {
  // 最小应用本体：一个根上下文。它自带的 root fiber 始终处于 ACTIVE。
  const ctx = new Context();

  let fiber: (Fiber & PromiseLike<Fiber>) | undefined;
  let active = false;
  let ticks = 0;
  let lastConfig: HeartbeatConfig | undefined;
  let disposed = false;
  const logs: MinimalAppLog[] = [];

  // 串行化 Controls 触发的变更，避免快速切换时加载 / 卸载交错。
  let queue: Promise<void> = Promise.resolve();

  function log(tag: MinimalAppLog['tag'], text: string) {
    logs.push({ time: new Date().toLocaleTimeString(), tag, text });
    if (logs.length > 40) {
      logs.splice(0, logs.length - 40);
    }
    emit();
  }

  function emit() {
    onUpdate(
      {
        state: fiber ? (STATE_LABELS[fiber.state] ?? '未知') : '未加载',
        uid: fiber?.uid ?? null,
        registry: ctx.registry.size,
        ticks,
      },
      logs,
    );
  }

  // 一个插件就是一个函数：拿到自己的 ctx 与 config，返回值是卸载时要执行的 disposer。
  // 注意用箭头函数：cordis 依据 prototype 区分函数插件与类插件，function 声明会被
  // 当成类用 new 调用，其返回值不再作为 disposer 收集。
  const heartbeat = (pluginCtx: Context, config: HeartbeatConfig) => {
    log('插件', `已启动：问候语「${config.message}」，心跳间隔 ${config.interval}ms`);

    // 副作用交给 ctx.effect：返回的清理函数由框架收集，插件卸载时自动执行。
    pluginCtx.effect(() => {
      const timer = setInterval(() => {
        ticks += 1;
        emit();
      }, config.interval);
      return () => {
        clearInterval(timer);
        log('effect', '心跳定时器已撤销');
      };
    }, '心跳定时器');

    // 插件函数本身的返回值同样是一个 disposer；卸载时它先于 effect 的清理函数运行。
    return () => {
      log('插件', '已停止（disposer 运行）');
    };
  };

  async function apply(args: MinimalAppArgs) {
    const config: HeartbeatConfig = { message: args.message, interval: args.interval };
    if (!args.loaded) {
      if (active && fiber) {
        // 卸载：框架逆序运行插件注册的全部 disposer，副作用被完全撤销。
        await fiber.dispose();
        active = false;
        lastConfig = undefined;
      }
    } else if (!active) {
      // 加载：ctx.plugin 返回 fiber；await 它即等到插件进入 ACTIVE。
      fiber = ctx.plugin(heartbeat, config);
      await fiber;
      active = true;
      lastConfig = config;
    } else if (fiber && lastConfig) {
      const unchanged =
        lastConfig.message === config.message && lastConfig.interval === config.interval;
      if (!unchanged) {
        // 配置变更：fiber.update 以新配置重启插件（重载机制的入口，见生命周期一课）。
        fiber.update(config);
        await fiber;
        lastConfig = config;
      }
    }
    emit();
  }

  function enqueue(task: () => Promise<void>) {
    queue = queue.then(task).catch((error: unknown) => {
      // 加载失败会被框架记录到 fiber 上并在 await 时抛出；这里兜底展示。
      log('应用', `出错：${String(error)}`);
    });
  }

  return {
    update(args) {
      if (disposed) {
        return;
      }
      enqueue(() => apply(args));
    },
    dispose() {
      disposed = true;
      enqueue(async () => {
        if (active && fiber) {
          await fiber.dispose();
          active = false;
        }
      });
    },
  };
}
