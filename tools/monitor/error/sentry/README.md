# [Sentry](https://sentry.io)

## 前端 SDK

- [API](http://getsentry.github.io/sentry-javascript/)
- [sentry-javascript](https://github.com/getsentry/sentry-javascript)

### 安装SDK

- [正常加载](https://docs.sentry.io/platforms/javascript/#integrating-the-sdk)
- [懒加载](https://docs.sentry.io/platforms/javascript/#lazy-loading-sentry)

### [错误数据](http://getsentry.github.io/sentry-javascript/interfaces/types.event.html)

错误数据对应 Sentry 的“事件对象”这个概念：

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

- message：消息，来自 `Sentry.captureMessage()`
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

- [`BrowserOptions.beforeSend(event: Event, hint?: EventHint): PromiseLike<Event | null> | Event | null`](http://getsentry.github.io/sentry-javascript/interfaces/browser.browseroptions.html#beforesend)：事件提交前的回调，可以在这里修改事件对象

    参数

    - [`event`](http://getsentry.github.io/sentry-javascript/interfaces/types.event.html#timestamp)：同上文提到的事件对象
    - [`hint`](http://getsentry.github.io/sentry-javascript/interfaces/types.eventhint.html)：

         event_id, originalException, syntheticException
    
        ps：在调用 `Sentry.captureMessage` 时没有原生的错误对象，Sentry 会自己创建一个合成对象 `syntheticException`。

- [`BrowserOptions.beforeBreadcrumb(breadcrumb: Breadcrumb, hint?: BreadcrumbHint): Breadcrumb | null`](http://getsentry.github.io/sentry-javascript/interfaces/browser.browseroptions.html#beforebreadcrumb)：“面包屑”添加前的回调，而已在这里修改相关对象的数据

    参数

    - [`breadcrumb`](http://getsentry.github.io/sentry-javascript/interfaces/types.breadcrumb.html)：“面包屑”对象
    
        不同类型的操作包含的信息不一样，大致包含以下字段：category、data、event_id、level、message、timestamp、type、Properties
    

    - [`hint`](http://getsentry.github.io/sentry-javascript/interfaces/types.breadcrumbhint.html)：包含涉及操作的原始数据信息，例如 Ajax 请求有 xhr 对象

        - xhr

            - breadcrumb：

                ```js
                { 
                  category: "xhr",
                  data: {
                    method: "GET"
                    status_code: 200
                    url: "http://www.mocky.io/v2/5db9070130000064005ee042"
                  }
                  timestamp: 1572407522.805
                  type: "http"
                }    
                ```
            
            - hint: `{ xhr: XMLHTTPRequest }`

        - console

            - breadcrumb：

                ```ts
                {
                  category: "console",
                  data: {
                    extra: {
                      arguments: any[],
                    },
                    logger: "console",
                  }
                  level: "debug",
                  message: "loaded"
                  timestamp: 1572407522.808
                }
                ```

            - hint:

                ```ts
                {
                  input: any[]
                  level: "debug"
                }
                ```

        - sentry

            - breadcrump

                ```ts
                object
                ```

            - hint: `undefiend`

        - navigation

            - breadcrump

                ```ts
                {
                  category: "navigation",
                  data: {
                    from: string,
                    to: string
                  },
                  timestamp: 1572407522.813
                }
                ```
        
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

### 通知

- [Notifications](https://docs.sentry.io/workflow/notifications/)
- [Alerts](https://docs.sentry.io/workflow/notifications/alerts/)
- [Workflow](https://docs.sentry.io/workflow/notifications/workflow/)

#### 通知渠道

- Email
- PagerDuty
- Slack
- 钉钉

#### 通知类型

- 警报通知：项目的错误警报
- 工作流通知：问题状态变化通知

    处理状态

    - Unresolved：未解决
    - Resolved：已解决
    - Regressions：回归
    - Ignored：忽略

    分配状态

    - Assigned：已分配
    - Unassigned：未分配

- 周报通知：报告组织每周问题统计情况
- 部署通知：版本、环境等部署通知


#### 通知配置

##### 开关

在[个人账号的通知设置](https://sentry.io/settings/account/notifications/)页面，可以统一设置不同类型通知的启用状态，或者按项目设置。

##### 责任人

[Issue Owners](https://docs.sentry.io/workflow/issue-owners/)

- 默认：警报默认发送给项目关联团队的所有成员
- 定制：根据路径或者 URL 指定给指定小组或者成员

ps：在项目的责任人设置页面里可以设置自动将问题分配给责任人的功能。

##### 规则

- 名称
- 条件：所有、任一、非

    - 收到事件
    - 第一次收到问题
    - 问题从已处理变为未处理
    - 问题从忽略变为未处理
    - 事件匹配某个标签
    - 问题在多长时间内触发多少次
    - 事件级别
    - 事件信息包含

- 环境
- 动作
- 频率

参考文献

- [Proactively Wrangle Events Using Sentry’s Alert Rules](https://blog.sentry.io/2017/10/12/proactive-alert-rules)

##### 其他

- [Unsubscribe](https://docs.sentry.io/workflow/notifications/#unsubscribe)

## 本地服务

下载 [getsentry/onpremise](https://github.com/getsentry/onpremise)，然后按照 [Setup](https://github.com/getsentry/onpremise#setup) 和 [.travis.yml](https://github.com/getsentry/onpremise/blob/master/.travis.yml) 的操作步骤操作。

参考文献（可能是旧版本的，不一定符合新版本，仅供参考）：

- [Self-Hosted Sentry](https://docs.sentry.io/server/)
- [用 Docker 部署 Sentry Bug 日志收集服务](https://thinkhard.tech/2019/05/25/docker-sentry-deploy/)
- [docker本地搭建Sentry](https://www.jianshu.com/p/cea2d22fbb32)
- [前端异常监控之 Sentry的部署和使用](https://juejin.im/post/5b55c33ae51d45198f5c7a91)

## 常见问题

### Missing support for SMTP with SSL

- [Missing support for SMTP with SSL](https://github.com/getsentry/sentry/issues/4252)
- [sentry发送邮件问题](http://lagel.me/server/sentry-mail.html#%E6%8E%92%E6%9F%A5%E6%88%91%E4%BB%AC%E6%9C%8D%E5%8A%A1%E5%99%A8%E7%9A%84%E7%BD%91%E7%BB%9C%E5%92%8C%E7%AB%AF%E5%8F%A3%E9%97%AE%E9%A2%98)
- [Sentry 之部署到生产环境](https://learnku.com/articles/9405/the-deployment-of-sentry-into-the-production-environment)
