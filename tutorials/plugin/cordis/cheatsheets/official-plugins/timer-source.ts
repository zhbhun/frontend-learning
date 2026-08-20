/**
 * 本文件是 @cordisjs/plugin-timer@1.1.2 源码的逐字副本（packages/timer/src/index.ts，
 * cordiverse/cordis master 分支，已与 npm 安装版核对一致）。
 * 工作区未安装该包，Storybook Canvas 需要浏览器可运行的本地副本，故复制到课程目录。
 * 实际项目中安装后直接：import TimerService from '@cordisjs/plugin-timer'
 *
 * 唯一改动：`PromiseWithResolvers<T>` 类型在工作区 tsconfig（target ES2022）的 lib 中不存在，
 * 换成下方等价的结构类型（与 effects 课对 const enum 的本地映射同一处理方式）；
 * 运行时的 Promise.withResolvers() 需要 Chrome 119+ / Safari 17.4+ / Node 22+。
 */
import { Context, Service } from 'cordis'

/** 等价于 lib.es2024.promise 的 PromiseWithResolvers<T>（见文件头说明） */
interface PromiseWithResolvers<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: any) => void
}

/** 等价 Promise.withResolvers<T>()（工作区 lib 未含 es2024，见文件头说明） */
function withResolvers<T>(): PromiseWithResolvers<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

declare module 'cordis' {
  interface Context extends Pick<TimerService, 'interval' | 'timeout' | 'throttle' | 'debounce' | 'setTimeout' | 'setInterval'> {
    timer: TimerService
  }
}

type WithDispose<T> = T & { dispose: () => void }

export class TimerService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'timer')
    ctx.mixin('timer', ['timeout', 'interval', 'throttle', 'debounce', 'setTimeout', 'setInterval'])
  }

  /** @deprecated use `ctx.timeout()` instead */
  setTimeout(callback: () => void, delay: number) {
    return this.timeout(callback, delay)
  }

  /** @deprecated use `ctx.interval()` instead */
  setInterval(callback: () => void, delay: number) {
    return this.interval(callback, delay)
  }

  timeout(callback: () => void, delay: number): () => void
  timeout(delay: number): Promise<void>
  timeout(...args: any[]): any {
    const callback = typeof args[0] === 'function' ? args.shift() : undefined
    const delay = args[0] as number
    if (callback) {
      const dispose = this.ctx.effect(() => {
        const timer = setTimeout(() => {
          dispose()
          callback()
        }, delay)
        return () => clearTimeout(timer)
      }, 'ctx.timeout()')
      return dispose
    } else {
      const { promise, resolve, reject } = withResolvers<void>()
      const dispose = this.ctx.effect(() => {
        const timer = setTimeout(resolve, delay)
        return () => {
          clearTimeout(timer)
          reject(new Error('Context has been disposed'))
        }
      }, 'ctx.timeout()')
      return promise.finally(dispose)
    }
  }

  interval(callback: () => void, delay: number): () => void
  interval<R = any>(delay: number): AsyncIterableIterator<void, R, void>
  interval(...args: any[]): any {
    const callback = typeof args[0] === 'function' ? args.shift() : undefined
    const delay = args[0] as number
    if (callback) {
      return this.ctx.effect(() => {
        const timer = setInterval(callback, delay)
        return () => clearInterval(timer)
      }, 'ctx.interval()')
    } else {
      let done: { kind: 'return'; value: any } | { kind: 'throw'; reason: any } | undefined
      let nextTask: PromiseWithResolvers<IteratorResult<void>> | undefined
      const dispose = this.ctx.effect(() => {
        const timer = setInterval(() => {
          nextTask?.resolve({ done: false, value: undefined })
        }, delay)
        return () => {
          clearInterval(timer)
          if (done) return
          done = { kind: 'throw', reason: new Error('Context has been disposed') }
          nextTask?.reject(done.reason)
        }
      }, 'ctx.interval()')
      return {
        next: () => {
          if (!done) return (nextTask = withResolvers()).promise
          if (done.kind === 'return') return Promise.resolve({ done: true, value: done.value })
          return Promise.reject(done.reason)
        },
        return: (value) => {
          if (!done) done = { kind: 'return', value }
          nextTask?.resolve({ done: true, value })
          dispose()
          return Promise.resolve({ done: true, value })
        },
        throw: (reason) => {
          if (!done) done = { kind: 'throw', reason }
          nextTask?.reject(reason)
          dispose()
          return Promise.resolve({ done: true, value: undefined })
        },
        [Symbol.asyncIterator]() {
          return this
        },
      } satisfies AsyncIterableIterator<void>
    }
  }

  private _schedule(label: string, trigger: (args: any[], isDisposed: boolean) => any, isDisposed = false) {
    let timer: ReturnType<typeof setTimeout> | undefined
    const dispose = this.ctx.effect(() => () => {
      isDisposed = true
      clearTimeout(timer)
    }, label)
    const wrapper: any = (...args: any[]) => {
      clearTimeout(timer)
      timer = trigger(args, isDisposed)
    }
    wrapper.dispose = dispose
    return wrapper
  }

  throttle<F extends (...args: any[]) => void>(callback: F, delay: number, noTrailing?: boolean): WithDispose<F> {
    let lastCall = -Infinity
    const execute = (...args: any[]) => {
      lastCall = Date.now()
      callback(...args)
    }
    return this._schedule('ctx.throttle()', (args, isDisposed) => {
      const now = Date.now()
      const remaining = delay - now + lastCall
      if (remaining <= 0) {
        execute(...args)
      } else if (!isDisposed) {
        return setTimeout(execute, remaining, ...args)
      }
    }, noTrailing)
  }

  debounce<F extends (...args: any[]) => void>(callback: F, delay: number): WithDispose<F> {
    return this._schedule('ctx.debounce()', (args, isDisposed) => {
      if (isDisposed) return
      return setTimeout(callback, delay, ...args)
    })
  }
}

export default TimerService
