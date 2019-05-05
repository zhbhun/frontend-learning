- http://stackoverflow.com/questions/tagged/mobile-safari

# 如何禁止 iOS Safari 的电话号码链接？
- 问题

    iOS 默认将连续的数字识别为电话号码，很多时候不是电话号码的数字也当作电话号码处理了。

- 解决

    在 HTML 头部添加 `<meta name="format-detection" content="telephone=no">`，如果还需要实现电话号码链接，可以使用 `tel` URI 模式。例如：`<a href="tel:1-408-555-5555">1-408-555-5555</a>`。

- 参考

    - [How to disable phone number linking in Mobile Safari?](http://stackoverflow.com/questions/226131/how-to-disable-phone-number-linking-in-mobile-safari)
    - https://developer.apple.com/library/content/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html#//apple_ref/doc/uid/TP40008193-SW5
    - https://developer.apple.com/library/content/featuredarticles/iPhoneURLScheme_Reference/PhoneLinks/PhoneLinks.html#//apple_ref/doc/uid/TP40007899-CH6-SW1

- 疑问：Android 该如何实现电话号码链接？
