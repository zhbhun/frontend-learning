/**
 * 范例：SpriteManager + Sprite 批量渲染广告牌图标。
 * 输入：
 *   - count：活跃 Sprite 数量（1..48）。
 *   - cellIndex：图集分格索引（0..3），切换所有 Sprite 显示的图标。
 *   - size：Sprite 的世界尺寸（写入 sprite.size，同步 width 与 height）。
 *   - autoRotate：相机是否自动绕 target 轨道，便于观察「始终面向相机」。
 * 主要操作：
 *   - makeIconAtlas 用 DynamicTexture 程序化绘制 256×256 的 2×2 图集（4 格），
 *     避免依赖远程贴图（headless / 离线会失败）。
 *   - new SpriteManager(name, '', capacity, cellSize, scene)：imgUrl 传空串跳过远程加载，
 *     再把 manager.texture 指向这张 DynamicTexture。
 *   - 用 count 增删 Sprite（new Sprite(name, manager) / sprite.dispose()），cellIndex 与 size
 *     实时写入每个 Sprite；autoRotate 时每帧推进 camera.alpha。
 * 预期结果：拖动相机或开启自转，所有 Sprite 始终正面朝向观察者；切换 cellIndex 立即换图标。
 * 阅读主线：makeIconAtlas → createSpriteExample 内的 SpriteManager 与 Sprite 创建 → onBeforeRenderObservable 回调。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DynamicTexture,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Sprite,
  SpriteManager,
  Texture,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

// 图集规格：256×256 贴图，2×2 共 4 格，每格 128 像素。
const ATLAS_SIZE = 256;
const CELL_PIXEL = 128;
const ATLAS_COLS = ATLAS_SIZE / CELL_PIXEL; // 2
const ICON_COUNT = ATLAS_COLS * ATLAS_COLS; // 4

// SpriteManager 容量与网格布局。
const CAPACITY = 64; // manager 一次性预分配的最大 Sprite 数
const GRID_COLS = 8; // 8 × 6 = 48 个网格位置，小于 CAPACITY
const GRID_ROWS = 6;
const MAX_COUNT = GRID_COLS * GRID_ROWS;
const SPACING = 2;
const SPRITE_Y = 1; // 悬浮在地面上方

export interface SpriteExampleOptions {
  count: number;
  cellIndex: number;
  size: number;
  autoRotate: boolean;
}

export interface SpriteExampleSnapshot {
  spriteCount: number;
  cellIndex: number;
  capacity: number;
  cellPixel: number;
  fps: number;
}

export interface SpriteExampleInstance {
  update(options: SpriteExampleOptions): void;
  dispose(): void;
}

// 4 格图标的形状与颜色，按下标对应 cellIndex。
const ICON_DEFS: Array<{ shape: 'circle' | 'square' | 'triangle' | 'star'; color: string }> = [
  { shape: 'circle', color: '#e23c4d' },
  { shape: 'square', color: '#3ca45a' },
  { shape: 'triangle', color: '#3d6fd6' },
  { shape: 'star', color: '#e0a82e' },
];

// 在 DynamicTexture 上画 2×2 共 4 个图标分格，返回这张图集。
// 程序化生成是为了避开远程贴图依赖（headless / 离线运行不会失败）。
function makeIconAtlas(scene: Scene): DynamicTexture {
  const tex = new DynamicTexture(
    'spriteAtlas',
    { width: ATLAS_SIZE, height: ATLAS_SIZE },
    scene,
    false,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  tex.hasAlpha = true;
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

  ICON_DEFS.forEach((icon, i) => {
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    drawIcon(ctx, col * CELL_PIXEL, row * CELL_PIXEL, CELL_PIXEL, icon.shape, icon.color);
  });

  tex.update();
  return tex;
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  size: number,
  shape: 'circle' | 'square' | 'triangle' | 'star',
  color: string,
) {
  const cx = ox + size / 2;
  const cy = oy + size / 2;
  const r = size * 0.36;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = size * 0.07;
  ctx.lineJoin = 'round';
  ctx.beginPath();

  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case 'square':
      roundRectPath(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.28);
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.92, cy + r * 0.72);
      ctx.lineTo(cx - r * 0.92, cy + r * 0.72);
      ctx.closePath();
      break;
    case 'star':
      starPath(ctx, cx, cy, 5, r, r * 0.46);
      break;
  }

  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, points: number, outer: number, inner: number) {
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

// 把索引 i 映射到网格里居中分布的世界坐标；Sprite 悬浮在地面之上。
function gridPosition(i: number, out: Vector3): void {
  const col = i % GRID_COLS;
  const row = Math.floor(i / GRID_COLS);
  out.set(
    (col - (GRID_COLS - 1) / 2) * SPACING,
    SPRITE_Y,
    (row - (GRID_ROWS - 1) / 2) * SPACING,
  );
}

// 同步本地 sprites 数组与 manager.sprites：增删 Sprite，再写入 cellIndex / size。
function syncSprites(manager: SpriteManager, sprites: Sprite[], opts: SpriteExampleOptions): void {
  const desired = Math.max(1, Math.min(MAX_COUNT, Math.round(opts.count)));

  while (sprites.length < desired) {
    // new Sprite 自动 push 进 manager.sprites；构造只接收 name 与 manager。
    const s = new Sprite(`sprite-${sprites.length}`, manager);
    const pos = new Vector3();
    gridPosition(sprites.length, pos);
    s.position.copyFrom(pos);
    sprites.push(s);
  }
  while (sprites.length > desired) {
    const removed = sprites.pop();
    removed?.dispose(); // dispose 会从 manager.sprites 里移除
  }

  const cellIndex = Math.max(0, Math.min(ICON_COUNT - 1, Math.round(opts.cellIndex)));
  for (const s of sprites) {
    s.cellIndex = cellIndex; // 图集分格索引
    s.size = opts.size; // setter 同步 width 与 height（世界单位）
  }
}

export function createSpriteExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SpriteExampleSnapshot) => void,
): SpriteExampleInstance {
  let current: SpriteExampleOptions = {
    count: 16,
    cellIndex: 0,
    size: 1,
    autoRotate: true,
  };

  // 把需要在 update / 帧回调里共享的对象收进一个可变 holder，避免闭包失效。
  const holder: {
    manager: SpriteManager | null;
    sprites: Sprite[];
    camera: ArcRotateCamera | null;
    azimuth: number;
    wasAuto: boolean;
  } = { manager: null, sprites: [], camera: null, azimuth: -Math.PI / 2, wasAuto: false };

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    // ArcRotateCamera：绕 target 的轨道相机，attachControl 后可鼠标拖拽 / 滚轮缩放。
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2.4,
      18,
      new Vector3(0, SPRITE_Y, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);
    holder.camera = camera;

    // 半球光：Sprite 不参与光照，但地面 StandardMaterial 需要光才可见。
    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 地面：给相机轨道提供透视参考，能看出 Sprite「悬浮在世界里」。
    const ground = MeshBuilder.CreateGround('ground', { width: 22, height: 22, subdivisions: 1 }, scene);
    const gMat = new StandardMaterial('groundMat', scene);
    gMat.diffuseColor = new Color3(0.82, 0.86, 0.82);
    gMat.specularColor = new Color3(0.08, 0.08, 0.08);
    ground.material = gMat;

    // SpriteManager：imgUrl 传空串跳过远程加载，再手动赋程序化图集。
    // cellSize 用像素数（128），与图集每格像素一致；capacity 预分配最大 Sprite 数。
    const manager = new SpriteManager('spriteManager', '', CAPACITY, CELL_PIXEL, scene);
    manager.texture = makeIconAtlas(scene); // 程序化 DynamicTexture，避开远程 URL
    holder.manager = manager;

    // 首次按 current 创建 Sprite。
    syncSprites(manager, holder.sprites, current);

    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;

      // autoRotate：每帧推进 alpha，相机绕 target 公转；切换开关时从当前 alpha 续上。
      if (current.autoRotate) {
        if (!holder.wasAuto) {
          holder.azimuth = camera.alpha;
          holder.wasAuto = true;
        }
        holder.azimuth += dt * 0.35;
        camera.alpha = holder.azimuth;
      } else {
        holder.wasAuto = false;
      }

      emit({
        spriteCount: holder.sprites.length,
        cellIndex: Math.max(0, Math.min(ICON_COUNT - 1, Math.round(current.cellIndex))),
        capacity: manager.capacity,
        cellPixel: manager.cellWidth,
        fps: Math.round(1000 / Math.max(engine.getDeltaTime(), 1)),
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      if (holder.manager) {
        syncSprites(holder.manager, holder.sprites, options);
      }
    },
    dispose() {
      runtime.dispose();
    },
  };
}
