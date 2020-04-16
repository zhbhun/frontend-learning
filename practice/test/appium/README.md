# [Appium](https://appium.io/)

Appium 是一个开源的自动化测试平台，适用以下场景

- Navtive App：iOS、Android 和 Windows
- Hybrid App：Apache Cordova、Phonegap
- Mobile Web：iOS safari、Android Chrome

特性：

1. 跨平台且支持测试代码复用；

    ps：使用一致的 API 来测试原生、Web 和混合应用，并支持跨平台的测试代码复用；

2. 不需要修改 App；

    ps：不要求在 App 内集成 SDK 或做特殊的编译

3. 自由选择喜欢的测试语言、工具和框架；

    ps：支持多种语言来编写测试用例


## 实现原理

Client + Server + Device

- Server =》Device：

    - iOS 9.3 and above: Apple's XCUITest
    - iOS 9.3 and lower: Apple's UIAutomation
    - Android 4.2+: Google's UiAutomator/UiAutomator2
    - Windows: Microsoft's WinAppDriver

    [Appium Platform Support](https://appium.io/docs/en/about-appium/platform-support/index.html)

    [Chromedriver](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/web/chromedriver.md)

- Client => Server

    测试客户端和服务端按照 [WebDriver](https://www.selenium.dev/projects/) API 规范基于 HTTP 协议进行通信，客户端支持任意的语言实现，只要符合 WebDriver 的 HTTP 通信规范。

    [List of client libraries with Appium server support](https://appium.io/docs/en/about-appium/appium-clients/index.html)

    - Ruby
    - Python
    - Java
    - JavaScript
    - PHP
    - C#

参考文档

- https://appium.io/docs/en/about-appium/intro/?lang=zh


## 安装使用

- package.json

    ```json
    {
      "private": true,
      "scripts": {
        "start": "appium --chromedriver-executable ./node_modules/appium-chromedriver/chromedriver/mac/chromedriver",
        "test": "mocha test"
      },
      "dependencies": {
        "appium": "^1.17.0",
        "appium-chromedriver": "^4.22.0",
        "assert": "^2.0.0",
        "chai": "^4.1.2",
        "mocha": "^7.0.1",
        "webdriverio": "^6.0.16"
      }
    }
    ```

- test

    - mocha.opts

        ```
        --timeout 1800000
        ```

    - hello-world

        ```js
        const webdriverio = require('webdriverio');
        const assert = require('chai').assert;

        const androidOptions = {
          host: 'localhost',
          port: 4723,
          path: '/wd/hub',
          logLevel: 'info',
          capabilities: {
            platformName: 'Android',
            automationName: 'UiAutomator2',
            deviceName: 'Android GoogleAPI Emulator',
            platformVersion: '8.1.0',
            browserName: 'chrome'
          }
        };

        describe('Create Chrome web session', function () {
          let client;

          before(async function () {
            client = await webdriverio.remote(androidOptions);
          });

          after(async function () {
            return await client.deleteSession();
          });

          it('should create and destroy Android browser session', async function () {
            // Navigate to baidu.com
            const client = await webdriverio.remote(androidOptions);
            await client.url('https://www.baidu.com');

            const title = await client.getTitle();
            assert.equal(title, '百度一下');
          });
        });
        ```

```bash
$ npm install
$ npm run start
$ npm run test
```

参考文献

- [Getting Started](https://appium.io/docs/en/about-appium/getting-started/?lang=zh#)

## 使用教程

- https://github.com/appium/appium/tree/master/sample-code
- [使用 Appium 对移动终端上 Hybrid 应用进行自动化测试](https://www.ibm.com/developerworks/cn/mobile/mo-cn-appium/index.html)

### 测试 API

- [服务器装填](https://appium.io/docs/en/commands/status/)：查询服务器当前状态
- [移动端命令](https://appium.io/docs/en/commands/mobile-command/)：执行原生移动端命令
- [会话管理](https://appium.io/docs/en/commands/session/create/)
- [设备管理](https://appium.io/docs/en/commands/device/activity/start-activity/)
- [元素操作](https://appium.io/docs/en/commands/element/find-element/)
- [上下文管理](https://appium.io/docs/en/commands/context/get-context/)
- [交互操作](https://appium.io/docs/en/commands/interactions/mouse/moveto/)
- [Web 相关](https://appium.io/docs/en/commands/web/window/set-window/)

