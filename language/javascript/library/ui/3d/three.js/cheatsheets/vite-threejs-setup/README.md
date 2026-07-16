# 安装

three.js 入门通常只需要安装 `three` 包，再用 Vite 提供开发服务器和生产构建。这个环境课用最小 renderer 验证浏览器能正常创建 WebGL canvas。

- `Vite`：负责开发服务器、ES Modules 加载和生产构建。
- `three`：通过 npm 安装，入口通常写成 `import * as THREE from 'three'`。
- `WebGLRenderer`：three.js 把 WebGL 画到 canvas 的渲染器。
- `THREE.REVISION`：运行时版本号，用来确认浏览器实际加载的 three.js 版本。
- `chunk size warning`：three.js 体积提示，不代表本课构建失败。
- `antialias`：开启边缘抗锯齿，画面更平滑但会多消耗一点 GPU。
- `renderer.setSize(width, height)`：设置 canvas 的绘制尺寸；本课用固定尺寸验证 renderer 能输出画面。

## 实践

```sh
# 安装依赖，启动开发服务器，再做一次生产构建检查。
cd cheatsheets/vite-threejs-setup
npm install
npm run dev
npm run build
```

浏览器打开终端给出的本地地址，应看到 `THREE.REVISION`、运行检查和一块 three.js canvas。

```js
import * as THREE from 'three';

// 创建 renderer；antialias 让边缘更平滑，alpha: false 表示画布背景不透明。
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});

// width 和 height 是 canvas 的绘制尺寸；背景色用于确认 WebGL 已经清屏成功。
renderer.setSize(640, 360);
renderer.setClearColor('#14213d', 1);
document.body.append(renderer.domElement);

// 先清屏一次，验证 renderer 能正常工作。
renderer.clear();
```

## 参考资料

- [Vite Guide](https://vite.dev/guide/)
- [three.js Manual: Installation](https://threejs.org/manual/#en/installation)
- [three.js Releases](https://github.com/mrdoob/three.js/releases)
