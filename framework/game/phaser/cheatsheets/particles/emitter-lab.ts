/**
 * 范例:粒子实验台——三个发射器覆盖粒子系统的三种典型用法。
 * 输入(Controls):speed / lifespan / frequency / quantity(发射节奏)、
 * scaleStart / scaleEnd / ease(scale 的 {start,end,ease} 曲线)、gravityY(重力)、
 * tint 模式与颜色、blendAdd(blendMode ADD 发光)、emitZone(edge 圆环边线域)、
 * deathZone(地面死亡区)、explodeCount(爆发数量)。
 * 主要操作:Controls 热调参数(对下一批出生的粒子生效);点击画布空白处在
 * 点击位置 explode() 爆发;画布底部按钮 STOP / START / KILL ALL 控制喷泉。
 * 预期结果:readout 同步各发射器的存活数(alive)、粒子池总数(累计创建)、
 * 喷泉累计发射数与 emitting 状态、当前 frequency / quantity,以及挂在
 * 发射器上的最近事件(start / stop / complete / explode / deathzone)。
 * 阅读主线:create(纹理、三个发射器、按钮与事件钩子)→ update(巡航方块)
 * → applyParams(Controls 热调入口)→ report。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即时生效,不重建发射器。 */
export interface ParticlesParams {
  /** 喷泉初速(px/s,radial 模式:方向由 angle 决定) */
  speed: number;
  /** 粒子寿命(ms;emit-only:只对之后出生的粒子生效) */
  lifespan: number;
  /** 流动模式发射间隔(ms);0 = 每个逻辑帧发一批 */
  frequency: number;
  /** 每批发射数量 */
  quantity: number;
  /** scale 曲线起点(出生时大小) */
  scaleStart: number;
  /** scale 曲线终点(死亡时大小) */
  scaleEnd: number;
  /** scale 曲线的缓动 */
  ease: 'Linear' | 'Quad.out' | 'Cubic.out' | 'Bounce.out';
  /** 重力加速度(px/s²,作用于喷泉与爆发) */
  gravityY: number;
  /** tint 模式:solid = 单色(取 tintColor),random = 从随机色数组抽取 */
  tintMode: 'solid' | 'random';
  /** tintMode = solid 时的颜色,'#rrggbb' */
  tintColor: string;
  /** blendMode ADD(叠加发光)与否(NORMAL) */
  blendAdd: boolean;
  /** 是否启用 edge 发射区(粒子从圆环边线出生,而非发射器中心点) */
  emitZone: boolean;
  /** 是否启用地面死亡区(粒子进入地面矩形立即死亡) */
  deathZone: boolean;
  /** 点击画布时 explode() 的爆发数量 */
  explodeCount: number;
}

/** readout 用的单个发射器读数:全部来自发射器真实状态。 */
export interface EmitterStatus {
  alive: number;
  pool: number;
}

export interface ParticlesSnapshot {
  fountain: EmitterStatus & { emitting: boolean; emittedTotal: number };
  trail: EmitterStatus & { target: { x: number; y: number } };
  burst: EmitterStatus;
  frequency: number;
  quantity: number;
  speed: number;
  lifespan: number;
  gravityY: number;
  tint: string;
  blendMode: string;
  lastEvent: string;
}

export interface ParticlesInstance {
  applyParams(params: ParticlesParams): void;
  dispose(): void;
}

const DOT_KEY = 'pt-dot';
const STAR_KEY = 'pt-star';

/** 随机 tint 模式的取色数组。 */
const RANDOM_TINTS = [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff, 0xb388ff];

/** 喷泉位置(左区)与 edge 发射区圆环半径。 */
const FOUNTAIN_X = 190;
const FOUNTAIN_Y = GROUND_Y - 22;
const ZONE_RADIUS = 72;

/** 巡航方块(右区)做圆周运动,是尾迹发射器的 follow 目标。 */
const ORBIT = { cx: 560, cy: 196, r: 96, speed: 1.15 }; // speed: rad/s

const LABEL_STYLE = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '11px',
  color: '#64789c',
};
const BUTTON_STYLE = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '13px',
  color: '#e7edf7',
};

/** 发射器上的粒子事件(Phaser.GameObjects.Particles.Events),记录最近一次。 */
const EMITTER_EVENTS = [
  'start',
  'stop',
  'complete',
  'explode',
  'deathzone',
] as const;

