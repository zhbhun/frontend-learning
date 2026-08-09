/**
 * 范例介绍：演示 Text 怎样用 Canvas 2D 光栅化渲染富样式文本，以及 fill / fontSize / align /
 * dropShadow 等 TextStyle 关键属性如何实时影响外观。
 * 输入：fill（填充色）、fontSize（字号）、align（多行对齐）、dropShadow（投影开关）。
 * 主要操作：new Text({ text, style }) 构造 → anchor.set(0.5) 居中 → 整体重赋 style 触发重新光栅化。
 * 预期结果：调 fill 改文字颜色，调 fontSize 改大小，切 align 让三行文本左 / 中 / 右对齐，开 dropShadow
 * 出投影；读数显示 fontFamily、fontSize、align 与 resolution（默认 null = 自动跟随渲染器）。
 * 阅读主线：先看构造与 anchor，再看 applyArgs 如何整体重赋 style（每次重新光栅化一次），
 * 最后看 dispose 的资源释放与离屏暂停。
 */
import { Application, Text } from 'pixi.js';

export interface TextDemoArgs {
  fill: string;
  fontSize: number;
  align: 'left' | 'center' | 'right';
  dropShadow: boolean;
}

export interface TextDemoSnapshot {
  fontFamily: string;
  fontSize: number;
  align: string;
  resolution: string;
}

export interface TextDemoInstance {
  update(args: TextDemoArgs): void;
  dispose(): void;
}

// 三行内容，让 align 的多行对齐效果一目了然；\n 是 Text 的换行符。
const CONTENT = 'PixiJS Text\nCanvas 光栅化\n字号 · 描边 · 投影';

export function createTextDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TextDemoSnapshot) => void,
): TextDemoInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: TextDemoArgs = { fill: '#f8fafc', fontSize: 36, align: 'center', dropShadow: true };
  let text: Text | null = null;

  function applyArgs(args: TextDemoArgs) {
    if (!text) {
      return;
    }
    // 整体重赋 style：Text 每次 text / style 变化都会重新光栅化整张纹理，整体赋值只触发一次。
    text.style = {
      fontFamily: 'Arial',
      fontSize: args.fontSize,
      fill: args.fill,
      align: args.align,
      stroke: { color: '#4f7cff', width: 4 },
      dropShadow: args.dropShadow
        ? { color: '#000000', blur: 4, distance: 6, alpha: 0.6 }
        : null,
      whiteSpace: 'pre',
    };
  }

  function emitSnapshot() {
    if (!ready || !text) {
      return;
    }
    emit({
      fontFamily: String(text.style.fontFamily),
      fontSize: text.style.fontSize,
      align: text.style.align,
      // resolution 默认 null：内部 _autoResolution=true，实际分辨率跟随渲染器。
      resolution: text.resolution == null ? '自动（跟随渲染器）' : String(text.resolution),
    });
  }

  app.init({
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

      text = new Text({ text: CONTENT, style: {} });
      // anchor 默认 (0,0) 是左上角；设 0.5 把锚点移到中心，配合 position 居中显示。
      text.anchor.set(0.5);
      applyArgs(current);
      app.stage.addChild(text);

      // 每帧重新居中（适配画布尺寸）并同步读数。
      app.ticker.add(() => {
        if (!text) {
          return;
        }
        text.position.set(app.screen.width / 2, app.screen.height / 2);
        emitSnapshot();
      });

      emitSnapshot();
    })
    .catch(() => {
      // 渲染器初始化失败时画布保持空白。
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
      current = args;
      if (ready) {
        applyArgs(args);
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
