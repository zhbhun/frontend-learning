/**
 * 范例介绍：在浏览器里定义、注册、替换并消费一个具名服务 counter。
 * 输入（Controls）：provider（提供者开关）、impl（同名服务的实现）、step（bump 步长）、
 *   duplicate（尝试再注册一个同名提供者）。
 * 操作：点击画布触发一次消费——先从根上下文调用 root.counter.bump(step)，
 *   再从兄弟作用域（普通插件 ctx）做一次属性访问。
 * 预期结果：提供者在线时服务值随点击变化；切换实现 = 卸旧上新，服务名与消费代码不变；
 *   重复注册抛 service "counter" has been registered；关闭提供者后 internal/service 报
 *   undefined、root.counter 变 undefined；兄弟作用域访问始终抛 without inject。
 * 阅读主线：CounterServiceApi 契约与两个 Service 子类 → createServiceDemo 的
 *   注册 / 替换 / 消费分支。
 */
import { Context, Service, type Fiber } from 'cordis';

/**
 * 服务契约：消费者只依赖「这个名字下有什么可用」。
 * 声明合并写的是契约而不是实现类——名字是接口，实现可替换。
 */
export interface CounterServiceApi {
  readonly count: number;
  bump(step: number): number;
}

// 声明合并：把 counter 槽位的类型告诉 TypeScript，ctx.counter 才有补全与检查。
// 它只影响类型层——不写这段代码，服务的注册与访问在运行时照样工作。
declare module 'cordis' {
  interface Context {
    counter: CounterServiceApi;
  }
}

/** Controls 提供的读者输入 */
export interface ServiceDemoArgs {
  provider: boolean;
  impl: 'linear' | 'double';
  step: number;
  duplicate: boolean;
}

/** 供读数与绘图消费的运行时快照 */
export interface ServiceDemoSnapshot {
  /** 提供者 fiber 的状态名；从未加载时为「未加载」 */
  state: string;
  /** 当前实现类名；未注册时为 '—' */
  impl: string;
  /** 服务当前值；服务不在时为 null */
  count: number | null;
  /** 点击画布（消费调用）的累计次数 */
  calls: number;
  /** 提供者 fiber 的 uid；未加载时为 null */
  uid: number | null;
  /** 消费者 fiber 的 uid；未加载时为 null */
  consumerUid: number | null;
  /** 重复注册的第二个提供者的状态名；未尝试时为 null */
  extra: string | null;
}

export interface ServiceDemoLog {
  time: string;
  tag: 'service' | '提供者' | '消费' | '错误';
  text: string;
}

