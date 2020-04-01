# WebDriver

- [WebDriver MDN](https://developer.mozilla.org/en-US/docs/Web/WebDriver)
- [webdriver Specification](https://www.w3.org/TR/webdriver/)
- [Selenium](https://www.selenium.dev)
- [ChromeDriver](https://chromedriver.chromium.org/home)
- [geckodriver](https://github.com/mozilla/geckodriver/)
- [node-chromedriver](https://github.com/giggio/node-chromedriver)

## 常见问题

- [npm 安装 chromedriver 失败的解决办法](https://segmentfault.com/a/1190000008310875)

    - https://npm.taobao.org/
    - https://gist.github.com/52cik/c1de8926e20971f415dd
    - ["ChromeDriver installation failed undefined" during npm install.](https://github.com/vuejs/vue-router/issues/261)

- Chrome 模拟移动设备且定制 userAgent


    ```js
    const chrome = require('selenium-webdriver/chrome');
    const chromeOptions = new chrome.Options();
    chromeOptions.setMobileEmulation({
      "deviceMetrics": {
        "width": 375,
        "height": 750,
        "pixelRatio": 2,
        "touch": true
      },
      "userAgent": "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"
    });
    ```

    ps：虽然 [`chrome.Options().setMobileEmulation(config)`](https://github.com/SeleniumHQ/selenium/tree/1f67907a949e73556af681ee86bd3b57c40080ea/javascript/node/selenium-webdriver/chromium.js#L532) 的接口文档里没有写明可以配置 deviceMetrics 和 userAgent，但是通过 ChromeDriver 的官方文档 [Specifying Individual Device Attributes](https://chromedriver.chromium.org/mobile-emulation) 可以得知是支持这些配置参数的。
