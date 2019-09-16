# 异常处理

- 是什么
- 为什么
- 怎么用

## 介绍

- 异常是什么？



- 异常处理，英文名为 "exceptional handling", 是编程语言或计算机硬件里的一种机制，用于处理软件或信息系统中出现的异常状况（即超出程序正常执行流程的某些特殊条件）。

## 为什么需要异常处理机制？


```ts
// 回调
function getUserByName(name: string, callback: (result: { code: number, data: { id: string, name: string } }) => void ): void {
  // ...一系列异步操作
  callback({
    code: 0,
    data: {
      id: 'a',
      name: '某某某',
    },
  });
}
function createUser(name: string, callback: (code: number) => void) {
  getUserByName(name, function (result) {
    const { code, data } = result;
    if (code === 0) {
      // 查询成功
      if (data === null) {
        // 新建用户
        callback(0);
      } else {
        callback(1); // 表示用户已经存在
      }
    } else {
      callback(code); // 向外传 code
    }
  })
}
createUser('某某某', function(code) {
  if (code === 0) {
    // 创建成功
  } else {
    // 创建失败
  }
});
```

```ts
// Error
function getUserByName(name: string, callback: (error: Error | null, data: { id: string, name: string }) => void ): void {
  // ...一系列异步操作
  callback(
    null,
    {
      id: 'a',
      name: '某某某',
    },
  );
}
function createUser(name: string, callback: (error: Error | null) => void) {
  getUserByName(name, function (error, data) {
    if (error === null) {
      // 查询成功
      if (data === null) {
        // 新建用户
        callback(null);
      } else {
        callback(new Error('用户已经存在'));
      }
    } else {
      callback(error);
    }
  })
}
createUser('某某某', function(error: Error | null) {
  if (error === null) {
    // 创建成功
  } else {
    // 创建失败
  }
});
```

```ts
// Promise
function getUserByName(name: string): Promise<{ id: string, name: string }> {
  return new Promise(function (resolve, reject) {
    // ...一系列异步操作
    resolve({
      id: 'a',
      name: '某某某',
    });
  });
}
function createUser(name: string): Promise<null> {
  return getUserByName(name)
    .then(function (data) {
      if (data === null) {
        // 新建用户
        return null;
      } else {
        return Promise.reject(new Error('用户已经存在'));
      }
    });
}
createUser('某某某')
  .then(function () {
    // 创建成功
  })
  .catch(function () {
    // 创建失败
  });
```

```ts
// Async
function todo() {
  // 一系列异步操作
}
async function getUserByName(name: string): Promise<{ id: string, name: string }> {
  await todo();
  return {
    id: 'a',
    name: '某某某',
  };
}
async function createUser(name: string): Promise<null> {
  const data = await  getUserByName(name);
  if (data === null) {
    // 新建用户
    return null;
  } else {
    throw new Error('用户已经存在');
  }
}
(async function () {
  try {
    await createUser('某某某');
    // 创建成功
  } catch(error) {
    // 创建失败
  }
}());
```

### 容易忘记处理异常

```ts
// 下面这段代码有什么问题？
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#Exceptions
function getData() {
  const cache = localStorage.getItem('key');
  if (cache) {
   return JSON.parse(cache);
  }
  return null;
}
console.log(getData());
```

- [在Java的异常处理机制中，什么时候应该抛出异常，什么时候捕获异常？](https://www.zhihu.com/question/25530011)
- [关于异常的争论](https://www.ibm.com/developerworks/cn/java/j-jtp05254/index.html)
- [Suggestion: `throws` clause and typed catch clause](https://github.com/Microsoft/TypeScript/issues/13219)

---

- [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
- [try...catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)
- [Control flow and error handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)

## 参考文献

- [前端开发中的Error以及异常捕获](https://segmentfault.com/a/1190000017708563)
- [Top 10 JavaScript errors from 1000+ projects (and how to avoid them)](https://codeburst.io/top-10-javascript-errors-from-1000-projects-and-how-to-avoid-them-2956ce008437) / https://rollbar.com/blog/top-10-javascript-errors/
- [【第1701期】 JavaScript Errors 指南](https://mp.weixin.qq.com/s/e4_AdSWMxl1BXLfMl-sAgA)
- [Introduction to JavaScript Source Maps](https://www.html5rocks.com/en/tutorials/developertools/sourcemaps/)
- [Debugging Asynchronous JavaScript with Chrome DevTools](https://www.html5rocks.com/en/tutorials/developertools/async-call-stack/)
