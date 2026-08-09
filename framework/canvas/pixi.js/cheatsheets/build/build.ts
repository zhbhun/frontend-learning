/**
 * 范例介绍：演示 PixiJS v8 的导入与初始化模式——构建打包的「输入」长什么样。
 * 这不是 Canvas 范例（打包结论无法在 Storybook 内稳定复现），而是一个可粘贴到
 * 真实 Vite + TypeScript 项目的参考入口，集中展示本课的几类导入决策。
 *
 * 输入（构建期 / 模块求值期决定）：
 *   - 走默认自动注册，还是 manageImports:false + 手动子路径导入。
 *   - 渲染后端 preference（webgl 兜底 / webgpu）。
 *
 * 主要操作：
 *   - 命名导入 from 'pixi.js'（唯一推荐入口，交给打包器 tree-shake）。
 *   - 异步 app.init()——必须包进 async 函数，不要用顶层 await（Vite ≤ 6.0.6 生产构建会报错）。
 *   - （可选分支）关掉自动注册后，按需 import 'pixi.js/...' 手动选扩展。
 *
 * 预期结果：得到一个挂到 DOM 的 PixiJS 应用；bundle 只含实际导入的能力。
 *
 * 阅读主线：先看「方式 A 默认」与「方式 B 自定义」两段注释对照，再看 bootstrap()
 * 如何把 init / preference / manageImports 串起来，最后看特殊扩展的导入时机。
 */

// ─────────────────────────────────────────────────────────────
// 方式 A：默认自动注册（推荐起点）
// events / text / graphics / mesh / filters / accessibility 等常用扩展
// 在主入口求值时自动注册，开箱即用，代价是 bundle 偏大。
// ─────────────────────────────────────────────────────────────
import { Application, Graphics } from 'pixi.js';

// ─────────────────────────────────────────────────────────────
// 方式 B：自定义打包做最小 bundle
// 把下面整块注释打开，并删掉对默认导入的依赖即可切换。
// manageImports:false 后，只有显式 import 的扩展会注册。
// ─────────────────────────────────────────────────────────────
// // 常用扩展：按实际用到的保留，注释掉不用的
// import 'pixi.js/app';
// import 'pixi.js/events';
// import 'pixi.js/graphics';
// import 'pixi.js/text';
// // 默认不自动注册、用到才加：
// import 'pixi.js/prepare';                 // 预上传纹理到 GPU
// import 'pixi.js/advanced-blend-modes';    // ColorBurn / Overlay 等高级混合
// import { Application, Graphics } from 'pixi.js';

// 特殊扩展：在 init() 之前用 Assets.load 加载位图字体时必须显式导入，
// 否则位图字体加载器还没注册、加载会失败。
// import 'pixi.js/text-bitmap';
// import { Assets } from 'pixi.js';
// await Assets.load('fonts/score.fnt');    // 需要上面这行先注册加载器

export interface BootstrapOptions {
  canvas?: HTMLCanvasElement;
  /** 渲染后端；'webgl'（默认 / 兜底）或 'webgpu'。 */
  preference?: 'webgl' | 'webgpu';
  /** 自定义打包时关掉扩展自动注册，配合上面的手动子路径导入。 */
  manageImports?: boolean;
}

/**
 * 启动一个最小 PixiJS 应用。把这个函数当作真实项目的入口——
 * 注意它被包成 async function 并在外层调用，不用顶层 await。
 */
export async function bootstrap(options: BootstrapOptions = {}) {
  const { canvas, preference = 'webgl', manageImports } = options;

  const app = new Application();
  await app.init({
    canvas,
    width: 800,
    height: 600,
    antialias: true,
    backgroundAlpha: 0,
    preference,
    // 自定义打包时打开；默认不传（true）让扩展系统自动注册
    ...(manageImports === false ? { manageImports: false } : {}),
  });

  // 最小可视化：证明导入与 init 生效
  const box = new Graphics().rect(0, 0, 100, 100).fill({ color: 0x4f7cff });
  app.stage.addChild(box);

  return app;
}

// 真实入口（在 Vite 项目的 main.ts 里）：
//   async function main() {
//     const app = await bootstrap({ canvas: document.querySelector('canvas') });
//     // 用 app.stage 继续搭场景……
//   }
//   void main();   // 不要写成顶层 await
