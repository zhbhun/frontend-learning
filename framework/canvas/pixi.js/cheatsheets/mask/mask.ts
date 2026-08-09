/**
 * 范例介绍：演示如何用 Graphics 作蒙版裁剪显示内容，以及 inverse 反向（抠洞）与移除。
 *
 * 演示内容：一整片彩色竖条 + 居中标签作为「被裁剪的内容」，用一个 Graphics 形状作蒙版。
 * 输入：蒙版形状（circle / roundRect / star）、是否反向 inverse、是否启用 enabled。
 *
 * 主要操作：update 时按形状重画 maskGfx；
 *           enabled 为真则 content.setMask({ mask, inverse })，否则 setMask({ mask: null }) 移除。
 *
 * 预期结果：
 *   - 切「蒙版形状」→ 内容只在所选形状（圆 / 圆角矩形 / 星）内可见。
 *   - 开「反向 inverse」→ 形状内变透明、形状外露出彩色竖条（抠洞）。
 *   - 关「启用蒙版」→ 蒙版移除，整片内容完整显示。
 *
 * 阅读主线：先看 buildContent 构造被裁剪的彩色内容，
 * 再看 drawMask 按形状画蒙版、applyMask 调 setMask 配置（含 inverse）或移除，
 * 注意 init 里 maskGfx 被 addChild 到 stage——蒙版必须加入显示列表才生效（本身不渲染像素）。
 */
import { Application, Container, Graphics, Text } from 'pixi.js';

export interface MaskDemoArgs {
  shape: string;
  inverse: boolean;
  enabled: boolean;
}

export interface MaskDemoSnapshot {
  shape: string;
  inverse: boolean;
  enabled: boolean;
}

export interface MaskDemoInstance {
  update(args: MaskDemoArgs): void;
  dispose(): void;
}

const SHAPE_LABELS: Record<string, string> = {
  circle: '圆形 circle',
  roundRect: '圆角矩形 roundRect',
  star: '星形 star',
};

const BAR_COLORS = [0x4f7cff, 0xff8c42, 0x22c55e, 0xff5a7a, 0xfacc15, 0xa855f7];
const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
} as const;

export function createMaskDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MaskDemoSnapshot) => void,
): MaskDemoInstance {
  const app = new Application();
  let disposed = false;
  let ready = false;
  let current: MaskDemoArgs = { shape: 'circle', inverse: false, enabled: true };
  let content: Container | null = null;
  let maskGfx: Graphics | null = null;

  // 构造「被裁剪的内容」：彩色竖条 + 居中标签，画在以 (0,0) 为中心的局部坐标。
  // 内容做得比蒙版大、且铺满中心区，使形状裁剪与反向（抠洞）效果都直观。
  function buildContent(): Container {
    const g = new Graphics();
    const barW = 40;
    const totalW = 520;
    const h = 300;
    const count = Math.ceil(totalW / barW);
    for (let i = 0; i < count; i += 1) {
      g.rect(-totalW / 2 + i * barW, -h / 2, barW, h).fill(
        BAR_COLORS[i % BAR_COLORS.length],
      );
    }

    const label = new Text({
      text: 'MASK',
      style: { ...MONO, fontSize: 26, fill: 0xf8fafc, fontWeight: '700' },
    });
    label.anchor.set(0.5);

    const container = new Container();
    container.addChild(g, label);
    return container;
  }

  // 按选中形状重画蒙版几何。蒙版的填充色不影响裁剪结果，只要有填充即可。
  function drawMask(g: Graphics, shape: string) {
    g.clear();
    const r = 96;
    switch (shape) {
      case 'roundRect':
        g.roundRect(-r, -r * 0.78, r * 2, r * 1.56, 30);
        break;
      case 'star':
        g.star(0, 0, 5, r, r * 0.45);
        break;
      case 'circle':
      default:
        g.circle(0, 0, r);
        break;
    }
    g.fill(0xffffff);
  }

  function applyMask(args: MaskDemoArgs) {
    current = args;
    if (!ready || !content || !maskGfx) {
      return;
    }
    // setMask 比 mask 属性多了 inverse / channel 两个选项；mask:null 移除蒙版。
    if (args.enabled) {
      drawMask(maskGfx, args.shape);
      content.setMask({ mask: maskGfx, inverse: args.inverse });
    } else {
      content.setMask({ mask: null });
      maskGfx.clear(); // 清空，避免作为普通显示对象画出白色形状
    }
    emit({
      shape: SHAPE_LABELS[args.shape] ?? args.shape,
      inverse: args.inverse,
      enabled: args.enabled,
    });
  }

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
      content = buildContent();
      maskGfx = new Graphics();
      app.stage.addChild(content);
      // 关键：蒙版对象本身不渲染像素，但必须加入显示列表才会生效。
      app.stage.addChild(maskGfx);

      // 内容与蒙版都居中、随画布尺寸同步定位，保证裁剪区始终落在画面中央。
      app.ticker.add(() => {
        const cx = app.screen.width / 2;
        const cy = app.screen.height / 2;
        if (content) {
          content.x = cx;
          content.y = cy;
        }
        if (maskGfx) {
          maskGfx.x = cx;
          maskGfx.y = cy;
        }
      });

      applyMask(current);
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
      applyMask(args);
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
