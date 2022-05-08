# 代码分割

## 基础

### 用法

1. 使用 React.lazy 包装组件
2. 使用 Suspend 来渲染动态组件，并通过 fallback 属性实现加载中效果；
3. 使用 Error boundaries 捕获加载异常；

```js
import React, { Suspense } from 'react';
import MyErrorBoundary from './MyErrorBoundary';

const OtherComponent = React.lazy(() => import('./OtherComponent'));
const AnotherComponent = React.lazy(() => import('./AnotherComponent'));

const MyComponent = () => (
  <div>
    <MyErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <section>
          <OtherComponent />
          <AnotherComponent />
        </section>
      </Suspense>
    </MyErrorBoundary>
  </div>
);
```

### 集成 react-router

```jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./routes/Home'));
const About = lazy(() => import('./routes/About'));

const App = () => (
  <Router>
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Suspense>
  </Router>
```

### 避免闪烁

```js
import React, { Suspense, startTransition } from 'react';
import Tabs from './Tabs';
import Glimmer from './Glimmer';

const Comments = React.lazy(() => import('./Comments'));
const Photos = React.lazy(() => import('./Photos'));

function MyComponent() {
  const [tab, setTab] = React.useState('photos');
  
  function handleTabSelect(tab) {
    startTransition(() => {
      setTab(tab); // 此处代码会告知 React，将标签设置为 'comments'，并非一个紧急更新。而是一个 transition，可能需要一些实际。然后 React 会保留旧的 UI 并进行交互，当它准备好时，会切换为 <Comments />。
    });
  };

  return (
    <div>
      <Tabs onTabSelect={handleTabSelect} />
      <Suspense fallback={<Glimmer />}>
        {tab === 'photos' ? <Photos /> : <Comments />}
      </Suspense>
    </div>
  );
}
```


## 进阶

### [react-loadable](https://github.com/jamiebuilds/react-loadable)

...

### [loadable-components](https://github.com/smooth-code/loadable-components)

- 支持配置加载过渡组件
- 支持加载失败处理；
- 支持加载超时处理；
- 支持加载过渡的延迟渲染，避免组件加载闪烁；
- 支持自定义渲染；
- 支持并发加载多个资源；
- 支持预加载；
- 支持服务端渲染；

## 参考文献

- [代码分割](https://zh-hans.reactjs.org/docs/code-splitting.html)
- [React Loadable 简介](https://zhuanlan.zhihu.com/p/25874892)
