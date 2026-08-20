/**
 * 范例:链式(chain)与错峰(stagger)。
 * 输入(Controls):staggerGap(多目标 delay 错开间隔,ms,变化即重建右侧补间)。
 * 主要操作:左侧小球用 this.tweens.chain 三步串行(右移 → 淡出 → 回位,
 * loop 无限循环);右侧五枚圆点用一条 tween + delay: stagger 依次错开启动。
 * 预期结果:左球严格分三阶段动作,当前步读数 1→2→3 循环;右侧圆点按
 * staggerGap 依次启动,间隔设 0 时五点同步;两侧 getTweensOf 均只数到 1
 * ——chain 是一条 TweenChain,stagger 是一条 tween 管多目标。
 * 阅读主线:create(两侧对象)→ buildChain / buildStagger(两个入口)
 * → report(每帧证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:错开间隔,变化即重建右侧补间。 */
export interface TweenChainParams {
  /** 多目标 delay 依次错开的毫秒数;0 表示全部同时启动 */
  staggerGap: number;
}

/** readout 用的派生读数:全部来自 chain / tween 真实属性。 */
export interface TweenChainSnapshot {
  /** 当前正在播放的 chain 子步(1–3) */
  chainStep: number;
  chainSteps: number;
  /** 当前子步自身的播放进度 0–1(取自 currentTween.progress) */
  chainStepProgress: number;
  /** 当前子步的属性名,证明链上各步可以插值不同属性 */
  chainStepKeys: string;
  /** 左球(chain 目标)在 TweenManager 中的补间数 */
  chainTweenCount: number;
  /** 右侧圆点(stagger 目标)在 TweenManager 中的补间数 */
  staggerTweenCount: number;
  /** 首个圆点与末个圆点的 delay 差,验证 stagger 生效范围 */
  staggerSpan: number;
}

export interface TweenChainInstance {
  applyStaggerGap(params: TweenChainParams): void;
  dispose(): void;
}

const CHAIN_BALL_KEY = 'tween-chain-ball';
const DOT_KEY = 'tween-chain-dot';
const CHAIN_Y = 140;
const CHAIN_X0 = 80;
const CHAIN_X1 = 320;
const DOTS_X = 470;
const DOTS_X_END = 660;
const DOT_COUNT = 5;
const DOT_GAP_Y = 44;
const DOTS_Y0 = 76;

