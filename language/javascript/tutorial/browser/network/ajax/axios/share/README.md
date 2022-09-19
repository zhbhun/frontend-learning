# axios 最佳实践

axios 是前端非常流行的一个 HTTP 请求封装库，但在项目中使用还需要结合业务做一些二次封装，例如：授权信息配置、响应错误处理等，本文介绍一种基于 axios 的最佳实践方案。

## 背景

在介绍实践方案前，我们先看下现有 axios 使用存在的一些误区和弊端，然后我们在结合这些问题去介绍实践方案，让大家更清楚为什么要这么做。

### 误用 axios 单例

axios 本身就是方法，可以直接调用发起 HTTP 请求，并且在该方法上还设置了许多快捷的请求方法（get、post 等），支持通过 axios.defaults 配置默认的请求头，携带用户授权信息。一些开发者会直接基于 axios 本身进行配置，但前端应用通常不止会对接一个服务域名，可能会对接多个服务域名，各个业务之间可能存在差异（请求头和响应数据结构差异），所以直接修改 axios 容易导致配置冲突，应该尽量使用 axios 的 create 方法创建一个新的实例。即使你的应用当前只对接一个业务服务接口，那也应该使用 create，为将来的扩展做好准备。

假设一个前端应用要对接两个服务：`https://api.xxx.com/a/` 和 `https://api.xxx.com/b/`，这两个服务的差异在于前者需要用户鉴权，而后者不需要，那么在封装的时候可以创建两个 axios 实例。

```js
// aAxios.js
const aAxios = axios.create({
  baseURL: 'https://api.xxx.com/a/'
});
aAxios.interceptors.request.use(function (config) {
    config.headers = {
      ...config.headers,
      authorization: '...'
    }
    // Do something before request is sent
    return config;
  }, function (error) {
    // Do something with request error
    return Promise.reject(error);
  });


// bAxios.js
const bAxios = axios.create({
  baseURL: 'https://api.xxx.com/b/'
});
```

如果有另外一个服务（`https://c-api.xxx.com/`）的请求和响应方式与 aAxios 类似，那么可以将 aAxios 的创建方式封装成一个函数来复用。

```js
function createAxios() {
  const instance = axios.create({
    baseURL: 'https://api.xxx.com/a/'
  });
  instance.interceptors.request.use(function (config) {
      config.headers = {
        ...config.headers,
        authorization: '...'
      }
      // Do something before request is sent
      return config;
    }, function (error) {
      // Do something with request error
      return Promise.reject(error);
    }); 
  return instance;
}
```

### 遗漏的错误处理

之前基于 Axios 封装过一个网络请求库 [eaxios](https://github.com/zhbhun/eaxios)，主要是为了简化服务端响应内容和各种异常情况的处理。但最新版的 axios 已经规范了错误编码，并且修复了存在的一些问题（支持 application/x-www-form-urlencoded 和优化了 JSON 的解析），现在完全可以基于 axios 的拦截器实现 eaxios 类似的效果，没有必要再封装独立的库。

### 偷懒的全局提示和加载

TODO

## 封装

## 集成

## 参考
