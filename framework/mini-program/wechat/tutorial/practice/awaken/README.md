# 唤起

## 方式

### 链接

- [JS SDK](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_Open_Tag.html#%E5%BC%80%E6%94%BE%E6%A0%87%E7%AD%BE%E8%AF%B4%E6%98%8E%E6%96%87%E6%A1%A3)
- [URL Scheme](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/url-scheme.html)

    适用于从短信、邮件、微信外网页等场景打开小程序。

- [URL Link](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/url-link.html)

    适用于从短信、邮件、网页、微信内等场景打开小程序

- [Short Link](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/shortlink.html)

    适用于微信内拉起小程序的业务场景


### 小程序码

- [小程序码](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/qr-code.html#%E8%8E%B7%E5%8F%96%E5%B0%8F%E7%A8%8B%E5%BA%8F%E7%A0%81)

    - [接口 A: 适用于需要的码数量较少的业务场景](https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/qr-code/wxacode.get.html)
    - [接口 B：适用于需要的码数量极多的业务场景](https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/qr-code/wxacode.getUnlimited.html)

- [二维码](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/qr-code.html#%E8%8E%B7%E5%8F%96%E5%B0%8F%E7%A8%8B%E5%BA%8F%E7%A0%81)

    - [接口 C：适用于需要的码数量较少的业务场景](https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/qr-code/wxacode.createQRCode.html)
    - [扫普通链接二维码打开小程序](https://developers.weixin.qq.com/miniprogram/introduction/qrcode.html)

- [一物一码](https://developers.weixin.qq.com/doc/offiaccount/Unique_Item_Code/Unique_Item_Code_Op_Guide.html)

## 场景

### 微信 H5 跳转小程序

- [开放标签说明文档](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_Open_Tag.html)
- [跳转到小程序](https://developer.work.weixin.qq.com/document/path/93114) / [JS-SDK](https://developer.work.weixin.qq.com/document/10029#%E5%9F%BA%E7%A1%80%E6%8E%A5%E5%8F%A3)
- [通过什么方法在微信公众号中跳转到小程序中？](https://www.zhihu.com/question/55567303)
- [企业微信H5唤起(打开)微信小程序](https://blog.csdn.net/qq_25863973/article/details/114930831)
- [H5跳转微信小程序(个人微信+企业微信)的实现](https://yinode.tech/post/202108/h5%E8%B7%B3%E8%BD%AC%E5%BE%AE%E4%BF%A1%E5%B0%8F%E7%A8%8B%E5%BA%8F%E4%B8%AA%E4%BA%BA%E5%BE%AE%E4%BF%A1+%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E7%9A%84%E5%AE%9E%E7%8E%B0/)
