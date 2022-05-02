# 混合内容

通过安全 HTTPS 连接加载初始 HTML，但通过不安全的 HTTP 连接加载其他资源（如图像、视频、样式表、脚本）时，就会出现混合内容。

## 基础

### 两种类型

- 被动：括图像、视频和音频内容
- 主动：脚本、样式表、iframe 和浏览器可以下载和执行的其他代码

### 被动混合内容

危害：

- 攻击者可以拦截您网站上图像的 HTTP 请求并交换或替换这些图像；

    - 攻击者可以交换保存和删除按钮的图像，导致您的用户在无意中删除内容；
    - 或者使用淫秽或色情内容替换您的产品图表，从而破坏您的网站；
    - 或者使用淫秽或色情内容替换您的产品图表，从而破坏您的网站；

- 即使攻击者不更改您网站的内容，他们也可以通过混合内容请求来跟踪用户。攻击者可以根据浏览器加载的图像或其他资源来判断用户访问了哪些页面以及查看了哪些产品。

现状：截止到目前，大多浏览器仍会加载被动混合内容，因为阻止这些内容会破坏许多网站。Chrome 支持被动混合内容的自动升级，如果资源可通过 HTTPS 加载，但已将其硬编码为 HTTP，则浏览器会加载 HTTPS 版本（如果不支持 https，现在的浏览器会继续使用 http，然后发出警告，但后续浏览器开始逐渐禁止请求）。

    ps：Chrome 会在将 DevTools 记录混合内容自动升级的信息。

![passive-mixed-content.avif](./assets/passive-mixed-content.avif)

### 主动混合内容

危害：攻击者可以拦截和重写活动内容，从而完全控制您的页面，甚至控制整个网站。

- 可以更改页面的任何内容
- 窃取用户密码或其他登录凭据
- 窃取用户会话 Cookie 
- 将用户重定向到完全不同的站点。

现状：由于这种威胁的严重性，为了保护用户，大多数浏览器已经默认阻止此类内容，但具体功能因浏览器供应商和版本而异。
    
![active-mixed-content.avif](./assets/active-mixed-content.avif)

## 进阶

### CSP 报告

CSP 报告机制可用于跟踪您网站上的混合内容，要启用此功能，请通过将 Content-Security-Policy-Report-Only 添加到网站的响应头来设置该指令。

```
Content-Security-Policy-Report-Only: default-src https: 'unsafe-inline' 'unsafe-eval'; report-uri https://example.com/reportingEndpoint
```

每当用户访问您网站上的网页时，他们的浏览器都会向 https://example.com/reportingEndpoint 发送一份 JSON 格式的报告，列举违反内容安全策略的内容。此时，只要通过 HTTP 加载子资源，就会发送报告。这些报告包括发生违反策略的网页 URL 和违反策略的子资源 URL。如果您将报告端点配置为记录这些报告，便可跟踪网站上的混合内容，而无需亲自访问每个网页。如果您的网站由 Blogger 等平台为您托管，您可能无权修改标头和添加 CSP。一个可行的替代方法是使用 [HTTPSChecker](https://httpschecker.net/how-it-works#httpsChecker) 或 [Mixed Content Scan](https://github.com/bramus/mixed-content-scan) 等网站爬虫为您查找整个网站的问题。

### CSP 策略

- `升级不安全的请求`：`<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`

    浏览器逐渐开始支持自动升级并阻止不安全的请求，我们可以使用 CSP 指令强制自动升级或阻止这些资产。与浏览器自动升级一样，如果资源无法通过 HTTPS 访问，则升级请求将失败并且不会加载资源。这样可以维护您网页的安全性。upgrade-insecure-requests 指令将超越自动浏览器升级，尝试升级浏览器当前没有的请求。

- `阻止所有混合内容`：`<meta http-equiv="Content-Security-Policy" content="block-all-mixed-content">`

    指令指示浏览器永不加载混合内容；所有混合内容资源请求都会被阻止，包括主动和被动混合内容。此方法还会级联到 <iframe> 文档中，确保整个网页都没有混合内容。

## 参考文献

- [混合内容是什么？](https://web.dev/what-is-mixed-content/)
- [修复混合内容](https://web.dev/fixing-mixed-content/)
- [Mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)
- [How to fix a website with blocked mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content/How_to_fix_website_with_mixed_content)
- [Why am I suddenly getting a "Blocked loading mixed active content" issue in Firefox?](https://stackoverflow.com/questions/18251128/why-am-i-suddenly-getting-a-blocked-loading-mixed-active-content-issue-in-fire)
- [https请求报错block:mixed-content问题的解决办法（已解决）](https://blog.csdn.net/qq_39390545/article/details/105550949)