class TweenChainScene extends Phaser.Scene {
  private chainBall?: Phaser.GameObjects.Image;
  private dots: Phaser.GameObjects.Image[] = [];
  private chain?: Phaser.Tweens.TweenChain;
  private staggerTween?: Phaser.Tweens.Tween;
  private pendingGap?: number;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: TweenChainSnapshot) => void = () => {};

  constructor() {
    super({ key: 'TweenChain' });
  }

  preload() {
    if (!this.textures.exists(CHAIN_BALL_KEY)) {
      const ball = this.make.graphics();
      ball.fillStyle(0x34d399, 1);
      ball.fillCircle(16, 16, 16);
      ball.fillStyle(0x141a26, 1);
      ball.fillCircle(16, 16, 5);
      ball.generateTexture(CHAIN_BALL_KEY, 32, 32);
      ball.destroy();
    }
    if (!this.textures.exists(DOT_KEY)) {
      const dot = this.make.graphics();
      dot.fillStyle(0xf472b6, 1);
      dot.fillCircle(10, 10, 10);
      dot.generateTexture(DOT_KEY, 20, 20);
      dot.destroy();
    }
  }

  create() {
    this.drawGuides();
    this.chainBall = this.add.image(CHAIN_X0, CHAIN_Y, CHAIN_BALL_KEY);
    for (let i = 0; i < DOT_COUNT; i++) {
      this.dots.push(this.add.image(DOTS_X, DOTS_Y0 + i * DOT_GAP_Y, DOT_KEY));
    }

    this.buildChain();
    this.buildStagger(this.pendingGap ?? 150);
    this.report();
  }

  override update() {
    this.report();
  }

  /** Controls 入口:间隔变化即重建右侧 stagger 补间。 */
  applyStaggerGap(params: TweenChainParams) {
    this.pendingGap = params.staggerGap;
    if (this.dots.length > 0) {
      this.buildStagger(params.staggerGap);
    }
  }

  /** 左侧:三步串行,子补间继承顶层 targets,整体无限循环。 */
  private buildChain() {
    const ball = this.chainBall;
    if (!ball) {
      return;
    }

    this.chain = this.tweens.chain({
      targets: ball,
      tweens: [
        { x: CHAIN_X1 },                          // 继承顶层 targets;duration 缺省走默认
        { alpha: 0.2, duration: 400 },            // 第二步:淡出
        { x: CHAIN_X0, alpha: 1, duration: 800 }, // 第三步:回位并恢复
      ],
      loop: -1,
    });
  }

  /** 右侧:一条 tween 管五个圆点,stagger 让 delay 依次错开。 */
  private buildStagger(gap: number) {
    this.tweens.killTweensOf(this.dots);
    for (const dot of this.dots) {
      dot.setPosition(DOTS_X, dot.y);
    }
    this.staggerTween = this.tweens.add({
      targets: this.dots,
      x: DOTS_X_END,
      duration: 900,
      ease: 'Sine.easeInOut',
      delay: this.tweens.stagger(gap),
      yoyo: true,
      repeat: -1,
    });
  }

  private report() {
    const chain = this.chain;
    if (!chain) {
      return;
    }

    // chain.data 存的是子 Tween 数组;currentTween 即正在播放的那一步
    const children = chain.data as Phaser.Tweens.Tween[];
    const current = chain.currentTween;
    // 子步的 data 是 TweenData 数组,每条对应一个目标×属性
    const keys = current
      ? (current.data as Phaser.Tweens.TweenData[])
          .map((d) => d.key)
          .join(', ')
      : '';

    this.emitSnapshot({
      chainStep: chain.currentIndex + 1,
      chainSteps: children.length,
      chainStepProgress: current ? current.progress : 0,
      chainStepKeys: keys,
      chainTweenCount: this.chainBall
        ? this.tweens.getTweensOf(this.chainBall).length
        : 0,
      staggerTweenCount:
        this.dots.length > 0 ? this.tweens.getTweensOf(this.dots).length : 0,
      staggerSpan: (DOT_COUNT - 1) * (this.pendingGap ?? 0),
    });
  }

  /** 两侧标题与轨道参考线。 */
  private drawGuides() {
    const guides = this.add.graphics();
    guides.lineStyle(2, 0x3b4a6b, 1);
    guides.lineBetween(CHAIN_X0, CHAIN_Y, CHAIN_X1, CHAIN_Y);
    guides.lineBetween(DOTS_X, DOTS_Y0 - 12, DOTS_X, DOTS_Y0 + (DOT_COUNT - 1) * DOT_GAP_Y + 12);
    guides.lineBetween(DOTS_X_END, DOTS_Y0 - 12, DOTS_X_END, DOTS_Y0 + (DOT_COUNT - 1) * DOT_GAP_Y + 12);

    const style = {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '12px',
      color: '#8fa3c8',
    };
    this.add.text(CHAIN_X0 - 20, 60, 'chain:三步串行,循环', style);
    this.add.text(DOTS_X - 20, 48, 'stagger:五目标错峰', style);
    this.add
      .text(12, GAME_HEIGHT - 20, '左:一条 TweenChain 串三步 · 右:一条 tween 用 stagger 管五个目标', style)
      .setOrigin(0, 0.5);
  }
}

export function createTweenChain(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TweenChainSnapshot) => void,
): TweenChainInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new TweenChainScene();
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
    applyStaggerGap(params: TweenChainParams) {
      scene.applyStaggerGap(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
