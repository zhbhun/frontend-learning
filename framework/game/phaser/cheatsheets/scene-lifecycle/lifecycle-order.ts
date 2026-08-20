/**
 * 范例:生命周期方法的执行顺序。
 * 输入:「场景重启次数」控件,每加一调用一次 this.scene.restart()。
 * 主要操作:场景在 init/preload/create 中记录阶段日志与调用次数,
 * update 每帧自增帧号;restart 后阶段顺序重走一遍。
 * 预期结果:读数显示 init → preload → create 顺序、各阶段次数、update 帧号
 * (重启后归零)与实例字段 visits(跨重启累加,证明 Scene 实例被复用)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/* 16×16 橙色方块 PNG 的 data URI,让 preload 走真实加载管线且自包含。 */
const BLOCK_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGUlEQVR4nGP40KTxnxLMMGrAqAGjBgwXAwAxuZkf80ueSQAAAABJRU5ErkJggg==';

export const STATUS_LABELS = [
  'PENDING (0)',
  'INIT (1)',
  'START (2)',
  'LOADING (3)',
  'CREATING (4)',
  'RUNNING (5)',
  'PAUSED (6)',
  'SLEEPING (7)',
  'SHUTDOWN (8)',
  'DESTROYED (9)',
];

export interface LifecycleOrderSnapshot {
  stageLog: string;
  initCount: number;
  preloadCount: number;
  createCount: number;
  updateFrame: number;
  visits: number;
  status: string;
}

export interface LifecycleOrderInstance {
  requestRestarts(count: number): void;
  dispose(): void;
}

class LifecycleScene extends Phaser.Scene {
  /** 跨重启保留的实例字段:只在 constructor 初始化,从不重置。 */
  visits = 0;

  /** 每轮启动应重置的状态,统一放在 init。 */
  private initCount = 0;
  private preloadCount = 0;
  private createCount = 0;
  private updateFrame = 0;
  private stageLog: string[] = ['(未启动)'];
  private block?: Phaser.GameObjects.Image;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: LifecycleOrderSnapshot) => void = () => {};

  constructor() {
    super({ key: 'Lifecycle' });
  }

  init() {
    this.initCount += 1;
    this.updateFrame = 0;
    this.stageLog = [`init #${this.initCount}`];
    this.report();
  }

  preload() {
    this.preloadCount += 1;
    this.stageLog.push(`preload #${this.preloadCount}`);
    // 只排队,不等待;方法返回后加载器才启动
    this.load.image('block', BLOCK_DATA_URI);
    this.report();
  }

  create() {
    this.createCount += 1;
    this.visits += 1;
    this.stageLog.push(`create #${this.createCount}`);

    this.add.text(24, 20, `Lifecycle 场景 · 第 ${this.visits} 次启动`, {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '18px',
      color: '#e2e8f0',
    });
    this.add.text(24, 48, 'init 重置状态 → preload 排队 → create 重建画面', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '13px',
      color: '#8fa3c8',
    });
    this.block = this.add.image(80, GAME_HEIGHT / 2, 'block');
    this.block.setScale(2);
    this.report();
  }

  override update(time: number) {
    this.updateFrame += 1;

    // 方块沿水平方向往返移动,证明 update 正在执行
    if (this.block) {
      const span = GAME_WIDTH - 160;
      const phase = ((time / 4000) % 2 + 2) % 2;
      const forward = phase < 1 ? phase : 2 - phase;
      this.block.x = 80 + forward * span;
    }

    if (this.updateFrame % 6 === 0 || this.updateFrame < 6) {
      this.report();
    }
  }

  private report() {
    this.emitSnapshot({
      stageLog: this.stageLog.join(' → '),
      initCount: this.initCount,
      preloadCount: this.preloadCount,
      createCount: this.createCount,
      updateFrame: this.updateFrame,
      visits: this.visits,
      status:
        STATUS_LABELS[this.sys.settings.status] ??
        String(this.sys.settings.status),
    });
  }
}

export function createLifecycleOrder(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LifecycleOrderSnapshot) => void,
): LifecycleOrderInstance {
  let appliedRestarts = 0;

  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [LifecycleScene],
  });

  const scene = game.scene.getScene('Lifecycle') as LifecycleScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    requestRestarts(count: number) {
      while (appliedRestarts < count) {
        appliedRestarts += 1;
        game.scene.getScene('Lifecycle')?.scene.restart();
      }
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
