/**
 * 范例:抛射弹球实验台——从左下发射台射出一枚小球,初速度、重力、阻力、
 * 反弹与世界边界怎样共同决定它的轨迹。
 * 输入(Controls):gravityY(世界重力 y,px/s²)、launchSpeed(初速度 px/s)、
 * launchAngle(发射角,度,0 = 水平向右,负值向上)、bounce(0–1)、
 * drag(0–200 px/s²)、allowGravity、collideWorldBounds、debug(调试绘制)。
 * 主要操作:点击画布任意处发射;小球带橙色残影轨迹与绿色速度矢量箭头,
 * 发射台旁的指示线显示当前发射角;关边界飞出画布后自动回到发射台。
 * 预期结果:readout 同步 velocity、speed、acceleration、生效重力、位置、
 * 本帧位移(≈ velocity ÷ 60)、blocked 四向、touching 与 worldbounds 反弹计数。
 * 阅读主线:create(纹理、小球、发射入口与 worldbounds 事件)
 * → applyParams(Controls 入口)→ update(残影与箭头 + 证据)→ report。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即时生效,不重置小球当前运动。 */
export interface ProjectileLabParams {
  /** this.physics.world.gravity.y,负值向上 */
  gravityY: number;
  /** 发射初速度(px/s),经 velocityFromAngle 分解到两轴 */
  launchSpeed: number;
  /** 发射角(度,0 = 向右,负值向上,顺时针为正) */
  launchAngle: number;
  /** setBounce:0 贴墙停死,1 完全弹性 */
  bounce: number;
  /** setDrag(px/s²,两轴同值,线性阻力) */
  drag: number;
  /** setAllowGravity:关闭后重力完全不参与积分 */
  allowGravity: boolean;
  /** setCollideWorldBounds:关闭后小球飞出画布不反弹 */
  collideWorldBounds: boolean;
  /** world.createDebugGraphic + drawDebug 官方调试绘制 */
  debug: boolean;
}

/** readout 用的派生读数:全部来自 Body 与 World 的真实属性。 */
export interface ProjectileLabSnapshot {
  vx: number;
  vy: number;
  speed: number;
  ax: number;
  ay: number;
  /** allowGravity ? world.gravity.y : 0 —— 实际参与积分的重力 */
  effectiveGravityY: number;
  worldGravityY: number;
  allowGravity: boolean;
  x: number;
  y: number;
  /** body.deltaX/Y:本帧位移,固定 60 步/秒下 ≈ velocity ÷ 60 */
  dx: number;
  dy: number;
  blocked: { up: boolean; down: boolean; left: boolean; right: boolean };
  touching: { none: boolean; up: boolean; down: boolean; left: boolean; right: boolean };
  /** worldbounds 事件累计次数(需要 body.onWorldBounds = true) */
  bounces: number;
}

export interface ProjectileLabInstance {
  applyParams(params: ProjectileLabParams): void;
  dispose(): void;
}

const BALL_KEY = 'apj-ball';
const LAUNCH_X = 64;
const LAUNCH_Y = GAME_HEIGHT - 56;
const TRAIL_MAX = 90;
const MARGIN = 120; // 出界超过该距离后自动回发射台

