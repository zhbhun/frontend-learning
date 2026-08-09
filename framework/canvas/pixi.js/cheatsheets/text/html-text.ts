/**
 * 范例介绍：演示 HTMLText 用 SVG foreignObject 渲染 HTML/CSS，支持标签、内联样式与 emoji；
 * 在「内联样式」与「HTML 标签」两段内容间切换，可观察标签解析与重新光栅化。
 * 输入：mode（内联样式 / HTML 标签）、align（多行对齐）。
 * 主要操作：new HTMLText({ text, style }) 构造 → text 含 <b>/<i>/<span style>/<br/> 与 emoji →
 * 运行时改 text（重新解析 + 重新光栅化）与 style.align。
 * 预期结果：内联样式模式每段不同颜色 / 字号；HTML 标签模式显示粗体 / 斜体 / 下划线 + emoji；
 * 切 align 让多行文本对齐；读数显示模式、对齐与字体。
 * 阅读主线：先看 RICH_INLINE / RICH_TAGS 两段内容，再看 HTMLText 构造与 anchor，
 * 接着看 applyArgs 改 text / style，最后看 dispose。
 */
import { Application, HTMLText } from 'pixi.js';

export interface HtmlTextDemoArgs {
  mode: 'inline' | 'tags';
  align: 'left' | 'center' | 'right';
}

export interface HtmlTextDemoSnapshot {
  mode: string;
  align: string;
  fontFamily: string;
}

export interface HtmlTextDemoInstance {
  update(args: HtmlTextDemoArgs): void;
  dispose(): void;
}

// 内联样式：每段 span 用 style 属性套不同颜色 / 字号——这是 HTMLText 区别于 Text 的招牌能力。
const RICH_INLINE =
  '<span style="color:#f87171">内联</span> ' +
  '<span style="color:#4f7cff">样式</span> 控制每段外观 ' +
  '<span style="font-size:48px">大字</span>';

// HTML 标签：<b>/<i>/<u> + <br/> 换行 + emoji；HTMLText 始终按 HTML 解析这些标记。
const RICH_TAGS =
  '<b>粗体</b> · <i>斜体</i> · <u>下划线</u><br/>支持 emoji 🎮 ✨ 与普通文本';

export function createHtmlTextDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: HtmlTextDemoSnapshot) => void,
): HtmlTextDemoInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: HtmlTextDemoArgs = { mode: 'inline', align: 'center' };
  let html: HTMLText | null = null;

  function applyArgs(args: HtmlTextDemoArgs) {
    if (!html) {
      return;
    }
    // 改 text 会重新解析 HTML 并重新光栅化；改 style.align 同样触发更新。
    html.text = args.mode === 'inline' ? RICH_INLINE : RICH_TAGS;
    html.style.align = args.align;
  }

  function emitSnapshot() {
    if (!ready || !html) {
      return;
    }
    emit({
      mode: current.mode === 'inline' ? '内联样式' : 'HTML 标签',
      align: html.style.align,
      fontFamily: String(html.style.fontFamily),
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

      html = new HTMLText({
        text: RICH_INLINE,
        style: {
          fontFamily: 'Arial',
          fontSize: 30,
          fill: '#e2e8f0',
          align: current.align,
          wordWrap: true,
          wordWrapWidth: 520,
        },
      });
      html.anchor.set(0.5);
      html.position.set(app.screen.width / 2, app.screen.height / 2);
      app.stage.addChild(html);

      // 每帧重新居中，适配画布尺寸。
      app.ticker.add(() => {
        if (!html) {
          return;
        }
        html.position.set(app.screen.width / 2, app.screen.height / 2);
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
