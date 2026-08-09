/**
 * 范例介绍：演示 NineSliceSprite 的九宫格拉伸——把一张纹理切成 3×3 共九块，
 * 四角不缩放、上下边水平拉伸、左右边垂直拉伸、中心双向填充。
 * 输入：width 与 height（面板目标尺寸）。
 * 主要操作：用 Texture.from 把程序生成的面板画布包成 Texture →
 * new NineSliceSprite({ texture, leftWidth, rightWidth, topHeight, bottomHeight, anchor }) →
 * 运行时 setSize(w, h) 触发顶点与 UV 重算。
 * 预期结果：拖动宽 / 高时面板尺寸变化，但四个彩色角块（白圆点）尺寸始终一致、
 * 圆形不变形——证明九宫格只拉伸中部、保护边角。
 * 阅读主线：先看 createPanelTexture 如何标注九块区域（四角圆点 / 边块条纹 / 中心点阵），
 * 再看构造 options 的四条边宽，最后看 update 的热更与 dispose 的资源释放、离屏暂停。
 */
import { Application, NineSliceSprite, Texture } from 'pixi.js';

export interface NineSliceArgs {
  width: number;
  height: number;
}

export interface NineSliceSnapshot {
  width: number;
  height: number;
  source: string;
  border: string;
}

export interface NineSliceInstance {
  update(args: NineSliceArgs): void;
  dispose(): void;
}

// 纹理原边长与四条边宽：决定九块区域怎么切。
const SRC = 160;
const BORDER = 40;

// 生成九宫格演示纹理：把九块区域的特征画出来，拉伸后能一眼看出每块的缩放规则。
function createPanelTexture(): Texture {
  const cnv = document.createElement('canvas');
  cnv.width = SRC;
  cnv.height = SRC;
  const ctx = cnv.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  // 中心区底色（中心块会双向拉伸）。
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, SRC, SRC);

  // 四角：彩色方块 + 白色圆点。拉伸后圆点保持正圆，即证明角块未被缩放。
  const corners: Array<[number, number, string]> = [
    [0, 0, '#ef4444'], // 左上 红
    [SRC - BORDER, 0, '#22c55e'], // 右上 绿
    [0, SRC - BORDER, '#3b82f6'], // 左下 蓝
    [SRC - BORDER, SRC - BORDER, '#eab308'], // 右下 黄
  ];
  for (const [x, y, color] of corners) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, BORDER, BORDER);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + BORDER / 2, y + BORDER / 2, BORDER / 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 上、下边块：竖条纹；水平拉伸时条纹间距被拉开。
  ctx.fillStyle = '#64748b';
  for (let x = BORDER + 4; x < SRC - BORDER; x += 8) {
    ctx.fillRect(x, 6, 2, BORDER - 12);
    ctx.fillRect(x, SRC - BORDER + 6, 2, BORDER - 12);
  }
  // 左、右边块：横条纹；垂直拉伸时条纹间距被拉开。
  for (let y = BORDER + 4; y < SRC - BORDER; y += 8) {
    ctx.fillRect(6, y, BORDER - 12, 2);
    ctx.fillRect(SRC - BORDER + 6, y, BORDER - 12, 2);
  }

  // 中心块：点阵；双向拉伸后点距变大，证明中心填充了多出来的空间。
  ctx.fillStyle = '#94a3b8';
  for (let x = BORDER + 10; x < SRC - BORDER; x += 14) {
    for (let y = BORDER + 10; y < SRC - BORDER; y += 14) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return Texture.from(cnv);
}

export function createNineSliceDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: NineSliceSnapshot) => void,
): NineSliceInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: NineSliceArgs = { width: 360, height: 240 };
  let panel: NineSliceSprite | null = null;
  let texture: Texture | null = null;

  function applyArgs(args: NineSliceArgs) {
    if (!panel) {
      return;
    }
    // 设置 width/height 会重算顶点与 UV：四角不缩放，中部按规则填充。
    panel.setSize(args.width, args.height);
    panel.x = app.screen.width / 2;
    panel.y = app.screen.height / 2;
  }

  function emitSnapshot() {
    if (!ready) {
      return;
    }
    emit({
      width: current.width,
      height: current.height,
      source: `${SRC} × ${SRC}`,
      border: `${BORDER}px`,
    });
  }

  app
    .init({
      canvas,
      background: '#0b1120',
      antialias: true,
      resizeTo: canvas.parentElement ?? window,
    })
    .then(() => {
      if (disposed) {
        app.destroy();
        return;
      }
      ready = true;

      texture = createPanelTexture();
      // 九宫格：四条边宽决定哪些区域不缩放。
      panel = new NineSliceSprite({
        texture,
        leftWidth: BORDER,
        rightWidth: BORDER,
        topHeight: BORDER,
        bottomHeight: BORDER,
        // anchor 0.5 让面板从中心向外扩展，改尺寸时居中可见。
        anchor: 0.5,
      });
      app.stage.addChild(panel);
      applyArgs(current);

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
        texture?.destroy(true);
        app.destroy();
      }
    },
  };
}
