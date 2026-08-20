/**
 * 范例:摄像机实验台——在一个 2×2 屏的世界里,scroll / bounds / follow / zoom
 * 怎样共同决定摄像机看到什么。
 * 输入(Controls):follow(跟随开/关)、lerp(平滑插值 0–1)、
 * deadzone(死区开/关)、zoom(0.5–2 显示缩放)、useBounds(边界开/关)。
 * 主要操作:菱形目标沿蓝色虚线框路径自动巡航;按住目标拖拽可摆到任意位置
 * (拖拽坐标已由输入系统换算成世界坐标,见正文「世界与屏幕坐标」);
 * 把指针移到画布上观察屏幕坐标 → 世界坐标的换算读数。
 * 预期结果:readout 同步 scrollX/scrollY、worldView 矩形、midPoint、
 * 目标世界坐标、死区内外判定与指针换算;网格与坐标标记物提供视觉证据。
 * 阅读主线:create(生成纹理、铺世界、建目标)→ update(巡航 + 每帧证据)
 * → applyParams(Controls 入口)→ report。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即时生效,不重建世界。 */
export interface CameraLabParams {
  /** startFollow / stopFollow 总开关 */
  follow: boolean;
  /** setLerp(x, y):0–1,1 为瞬移、越小越平滑 */
  lerp: number;
  /** setDeadzone(216, 136) 或无参清除 */
  deadzone: boolean;
  /** setZoom:0.5–2 的显示缩放 */
  zoom: number;
  /** setBounds(0, 0, 世界宽, 世界高) 或 removeBounds */
  useBounds: boolean;
}

/** readout 用的派生读数:全部来自摄像机真实属性与本帧换算。 */
export interface CameraLabSnapshot {
  follow: boolean;
  scrollX: number;
  scrollY: number;
  worldView: { x: number; y: number; w: number; h: number };
  midX: number;
  midY: number;
  targetX: number;
  targetY: number;
  /** null = 未启用死区 */
  inDeadzone: boolean | null;
  pointer: {
    x: number;
    y: number;
    worldX: number;
    worldY: number;
    viaWorldPointX: number;
    viaWorldPointY: number;
  };
}

export interface CameraLabInstance {
  applyParams(params: CameraLabParams): void;
  dispose(): void;
}

const GRID_KEY = 'cam-grid';
const MARKER_KEY = 'cam-marker';
const TARGET_KEY = 'cam-target';

const WAYPOINTS = [
  { x: 200, y: 160 },
  { x: 1240, y: 160 },
  { x: 1240, y: 650 },
  { x: 200, y: 650 },
];
const TARGET_SPEED = 170; // px/s
const DEADZONE_W = 216;
const DEADZONE_H = 136;

