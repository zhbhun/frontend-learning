/**
 * 范例介绍：演示 Assets 异步加载纹理的完整心智模型——加载是异步的、结果按 key
 * 缓存、同名请求去重返回同一对象。
 * 输入：资源别名（select 切换 bunny / flowerTop / eggHead）。
 * 主要操作：
 *   - 首次选择某别名：Assets.load({alias, src}, onProgress) 触发网络加载，进度回调驱动画布上的进度条；
 *   - 再次切回已加载的别名：Assets.cache.has 命中，Assets.get 同步取出纹理，瞬时显示、无进度条。
 * 预期结果：画布出现该纹理精灵；左下角读数显示「加载中 / 加载完成 / 缓存命中」状态、进度百分比与缓存标记，
 *   切换资源能直观对比「首次加载」与「缓存命中」两种路径。
 * 阅读主线：先看 app.init 与 RESOURCES 注册，再看 loadAlias 里缓存命中分支与异步加载分支，
 *   最后看 onProgress 如何驱动进度条、dispose 如何释放。
 */
import { Application, Assets, Graphics, Sprite, Texture } from 'pixi.js';

export interface AssetsArgs {
  alias: string;
}

export interface AssetsSnapshot {
  state: string; // 加载中 / 加载完成 / 缓存命中 / 加载失败
  alias: string;
  progress: number; // 0–1
  cached: boolean;
}

export interface AssetsInstance {
  update(args: AssetsArgs): void;
  dispose(): void;
}

// 资源注册表：alias → 远端 URL。演示用 PixiJS 官方示例图。
const RESOURCES: Record<string, string> = {
  bunny: 'https://pixijs.com/assets/bunny.png',
  flowerTop: 'https://pixijs.com/assets/flowerTop.png',
  eggHead: 'https://pixijs.com/assets/eggHead.png',
};

export function createAssets(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AssetsSnapshot) => void,
): AssetsInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let currentAlias = 'bunny';
  let sprite: Sprite | null = null;
  let loaderTrack: Graphics | null = null;
  let loaderBar: Graphics | null = null;

  function emitSnapshot(state: string, progress: number) {
    emit({
      state,
      alias: currentAlias,
      progress,
      cached: Assets.cache.has(currentAlias),
    });
  }

  // 进度条贴着精灵下方绘制，进度 0–1。
  function drawProgress(progress: number) {
    if (!loaderTrack || !loaderBar) {
      return;
    }
    const cx = app.screen.width / 2;
    const cy = app.screen.height / 2;
    const trackWidth = Math.min(260, app.screen.width - 80);
    const x = cx - trackWidth / 2;
    const y = cy + Math.min(app.screen.height, app.screen.width) * 0.28;

    loaderTrack.clear();
    loaderTrack
      .roundRect(x - 1, y - 1, trackWidth + 2, 12, 6)
      .stroke({ color: 0x64748b, width: 1 });

    loaderBar.clear();
    if (progress > 0) {
      loaderBar
        .roundRect(x, y, Math.max(8, trackWidth * progress), 10, 5)
        .fill({ color: 0x4f7cff });
    }
  }

  function showLoader(visible: boolean) {
    if (loaderTrack) {
      loaderTrack.visible = visible;
    }
    if (loaderBar) {
      loaderBar.visible = visible;
    }
  }

  // 应用纹理到精灵：首次创建，后续直接换贴图。按画布尺寸自适应缩放并居中。
  function applyTexture(texture: Texture) {
    if (!sprite) {
      sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      app.stage.addChild(sprite);
    } else {
      sprite.texture = texture;
    }

    const target = Math.min(app.screen.width, app.screen.height) * 0.42;
    const maxSrc = Math.max(texture.width, texture.height) || 1;
    const scale = Math.min(4, target / maxSrc); // 小图（如 bunny）允许放大
    sprite.scale.set(scale);
  }

  // 最近一次进度值，供 recenter 重绘进度条时复用。
  let lastProgress = 0;

  function recenter() {
    if (!sprite) {
      return;
    }
    sprite.x = app.screen.width / 2;
    sprite.y = app.screen.height / 2;
    if (loaderTrack && loaderTrack.visible) {
      drawProgress(lastProgress);
    }
  }

  // 核心：按别名加载。缓存命中走同步分支（瞬时），否则走异步加载分支（进度回调）。
  async function loadAlias(alias: string) {
    currentAlias = alias;
    const src = RESOURCES[alias];

    // 缓存命中：Assets.get 同步取出，无需 await、无网络、无进度条。
    if (Assets.cache.has(alias)) {
      const cached = Assets.get<Texture>(alias);
      applyTexture(cached);
      showLoader(false);
      recenter();
      emitSnapshot('缓存命中', 1);
      return;
    }

    // 首次加载：异步，期间用进度条反馈。
    showLoader(true);
    lastProgress = 0;
    drawProgress(0);
    recenter();
    emitSnapshot('加载中', 0);

    try {
      const texture = await Assets.load<Texture>(
        { alias, src },
        (progress) => {
          lastProgress = progress;
          drawProgress(progress);
          // 切换期间可能已改选别的别名，只更新与当前别名一致的读数
          if (currentAlias === alias) {
            emitSnapshot('加载中', progress);
          }
        },
      );

      // 切换竞态：加载完成时若已改选，则不覆盖当前显示
      if (currentAlias === alias) {
        applyTexture(texture);
        showLoader(false);
        recenter();
        emitSnapshot('加载完成', 1);
      }
    } catch {
      if (currentAlias === alias) {
        showLoader(false);
        emitSnapshot('加载失败', 0);
      }
    }
  }

  // v8 启动：异步 init 复用 Storybook 传入的 canvas。
  app
    .init({
      canvas,
      background: '#1a1a2e',
      antialias: true,
      resizeTo: canvas.parentElement ?? window,
    })
    .then(() => {
      if (disposed) {
        app.destroy();
        return;
      }
      ready = true;

      // 进度条两个图层：底框 + 填充条，初始隐藏。
      loaderTrack = new Graphics();
      loaderBar = new Graphics();
      loaderTrack.visible = false;
      loaderBar.visible = false;
      app.stage.addChild(loaderTrack, loaderBar);

      // 每帧重新居中，确保画布尺寸变化时精灵与进度条不会跑偏。
      app.ticker.add(recenter);

      // 首次触发默认别名的加载。
      void loadAlias(currentAlias);
    })
    .catch(() => {
      // 渲染器初始化失败（如缺少 WebGL 支持），画布保持空白。
    });

  // 离屏时暂停渲染循环以省 GPU。
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
      if (!ready) {
        currentAlias = args.alias;
        return;
      }
      if (args.alias !== currentAlias || !sprite) {
        void loadAlias(args.alias);
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
