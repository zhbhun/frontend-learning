/**
 * 范例介绍：演示用 Sprite 作蒙版（按纹理通道采样），并对比 red / alpha 通道的差异。
 *
 * 演示内容：彩色竖条内容被一张程序生成的蒙版纹理裁剪。
 * 输入：采样通道 channel（'red' 红通道 / 'alpha' 透明通道）。
 *
 * 主要操作：用 Graphics 画「红圆 + 蓝矩形」生成纹理，做成 Sprite 蒙版；
 *           update 时 content.setMask({ mask: sprite, channel }) 切换通道。
 *
 * 预期结果（红圆 red=255、蓝矩形 red=0，二者 alpha 都是 255）：
 *   - 选 'red'  → 只有红圆区域露出内容（蓝矩形 red=0 被裁掉）。
 *   - 选 'alpha' → 红圆和蓝矩形都露出内容（二者 alpha 都=255）。
 *
 * 阅读主线：先看 buildMaskTexture 生成「红圆 + 蓝矩形」纹理（红 / alpha 通道有意不同），
 * 再看 applyChannel 按 channel 调 setMask；注意 Sprite 蒙版同样要加入显示列表。
 */
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';

export interface SpriteMaskArgs {
  channel: 'red' | 'alpha';
}

export interface SpriteMaskSnapshot {
  channel: string;
}

export interface SpriteMaskInstance {
  update(args: SpriteMaskArgs): void;
  dispose(): void;
}

const CHANNEL_LABELS: Record<string, string> = {
  red: '红通道 red（默认）',
  alpha: '透明通道 alpha',
};

const BAR_COLORS = [0x4f7cff, 0xff8c42, 0x22c55e, 0xff5a7a, 0xfacc15, 0xa855f7];
const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
} as const;

export function createSpriteMaskDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SpriteMaskSnapshot) => void,
): SpriteMaskInstance {
  const app = new Application();
  let disposed = false;
  let ready = false;
  let current: SpriteMaskArgs = { channel: 'red' };
  let content: Container | null = null;
  let maskSprite: Sprite | null = null;

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
      text: 'SPRITE MASK',
      style: { ...MONO, fontSize: 22, fill: 0xf8fafc, fontWeight: '700' },
    });
    label.anchor.set(0.5);

    const container = new Container();
    container.addChild(g, label);
    return container;
  }

  // 生成蒙版纹理：红圆（red=255, alpha=255）+ 蓝矩形（red=0, alpha=255）。
  // red 通道与 alpha 通道有意不同，切换 channel 时可见区域随之改变。
  function buildMaskTexture(): Sprite {
    const g = new Graphics();
    g.circle(-58, 0, 58).fill(0xff0000); // 纯红：red=255
    g.rect(18, -60, 84, 120).fill(0x0000ff); // 纯蓝：red=0
    const texture = app.renderer.generateTexture(g);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    return sprite;
  }

  function applyChannel(args: SpriteMaskArgs) {
    current = args;
    if (!ready || !content || !maskSprite) {
      return;
    }
    // Sprite 蒙版按通道采样纹理：默认 'red'，靠透明度表达的蒙版图用 'alpha'。
    content.setMask({ mask: maskSprite, channel: args.channel });
    emit({ channel: CHANNEL_LABELS[args.channel] ?? args.channel });
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
      maskSprite = buildMaskTexture(); // 需在 renderer 就绪后生成纹理
      app.stage.addChild(content);
      app.stage.addChild(maskSprite); // Sprite 蒙版同样要加入显示列表

      app.ticker.add(() => {
        const cx = app.screen.width / 2;
        const cy = app.screen.height / 2;
        if (content) {
          content.x = cx;
          content.y = cy;
        }
        if (maskSprite) {
          maskSprite.x = cx;
          maskSprite.y = cy;
        }
      });

      applyChannel(current);
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
      applyChannel(args);
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
