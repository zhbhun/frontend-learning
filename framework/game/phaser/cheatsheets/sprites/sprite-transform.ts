/**
 * 范例:精灵与图像的定位与变换实验台。
 * 输入:originX/originY(0–1)、scale、angle(度)、flipX/flipY、visible 七个 Controls 参数。
 * 主要操作:调节 Controls,观察红色包围盒(getBounds)、白色十字(position 锚点)
 * 与纹理渲染的相对变化;网格间距 60px,中心参考线交点即 position。
 * 预期结果:position 固定不动;origin/scale/angle 只改变渲染偏移与派生坐标;
 * flip 镜像像素但不改变任何坐标;visible=false 隐藏渲染但派生坐标照常可读;
 * 旋转后 getBounds 变大(轴对齐外接矩形)。
 * 阅读主线:makeMarkerTexture(自包含纹理)→ create(参考网格与对象)
 * → applyTransform(Controls 入口)→ drawOverlay/report(每帧证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的变换参数,运行中修改立即生效。 */
export interface SpriteTransformParams {
  /** 水平原点,0–1,默认 0.5(中心) */
  originX: number;
  /** 垂直原点,0–1,默认 0.5(中心) */
  originY: number;
  /** 等比缩放,setScale(x) 同时作用于两轴 */
  scale: number;
  /** 旋转角,单位度,顺时针为正 */
  angle: number;
  /** 水平翻转(纯渲染开关) */
  flipX: boolean;
  /** 垂直翻转(纯渲染开关) */
  flipY: boolean;
  /** 可见性;false 时跳过渲染但仍处理 update */
  visible: boolean;
}

/** readout 用的派生读数:全部来自对象真实属性与 GetBounds 派生方法。 */
export interface SpriteTransformSnapshot {
  originX: number;
  originY: number;
  displayOriginX: number;
  displayOriginY: number;
  scaleX: number;
  scaleY: number;
  displayWidth: number;
  displayHeight: number;
  angle: number;
  rotation: number;
  topLeft: Phaser.Math.Vector2;
  center: Phaser.Math.Vector2;
  bottomRight: Phaser.Math.Vector2;
  bounds: Phaser.Geom.Rectangle;
  visible: boolean;
}

export interface SpriteTransformInstance {
  applyTransform(params: SpriteTransformParams): void;
  dispose(): void;
}

const MARKER_KEY = 'marker';
const MARKER_SIZE = 96;
/** position 固定在画布中心:所有变换围绕这个不动点展开,证据才好读。 */
const ANCHOR = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };

class TransformScene extends Phaser.Scene {
  private marker?: Phaser.GameObjects.Image;
  /** 每帧重画的证据层:包围盒 + 锚点十字。 */
  private overlay?: Phaser.GameObjects.Graphics;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: SpriteTransformSnapshot) => void = () => {};

  constructor() {
    super({ key: 'SpriteTransform' });
  }

  preload() {
    this.makeMarkerTexture();
  }

  create() {
    this.drawReferenceGrid();

    // 实验对象是静态图:按本课自己的选型结论用 Image(不需要动画)
    this.marker = this.add.image(ANCHOR.x, ANCHOR.y, MARKER_KEY);
    this.overlay = this.add.graphics();

    this.add
      .text(12, GAME_HEIGHT - 20, '红框 = getBounds · 白十字 = position 锚点 · 网格 60px', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#8fa3c8',
      })
      .setOrigin(0, 0.5);

    this.report();
  }

  override update() {
    this.drawOverlay();
    this.report();
  }

  /** Controls 入口:链式 setter 一次性应用全部变换参数。 */
  applyTransform(params: SpriteTransformParams) {
    this.marker
      ?.setOrigin(params.originX, params.originY)
      .setScale(params.scale)
      .setAngle(params.angle)
      .setFlip(params.flipX, params.flipY)
      .setVisible(params.visible);
  }

  private drawOverlay() {
    const marker = this.marker;
    const overlay = this.overlay;
    if (!marker || !overlay) {
      return;
    }

    const bounds = marker.getBounds();
    overlay.clear();

    // 红框:getBounds 轴对齐外接矩形,旋转后可见"外接"效应
    overlay.lineStyle(2, 0xf87171, 1);
    overlay.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // 白十字:position 锚点,不随对象 visible 隐藏,便于观察"隐藏但仍在"
    overlay.lineStyle(2, 0xffffff, 1);
    overlay.lineBetween(marker.x - 10, marker.y, marker.x + 10, marker.y);
    overlay.lineBetween(marker.x, marker.y - 10, marker.x, marker.y + 10);
  }

  private report() {
    const marker = this.marker;
    if (!marker) {
      return;
    }

    this.emitSnapshot({
      originX: marker.originX,
      originY: marker.originY,
      displayOriginX: marker.displayOriginX,
      displayOriginY: marker.displayOriginY,
      scaleX: marker.scaleX,
      scaleY: marker.scaleY,
      displayWidth: marker.displayWidth,
      displayHeight: marker.displayHeight,
      angle: marker.angle,
      rotation: marker.rotation,
      topLeft: marker.getTopLeft(),
      center: marker.getCenter(),
      bottomRight: marker.getBottomRight(),
      bounds: marker.getBounds(),
      visible: marker.visible,
    });
  }

  /** 静态参考:60px 网格 + 经过锚点的中心参考线,让"渲染偏移几格"一眼可读。 */
  private drawReferenceGrid() {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x253048, 1);
    for (let x = 60; x < GAME_WIDTH; x += 60) {
      grid.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 60; y < GAME_HEIGHT; y += 60) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }
    grid.lineStyle(1, 0x3b4a6b, 1);
    grid.lineBetween(ANCHOR.x, 0, ANCHOR.x, GAME_HEIGHT);
    grid.lineBetween(0, ANCHOR.y, GAME_WIDTH, ANCHOR.y);
  }

  /** 自包含素材:方向感纹理(右向箭头 + 左上角标),翻转/旋转肉眼可辨。 */
  private makeMarkerTexture() {
    if (this.textures.exists(MARKER_KEY)) {
      return;
    }
    const g = this.make.graphics();
    g.fillStyle(0x1e293b, 1);
    g.fillRoundedRect(0, 0, MARKER_SIZE, MARKER_SIZE, 10);
    g.lineStyle(3, 0x60a5fa, 1);
    g.strokeRoundedRect(2, 2, MARKER_SIZE - 4, MARKER_SIZE - 4, 8);
    // 右向箭头:给旋转和翻转一个明确的方向参照
    g.fillStyle(0x60a5fa, 1);
    g.fillTriangle(30, 30, 30, 66, 72, 48);
    // 左上角标:标记纹理的"原始左上",翻转后跑到另一侧
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(14, 14, 6);
    g.generateTexture(MARKER_KEY, MARKER_SIZE, MARKER_SIZE);
    g.destroy();
  }
}

export function createSpriteTransform(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SpriteTransformSnapshot) => void,
): SpriteTransformInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new TransformScene();
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [scene],
  });

  scene.emitSnapshot = emit;

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    applyTransform(params: SpriteTransformParams) {
      scene.applyTransform(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
