/**
 * 范例介绍：同一组 format 事件监听器（按注册顺序 A、B、C），分别用
 *   emit / parallel / serial / bail / waterfall 五种模式触发，对比调用顺序、
 *   等待行为、返回值流动与错误传播。
 * 输入（Controls）：mode（分发模式）、responder（返回有效值的监听器——serial/bail
 *   在此处短路，waterfall 在此处停止委托）、asyncB（B 改为异步监听器，约 400ms）、
 *   throwB（B 抛出异常，与 asyncB 叠加时延后抛出）。
 * 操作：点击画布以当前输入触发一次 format 事件；上一次仍在等待时点击被忽略。
 * 预期结果：emit 同步跑完、返回值丢弃、异步监听器无人等待；parallel 同时启动、
 *   等待全部、错误聚合为 AggregateError；serial 逐个 await、有效值或异常即中断；
 *   bail 同步短路（B 异步时拿到的是 Promise 对象本身）；waterfall 沿 next() 委托
 *   到兜底实现、返回值逐层回流、不委托即短路。
 * 阅读主线：事件声明合并 → wrapDownstream 与监听器行为 → trigger() 的五种分支。
 */
import { Context } from 'cordis';

export type DispatchModeName = 'emit' | 'parallel' | 'serial' | 'bail' | 'waterfall';

export type ResponderName = 'none' | 'B' | 'C';

/** Controls 提供的读者输入 */
export interface FormatEventArgs {
  mode: DispatchModeName;
  responder: ResponderName;
  asyncB: boolean;
  throwB: boolean;
}

/** 日志流的一条记录：at 为相对本次触发的毫秒数 */
export interface FormatLogEntry {
  at: number;
  tag: '触发' | '监听器' | '兜底' | '错误';
  text: string;
}

/** 供读数与绘图消费的运行时快照 */
export interface FormatSnapshot {
  mode: DispatchModeName;
  /** 本次触发已开始执行的监听器（按实际执行顺序） */
  executed: string[];
  /** 兜底实现是否执行 */
  inner: boolean;
  /** 触发调用的状态：sync = 已同步返回；pending / fulfilled / rejected = 异步结算 */
  status: 'sync' | 'pending' | 'fulfilled' | 'rejected';
  /** 触发调用拿到的返回值或异常摘要 */
  result: string;
  /** 触发序号 */
  run: number;
}

export interface FormatDemoInstance {
  update(args: FormatEventArgs): void;
  /** 点击画布：以当前输入触发一次分发 */
  trigger(): void;
  dispose(): void;
}

// 事件契约：声明合并把 format 写进 Events 接口，ctx.on 与五种分发方法才有类型。
// 本课要用同一事件横向对比五种模式，所以把 waterfall 专属的 next 声明为可选、
// 返回值放宽为联合类型；实际项目里一个事件约定用一种分发模式，按该模式的
// 监听器形状声明（声明合并的基础见 3.2 事件课）。
declare module 'cordis' {
  interface Events {
    format(source: string, next?: () => string): string | Promise<string | undefined> | undefined;
  }
}

const SOURCE = 'hello';
const ASYNC_DELAY = 400;

