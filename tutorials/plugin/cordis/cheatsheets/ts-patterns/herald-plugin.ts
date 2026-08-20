/**
 * 范例介绍：一个「声明合并完整」的迷你插件 herald——服务槽位、事件契约、插件 Config
 * 三条类型链路同时在真实 cordis 运行里走通。
 * 输入（Controls）：pitch（事件音高，1-5）、topic（announce 主题）、decorate（Config
 *   装饰开关，变化时按新配置重载提供者）、provider（提供者在线开关）。
 * 操作：点击画布 → 先 root.emit('herald/chime', pitch) 触发类型化事件，
 *   再从根上下文调用 root.herald.announce(topic) 消费服务。
 * 预期结果：监听器收到的音高与触发参数一致（签名里的 number 在运行时原样到达）；
 *   announce 返回值随 Config 的 decorate 变化（提供者按新配置重载后生效）；
 *   关闭提供者后 root.herald 变 undefined、announce 不可用，而事件链路不受影响——
 *   类型层说「有这个名字」，运行时仍要按位置判断「现在有没有实现」。
 * 阅读主线：HeraldApi / HeraldConfig 契约与 declare module 'cordis' 合并 →
 *   heraldSchema → HeraldService（static provide 单一真源）→ heraldConsumer
 *   （类型化监听）→ createHeraldDemo 的装载与触发分支。
 */
import { Context, Service, type Fiber, type Plugin } from 'cordis';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/** 服务契约：消费者只依赖「herald 这个名字下有什么可用」。 */
export interface HeraldApi {
  readonly calls: number;
  announce(topic: string): string;
}

/** 插件配置的 output 形态——Plugin.Function<HeraldConfig> 的 T。 */
export interface HeraldConfig {
  decorate: boolean;
}

// 声明合并（纯类型层）：Context 的 herald 槽位 + Events 的 'herald/chime' 事件名。
// 与实现写在同一个文件、随包主入口导出——「合并紧贴实现」的标准组织方式。
declare module 'cordis' {
  interface Context {
    herald: HeraldApi;
  }
  interface Events {
    'herald/chime'(pitch: number): void;
  }
}

// 手写 Standard Schema V1：decorate 缺省时收敛为 true（schema 机制见 config 课）。
const heraldSchema: StandardSchemaV1<unknown, HeraldConfig> = {
  '~standard': {
    version: 1,
    vendor: 'cordis-cheatsheet',
    validate(value) {
      if (typeof value !== 'object' || value === null) {
        return { issues: [{ message: 'expected an object' }] };
      }
      const source = value as Record<string, unknown>;
      let decorate = true;
      if (source.decorate !== undefined) {
        if (typeof source.decorate !== 'boolean') {
          return { issues: [{ message: 'expected boolean', path: ['decorate'] }] };
        }
        decorate = source.decorate;
      }
      return { value: { decorate } };
    },
  },
};

/**
 * 服务实现：Service 子类本身就是插件类——root.plugin(HeraldService, config) 装载，
 * config 经 schema 校验后作为第二构造参数到达，fiber 销毁时注销服务。
 * static provide 是默认服务名（运行时生效）；类型层 super 的 name 参数必填，
 * 写 super(ctx, HeraldService.provide) 让名字只声明一份。
 */
export class HeraldService extends Service implements HeraldApi {
  static provide = 'herald' as const;

  /** 类插件的 Config 是静态属性（函数插件挂在对象自身，见 config 课） */
  static Config = heraldSchema;

  private _calls = 0;

  constructor(ctx: Context, private options: HeraldConfig) {
    super(ctx, HeraldService.provide);
  }

  get calls() {
    return this._calls;
  }

  announce(topic: string) {
    this._calls += 1;
    return this.options.decorate ? `《${topic}》` : topic;
  }
}

/** Controls 提供的读者输入 */
export interface HeraldDemoArgs {
  pitch: number;
  topic: string;
  decorate: boolean;
  provider: boolean;
}

