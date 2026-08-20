/**
 * 范例:补间时间结构实验台。
 * 输入(Controls):duration、delay、repeat(-1 无限)、yoyo、hold、repeatDelay、
 * ease(Linear / Sine.easeInOut,曲线形状见 2.3.3)、paused(以暂停状态创建)。
 * 主要操作:任一 Controls 参数变化 → applyTweens 立即 killTweensOf 并按当前
 * 参数重建补间;小球沿水平轨道从左端插值到右端。
 * 预期结果:totalDuration 随 repeat / yoyo / hold / repeatDelay 组合按源码公式
 * 变化;delay 期间 totalProgress 停在 0;repeat 为 -1 时 isInfinite = true 且
 * 永不完成;paused 创建时 isPaused = true、属性不动。
 * 阅读主线:makeBallTexture(自包含纹理)→ create(轨道与对象)
 * → applyTweens(Controls 入口,重建补间)→ report(每帧证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的时间结构参数,变化即重建补间。 */
export interface TweenLabParams {
  /** 单程时长,ms */
  duration: number;
  /** 启动前等待,ms(不计入 totalDuration) */
  delay: number;
  /** 属性级重复次数;-1 无限 */
  repeat: number;
  /** 到终点后按同 duration 折返 */
  yoyo: boolean;
  /** 到终点后的停留,ms */
  hold: number;
  /** 两次 repeat 之间的等待,ms */
  repeatDelay: number;
  /** 缓动名称;形状与选型属于 2.3.3,本课只作参数 */
  ease: 'Linear' | 'Sine.easeInOut';
  /** 以暂停状态创建,验证 paused 配置与 play() 的关系 */
  paused: boolean;
}

/** readout 用的派生读数:全部来自 tween 真实属性。 */
export interface TweenLabSnapshot {
  /** 补间是否还活着(播完自动销毁后为 false) */
  alive: boolean;
  /** States 枚举名,如 ACTIVE / START_DELAY / PENDING_REMOVE */
  state: string;
  isPlaying: boolean;
  isPaused: boolean;
  isInfinite: boolean;
  /** 本程进度 0–1(不含 repeat / loop) */
  progress: number;
  /** 全程进度 0–1(含 repeat / loop) */
  totalProgress: number;
  elapsed: number;
  totalDuration: number;
  /** 小球当前 x,即被插值属性的实时值 */
  x: number;
}

export interface TweenLabInstance {
  applyTweens(params: TweenLabParams): void;
  dispose(): void;
}

const BALL_KEY = 'tween-lab-ball';
const TRACK_Y = 190;
const START_X = 80;
const END_X = GAME_WIDTH - 80;

class TweenLabScene extends Phaser.Scene {
  private ball?: Phaser.GameObjects.Image;
  private tween?: Phaser.Tweens.Tween;
  /** 场景就绪前暂存 Controls 参数;create 后按它建首个补间。 */
  private pendingParams?: TweenLabParams;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: TweenLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'TweenLab' });
  }

  preload() {
    this.makeBallTexture();
  }

  create() {
    this.drawTrack();
    this.ball = this.add.image(START_X, TRACK_Y, BALL_KEY);
    this.add
      .text(12, GAME_HEIGHT - 20, '小球 x 从 ' + START_X + ' 插值到 ' + END_X + ' · 参数变化即重建补间', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#8fa3c8',
      })
      .setOrigin(0, 0.5);

    if (this.pendingParams) {
      this.applyTweens(this.pendingParams);
    }
    this.report();
  }

  override update() {
    this.report();
  }

  /** Controls 入口:销毁旧补间,按当前参数重建。 */
  applyTweens(params: TweenLabParams) {
    this.pendingParams = params;
    const ball = this.ball;
    if (!ball) {
      return; // 场景尚未就绪,create() 会用 pendingParams 补建
    }

    this.tweens.killTweensOf(ball);
    ball.setPosition(START_X, TRACK_Y);
    this.tween = this.tweens.add({
      targets: ball,
      x: END_X,
      duration: params.duration,
      delay: params.delay,
      repeat: params.repeat,
      yoyo: params.yoyo,
      hold: params.hold,
      repeatDelay: params.repeatDelay,
      ease: params.ease,
      paused: params.paused,
    });
  }

  private report() {
    const tween = this.tween;
    if (!tween) {
      return;
    }

    // tween.destroy() 只清引用不置空本地变量,用 targets 判断是否仍活着
    const alive = tween.targets !== null;
    this.emitSnapshot({
      alive,
      state: alive ? Phaser.Tweens.States[tween.state] : 'DESTROYED',
      isPlaying: alive && tween.isPlaying(),
      isPaused: alive && tween.isPaused(),
      isInfinite: alive && tween.isInfinite,
      progress: tween.progress,
      totalProgress: tween.totalProgress,
      elapsed: tween.elapsed,
      totalDuration: tween.totalDuration,
      x: this.ball?.x ?? START_X,
    });
  }

  /** 轨道 + 起终点刻度,让"插值到哪了"一眼可读。 */
  private drawTrack() {
    const track = this.add.graphics();
    track.lineStyle(2, 0x3b4a6b, 1);
    track.lineBetween(START_X, TRACK_Y, END_X, TRACK_Y);
    track.lineStyle(1, 0x253048, 1);
    for (let x = START_X + 80; x < END_X; x += 80) {
      track.lineBetween(x, TRACK_Y - 6, x, TRACK_Y + 6);
    }
  }

  /** 自包含素材:实心圆 + 内部方向点,插值进度肉眼可辨。 */
  private makeBallTexture() {
    if (this.textures.exists(BALL_KEY)) {
      return;
    }
    const g = this.make.graphics();
    g.fillStyle(0x60a5fa, 1);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0x141a26, 1);
    g.fillCircle(16, 16, 5);
    g.generateTexture(BALL_KEY, 32, 32);
    g.destroy();
  }
}

export function createTweenLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TweenLabSnapshot) => void,
): TweenLabInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new TweenLabScene();
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
    applyTweens(params: TweenLabParams) {
      scene.applyTweens(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
