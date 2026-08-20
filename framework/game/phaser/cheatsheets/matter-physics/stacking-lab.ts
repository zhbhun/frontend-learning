/**
 * 范例:堆叠实验台——点击画布生成矩形 / 圆 / 五边形 / 复合体刚体落下堆叠,
 * 左上角一个 worldConstraint 摆锤,右侧一个 isSensor 拾取区,全场可用鼠标拖拽。
 * 输入(Controls):gravityY(Matter 重力 y,默认 1)、frictionAir(空气阻力,默认 0.01)、
 * enableSleeping(引擎休眠开关)、spawnShape(下次点击生成的形状)、
 * pendulumStiffness(摆锤约束刚度)、debug(官方调试绘制)。
 * 主要操作:点击画布生成刚体;按住任意刚体(含摆锤)拖拽;观察刚体自然堆叠、
 * 休眠后停摆、传感器只报碰撞不分离。
 * 预期结果:readout 同步动态刚体总数、活动 / 休眠数、约束数(含拖拽约束)、
 * 本步接触对数、最近碰撞对、传感器命中与正在拖拽的刚体 label。
 * 阅读主线:create(地面 / 边界 / 摆锤 / 传感器 / 拖拽 / 碰撞事件)
 * → spawn(四种形状)→ applyParams(Controls 入口)→ update(绘制与证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即时生效,不清场。 */
export interface StackingLabParams {
  /** world.setGravity(0, v) 的 y 分量;Matter 重力是比例量,默认 1 */
  gravityY: number;
  /** setFrictionAir:每步按比例衰减速度,默认 0.01;对全部动态刚体生效 */
  frictionAir: number;
  /** world.engine.enableSleeping:开启后低速刚体累积 sleepThreshold 步后休眠 */
  enableSleeping: boolean;
  /** 点击画布时生成的形状 */
  spawnShape: 'rectangle' | 'circle' | 'pentagon' | 'compound';
  /** 摆锤约束 stiffness:1 = 刚性销,0.1 左右 = 弹簧 */
  pendulumStiffness: number;
  /** world.createDebugGraphic + drawDebug 官方调试绘制 */
  debug: boolean;
}

/** readout 用的派生读数:全部来自 Matter Body / World 的真实状态。 */
export interface StackingLabSnapshot {
  /** 动态刚体数(不含地面 / 边界墙 / 传感器) */
  bodies: number;
  /** body.isSleeping === false 的动态刚体数 */
  awake: number;
  /** body.isSleeping === true 的动态刚体数 */
  sleeping: number;
  /** world.getAllConstraints().length,含 pointerConstraint 注入的拖拽约束 */
  constraints: number;
  /** 最近一次 collisionactive 的 event.pairs.length(本步接触对数) */
  activePairs: number;
  /** 最近一次 collisionstart 的最后一对 label */
  lastCollision: string;
  /** 拾取区(isSensor)累计命中次数 */
  sensorHits: number;
  /** pointerConstraint.body 的 label,未拖拽时为 '—' */
  dragging: string;
}

export interface StackingLabInstance {
  applyParams(params: StackingLabParams): void;
  dispose(): void;
}

/** 刚体上限:超过后移除最早的刚体,同时演示 world.remove。 */
const MAX_BODIES = 60;
/** 各形状的绘制色(按 label 区分)。 */
const COLORS: Record<string, number> = {
  crate: 0xf59e0b,
  ball: 0x2dd4bf,
  penta: 0xa78bfa,
  compound: 0xf472b6,
  bob: 0x93c5fd,
};