class ProjectileLabScene extends Phaser.Scene {
  private ball?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private overlay?: Phaser.GameObjects.Graphics;
  private trail: Array<{ x: number; y: number }> = [];
  private bounces = 0;
  private ready = false;
  private pending: ProjectileLabParams | null = null;
  /** 最近一次 applyParams 的参数:launch 时按当前 Controls 的角度与初速度出发。 */
  private lastParams: ProjectileLabParams | null = null;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: ProjectileLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'ProjectileLab' });
  }

  create() {
    this.makeTextures();

    // 发射台基座(纯视觉):指示小球从哪里出发
    this.add.graphics()
      .fillStyle(0x2e3b57, 1)
      .fillRect(LAUNCH_X - 22, LAUNCH_Y + 10, 44, 6);

    this.ball = this.physics.add.sprite(LAUNCH_X, LAUNCH_Y, BALL_KEY);
    this.ball.setCircle(12);            // 圆形碰撞盒(见正文「碰撞盒」)
    this.ball.body.onWorldBounds = true; // 默认 false,不开不发 worldbounds 事件
    this.ball.setCollideWorldBounds(true);

    // 反弹瞬间计数:World 级事件,按 body 过滤出小球
    this.physics.world.on(
      'worldbounds',
      (body: Phaser.Physics.Arcade.Body) => {
        if (body === this.ball?.body) {
          this.bounces += 1;
        }
      },
    );

    // 点击画布 = 发射:reset 归位并清速度,再按角度与初速度出发
    this.input.on('pointerdown', () => {
      this.launch();
    });

    this.overlay = this.add.graphics();

    this.ready = true;
    if (this.pending) {
      this.applyParams(this.pending);
      this.pending = null;
    }
  }

  override update(): void {
    this.autoRecall();
    this.drawOverlay();
    this.report();
  }

  /** Controls 入口:八个参数即时生效;debug 图形只建一次,之后切 drawDebug。 */
  applyParams(params: ProjectileLabParams) {
    this.lastParams = params;
    if (!this.ready) {
      this.pending = params;
      return;
    }
    const world = this.physics.world;
    world.gravity.y = params.gravityY;

    const ball = this.ball;
    if (!ball) {
      return;
    }
    ball.setBounce(params.bounce, params.bounce);
    ball.setDrag(params.drag, params.drag);
    // setAllowGravity 只在 Body 上,不在游戏对象组件里
    ball.body.setAllowGravity(params.allowGravity);
    ball.setCollideWorldBounds(params.collideWorldBounds);

    if (params.debug && !world.debugGraphic) {
      world.createDebugGraphic(); // 建置顶 Graphics 并置 drawDebug = true
    }
    world.drawDebug = params.debug;
  }

  /** 发射:reset 清掉旧运动,再用 velocityFromAngle 换算初速度。 */
  private launch() {
    const ball = this.ball;
    if (!ball) {
      return;
    }
    const params = this.lastParams;
    if (params) {
      this.applyParams(params);
    }
    ball.body.reset(LAUNCH_X, LAUNCH_Y);
    const v = this.physics.velocityFromAngle(
      params?.launchAngle ?? -45,
      params?.launchSpeed ?? 260,
    );
    ball.setVelocity(v.x, v.y);
    this.trail = [];
    this.bounces = 0;
  }

  /** 关掉世界边界后小球会一直飞:出界太远就召回发射台静止,便于继续实验。 */
  private autoRecall() {
    const ball = this.ball;
    if (!ball || ball.body.velocity.lengthSq() === 0) {
      return;
    }
    const out =
      ball.x < -MARGIN ||
      ball.x > GAME_WIDTH + MARGIN ||
      ball.y < -MARGIN ||
      ball.y > GAME_HEIGHT + MARGIN;
    if (out) {
      ball.body.reset(LAUNCH_X, LAUNCH_Y);
      this.trail = [];
    }
  }

  /** 视觉证据:残影轨迹 + 速度矢量箭头 + 发射角指示线。 */
  private drawOverlay() {
    const ball = this.ball;
    const gfx = this.overlay;
    if (!ball || !gfx) {
      return;
    }
    if (ball.body.velocity.lengthSq() > 1) {
      this.trail.push({ x: ball.x, y: ball.y });
      if (this.trail.length > TRAIL_MAX) {
        this.trail.shift();
      }
    }
    gfx.clear();

    // 残影:越新越实
    this.trail.forEach((p, i) => {
      const t = (i + 1) / this.trail.length;
      gfx.fillStyle(0xf59e0b, 0.06 + 0.44 * t);
      gfx.fillCircle(p.x, p.y, 2);
    });

    // 速度矢量箭头(与官方 debug 的绿色速度线同一语义)
    const v = ball.body.velocity;
    const speed = v.length();
    if (speed > 8) {
      const len = Math.min(speed * 0.3, 90);
      const ux = v.x / speed;
      const uy = v.y / speed;
      const tipX = ball.x + ux * len;
      const tipY = ball.y + uy * len;
      gfx.lineStyle(2, 0x22c55e, 0.95);
      gfx.lineBetween(ball.x, ball.y, tipX, tipY);
      const px = -uy;
      const py = ux;
      gfx.fillStyle(0x22c55e, 0.95);
      gfx.fillPoints(
        [
          new Phaser.Math.Vector2(tipX, tipY),
          new Phaser.Math.Vector2(tipX - ux * 9 + px * 5, tipY - uy * 9 + py * 5),
          new Phaser.Math.Vector2(tipX - ux * 9 - px * 5, tipY - uy * 9 - py * 5),
        ],
        true,
      );
    }

    // 发射角指示线:点按当前角度出发前的预测方向
    const angle = Phaser.Math.DegToRad(this.lastParams?.launchAngle ?? -45);
    gfx.lineStyle(1, 0x8fa3c8, 0.7);
    gfx.lineBetween(
      LAUNCH_X,
      LAUNCH_Y,
      LAUNCH_X + Math.cos(angle) * 56,
      LAUNCH_Y + Math.sin(angle) * 56,
    );
  }

  private report() {
    const ball = this.ball;
    if (!ball) {
      return;
    }
    const body = ball.body;
    this.emitSnapshot({
      vx: Math.round(body.velocity.x),
      vy: Math.round(body.velocity.y),
      speed: Math.round(body.speed),
      ax: Math.round(body.acceleration.x),
      ay: Math.round(body.acceleration.y),
      effectiveGravityY: body.allowGravity ? this.physics.world.gravity.y : 0,
      worldGravityY: this.physics.world.gravity.y,
      allowGravity: body.allowGravity,
      x: Math.round(ball.x),
      y: Math.round(ball.y),
      dx: +body.deltaX().toFixed(2),
      dy: +body.deltaY().toFixed(2),
      blocked: { ...body.blocked },
      touching: { ...body.touching },
      bounces: this.bounces,
    });
  }

  /** 自包含素材:Graphics 画完 generateTexture 烘焙成普通纹理。 */
  private makeTextures() {
    if (!this.textures.exists(BALL_KEY)) {
      const g = this.make.graphics();
      g.fillStyle(0xf59e0b, 1);
      g.fillCircle(12, 12, 11);
      g.lineStyle(2, 0x141a26, 1);
      g.strokeCircle(12, 12, 11);
      g.generateTexture(BALL_KEY, 24, 24);
      g.destroy();
    }
  }
}

export function createProjectileLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ProjectileLabSnapshot) => void,
): ProjectileLabInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new ProjectileLabScene();
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 300 } },
    },
    scene: [scene],
  });

  scene.emitSnapshot = emit;

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    applyParams(params: ProjectileLabParams) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
