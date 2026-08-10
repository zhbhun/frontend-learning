/**
 * 演示内容：@leafer-in/scroll 滚动条 —— 大画布内容超出视口时自动出现滚动条，拖动滑块浏览内容。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *           本课公开输入：主题 theme（light/dark/custom 自定义样式）、画布内边距 padding、内容尺寸 contentScale。
 * 主要操作：new App({ view: canvas, tree: {}, sky: {} }) 复用传入的 <canvas>，显式声明 tree/sky 分层；
 *           在 app.tree 放一个超出视口的坐标网格（按 contentScale 整体缩放），在 app.sky 放固定提示文字；
 *           new ScrollBar(app, { theme, padding }) 把滚动条挂到 app —— 构造时自动加入 sky 层、监视 tree 层内容。
 *           拖动滚动条滑块 → ScrollBar 内部对 app.tree 调 moveWorld 平移内容 → 网格在视口里滑动；
 *           readout 读出：内容范围(scrollBounds)、视口尺寸、缩略比(ratioX/ratioY，<1 表示该轴出现滚动条)、视图偏移(app.tree.x/y)。
 * 预期结果：contentScale=1 时坐标网格(约 1360×680)大于视口，X/Y 滚动条都出现；拖动滑块，视图偏移随平移变化、滑块位置同步；
 *           把 contentScale 调小到内容小于视口时，ratioX/ratioY ≥ 1，对应方向的滚动条自动隐藏。
 * 阅读主线：createScroll → App/分层/坐标网格/提示 构造 → new ScrollBar(app, config) → report 派发读数 → update 同步主题/内边距/尺寸 → dispose 销毁。
 */
import { App, Group, Rect, Text, Star } from 'leafer-ui';
import { ScrollBar } from '@leafer-in/scroll';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ScrollThemeType = 'light' | 'dark' | 'custom';

export interface ScrollOptions {
  /** 滚动条主题：light/dark 为内置配色，custom 传自定义 IBoxInputData 样式。 */
  theme: ScrollThemeType;
  /** 滚动条轨道距画布边缘的内边距（fourNumber）。 */
  padding: number;
  /** 坐标网格的整体缩放，用来演示「内容超出/小于视口 → 滚动条出现/消失」。 */
  contentScale: number;
}

export interface ScrollSnapshot {
  /** 内容在世界坐标系下的包围盒宽 × 高（滚动可及的全部内容范围）。 */
  contentRange: string;
  /** 视口（canvas）的宽 × 高。 */
  viewport: string;
  /** 滑块占比：ratio < 1 该轴出现滚动条，≥ 1 该轴隐藏。 */
  ratio: string;
  /** app.tree 的当前平移偏移，即「滚到了哪里」。 */
  offset: string;
}

export interface ScrollInstance {
  update(options: ScrollOptions): void;
  dispose(): void;
}

// 三套主题对应的画布底色：暗主题配深底、自定义主题配浅绿底，让滑块颜色看得清。
const APP_FILL: Record<ScrollThemeType, string> = {
  light: '#f8fafc',
  dark: '#0f172a',
  custom: '#f0fdf4',
};

const TILE_COLORS = ['#dbeafe', '#bfdbfe', '#bbf7d0', '#fde68a', '#fecaca', '#e9d5ff'];

// 把控件里的主题选项映射成 ScrollBar 接受的 theme 值：custom 用自定义 IBoxInputData 样式对象。
function resolveTheme(theme: ScrollThemeType) {
  if (theme === 'custom') {
    return { fill: '#22c55e', stroke: 'rgba(255,255,255,0.85)' };
  }
  return theme;
}

