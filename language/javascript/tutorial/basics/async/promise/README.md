# Promise

- then：捕获异步成功或错误，如果回调传空，当前 promise 会继续往下透传
- catch：捕获异步错误，如果回调传空，当前 promise 会继续往下透传
- finally：等待当前 promise 完成工作后，执行传入的回调函数，然后继续保持现有的原型返回值

## 进阶

### 存在问题

- 无法取消

    https://github.com/alkemics/CancelablePromise

- 性能问题