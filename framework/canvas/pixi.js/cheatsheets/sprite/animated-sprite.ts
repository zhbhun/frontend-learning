/**
 * 范例介绍：演示 AnimatedSprite 怎样按 Texture 帧序列播放逐帧动画，以及动画速度与循环的效果。
 * 输入：animationSpeed（每帧推进倍率）、loop（是否循环）。
 * 主要操作：用 Texture.from 把 8 张离屏画布包成 Texture[] → new AnimatedSprite({ textures,
 * autoUpdate: false }) → 绑定到 app.ticker 驱动 → 运行时改 animationSpeed / loop。
 * 预期结果：一个亮蓝点沿圆周转动的加载动画；调 animationSpeed 改变快慢，关 loop 时播到末帧
 * 停下（playing=false），开 loop 时持续循环；读数显示 currentFrame / totalFrames / playing。
 * 阅读主线：先看 createSpinnerFrames 如何得到帧序列，再看 AnimatedSprite 构造与 anchor / 播放，
 * 接着看 autoUpdate:false 为何绑到 app.ticker，最后看 update 的热更新与 dispose 的资源释放。
 */
import { AnimatedSprite, Application, Texture } from 'pixi.js';

export interface AnimatedSpriteDemoArgs {
  animationSpeed: number;
  loop: boolean;
}

export interface AnimatedSpriteDemoSnapshot {
  currentFrame: number;
  totalFrames: number;
  playing: boolean;
}

export interface AnimatedSpriteDemoInstance {
  update(args: AnimatedSpriteDemoArgs): void;
  dispose(): void;
}

// 生成 8 帧加载动画：每帧亮蓝点转到下一个位置，其余点向后淡出。
// 每帧是内容真正不同的独立图像——这是逐帧动画的典型场景。
function createSpinnerTextures(count = 8): Texture[] {
  const size = 128;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 44;
  const dotRadius = 10;
  const textures: Texture[] = [];

  for (let i = 0; i < count; i += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('当前浏览器不支持 Canvas 2D。');
    }

    for (let j = 0; j < count; j += 1) {
      const angle = (j / count) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      // 距离亮点的步数：0 表示当前帧亮点，越大越淡。
      const steps = (count + i - j) % count;
      const isHead = steps === 0;
      const alpha = isHead ? 1 : Math.max(0.16, 1 - steps * 0.13);

      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = isHead ? '#4f7cff' : `rgba(148, 163, 184, ${alpha})`;
      ctx.fill();
    }

    textures.push(Texture.from(canvas));
  }

  return textures;
}

export function createAnimatedSpriteDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AnimatedSpriteDemoSnapshot) => void,
): AnimatedSpriteDemoInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: AnimatedSpriteDemoArgs = { animationSpeed: 0.2, loop: true };
  let anim: AnimatedSprite | null = null;
  let textures: Texture[] = [];

  function emitSnapshot() {
    if (!ready || !anim) {
      return;
    }
    emit({
      currentFrame: anim.currentFrame,
      totalFrames: anim.totalFrames,
      playing: anim.playing,
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

      textures = createSpinnerTextures(8);

      // autoUpdate 默认 true 会绑定全局 Ticker.shared（与 app.ticker 不是同一个）。
      // 这里设 false，改由 app.ticker 驱动 update，这样离屏 app.stop() 能一并暂停帧推进。
      anim = new AnimatedSprite({
        textures,
        autoPlay: true,
        animationSpeed: current.animationSpeed,
        loop: current.loop,
        autoUpdate: false,
      });
      anim.anchor.set(0.5);
      anim.position.set(app.screen.width / 2, app.screen.height / 2);
      app.stage.addChild(anim);

      // 用应用自己的 ticker 推进逐帧动画，并同步读数与居中位置。
      app.ticker.add((ticker) => {
        if (!anim) {
          return;
        }
        anim.update(ticker);
        anim.x = app.screen.width / 2;
        anim.y = app.screen.height / 2;
        emitSnapshot();
      });
    })
    .catch(() => {
      // 渲染器初始化失败时画布保持空白。
    });

  // 离屏时暂停渲染循环（连同上面的 ticker 回调）以省 GPU。
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
      const wasLoop = current.loop;
      current = args;
      if (!ready || !anim) {
        return;
      }
      anim.animationSpeed = args.animationSpeed;
      anim.loop = args.loop;
      // 关 loop 时播完会停在末帧并停止；重新打开 loop 后主动从首帧续播，让效果可复现。
      if (!wasLoop && args.loop && !anim.playing) {
        anim.gotoAndPlay(0);
      }
      emitSnapshot();
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      if (ready) {
        // 销毁所有帧纹理，释放显存并清理 Texture.from 写入的缓存。
        textures.forEach((t) => t.destroy(true));
        app.destroy();
      }
    },
  };
}