export function createScroll(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ScrollSnapshot) => void,
): ScrollInstance {
  let current: ScrollOptions = { theme: 'light', padding: 0, contentScale: 1 };

  const initial = readCanvasSize(canvas);
  // App 只有在 config 里给出 tree/sky（或 editor）时才会创建这两个分层；
  // 滚动条要加入 sky、要监视 tree，所以这里显式声明 tree: {} 与 sky: {}。
  const app = new App({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: APP_FILL.light,
    tree: {},
    sky: {},
  });

  // 提示文字放在 sky 层（覆盖层），不随 tree 内容一起滚动，始终钉在视口左上角。
  const hint = new Text({
    text: '拖动右侧 / 下侧滚动条滑块浏览大画布',
    fontSize: 14,
    fontWeight: 600,
    fill: '#475569',
    hittable: false,
  });
  app.sky.add(hint);

  // 坐标网格：6 列 × 4 行的瓦片，每片标出它的 (列,行) 与世界坐标，超出视口才能滚动。
  const content = new Group();
  const cols = 6;
  const rows = 4;
  const tileW = 200;
  const tileH = 140;
  const gap = 20;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * (tileW + gap);
      const y = row * (tileH + gap);
      const tile = new Group({ x, y });
      tile.add(
        new Rect({
          width: tileW,
          height: tileH,
          fill: TILE_COLORS[(row + col) % TILE_COLORS.length],
          stroke: 'rgba(79,124,201,0.35)',
          strokeWidth: 1,
          cornerRadius: 10,
          hittable: false,
        }),
      );
      tile.add(
        new Text({
          text: `${col}, ${row}`,
          x: 16,
          y: 14,
          fontSize: 22,
          fontWeight: 700,
          fill: '#1e3a8a',
          hittable: false,
        }),
      );
      tile.add(
        new Text({
          text: `x=${x}  y=${y}`,
          x: 16,
          y: 46,
          fontSize: 13,
          fill: '#475569',
          hittable: false,
        }),
      );
      content.add(tile);
    }
  }
  // 在右下角放一个醒目的星形，既延伸内容范围，也作为「滚到底」的视觉地标。
  content.add(
    new Star({
      x: cols * (tileW + gap) + 60,
      y: rows * (tileH + gap) + 40,
      width: 90,
      height: 90,
      around: 'center',
      corners: 5,
      innerRadius: 0.42,
      fill: '#f97316',
      stroke: '#7c2d12',
      strokeWidth: 2,
      hittable: false,
    }),
  );
  content.scaleX = current.contentScale;
  content.scaleY = current.contentScale;
  app.tree.add(content);

  // 滚动条：传 App 时构造函数自动把它加入 sky 层、把 target 设为 tree 层来监视内容范围。
  const scroll = new ScrollBar(app, {
    theme: resolveTheme(current.theme),
    padding: current.padding,
  });

  function report() {
    const size = readCanvasSize(canvas);
    const bounds = scroll.scrollBounds;
    const rx = scroll.ratioX ?? 1;
    const ry = scroll.ratioY ?? 1;
    // app.tree.x/y 是 tree 层相对画布的平移：滚动条拖动时 moveWorld 改的就是它，即「滚到了哪里」。
    const ox = Math.round(app.tree.x ?? 0);
    const oy = Math.round(app.tree.y ?? 0);

    emit({
      contentRange: bounds
        ? `${Math.round(bounds.width)} × ${Math.round(bounds.height)}`
        : '—',
      viewport: `${size.width} × ${size.height}`,
      ratio: `X ${rx.toFixed(2)} · Y ${ry.toFixed(2)}`,
      offset: `${ox}, ${oy}`,
    });
  }

  // 读数用轻量定时轮询：ScrollBar 在 render.before 重算 ratio/scrollBounds，内容平移改 tree.x/y；
  // canvasStory 的 emit 有 100ms 节流，轮询能保证「内容就绪后」和「拖动滑块过程中」读数都刷新到最新值。
  const readoutTimer = globalThis.setInterval(report, 150);

  function layout() {
    const size = readCanvasSize(canvas);
    app.resize({ width: size.width, height: size.height });
    hint.set({ x: 20, y: 16 });
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    layout();
    report();
  });

  layout();
  // 首帧后强制刷新一次滚动条并报初始读数；定时轮询随后持续同步。
  requestAnimationFrame(() => {
    scroll.update();
    report();
  });

  return {
    update(options) {
      current = options;

      // 主题变化：同步画布底色 + ScrollBar 主题（changeTheme 内部会触发 update 重算滑块样式）。
      app.fill = APP_FILL[options.theme];
      scroll.changeTheme(resolveTheme(options.theme));

      // 内边距变化：写回 config 再手动 update（运行时改 config 不会自动刷新）。
      scroll.config.padding = options.padding;
      scroll.update();

      // 内容尺寸变化：缩放坐标网格，worldRenderBounds 随之改变，下一帧 render.before 自动重算滚动条。
      content.scaleX = options.contentScale;
      content.scaleY = options.contentScale;

      report();
    },
    dispose() {
      globalThis.clearInterval(readoutTimer);
      resizeObserver.disconnect();
      scroll.destroy();
      app.destroy();
    },
  };
}