type ListenerId = 'A' | 'B' | 'C';
type Listener = (
  source: string,
  next?: () => string,
) => string | Promise<string | undefined> | undefined;

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function describeError(error: unknown): string {
  // parallel 收尾抛出的是 AggregateError：errors 数组汇总所有监听器的失败
  if (error instanceof AggregateError) {
    const reasons = error.errors.map(message).join('；');
    return `AggregateError（${error.errors.length} 个错误：${reasons}）`;
  }
  return message(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// waterfall 的 next() 不接受参数也不等待：下游含 async 监听器时，next() 返回的是
// Promise。想「加工后再上抛」就要兼容两种形态——这是写 waterfall 监听器最要紧的边界。
//（本例的兜底与下游加工都返回 string，运行时 next() 只会是 string 或 Promise<string>。）
function wrapDownstream(
  downstream: unknown,
  wrap: (value: string) => string,
): string | Promise<string> {
  if (downstream instanceof Promise) {
    return (downstream as Promise<string>).then(wrap);
  }
  return wrap(downstream as string);
}

export function createFormatDemo(
  onUpdate: (snapshot: FormatSnapshot, logs: FormatLogEntry[]) => void,
): FormatDemoInstance {
  const root = new Context();
  let args: FormatEventArgs = { mode: 'emit', responder: 'none', asyncB: false, throwB: false };
  let run = 0;
  let startAt = 0;
  let status: FormatSnapshot['status'] = 'sync';
  let result = '尚未触发';
  const executed: ListenerId[] = [];
  let innerCalled = false;
  const logs: FormatLogEntry[] = [];

  function snapshot(): FormatSnapshot {
    return { mode: args.mode, executed: [...executed], inner: innerCalled, status, result, run };
  }

  function at(): number {
    return Math.max(0, Math.round(performance.now() - startAt));
  }

  function log(tag: FormatLogEntry['tag'], text: string): void {
    logs.push({ at: at(), tag, text });
    if (logs.length > 60) logs.splice(0, logs.length - 60);
    onUpdate(snapshot(), logs);
  }

  function settle(nextStatus: FormatSnapshot['status'], nextResult: string): void {
    status = nextStatus;
    result = nextResult;
    onUpdate(snapshot(), logs);
  }

  // 兜底实现：waterfall 的最后一个参数，类型就是事件声明的最后一个参数
  //（0 参函数，用闭包取值——核心 internal/get 的兜底也是这个写法）。
  // 链上没有监听器截留（全部委托到底）时执行，其返回值是最终结果的起点。
  // 它运行时同样会收到负载与 next（源码原样传入），但链已到头，再调用 next
  // 会自递归——不要调用。
  const inner = (): string => {
    innerCalled = true;
    log('兜底', `inner 执行：source="${SOURCE}"，返回 "${SOURCE}[inner]"`);
    return `${SOURCE}[inner]`;
  };

  function createListener(id: ListenerId): Listener {
    return (source, next) => {
      executed.push(id);
      log('监听器', `${id} 执行：收到 source="${source}"`);
      const respond = args.responder === id;
      const work = (): string | Promise<string> | undefined => {
        if (args.throwB && id === 'B') {
          throw new Error(`${id} 抛出的异常`);
        }
        if (next) {
          // waterfall 路径：委托下游，把下游结果加工后上抛；抢答时不委托即短路
          if (respond) {
            log('监听器', `${id} 返回 "[${id}]${source}"，不调用 next()——短路`);
            return `[${id}]${source}`;
          }
          log('监听器', `${id} 调用 next() 委托下游（下游收到的仍是原始 source）`);
          return wrapDownstream(next(), (value) => `[${id}]${value}`);
        }
        // 其余模式：默认让位（返回 undefined，serial/bail 继续问下一个）；
        // 被选为抢答者时返回有效值
        if (respond) {
          log('监听器', `${id} 返回 "[${id}]${source}"`);
          return `[${id}]${source}`;
        }
        log('监听器', `${id} 返回 undefined`);
        return undefined;
      };
      if (args.asyncB && id === 'B') {
        // 异步监听器：立即交回 Promise，ASYNC_DELAY 后才执行实际行为——
        // 是否有人等待这个 Promise，正是五种模式的分水岭
        log('监听器', `${id} 是异步监听器，${ASYNC_DELAY}ms 后继续`);
        return sleep(ASYNC_DELAY).then(work);
      }
      return work();
    };
  }

  // 注册顺序即调用顺序：A → B → C。返回的清理函数是可逆注册（3.1），
  // prepend / global 等注册选项见 3.2 事件课。
  const disposers = (['A', 'B', 'C'] as ListenerId[]).map((id) =>
    root.on('format', createListener(id)),
  );

  async function dispatch(): Promise<void> {
    if (status === 'pending') {
      log('触发', '上一次触发仍在等待，忽略本次点击');
      return;
    }
    run += 1;
    executed.length = 0;
    innerCalled = false;
    startAt = performance.now();
    const { mode } = args;
    log('触发', `#${run} ctx.${mode}('format', '${SOURCE}')`);

    if (mode === 'emit') {
      // 同步广播：不等待、不收返回值；监听器抛错同步炸给触发方
      try {
        root.emit('format', SOURCE);
        settle('sync', 'undefined（emit 无返回值）');
      } catch (error) {
        settle('sync', `同步抛出：${describeError(error)}`);
      }
      return;
    }

    if (mode === 'parallel') {
      // 并发启动、等待全部；失败聚合为 AggregateError 在收尾抛出
      settle('pending', 'Promise（等待全部监听器）');
      try {
        await root.parallel('format', SOURCE);
        settle('fulfilled', 'undefined（parallel 无返回值）');
      } catch (error) {
        settle('rejected', describeError(error));
      }
      return;
    }

    if (mode === 'serial') {
      // 逐个 await：有效返回值短路，抛错立即整体 reject
      settle('pending', 'Promise（逐个等待监听器）');
      try {
        const value = (await root.serial('format', SOURCE)) as string | undefined;
        settle('fulfilled', value === undefined ? 'undefined（无监听器返回有效值）' : `"${value}"`);
      } catch (error) {
        settle('rejected', describeError(error));
      }
      return;
    }

    if (mode === 'bail') {
      // 同步短路：B 异步时，未等待的 Promise 对象本身就是「有效值」
      try {
        const value = root.bail('format', SOURCE);
        if (value instanceof Promise) {
          settle('sync', 'Promise（bail 不等待，拿到的是 Promise 对象）');
        } else if (value === undefined) {
          settle('sync', 'undefined（无监听器返回有效值）');
        } else {
          settle('sync', `"${value}"`);
        }
      } catch (error) {
        settle('sync', `同步抛出：${describeError(error)}`);
      }
      return;
    }

    // waterfall：最后一个参数是兜底实现 inner（类型即事件声明的 next）
    try {
      const returned = root.waterfall('format', SOURCE, inner);
      if (returned instanceof Promise) {
        settle('pending', 'Promise（waterfall 不等待，由 async 监听器上浮）');
        returned.then(
          (value) => settle('fulfilled', `"${value}"`),
          (error) => settle('rejected', describeError(error)),
        );
      } else if (returned === undefined) {
        settle('sync', 'undefined（无监听器接手）');
      } else {
        settle('sync', `"${returned}"`);
      }
    } catch (error) {
      settle('sync', `同步抛出：${describeError(error)}`);
    }
  }

  // emit 不等待也不捕获 async 监听器：捕获全局 unhandledrejection 作为证据
  //（emit + 异步 B + B 抛错时，约 ASYNC_DELAY 后出现一条日志）。
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    log('错误', `unhandledrejection：${message(event.reason)}（emit 丢下的 Promise 无人接收）`);
  };
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return {
    update(next) {
      args = next;
      onUpdate(snapshot(), logs);
    },
    trigger() {
      void dispatch();
    },
    dispose() {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      for (const dispose of disposers) dispose();
    },
  };
}