/** 供读数与绘图消费的运行时快照 */
export interface HeraldDemoSnapshot {
  /** 消费者监听器最近收到的音高；未触发过为 null */
  receivedPitch: number | null;
  /** root.herald.announce(topic) 的返回值；服务不可用时为 null */
  announceResult: string | null;
  /** announce 的累计调用次数（服务实例内部计数，随提供者重载归零） */
  calls: number;
  /** 提供者 fiber 的状态名；已卸载时为「已卸载」 */
  providerState: string;
  /** 当前生效的 Config decorate 值 */
  decorate: boolean;
}

export interface HeraldDemoInstance {
  update(args: HeraldDemoArgs): void;
  /** 点击画布：触发一次类型化事件并消费一次服务 */
  trigger(): void;
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

function message(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function createHeraldDemo(
  onUpdate: (snapshot: HeraldDemoSnapshot) => void,
): HeraldDemoInstance {
  // 应用侧入口：根上下文。事件全树共享注册表，服务槽位挂在提供者 fiber 上。
  const root = new Context();

  let provider: (Fiber & PromiseLike<Fiber>) | undefined;
  let receivedPitch: number | null = null;
  let announceResult: string | null = null;
  let calls = 0;
  let decorate = true;
  let topic = 'cordis';
  let pitch = 3;
  let loadError: string | null = null;
  let disposed = false;
  // 串行化 Controls 触发的装载 / 卸载，避免快速切换时注册与清理交错。
  let queue: Promise<void> = Promise.resolve();

  // 消费者插件：类型化监听 'herald/chime'——参数 p 的类型来自 Events 合并里的签名。
  // 监听器归属消费者作用域，且不依赖 herald 服务：提供者下线不影响这条事件链路。
  const heraldConsumer: Plugin.Function = (ctx) => {
    ctx.on('herald/chime', (p) => {
      receivedPitch = p;
    });
  };
  const consumerFiber = root.plugin(heraldConsumer);

  function emit() {
    onUpdate({
      receivedPitch,
      announceResult,
      calls,
      providerState: provider
        ? STATE_LABELS[provider.state] ?? '未知'
        : loadError
          ? `FAILED：${loadError}`
          : '已卸载',
      decorate,
    });
  }

  async function apply(args: HeraldDemoArgs) {
    pitch = args.pitch;
    topic = args.topic;

    if (!args.provider) {
      // 卸载提供者：herald 槽位随之清空，服务读数回到「不可用」。
      if (provider) {
        const closing = provider;
        provider = undefined;
        await closing.dispose();
        announceResult = null;
        calls = 0;
      }
    } else if (!provider || decorate !== args.decorate) {
      // 首次装载或 Config 变化：卸旧上新，让新的 decorate 到达实现。
      if (provider) {
        const closing = provider;
        provider = undefined;
        await closing.dispose();
      }
      decorate = args.decorate;
      provider = root.plugin(HeraldService, { decorate });
      try {
        await provider;
        loadError = null;
      } catch (error) {
        loadError = message(error);
      }
      calls = 0;
    }
    emit();
  }

  function trigger() {
    if (disposed) return;
    // 链路一（事件）：参数类型来自声明合并的签名，运行时原样到达每个监听器。
    root.emit('herald/chime', pitch);
    // 链路二（服务）：根上下文按名字查槽位——提供者不在线时得到 undefined。
    const herald = root.herald;
    if (herald) {
      announceResult = herald.announce(topic);
      calls = herald.calls;
    } else {
      announceResult = null;
    }
    emit();
  }

  return {
    update(args) {
      if (disposed) return;
      queue = queue
        .then(() => apply(args))
        .catch((error: unknown) => {
          loadError = message(error);
          emit();
        });
    },
    trigger,
    dispose() {
      disposed = true;
      queue = queue
        .then(async () => {
          if (provider) await provider.dispose();
          if (consumerFiber) await consumerFiber.dispose();
        })
        .catch(() => {
          // 离开文档页时的清理失败无需呈现。
        });
    },
  };
}