export interface ServiceDemoInstance {
  update(args: ServiceDemoArgs): void;
  /** 点击画布：执行一次消费（应用侧 + 兄弟作用域两条访问路径） */
  consume(): void;
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

export function createServiceDemo(
  onUpdate: (snapshot: ServiceDemoSnapshot, logs: ServiceDemoLog[]) => void,
): ServiceDemoInstance {
  // 应用侧入口：一个根上下文。服务的可见性与生命周期都挂在它的 fiber 树上。
  const root = new Context();

  let provider: (Fiber & PromiseLike<Fiber>) | undefined;
  let extra: (Fiber & PromiseLike<Fiber>) | undefined;
  let consumerFiber: (Fiber & PromiseLike<Fiber>) | undefined;
  let sibling: Context | undefined;
  let impl: 'linear' | 'double' | undefined;
  let step = 1;
  let calls = 0;
  let lastService: unknown;
  let disposed = false;
  const logs: ServiceDemoLog[] = [];

  // 串行化 Controls 触发的变更，避免快速切换时注册 / 卸载交错。
  let queue: Promise<void> = Promise.resolve();

  function log(tag: ServiceDemoLog['tag'], text: string) {
    logs.push({ time: new Date().toLocaleTimeString(), tag, text });
    if (logs.length > 40) logs.splice(0, logs.length - 40);
    emit();
  }

  function implName(kind: 'linear' | 'double' | undefined): string {
    if (!kind) return '—';
    return kind === 'double' ? 'DoublingCounter' : 'LinearCounter';
  }

  function emit() {
    // 根上下文访问查不到服务时得到 undefined（不抛错），读数据此显示空值。
    const counter = root.counter;
    onUpdate(
      {
        state: provider ? (STATE_LABELS[provider.state] ?? '未知') : '未加载',
        impl: implName(impl),
        count: counter ? counter.count : null,
        calls,
        uid: provider?.uid ?? null,
        consumerUid: consumerFiber?.uid ?? null,
        extra: extra ? (STATE_LABELS[extra.state] ?? '未知') : null,
      },
      logs,
    );
  }

  // 两个实现注册到同一个名字 counter 上：名字是契约，实现可以不同。
  // super(ctx, 'counter') 就是注册动作本身——Service 基类会调用
  // ctx.reflect.provide('counter', this)，把实例放进当前作用域的 counter 槽位。
  class LinearCounter extends Service implements CounterServiceApi {
    count = 0;

    constructor(ctx: Context) {
      super(ctx, 'counter');
    }

    // 类插件路径专属钩子：实例构造完成后由框架调用（手动 new 不会触发）。
    // 适合放异步初始化；返回清理函数同样会被框架托管。
    [Service.init]() {
      log('提供者', 'LinearCounter：[Service.init] 运行');
    }

    bump(step: number) {
      this.count += step;
      return this.count;
    }
  }

  class DoublingCounter extends Service implements CounterServiceApi {
    count = 0;

    constructor(ctx: Context) {
      super(ctx, 'counter');
    }

    [Service.init]() {
      log('提供者', 'DoublingCounter：[Service.init] 运行');
    }

    bump(step: number) {
      this.count = this.count * 2 + step;
      return this.count;
    }
  }

  // 兄弟作用域消费者：root 下的普通函数插件，不声明 inject。
  // 它的 fiber 与提供者 fiber 平级——属性访问沿 fiber 链解析，走不出对方的子树。
  const consumer = (ctx: Context) => {
    sibling = ctx;
    return () => log('消费', '消费者插件已销毁');
  };
  consumerFiber = root.plugin(consumer);

  // 观察服务注册 / 移除的内置事件：注册时 value 是实例，移除时是 undefined。
  // 提供者开始卸载时还会以旧实例补发一次（状态机先转 UNLOADING 再清理），按引用去重。
  root.on('internal/service', (name, value) => {
    if (name !== 'counter') return;
    if (value) {
      if (value === lastService) return;
      lastService = value;
      log('service', `internal/service：counter ← ${value.constructor.name}（已注册）`);
    } else {
      lastService = undefined;
      log('service', 'internal/service：counter ← undefined（已移除）');
    }
  });

  async function apply(args: ServiceDemoArgs) {
    step = args.step;

    // 重复注册：名字被占用时，第二个提供者加载失败（fiber 进入 FAILED），原服务不受影响。
    const wantExtra = args.duplicate && args.provider;
    if (wantExtra && !extra) {
      extra = root.plugin(LinearCounter);
      try {
        await extra;
      } catch (error) {
        log('错误', `重复注册被拒绝：${message(error)}`);
      }
    } else if (!wantExtra && extra) {
      const closing = extra;
      extra = undefined;
      await closing.dispose();
    }

    if (!args.provider) {
      // 卸载提供者：注册时挂上的清理逻辑自动运行，counter 槽位被清空。
      if (provider) {
        const closing = provider;
        provider = undefined;
        impl = undefined;
        await closing.dispose();
      }
    } else if (!provider) {
      const kind = args.impl;
      provider = root.plugin(kind === 'double' ? DoublingCounter : LinearCounter);
      try {
        await provider;
        impl = kind;
      } catch (error) {
        log('错误', `提供者加载失败：${message(error)}`);
      }
    } else if (impl !== args.impl) {
      // 替换实现 = 卸载旧提供者、注册新提供者：服务名不变，消费代码不变。
      const closing = provider;
      provider = undefined;
      await closing.dispose();
      const kind = args.impl;
      provider = root.plugin(kind === 'double' ? DoublingCounter : LinearCounter);
      try {
        await provider;
        impl = kind;
        log('提供者', `实现已替换为 ${implName(kind)}，服务名仍是 counter`);
      } catch (error) {
        log('错误', `提供者加载失败：${message(error)}`);
      }
    }
    emit();
  }

  function consume() {
    if (disposed) return;
    calls += 1;

    // 路径一：应用侧（根上下文）。查不到时得到 undefined，随后对 undefined 调方法抛 TypeError。
    try {
      const counter = root.counter;
      if (!counter) {
        throw new Error('root.counter 是 undefined——服务已随提供者一起消失');
      }
      counter.bump(step);
      log('消费', `root.counter.bump(${step}) → count = ${counter.count}`);
    } catch (error) {
      log('错误', `应用侧访问失败：${message(error)}`);
    }

    // 路径二：兄弟作用域（普通插件 ctx）。不在提供者子树内，属性访问直接抛错。
    if (sibling) {
      try {
        const counter = sibling.counter;
        log('消费', `兄弟作用域：拿到了 ${counter.constructor.name}`);
      } catch (error) {
        log('错误', `兄弟作用域访问：${message(error)}`);
      }
    }
    emit();
  }

  return {
    update(args) {
      if (disposed) return;
      queue = queue.then(() => apply(args)).catch((error: unknown) => {
        log('错误', message(error));
      });
    },
    consume,
    dispose() {
      disposed = true;
      queue = queue
        .then(async () => {
          for (const fiber of [extra, provider, consumerFiber]) {
            if (fiber) await fiber.dispose();
          }
        })
        .catch(() => {
          // 离开文档页时的清理失败无需呈现。
        });
    },
  };
}
