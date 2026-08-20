/**
 * 范例:补间播放控制台。
 * 输入(Controls):persist(是否以 persist:true 创建);画布内按钮提供
 * 暂停 / 恢复 / 重播 / 停止 / 跳到 50% / 完成 / 新建 七种即时操作。
 * 主要操作:小球做单程 2400ms 的 yoyo 无限往返;点击按钮调用对应 Tween 方法;
 * readout 同步状态、进度与九类事件计数(用配置回调计数)。
 * 预期结果:pause/resume 冻结与恢复 elapsed;seek 瞬移且不触发事件;
 * complete/stop 后非 persist 补间被销毁(按钮失效),persist 补间停在
 * FINISHED / REMOVED 且可 restart;onRepeat/onYoyo 计数按属性级触发。
 * 阅读主线:applyPersist(Controls 入口,重建)→ buildTween(创建与回调)
 * → addButtons(操作入口)→ report(每帧证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:切换即按新 persist 重建补间。 */
export interface TweenControlsParams {
  /** 以 persist:true 创建,播完 / 停止后保留可重播;false 播完即销毁 */
  persist: boolean;
}

/** 九类事件的触发次数,验证各事件的级别与频率。 */
export interface TweenEventCounts {
  active: number;
  start: number;
  update: number;
  repeat: number;
  yoyo: number;
  complete: number;
  stop: number;
  pause: number;
  resume: number;
}

/** readout 用的派生读数:全部来自 tween 真实属性与事件计数。 */
export interface TweenControlsSnapshot {
  alive: boolean;
  state: string;
  isPlaying: boolean;
  isPaused: boolean;
  elapsed: number;
  totalProgress: number;
  persist: boolean;
  /** TweenManager 中该目标的补间数量 */
  tweenCount: number;
  counts: TweenEventCounts;
}

export interface TweenControlsInstance {
  applyPersist(params: TweenControlsParams): void;
  dispose(): void;
}

const BALL_KEY = 'tween-ctrl-ball';
const TRACK_Y = 250;
const START_X = 80;
const END_X = GAME_WIDTH - 80;
const TWEEN_DURATION = 2400;

class TweenControlsScene extends Phaser.Scene {
  private ball?: Phaser.GameObjects.Image;
  private tween?: Phaser.Tweens.Tween;
  private counts: TweenEventCounts = createCounts();
  private createdPersist = false;
  private pendingPersist?: boolean;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: TweenControlsSnapshot) => void = () => {};

  constructor() {
    super({ key: 'TweenControls' });
  }

  preload() {
    if (!this.textures.exists(BALL_KEY)) {
      const g = this.make.graphics();
      g.fillStyle(0xfacc15, 1);
      g.fillCircle(16, 16, 16);
      g.fillStyle(0x141a26, 1);
      g.fillCircle(16, 16, 5);
      g.generateTexture(BALL_KEY, 32, 32);
      g.destroy();
    }
  }

  create() {
    this.drawTrack();
    this.ball = this.add.image(START_X, TRACK_Y, BALL_KEY);
    this.addButtons();
    this.buildTween(this.pendingPersist ?? false);
    this.report();
  }

  override update() {
    this.report();
  }

  /** Controls 入口:persist 变化时重建补间。 */
  applyPersist(params: TweenControlsParams) {
    this.pendingPersist = params.persist;
    if (this.ball && params.persist !== this.createdPersist) {
      this.buildTween(params.persist);
    }
  }

  /** 创建演示补间并挂九类配置回调计数;每次重建清零计数。 */
  private buildTween(persist: boolean) {
    const ball = this.ball;
    if (!ball) {
      return;
    }

    this.tweens.killTweensOf(ball);
    ball.setPosition(START_X, TRACK_Y);
    this.counts = createCounts();
    this.createdPersist = persist;
    this.tween = this.tweens.add({
      targets: ball,
      x: END_X,
      duration: TWEEN_DURATION,
      yoyo: true,
      repeat: -1,
      ease: 'Linear',
      persist,
      onActive: () => this.counts.active++,
      onStart: () => this.counts.start++,
      onUpdate: () => this.counts.update++,
      onRepeat: () => this.counts.repeat++,
      onYoyo: () => this.counts.yoyo++,
      onComplete: () => this.counts.complete++,
      onStop: () => this.counts.stop++,
      onPause: () => this.counts.pause++,
      onResume: () => this.counts.resume++,
    });
  }

  /** 七个操作按钮:直接调用对应 Tween 方法,readout 同步状态。 */
  private addButtons() {
    const labels: Array<[string, () => void]> = [
      ['暂停', () => this.tween?.pause()],
      ['恢复', () => this.tween?.resume()],
      [
        '重播',
        // restart 对 ACTIVE 是回到起点,对 FINISHED / REMOVED 是复活重播;
        // 对 DESTROYED 只在控制台警告,不恢复。
        () => this.tween?.restart(),
      ],
      ['停止', () => this.tween?.stop()],
      [
        '跳到 50%',
        // seek 按全程毫秒数定位;这里跳到首程中点(轨道中央),
        // 跳转过程不触发任何事件,计数不动。
        () => this.tween?.seek(TWEEN_DURATION / 2),
      ],
      // repeat: -1 的补间永不完成,complete() 让它立刻收尾并触发 onComplete
      ['完成', () => this.tween?.complete()],
      ['新建', () => this.buildTween(this.pendingPersist ?? false)],
    ];

    const startX = 64;
    const gap = 100;
    labels.forEach(([label, onClick], i) => {
      const btn = this.add
        .text(startX + i * gap, 60, label, {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '14px',
          color: '#dbe6f5',
          backgroundColor: '#253048',
          padding: { x: 10, y: 6 },
        })
        .setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', onClick);
    });
  }

  private report() {
    const tween = this.tween;
    const ball = this.ball;
    if (!tween || !ball) {
      return;
    }

    const alive = tween.targets !== null;
    this.emitSnapshot({
      alive,
      state: alive ? Phaser.Tweens.States[tween.state] : 'DESTROYED',
      isPlaying: alive && tween.isPlaying(),
      isPaused: alive && tween.isPaused(),
      elapsed: tween.elapsed,
      totalProgress: tween.totalProgress,
      persist: this.createdPersist,
      tweenCount: this.tweens.getTweensOf(ball).length,
      counts: { ...this.counts },
    });
  }

  /** 轨道 + 起终点刻度。 */
  private drawTrack() {
    const track = this.add.graphics();
    track.lineStyle(2, 0x3b4a6b, 1);
    track.lineBetween(START_X, TRACK_Y, END_X, TRACK_Y);
    track.lineStyle(1, 0x253048, 1);
    for (let x = START_X + 80; x < END_X; x += 80) {
      track.lineBetween(x, TRACK_Y - 6, x, TRACK_Y + 6);
    }
    this.add
      .text(12, GAME_HEIGHT - 20, 'yoyo 无限往返 · 2400ms · persist 切换即重建 · 按钮直接调用 Tween 方法', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#8fa3c8',
      })
      .setOrigin(0, 0.5);
  }
}

function createCounts(): TweenEventCounts {
  return {
    active: 0,
    start: 0,
    update: 0,
    repeat: 0,
    yoyo: 0,
    complete: 0,
    stop: 0,
    pause: 0,
    resume: 0,
  };
}

export function createTweenControls(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TweenControlsSnapshot) => void,
): TweenControlsInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new TweenControlsScene();
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
    applyPersist(params: TweenControlsParams) {
      scene.applyPersist(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