/** '#rrggbb' → 0xrrggbb 数值,喂给 setParticleTint。 */
function hexToTint(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

class ParticlesLabScene extends Phaser.Scene {
  private fountain?: Phaser.GameObjects.Particles.ParticleEmitter;
  private trail?: Phaser.GameObjects.Particles.ParticleEmitter;
  private burst?: Phaser.GameObjects.Particles.ParticleEmitter;
  private jet?: Phaser.GameObjects.Rectangle;
  private ground?: Phaser.GameObjects.Graphics;
  private buttons: Phaser.GameObjects.GameObject[] = [];
  private params: ParticlesParams = {
    speed: 160,
    lifespan: 1500,
    frequency: 30,
    quantity: 2,
    scaleStart: 1.4,
    scaleEnd: 0,
    ease: 'Cubic.out',
    gravityY: 220,
    tintMode: 'random',
    tintColor: '#66e0ff',
    blendAdd: true,
    emitZone: false,
    deathZone: false,
    explodeCount: 60,
  };
  private orbitAngle = 0;
  private emittedTotal = 0;
  private ready = false;
  private pending: ParticlesParams | null = null;
  private lastEvent = '—(尚未触发)';
  private fountainZoneOn = false;
  private deathZoneOn = false;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: ParticlesSnapshot) => void = () => {};

  constructor() {
    super({ key: 'ParticlesLab' });
  }

  create() {
    this.makeTextures();
    this.buildStage();
    this.buildFountain();
    this.buildTrail();
    this.buildBurst();
    this.buildButtons();
    this.hookEmitterEvents();

    this.ready = true;
    if (this.pending) {
      this.applyParams(this.pending);
      this.pending = null;
    } else {
      this.applyParams(this.params);
    }
  }

  override update(_time: number, delta: number): void {
    // 巡航方块做圆周运动:尾迹发射器通过 follow 持续从它身上取发射原点
    this.orbitAngle += (ORBIT.speed * delta) / 1000;
    this.jet?.setPosition(
      ORBIT.cx + ORBIT.r * Math.cos(this.orbitAngle),
      ORBIT.cy + ORBIT.r * Math.sin(this.orbitAngle),
    );

    this.report();
  }

  /** 自包含素材:Graphics 画完 generateTexture 烘焙成普通纹理(白色,便于 tint 上色)。 */
  private makeTextures() {
    if (!this.textures.exists(DOT_KEY)) {
      // 柔边圆点:多层同心圆叠出从亮到透明的过渡,配 blendMode ADD 就是光晕
      const g = this.make.graphics();
      g.fillStyle(0xffffff, 0.16);
      g.fillCircle(8, 8, 8);
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(8, 8, 5.5);
      g.fillStyle(0xffffff, 0.65);
      g.fillCircle(8, 8, 3.5);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 2);
      g.generateTexture(DOT_KEY, 16, 16);
      g.destroy();
    }

    if (!this.textures.exists(STAR_KEY)) {
      // 四角星:用于爆发,旋转时轮廓明显
      const pts = [
        new Phaser.Math.Vector2(7, 0),
        new Phaser.Math.Vector2(8.8, 5.2),
        new Phaser.Math.Vector2(14, 7),
        new Phaser.Math.Vector2(8.8, 8.8),
        new Phaser.Math.Vector2(7, 14),
        new Phaser.Math.Vector2(5.2, 8.8),
        new Phaser.Math.Vector2(0, 7),
        new Phaser.Math.Vector2(5.2, 5.2),
      ];
      const g = this.make.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillPoints(pts, true);
      g.generateTexture(STAR_KEY, 14, 14);
      g.destroy();
    }
  }

  /** 地面线与区域标注:死亡区 = 地面线以下的矩形。 */
  private buildStage() {
    this.ground = this.add.graphics();
    this.ground.lineStyle(1, 0x4f7cff, 0.5);
    this.ground.lineBetween(0, GROUND_Y, GAME_WIDTH, GROUND_Y);
    this.ground.fillStyle(0x4f7cff, 0.06);
    this.ground.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);
    this.ground.setDepth(1);

    this.add
      .text(
        FOUNTAIN_X - 46,
        GROUND_Y + 8,
        '喷泉(连续发射,radial)',
        LABEL_STYLE,
      )
      .setDepth(10);
    this.add
      .text(ORBIT.cx - 96, 36, '尾迹(startFollow 方块)', LABEL_STYLE)
      .setDepth(10);
    this.add
      .text(12, 12, '点击画布空白处 = burst.explode(count, x, y)', {
        ...LABEL_STYLE,
        color: '#8fa3c8',
      })
      .setDepth(10);
  }

  /** 喷泉:连续发射器。角度向上扇形,数量 / 频率 / 曲线全部由 Controls 热调。 */
  private buildFountain() {
    this.fountain = this.add.particles(FOUNTAIN_X, FOUNTAIN_Y, DOT_KEY, {
      angle: { min: -108, max: -72 }, // 向上 ±18° 扇形(radial 模式配 angle)
      speed: this.params.speed,
      lifespan: this.params.lifespan,
      frequency: this.params.frequency,
      quantity: this.params.quantity,
      scale: { start: this.params.scaleStart, end: this.params.scaleEnd },
      alpha: { start: 1, end: 0 },
      gravityY: this.params.gravityY,
      tint: RANDOM_TINTS,
    });
    this.fountain.setDepth(5);
    // onParticleEmit:每次发射回调,这里用来累计「发射总数」供 readout 展示
    this.fountain.onParticleEmit(() => {
      this.emittedTotal++;
    });
  }

  /** 尾迹:跟随巡航方块。quantity 1 + 高频率 + 短寿命 = 拖尾。 */
  private buildTrail() {
    this.jet = this.add
      .rectangle(ORBIT.cx, ORBIT.cy, 18, 18, 0xf59e0b, 1)
      .setStrokeStyle(2, 0x141a26, 1)
      .setDepth(4);

    this.trail = this.add.particles(0, 0, DOT_KEY, {
      // follow 目标每次发射时取 x/y(+followOffset),发射器自身 x/y 被忽略
      follow: this.jet,
      speed: { min: 6, max: 24 },
      angle: { min: 0, max: 360 },
      lifespan: 620,
      frequency: 12,
      quantity: 1,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.85, end: 0 },
      tint: 0xffd740,
    });
    this.trail.setDepth(3);
  }

  /** 爆发:独立发射器待命,点击画布时 explode() 在点击位置一次喷发。
   *  explode() 会把发射器切到爆发模式(frequency = -1),
   *  所以爆发必须用独立发射器,不能与连续发射器混用。 */
  private buildBurst() {
    this.burst = this.add.particles(0, 0, STAR_KEY, {
      frequency: -1, // 爆发模式:preUpdate 不再自动发射,只等 explode()
      emitting: false,
      speed: { min: 80, max: 300 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 400, max: 900 },
      quantity: this.params.explodeCount,
      scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { start: 0, end: 240 },
      gravityY: this.params.gravityY,
      tint: RANDOM_TINTS,
    });
    this.burst.setDepth(6);
  }

  /** 画布内按钮:STOP / START / KILL ALL 作用于喷泉发射器。 */
  private buildButtons() {
    const cy = GAME_HEIGHT - 28;
    const make = (x: number, label: string, onClick: () => void) => {
      const rect = this.add
        .rectangle(x + 46, cy, 92, 26, 0x27344c, 0.92)
        .setStrokeStyle(1, 0x4f7cff, 0.9)
        .setDepth(11);
      const text = this.add
        .text(x + 46, cy, label, BUTTON_STYLE)
        .setOrigin(0.5)
        .setDepth(12);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', onClick);
      rect.on('pointerover', () => rect.setFillStyle(0x3a4d75, 0.95));
      rect.on('pointerout', () => rect.setFillStyle(0x27344c, 0.92));
      this.buttons.push(rect, text);
    };
    // stop() 只停发射,存量粒子活完寿命;stop(true) 连存量一起杀
    make(16, 'STOP', () => this.fountain?.stop());
    // start() 恢复流动发射;若发射器已被 explode 切到爆发模式,start() 不会发
    make(120, 'START', () => this.fountain?.start());
    // killAll():存量粒子立即回池,emitting 不变
    make(224, 'KILL ALL', () => this.fountain?.killAll());

    // 点击画布空白处 → 在点击位置爆发;点在按钮上时不触发
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.input.hitTestPointer(pointer).length > 0) {
        return;
      }
      this.burst?.explode(this.params.explodeCount, pointer.worldX, pointer.worldY);
    });
  }

  /** 粒子事件挂在发射器上,这里记录最近一次供 readout 展示。 */
  private hookEmitterEvents() {
    for (const emitter of [this.fountain!, this.burst!]) {
      for (const name of EMITTER_EVENTS) {
        emitter.on(name, () => {
          this.lastEvent = `${name}(${emitter === this.burst ? 'burst' : 'fountain'})`;
        });
      }
    }
  }

  /** Controls 入口:数值参数用 setter 热调;scale 曲线变化时用全量配置
   *  updateConfig 重载(曲线只能经 setConfig 安装,且 setConfig 会用配置
   *  里的旧值覆盖 setter 的热调,所以这里始终同步整份配置作单一真源)。 */
  applyParams(params: ParticlesParams) {
    if (!this.ready) {
      this.pending = params;
      return;
    }
    const prev = this.params;
    this.params = params;
    const fountain = this.fountain!;

    const tint =
      params.tintMode === 'solid' ? hexToTint(params.tintColor) : RANDOM_TINTS;

    // scale 曲线:{start,end,ease} 是 onUpdate 运算符,存活粒子的缩放按生命
    // 进度实时插值——改曲线会立刻影响已在空中的粒子
    const scaleChanged =
      params.scaleStart !== prev.scaleStart ||
      params.scaleEnd !== prev.scaleEnd ||
      params.ease !== prev.ease;

    if (scaleChanged) {
      fountain.updateConfig({
        speed: params.speed,
        lifespan: params.lifespan,
        frequency: params.frequency,
        quantity: params.quantity,
        gravityY: params.gravityY,
        tint,
        scale: {
          start: params.scaleStart,
          end: params.scaleEnd,
          ease: params.ease,
        },
      });
    } else {
      // 节奏与寿命:emit-only 运算符,出生时抽样一次(不触发 setConfig 重置)
      fountain.setParticleSpeed(params.speed);
      fountain.setParticleLifespan(params.lifespan);
      fountain.setFrequency(params.frequency, params.quantity);
      fountain.gravityY = params.gravityY;
      fountain.setParticleTint(tint);
    }
    this.burst!.gravityY = params.gravityY;
    this.burst!.setParticleTint(tint);

    // blendMode:ADD 叠加发光 / NORMAL 普通绘制
    const blend = params.blendAdd ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL;
    fountain.setBlendMode(blend);
    this.trail!.setBlendMode(blend);
    this.burst!.setBlendMode(blend);

    // edge 发射区:同一开关只添加一次,关闭时清空
    if (params.emitZone && !this.fountainZoneOn) {
      fountain.addEmitZone({
        type: 'edge',
        source: new Phaser.Geom.Circle(FOUNTAIN_X, FOUNTAIN_Y, ZONE_RADIUS),
        quantity: 48,
      });
      this.fountainZoneOn = true;
    } else if (!params.emitZone && this.fountainZoneOn) {
      fountain.clearEmitZones();
      this.fountainZoneOn = false;
    }

    // 地面死亡区:粒子进入矩形(onEnter)立即死亡,活不过剩余寿命
    if (params.deathZone && !this.deathZoneOn) {
      fountain.addDeathZone({
        source: new Phaser.Geom.Rectangle(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y),
        type: 'onEnter',
      });
      this.deathZoneOn = true;
    } else if (!params.deathZone && this.deathZoneOn) {
      fountain.clearDeathZones();
      this.deathZoneOn = false;
    }
  }

  private report() {
    const fountain = this.fountain!;
    this.emitSnapshot({
      fountain: {
        alive: fountain.getAliveParticleCount(),
        pool: fountain.getParticleCount(),
        emitting: fountain.emitting,
        emittedTotal: this.emittedTotal,
      },
      trail: {
        alive: this.trail!.getAliveParticleCount(),
        pool: this.trail!.getParticleCount(),
        target: {
          x: Math.round(this.jet?.x ?? 0),
          y: Math.round(this.jet?.y ?? 0),
        },
      },
      burst: {
        alive: this.burst!.getAliveParticleCount(),
        pool: this.burst!.getParticleCount(),
      },
      frequency: fountain.frequency,
      quantity: this.params.quantity,
      speed: this.params.speed,
      lifespan: this.params.lifespan,
      gravityY: this.params.gravityY,
      tint:
        this.params.tintMode === 'solid'
          ? `solid ${this.params.tintColor}`
          : `random [${RANDOM_TINTS.length} 色]`,
      blendMode: this.params.blendAdd ? 'ADD' : 'NORMAL',
      lastEvent: this.lastEvent,
    });
  }
}

export function createParticlesLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ParticlesSnapshot) => void,
): ParticlesInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new ParticlesLabScene();
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
    applyParams(params: ParticlesParams) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
