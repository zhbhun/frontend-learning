# [Sentry](https://sentry.io)

## 前端 SDK

- [API](http://getsentry.github.io/sentry-javascript/)
- [sentry-javascript](https://github.com/getsentry/sentry-javascript)

### 安装SDK

- [正常加载](https://docs.sentry.io/platforms/javascript/#integrating-the-sdk)
- [懒加载](https://docs.sentry.io/platforms/javascript/#lazy-loading-sentry)

### 错误数据

- event_id：事件标识

    ```ts
    string
    ```

- user：用户信息

    ```ts
    {
      id: string;
      username: string;
      email: string;
      ip_address: string;
    }
    ```

- tags：事件标签，传给服务端后会建立索引，在 Sentry 后台可以按该标签进行过滤查询数据，且查看标签值的统计情况

    ```ts
    [{ [key in string]: string }]
    ```

- level：事件级别，默认是 `'error'`

    ```ts
    'fatal' | 'error’ | 'warning’ | 'info' | 'debug'
    ```

- fingerprint：事件“指纹”，用于对事件进行分组，对应 Sentry 后台的 Issue 概念

    ```ts
    string[]
    ```
- extra：事件额外的信息

    ```ts
    {
      [key in string]: string
    }
    ```

- exception：事件异常信息

    ```ts
    {
      values: {
        type: string; // "ReferenceError"
        value: string; // myUndefinedFunction is not defined
        mechanism: {
          handled: boolean;
          type: string; // onerror
        };
        stacktrace: {
          frames: {
            filename: string;
            lineno: number;
            colno: number;
            function: string;
            in_app: boolean;
          }[]
        }
      }[]
    }
    ```

- breadcrumbs：”面包屑“，产生事件的操作路径（包含 console 日志，DOM 交互事件和 history 记录等）
- request：产生事件的页面信息

    ```ts
    {
      headers: {
        'User-Agent': string;
      };
      url: string
    }
    ```

- sdk：处理事件的 SDK

    ```ts
    {
      integrations: string[];
      name: string; // entry.javascript.browser
      versions: string; // 5.7.1
      packages: {
        name: string; // npm:@sentry/browser
        version: string; // 5.7.1
      }[]
    }
    ```
- platform：发生事件的平台

    ```ts
    string // javascript
    ```

- environment：产生事件的运行环境，这个环境通常对应的是某个项目的测试环境和生成环境，在 Sentry 后台可以按环境进行过滤数据。

    ```ts
    string
    ```

### 配置 SDK

TODO

### 错误捕获

- 自动捕获

    - `window.onerror`
    - `console`
    - ...

- 手动捕获

    - [`Sentry.captureMessage(message: string, level?: Severity, hint?: EventHint, scope?: Scope): string | undefined`](https://docs.sentry.io/platforms/javascript/#messages)
    - `Sentry.captureEvent(event: Event, hint?: EventHint, scope?: Scope): string | undefined`
    - [`Sentry.captureException(exception: any, hint?: EventHint, scope?: Scope): string | undefined`](https://docs.sentry.io/platforms/javascript/#capturing-errors)

## 日志后台

- 组织
- 小组
- 成员
- 项目
- 错误
- 事件
- 反馈
- 评论
- 标签

## 本地服务

下载 [getsentry/onpremise](https://github.com/getsentry/onpremise)，然后按照 [Setup](https://github.com/getsentry/onpremise#setup) 和 [.travis.yml](https://github.com/getsentry/onpremise/blob/master/.travis.yml) 的操作步骤操作。

参考文献（可能是旧版本的，不一定符合新版本，仅供参考）：

- [Self-Hosted Sentry](https://docs.sentry.io/server/)
- [用 Docker 部署 Sentry Bug 日志收集服务](https://thinkhard.tech/2019/05/25/docker-sentry-deploy/)
- [docker本地搭建Sentry](https://www.jianshu.com/p/cea2d22fbb32)
- [前端异常监控之 Sentry的部署和使用](https://juejin.im/post/5b55c33ae51d45198f5c7a91)
