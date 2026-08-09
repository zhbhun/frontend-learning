/**
 * 范例介绍：演示 BitmapText 用预生成字形图集渲染文本——改 text 只重排字形（不重新光栅化），
 * 适合频繁变化的标签（分数、计数器）。实例 fontSize 缩放字形，tint 整体染色。
 * 输入：running（计数器是否跑）、fontSize（字号 = 缩放）、tint（染色）。
 * 主要操作：首次创建实例时 BitmapFont.install 预装 ASCII 字体 → new BitmapText({ style: { fontFamily: 名称 } }) →
 * ticker 每帧 bmp.text = `SCORE ${n}`（只重排字形）→ 运行时改 fontSize / tint。
 * 预期结果：计数器每帧增长、文本流畅刷新（无重新光栅化代价）；调 fontSize 缩放，调 tint 染色；
 * 读数显示 fontFamily、fontSize、tint 与当前文本。
 * 阅读主线：先看顶部预装字体，再看 BitmapText 构造与 anchor，接着看 ticker 改 text，
 * 最后看 dispose 的资源释放与离屏暂停。
 *
 * API 说明：v8 中预装位图字体用 BitmapFont.install({...})（等价 BitmapFontManager.install）；
 * 字符集常量在 BitmapFontManager 上（ASCII / ALPHA / NUMERIC / ALPHANUMERIC）。
 */
import { Application, BitmapFont, BitmapFontManager, BitmapText } from 'pixi.js';

export interface BitmapTextDemoArgs {
  running: boolean;
  fontSize: number;
  tint: string;
}

export interface BitmapTextDemoSnapshot {
  fontFamily: string;
  fontSize: number;
  tint: string;
  text: string;
}

export interface BitmapTextDemoInstance {
  update(args: BitmapTextDemoArgs): void;
  dispose(): void;
}

const FONT_NAME = 'TextDemoBitmap';

// 预装 ASCII 位图字体：glyphs 一次性光栅化进图集并写入全局缓存，后续所有引用该 fontFamily
// 的 BitmapText 共享这组字形；改文本只重排、不重新光栅化。字符集用 BitmapFontManager.ASCII
// （[[' ', '~']]，即完整 ASCII 表）。延迟到首次创建实例时执行，确保在浏览器上下文里运行；
// 用模块级布尔守卫保证只装一次。
let fontInstalled = false;
function ensureFont() {
  if (fontInstalled) {
    return;
  }
  BitmapFont.install({
    name: FONT_NAME,
    style: { fontFamily: 'Arial', fontSize: 32, fill: '#ffffff' },
    chars: BitmapFontManager.ASCII,
    resolution: 2,
  });
  fontInstalled = true;
}

// CSS 颜色字符串 → 0xRRGGBB 数值，喂给 BitmapText 继承自 Container 的 tint。
function tintToNumber(color: string): number {
  return Number.parseInt(color.replace('#', ''), 16);
}

export function createBitmapTextDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BitmapTextDemoSnapshot) => void,
): BitmapTextDemoInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: BitmapTextDemoArgs = { running: true, fontSize: 40, tint: '#fde047' };
  let bmp: BitmapText | null = null;
  let score = 0;

  function applyArgs(args: BitmapTextDemoArgs) {
    if (!bmp) {
      return;
    }
    // 实例 fontSize 会缩放已生成的字形（字体数据不变）；tint 在不改字体数据的前提下染色。
    bmp.style.fontSize = args.fontSize;
    bmp.tint = tintToNumber(args.tint);
  }

  function emitSnapshot() {
    if (!ready || !bmp) {
      return;
    }
    emit({
      fontFamily: String(bmp.style.fontFamily),
      fontSize: bmp.style.fontSize,
      tint: current.tint,
      text: bmp.text,
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
      ensureFont();

      bmp = new BitmapText({
        text: 'SCORE 0',
        style: { fontFamily: FONT_NAME, fontSize: current.fontSize, align: 'center' },
      });
      // BitmapText 的 fill 默认 0xffffff（白），与 TextStyle 默认 'black' 不同；这里用 tint 染色。
      bmp.anchor.set(0.5);
      bmp.tint = tintToNumber(current.tint);
      app.stage.addChild(bmp);

      // 计数器：每帧改 text，演示「改文本只重排字形、无重新光栅化」的廉价更新——BitmapText 的招牌场景。
      app.ticker.add((ticker) => {
        if (!bmp) {
          return;
        }
        if (current.running) {
          score += ticker.deltaTime;
        }
        bmp.text = `SCORE ${Math.floor(score)}`;
        bmp.position.set(app.screen.width / 2, app.screen.height / 2);
        emitSnapshot();
      });

      emitSnapshot();
    })
    .catch(() => {
      // 渲染器初始化失败时画布保持空白。
    });

  // 离屏时暂停渲染循环（连同 ticker 回调）以省 GPU。
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
        // 不在此卸载 BitmapFont：字体是跨实例共享的全局资源，由 PixiJS 统一管理。
        app.destroy();
      }
    },
  };
}
