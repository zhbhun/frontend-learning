# 基础

## 异步

### Promise

```js
new Promise(function (resolve, reject) {
  if () {
    resolve(1)
  } else {
    reject(2)
  }
})
  .then((d) => {})
  .catch((e) => {})
Promise.resolve()
Promise.reject()
Promise.race()
Promise.any()
Promise.all()
Promise.allSettled()
```

```js
//Promise 完整的实现
class Promise {
  callbacks = [];
  state = 'pending';//增加状态
  value = null;//保存结果
  constructor(fn) {
    fn(this._resolve.bind(this), this._reject.bind(this));
  }
  then(onFulfilled, onRejected) {
    return new Promise((resolve, reject) => {
      this._handle({
        onFulfilled: onFulfilled || null,
        onRejected: onRejected || null,
        resolve: resolve,
        reject: reject
      });
    });
  }
  catch(onError) {
    return this.then(null, onError);
  }
  finally(onDone) {
    if (typeof onDone !== 'function') return this.then();

    let Promise = this.constructor;
    return this.then(
      value => Promise.resolve(onDone()).then(() => value),
      reason => Promise.resolve(onDone()).then(() => { throw reason })
    );
  }
  static resolve(value) {
    if (value && value instanceof Promise) {
      return value;
    } else if (value && typeof value === 'object' && typeof value.then === 'function') {
      let then = value.then;
      return new Promise(resolve => {
        then(resolve);
      });

    } else if (value) {
      return new Promise(resolve => resolve(value));
    } else {
      return new Promise(resolve => resolve());
    }
  }
  static reject(value) {
    if (value && typeof value === 'object' && typeof value.then === 'function') {
      let then = value.then;
      return new Promise((resolve, reject) => {
        then(reject);
      });

    } else {
      return new Promise((resolve, reject) => reject(value));
    }
  }
  static all(promises) {
    return new Promise((resolve, reject) => {
      let fulfilledCount = 0
      const itemNum = promises.length
      const rets = Array.from({ length: itemNum })
      promises.forEach((promise, index) => {
        Promise.resolve(promise).then(result => {
          fulfilledCount++;
          rets[index] = result;
          if (fulfilledCount === itemNum) {
            resolve(rets);
          }
        }, reason => reject(reason));
      })

    })
  }
  static race(promises) {
    return new Promise(function (resolve, reject) {
      for (let i = 0; i < promises.length; i++) {
        Promise.resolve(promises[i]).then(function (value) {
          return resolve(value)
        }, function (reason) {
          return reject(reason)
        })
      }
    })
  }
  _handle(callback) {
    if (this.state === 'pending') {
      this.callbacks.push(callback);
      return;
    }

    let cb = this.state === '1' ? callback.onFulfilled : callback.onRejected;

    if (!cb) {//如果then中没有传递任何东西
      cb = this.state === 'fulfilled' ? callback.resolve : callback.reject;
      cb(this.value);
      return;
    }

    let ret;

    try {
      ret = cb(this.value);
      cb = callback.resolve;
    } catch (error) {
      ret = error;
      cb = callback.reject
    } finally {
      cb(ret);
    }

  }
  _resolve(value) {
    if(this.state !== 'pending') return
    if (value && (typeof value === 'object' || typeof value === 'function')) {
      var then = value.then;
      if (typeof then === 'function') {
        then.call(value, this._resolve.bind(this), this._reject.bind(this));
        return;
      }
    }

    this.state = 'fulfilled';//改变状态
    this.value = value;//保存结果

    setTimeout(() => {
      this.callbacks.forEach(callback => this._handle(callback));
    })
  }
  _reject(error) {
    if(this.state !== 'pending') return
    this.state = 'rejected';
    this.value = error;
    setTimeout(() => {
      this.callbacks.forEach(callback => this._handle(callback));
    })
  }
}
```

- [图解 Promise 实现原理（一）—— 基础实现](https://zhuanlan.zhihu.com/p/58428287)
- [图解 Promise 实现原理（二）—— Promise 链式调用](https://zhuanlan.zhihu.com/p/102017798)
- [图解 Promise 实现原理（三）—— Promise 原型方法实现](https://zhuanlan.zhihu.com/p/102018239)
- [图解 Promise 实现原理（四）—— Promise 静态方法实现](https://zhuanlan.zhihu.com/p/102018323)


```ts
type MyPromiseState = 'pending' | 'fulfilled' | 'rejected';

type MyPromiseResolve<T> = (ret: T) => void;

type MyPromiseReject<E = any> = (reason?: E) => void;

type MyPromiseProcess<T> = (resolve: MyPromiseResolve<T>, reject: MyPromiseReject) => void;

interface MyPromiseListener<T> {
  onFulfilled: ((result: T) => any | MyPromise<any>) | undefined | null;
  onRejected: ((reson?: T) => any | Promise<any>) | undefined | null;
  resolve: any;
  reject: any;
}

class MyPromise<T> {
  _listener: any[] = [];
  _state: MyPromiseState = 'pending';
  _result: any;

  constructor(callback: MyPromiseProcess<T>) {
    callback(this._resolve.bind(this), this._reject.bind(this))
  }

  then<T1, T2 = never>(onFulfilled: (((value: T) => T1 | MyPromise<T1>) | undefined | null), onRejected?: ((reason: any) => T2 | MyPromise<T2>) | undefined | null) {
    return new MyPromise<T1>((resolve, reject) => {
      this._handle({
        onFulfilled,
        onRejected,
        resolve,
        reject,
      });
    });
  }

  catch() {

  }

  _handle(listener: MyPromiseListener<T>) {
    if (this._state === 'pending') {
      this._listener.push(listener)
      return
    }

    let callback = this._state === 'fulfilled' ? listener.onFulfilled : listener.onRejected
    if (!callback) {
      callback = this._state === 'fulfilled' ? listener.resolve : listener.reject;
      callback?.(this._result)
      return
    }

    let newResult;
    try {
      newResult = callback(this._result);
      callback = listener.resolve;
    } catch (error: any) {
      callback = listener.reject;
    } finally {
      callback?.(newResult)
    }
  }

  _resolve(result: T) {
    if (this._state === 'pending') {
      return;
    }
    this._state = 'fulfilled';
    this._result = result;
    setTimeout(() => {
      this._listener.forEach(listener => this._handle(listener))
    })
  }

  _reject(reason: any) {

    if (this._state === 'pending') {
      return;
    }
    this._state = 'fulfilled';
    this._result = reason;
    setTimeout(() => {
      this._listener.forEach(listener => this._handle(listener))
    })
  }
}
```