class StackingLabScene extends Phaser.Scene {
  /** 逐帧把所有 body.vertices 画出来的叠加层。 */
  private overlay?: Phaser.GameObjects.Graphics;
  /** 实验台内的动态刚体(可生成 / 可休眠 / 可被拖拽)。 */
  private dynamic: MatterJS.BodyType[] = [];
  /** 摆锤的锚点(世界坐标)与摆锤约束。 */
  private anchor = new Phaser.Math.Vector2(104, 18);
  private pendulum?: MatterJS.ConstraintType;
  private pendulumBob?: MatterJS.BodyType;
  /** 拖拽约束:Phaser 4 的 pointerConstraint(Phaser 3 叫 mouseConstraint)。 */
  private pointer?: Phaser.Physics.Matter.PointerConstraint;
  private lastCollision = '—';
  private sensorHits = 0;
  private activePairs = 0;
  private ready = false;
  private pending: StackingLabParams | null = null;
  private lastParams: StackingLabParams | null = null;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: StackingLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'StackingLab' });
  }

  create() {
    const world = this.matter.world;

    // 地面 + 左右边界墙:isStatic 的矩形刚体 = 关卡几何
    world.add(
      this.matter.bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 10, GAME_WIDTH, 20, {
        isStatic: true,
        label: 'floor',
      }),
    );
    // 左右墙用官方 setBounds 生成,只开左右(thickness 的墙厚大部分在画布外)
    world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT, 64, true, true, false, false);

    // 摆锤:worldConstraint 把刚体锚到世界点 pointA
    this.pendulumBob = this.matter.bodies.rectangle(
      this.anchor.x + 84,
      this.anchor.y + 44,
      30,
      30,
      { label: 'bob', frictionAir: 0, density: 0.004 },
    );
    world.add(this.pendulumBob);
    this.pendulum = this.matter.add.worldConstraint(
      this.pendulumBob,
      104,
      1,
      { pointA: { x: this.anchor.x, y: this.anchor.y } },
    );

    // 拾取区:isSensor 只检测碰撞、不做分离,静态放置在地面右侧
    world.add(
      this.matter.bodies.rectangle(GAME_WIDTH - 84, GAME_HEIGHT - 44, 96, 56, {
        isStatic: true,
        isSensor: true,
        label: 'pickup-zone',
      }),
    );

    // 鼠标拖拽:一行开启,物理体随指针拖动(默认 stiffness 0.1,有橡皮筋感)
    // d.ts 把返回值标成 MatterJS.ConstraintType,运行时实际是 PointerConstraint
    this.pointer = this.matter.add.pointerConstraint() as unknown as Phaser.Physics.Matter.PointerConstraint;

    // 碰撞事件:World 级监听,回调参数 (event, bodyA, bodyB)
    world.on(
      'collisionstart',
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
        this.activePairsStart(event.pairs);
      },
    );
    world.on(
      'collisionactive',
      (event: Phaser.Physics.Matter.Events.CollisionActiveEvent) => {
        this.activePairs = event.pairs.length;
      },
    );

    // 点击空白处 = 在指针处生成刚体;点在刚体上则交给拖拽
    // (containsPoint 是 this.matter 上的查询辅助,对整个刚体列表做命中测试)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const overBody = this.matter.containsPoint(
        this.matter.world.getAllBodies(),
        p.worldX,
        p.worldY,
      );
      if (!overBody) {
        this.spawn(p.worldX, p.worldY);
      }
    });

    this.overlay = this.add.graphics();

    // 初始撒一些刚体,进场即有堆叠可看
    [
      ['rectangle', 300, 120],
      ['rectangle', 360, 60],
      ['rectangle', 330, 20],
      ['circle', 470, 40],
      ['circle', 500, 100],
      ['pentagon', 250, 30],
    ].forEach(([shape, x, y]) => {
      this.spawn(
        x as number,
        y as number,
        shape as StackingLabParams['spawnShape'],
      );
    });

    this.ready = true;
    if (this.pending) {
      this.applyParams(this.pending);
      this.pending = null;
    }
  }

  override update(): void {
    this.drawOverlay();
    this.report();
  }

  /** 生成刚体:前三种是工厂基础形状,第四种用 parts 组复合体。 */
  private spawn(
    x: number,
    y: number,
    shape?: StackingLabParams['spawnShape'],
  ): void {
    const kind = shape ?? this.lastParams?.spawnShape ?? 'rectangle';
    const world = this.matter.world;
    let body: MatterJS.BodyType;

    if (kind === 'circle') {
      body = this.matter.add.circle(x, y, 17, { label: 'ball' });
    } else if (kind === 'pentagon') {
      body = this.matter.add.polygon(x, y, 5, 24, { label: 'penta' });
    } else if (kind === 'compound') {
      // 复合体:先用 this.matter.bodies 造零件,再 this.matter.body.create 组合,
      // 最后 setPosition 把整体质心搬到 (x, y)
      const bar = this.matter.bodies.rectangle(0, -13, 58, 13);
      const cap = this.matter.bodies.circle(0, 13, 13);
      body = this.matter.body.create({ parts: [bar, cap], label: 'compound' });
      this.matter.body.setPosition(body, { x, y });
      world.add(body);
    } else {
      body = this.matter.add.rectangle(x, y, 44, 30, {
        label: 'crate',
        chamfer: { radius: 3 },
      });
    }

    if (this.lastParams) {
      body.frictionAir = this.lastParams.frictionAir;
    }
    this.dynamic.push(body);

    // 超上限先移除最早的刚体:world.remove 立即退出模拟
    while (this.dynamic.length > MAX_BODIES) {
      const oldest = this.dynamic.shift();
      if (oldest) {
        world.remove(oldest);
      }
    }
  }

  /** collisionstart:取最后一对作读数;传感器对(pair.isSensor)单独计数。 */
  private activePairsStart(pairs: Phaser.Types.Physics.Matter.MatterCollisionPair[]): void {
    const last = pairs.at(-1);
    if (last) {
      this.lastCollision = `${last.bodyA.label} ↔ ${last.bodyB.label}`;
    }
    for (const pair of pairs) {
      if (pair.isSensor) {
        this.sensorHits += 1;
      }
    }
  }

  /** Controls 入口:六个参数即时生效。 */
  applyParams(params: StackingLabParams) {
    this.lastParams = params;
    if (!this.ready) {
      this.pending = params;
      return;
    }
    const world = this.matter.world;

    world.setGravity(0, params.gravityY);

    for (const body of this.dynamic) {
      body.frictionAir = params.frictionAir;
    }

    // 休眠开关挂在引擎上;关掉时已睡着的刚体不会自动醒,逐个手动唤醒
    world.engine.enableSleeping = params.enableSleeping;
    if (!params.enableSleeping) {
      for (const body of this.dynamic) {
        this.matter.body.set(body, { isSleeping: false });
      }
    }

    if (this.pendulum) {
      this.pendulum.stiffness = params.pendulumStiffness;
    }

    if (params.debug && !world.debugGraphic) {
      world.createDebugGraphic();
    }
    world.drawDebug = params.debug;
  }

  /** 视觉证据:自己按 body.vertices 绘制每个刚体(复合体逐 part 画)。 */
  private drawOverlay() {
    const gfx = this.overlay;
    if (!gfx) {
      return;
    }
    gfx.clear();

    // 地面与拾取区:静态几何用固定图示
    gfx.fillStyle(0x2e3b57, 1);
    gfx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);
    gfx.lineStyle(1, 0x22c55e, 0.8);
    gfx.strokeRect(GAME_WIDTH - 132, GAME_HEIGHT - 72, 96, 56);
    gfx.fillStyle(0x22c55e, 0.08);
    gfx.fillRect(GAME_WIDTH - 132, GAME_HEIGHT - 72, 96, 56);

    // 摆锤:锚点、摆杆(constraint)与摆锤刚体
    if (this.pendulum && this.pendulumBob) {
      const bob = this.pendulumBob;
      gfx.fillStyle(0x8fa3c8, 1);
      gfx.fillCircle(this.anchor.x, this.anchor.y, 4);
      gfx.lineStyle(2, 0x64748b, 0.9);
      gfx.lineBetween(this.anchor.x, this.anchor.y, bob.position.x, bob.position.y);
    }

    // 每个动态刚体按顶点画:旋转 / 多边形 / 复合体 parts 全部现形
    for (const body of this.dynamic.concat(this.pendulumBob ? [this.pendulumBob] : [])) {
      const color = COLORS[body.label] ?? 0xe2e8f0;
      const alpha = body.isSleeping ? 0.28 : 0.92;
      const parts = body.parts.length > 1 ? body.parts.slice(1) : body.parts;
      for (const part of parts) {
        const points = (part.vertices ?? []).map(
          (v) => new Phaser.Math.Vector2(v.x, v.y),
        );
        gfx.fillStyle(color, alpha * 0.35);
        gfx.fillPoints(points, true);
        gfx.lineStyle(body.isSleeping ? 1 : 2, color, alpha);
        gfx.strokePoints(points, true);
      }
    }
  }

  private report() {
    const world = this.matter.world;
    let awake = 0;
    let sleeping = 0;
    for (const body of this.dynamic) {
      if (body.isSleeping) {
        sleeping += 1;
      } else {
        awake += 1;
      }
    }
    const dragging = this.pointer?.body;
    this.emitSnapshot({
      bodies: this.dynamic.length,
      awake,
      sleeping,
      constraints: world.getAllConstraints().length,
      activePairs: this.activePairs,
      lastCollision: this.lastCollision,
      sensorHits: this.sensorHits,
      dragging: dragging ? String(dragging.label) : '—',
    });
  }
}

export function createStackingLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StackingLabSnapshot) => void,
): StackingLabInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new StackingLabScene();
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 1 },       // 引擎默认 y = 1、scale = 0.001
        enableSleeping: false,          // Controls 可运行时切换
        positionIterations: 6,          // 引擎默认:6 / 4 / 2
        velocityIterations: 4,
        constraintIterations: 2,
        debug: false,
      },
    },
    scene: [scene],
  });

  scene.emitSnapshot = emit;

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    applyParams(params: StackingLabParams) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