class CameraLabScene extends Phaser.Scene {
  private target?: Phaser.GameObjects.Image;
  private dzOutline?: Phaser.GameObjects.Graphics;
  private cruise = true;
  private waypoint = 1;
  private ready = false;
  private pending: CameraLabParams | null = null;
  private following = false;
  private deadzoneOn = false;
  private boundsOn = false;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: CameraLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'CameraLab' });
  }

  create() {
    this.makeTextures();
    this.buildWorld();

    this.target = this.add.image(WAYPOINTS[0].x, WAYPOINTS[0].y, TARGET_KEY);
    // 交互与拖拽:drag 回调里的 dragX/dragY 已是世界坐标
    // (输入系统按拖拽起始摄像机做过 getWorldPoint 换算,见正文)
    this.target.setInteractive();
    this.input.setDraggable(this.target);
    this.target.on('dragstart', () => {
      this.cruise = false;
    });
    this.target.on('drag', (_pointer: unknown, dragX: number, dragY: number) => {
      this.target?.setPosition(dragX, dragY);
    });
    this.target.on('dragend', () => {
      this.cruise = true;
    });

    this.dzOutline = this.add.graphics();

    // 出发点:先把镜头对准目标(手动滚动的最小写法)
    this.cameras.main.centerOn(WAYPOINTS[0].x, WAYPOINTS[0].y);

    this.ready = true;
    if (this.pending) {
      this.applyParams(this.pending);
      this.pending = null;
    }
  }

  override update(_time: number, delta: number): void {
    const target = this.target;
    if (target) {
      if (this.cruise) {
        // 沿航点矩形巡航:朝下一个航点匀速前进,接近后切换
        const wp = WAYPOINTS[this.waypoint];
        const dx = wp.x - target.x;
        const dy = wp.y - target.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) {
          this.waypoint = (this.waypoint + 1) % WAYPOINTS.length;
        } else {
          const step = (TARGET_SPEED * delta) / 1000;
          target.x += (dx / dist) * step;
          target.y += (dy / dist) * step;
        }
      }
      this.drawDeadzone();
    }
    this.report();
  }

  /** Controls 入口:五个参数都即时生效;开关只在变化时调用一次。 */
  applyParams(params: CameraLabParams) {
    if (!this.ready) {
      this.pending = params;
      return;
    }
    const cam = this.cameras.main;
    const target = this.target;
    if (!target) {
      return;
    }

    if (params.follow !== this.following) {
      this.following = params.follow;
      if (params.follow) {
        cam.startFollow(target, false, params.lerp, params.lerp);
      } else {
        cam.stopFollow();
      }
    }
    cam.setLerp(params.lerp, params.lerp);

    if (params.deadzone !== this.deadzoneOn) {
      this.deadzoneOn = params.deadzone;
      if (params.deadzone) {
        cam.setDeadzone(DEADZONE_W, DEADZONE_H);
      } else {
        cam.setDeadzone();
      }
    }

    if (params.useBounds !== this.boundsOn) {
      this.boundsOn = params.useBounds;
      if (params.useBounds) {
        cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      } else {
        cam.removeBounds();
      }
    }

    cam.setZoom(params.zoom);
  }

  /** 死区是镜头中心的固定矩形:每帧按 midPoint 重定心,这里只画轮廓。 */
  private drawDeadzone() {
    const dz = this.cameras.main.deadzone;
    const gfx = this.dzOutline;
    if (!gfx) {
      return;
    }
    gfx.clear();
    if (dz) {
      gfx.lineStyle(1, 0xf59e0b, 0.9);
      gfx.strokeRect(dz.x, dz.y, dz.width, dz.height);
    }
  }

  private report() {
    const cam = this.cameras.main;
    const target = this.target;
    if (!target) {
      return;
    }
    const dz = cam.deadzone;
    const pointer = this.input.activePointer;
    // 两条换算通路:pointer.worldX 由输入系统缓存,
    // getWorldPoint 现场换算——两者应当一致
    const via = cam.getWorldPoint(pointer.x, pointer.y);

    this.emitSnapshot({
      follow: this.following,
      scrollX: Math.round(cam.scrollX),
      scrollY: Math.round(cam.scrollY),
      worldView: {
        x: Math.round(cam.worldView.x),
        y: Math.round(cam.worldView.y),
        w: Math.round(cam.worldView.width),
        h: Math.round(cam.worldView.height),
      },
      midX: Math.round(cam.midPoint.x),
      midY: Math.round(cam.midPoint.y),
      targetX: Math.round(target.x),
      targetY: Math.round(target.y),
      inDeadzone: dz
        ? Phaser.Geom.Rectangle.Contains(dz, target.x, target.y)
        : null,
      pointer: {
        x: Math.round(pointer.x),
        y: Math.round(pointer.y),
        worldX: Math.round(pointer.worldX),
        worldY: Math.round(pointer.worldY),
        viaWorldPointX: Math.round(via.x),
        viaWorldPointY: Math.round(via.y),
      },
    });
  }

  /** 自包含素材:Graphics 画完 generateTexture 烘焙成普通纹理。 */
  private makeTextures() {
    if (!this.textures.exists(GRID_KEY)) {
      const g = this.make.graphics();
      g.fillStyle(0x1a2334, 1);
      g.fillRect(0, 0, 60, 60);
      g.lineStyle(1, 0x2e3b57, 1);
      g.strokeRect(0, 0, 60, 60);
      g.generateTexture(GRID_KEY, 60, 60);
      g.destroy();
    }

    if (!this.textures.exists(MARKER_KEY)) {
      const g = this.make.graphics();
      g.lineStyle(1, 0x8fa3c8, 1);
      g.lineBetween(2, 0, 2, 4);
      g.lineBetween(0, 2, 4, 2);
      g.lineBetween(2, 4, 2, 8);
      g.lineBetween(4, 2, 8, 2);
      g.generateTexture(MARKER_KEY, 8, 8);
      g.destroy();
    }

    if (!this.textures.exists(TARGET_KEY)) {
      const g = this.make.graphics();
      g.fillStyle(0xf59e0b, 1);
      g.fillPoints(
        [
          new Phaser.Math.Vector2(0, 14),
          new Phaser.Math.Vector2(14, 0),
          new Phaser.Math.Vector2(28, 14),
          new Phaser.Math.Vector2(14, 28),
        ],
        true,
      );
      g.lineStyle(2, 0x141a26, 1);
      g.strokePoints(
        [
          new Phaser.Math.Vector2(0, 14),
          new Phaser.Math.Vector2(14, 0),
          new Phaser.Math.Vector2(28, 14),
          new Phaser.Math.Vector2(14, 28),
        ],
        true,
        true,
      );
      g.generateTexture(TARGET_KEY, 28, 28);
      g.destroy();
    }
  }

  /** 大于视口的世界:网格平铺 + 边界框 + 坐标标记物 + 巡航路径。 */
  private buildWorld() {
    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, GRID_KEY).setOrigin(0);

    const border = this.add.graphics();
    border.lineStyle(2, 0x4f7cff, 0.8);
    border.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const path = this.add.graphics();
    path.lineStyle(1, 0x4f7cff, 0.35);
    path.strokeRect(
      WAYPOINTS[0].x,
      WAYPOINTS[0].y,
      WAYPOINTS[1].x - WAYPOINTS[0].x,
      WAYPOINTS[2].y - WAYPOINTS[1].y,
    );

    const labelStyle = {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '11px',
      color: '#64789c',
    };
    for (const x of [360, 720, 1080]) {
      for (const y of [270, 540]) {
        this.add.image(x, y, MARKER_KEY);
        this.add.text(x + 8, y + 6, `(${x}, ${y})`, labelStyle);
      }
    }
    this.add.image(720, 405, MARKER_KEY);
    this.add.text(728, 411, '(720, 405) 世界中心', labelStyle);
  }
}

export function createCameraLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CameraLabSnapshot) => void,
): CameraLabInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new CameraLabScene();
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
    applyParams(params: CameraLabParams) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
