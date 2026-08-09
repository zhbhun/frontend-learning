/**
 * 范例介绍：用 Application.init 启动 PixiJS，演示异步 init 完成后 canvas、stage、ticker、
 * renderer 同时就绪。
 * 输入：背景色（对应 init 的 background 选项，可在运行时通过 renderer.background.color 修改）。
 * 主要操作：构造 Application → await init → 向 stage 添加旋转图形 → ticker 驱动动画。
 * 预期结果：画布出现彩色旋转图形，读数显示渲染器类型、分辨率与画布尺寸。
 * 阅读主线：先看 app.init 调用与 stage / ticker 用法，再看 update 如何运行时改背景色，
 * 最后看 dispose 的资源释放与离屏暂停。
 */
import { Application, Graphics } from 'pixi.js';

export interface GettingStartedArgs {
  background: string;
}

export interface GettingStartedSnapshot {
  renderer: string;
  resolution: number;
  screen: string;
}

export interface GettingStartedInstance {
  update(args: GettingStartedArgs): void;
  dispose(): void;
}

export function createGettingStarted(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GettingStartedSnapshot) => void,
): GettingStartedInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let currentBg = '#1a1a2e';
  let scene: Graphics | null = null;

  function emitSnapshot() {
    if (!ready) {
      return;
    }

    // 渲染器类名含后端标识，提取为可读标签
    const name = app.renderer.constructor.name;
    let label = name;
    if (name.includes('WebGPU')) {
      label = 'WebGPU';
    } else if (name.includes('WebGL')) {
      label = 'WebGL';
    } else if (name.includes('Canvas')) {
      label = 'Canvas';
    }

    emit({
      renderer: label,
      resolution: app.renderer.resolution,
      screen: `${Math.round(app.screen.width)} × ${Math.round(app.screen.height)}`,
    });
  }

  // v8 的核心启动入口：异步 init 一次性创建渲染器、画布、stage 和 ticker。
  // 复用 Storybook 传入的 canvas，并用 resizeTo 让画布跟随容器尺寸。
  app.init({
    canvas,
    background: currentBg,
    antialias: true,
    resizeTo: canvas.parentElement ?? window,
  })
    .then(() => {
      // init 完成前就被销毁，直接清理
      if (disposed) {
        app.destroy();
        return;
      }
      ready = true;

      // init 后 stage 已就绪——添加旋转图形，证明渲染循环已自动开始
      scene = new Graphics();
      scene.circle(0, 0, 56).fill({ color: 0x4fc3f7 });
      scene.star(0, 0, 5, 36, 15).fill({ color: 0xffd54f });
      app.stage.addChild(scene);

      // 应用 init 期间到达的背景色变更
      app.renderer.background.color = currentBg;

      // autoStart 默认 true，ticker 已自动开始；这里只注册逐帧回调。
      // 每帧重新居中，确保画布尺寸变化时图形不会跑偏。
      app.ticker.add(() => {
        if (!scene) {
          return;
        }
        scene.rotation += 0.02;
        scene.x = app.screen.width / 2;
        scene.y = app.screen.height / 2;
      });

      emitSnapshot();
    })
    .catch(() => {
      // 渲染器初始化失败（如缺少 WebGL 支持），画布保持空白
    });

  // 离屏时暂停渲染循环以省 GPU
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!ready) {
        return;
      }
      const visible = entries.at(-1)?.isIntersecting ?? false;
      if (visible) {
        app.start();
      } else {
        app.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas.parentElement ?? canvas);

  return {
    update(args) {
      currentBg = args.background;
      if (ready) {
        // background 选项的运行时入口在 renderer.background.color
        app.renderer.background.color = args.background;
        emitSnapshot();
      }
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      if (ready) {
        app.destroy();
      }
    },
  };
}
