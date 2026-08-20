/**
 * 范例:播放控制与 PlayAnimationConfig 参数实验台(本课主范例)。
 * 输入:Controls 的 播放/暂停/反向 开关与 frameRate / repeat / yoyo 参数。
 * 前置状态:8 帧表盘雪碧图在 preload 用 load.spritesheet 切帧,
 * 全局动画 'fill' 只用默认参数创建一次——frameRate/repeat/yoyo 全部
 * 通过 play({ key, ... }) 的 PlayAnimationConfig 在播放时覆盖。
 * 主要操作:调节任一参数会重新加载动画并立即生效;「暂停」用
 * anims.pause()/resume(),与 stop 的区别由 isPaused 读数区分;
 * 「反向」对比 play 与 playReverse(yoyo 打开后观察 forward 读数来回翻转)。
 * 预期结果:readout 显示当前帧、动画内 index、生效参数副本(frameRate/
 * msPerFrame/repeat/yoyo/forward)、animationupdate 与 animationrepeat
 * 事件计数、剩余 repeatCounter——每个控件都对应一列可核对读数。
 * 阅读主线:preload → create(全局动画 + 事件计数)→ applyPlayback(Controls
 * 入口,演示 play/playReverse/pause/resume/stop)→ report。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  FRAME_COUNT,
  GAME_HEIGHT,
  GAME_WIDTH,
  SHEET_KEY,
  TEXT_STYLE,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';
import sheetUrl from './gauge-sheet.png?url&no-inline';

/** Controls 一次 apply 的全部输入;frameRate/repeat/yoyo 组成 PlayAnimationConfig */
export interface PlaybackParams {
  playing: boolean;
  paused: boolean;
  reverse: boolean;
  frameRate: number;
  repeat: number;
  yoyo: boolean;
}

export interface PlaybackSnapshot {
  isPlaying: string;
  isPaused: string;
  currentAnim: string;
  textureFrame: string;
  indexInAnim: string;
  totalFrames: string;
  effective: string;
  msPerFrame: string;
  forward: string;
  updateCount: string;
  repeatCount: string;
  repeatLeft: string;
}

export interface PlaybackInstance {
  applyPlayback(args: PlaybackParams): void;
  dispose(): void;
}

const FILL_KEY = 'fill';

class PlaybackScene extends Phaser.Scene {
  private sprite?: Phaser.GameObjects.Sprite;
  private updateCount = 0;
  private repeatCount = 0;
  private lastConfig = '';

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout */
  emitSnapshot: (snapshot: PlaybackSnapshot) => void = () => {};

  constructor() {
    super({ key: 'PlaybackLab' });
  }

  preload() {
    this.load.spritesheet(SHEET_KEY, sheetUrl, {
      frameWidth: 64,
      frameHeight: 64,
    });
  }

  create() {
    // 全局动画只用最简参数创建;播放参数交给 play({ key, ... }) 覆盖
    this.anims.create({
      key: FILL_KEY,
      frames: this.anims.generateFrameNumbers(SHEET_KEY, {
        start: 0,
        end: FRAME_COUNT - 1,
      }),
    });

    this.sprite = this.add
      .sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, SHEET_KEY, 0)
      .setScale(3);
    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 78,
        'frameRate / repeat / yoyo 经 play({ key, … }) 按次覆盖,不动全局定义',
        TEXT_STYLE,
      )
      .setOrigin(0.5);

    // 事件计数:animationupdate 每推进一帧 +1;animationrepeat 每重播一轮 +1
    this.sprite.on(Phaser.Animations.Events.ANIMATION_START, () => {
      this.updateCount = 0;
      this.repeatCount = 0;
    });
    this.sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => {
      this.updateCount += 1;
    });
    this.sprite.on(Phaser.Animations.Events.ANIMATION_REPEAT, () => {
      this.repeatCount += 1;
    });

    this.report();
  }

  override update() {
    this.report();
  }

  /** Controls 入口:参数变化 → 重新加载动画;暂停/恢复独立处理 */
  applyPlayback(args: PlaybackParams) {
    if (!this.sprite) {
      return;
    }
    const state = this.sprite.anims;

    if (!args.playing) {
      // stop:停在当前帧;与 pause 的区别看 isPaused 读数
      if (state.isPlaying || state.isPaused) {
        this.sprite.stop();
      }
      return;
    }

    // 任一播放参数变化都需要重新加载(直接改 state.frameRate 不影响已开始的播放)
    const configKey = JSON.stringify([
      args.frameRate,
      args.repeat,
      args.yoyo,
      args.reverse,
    ]);
    if (!state.currentAnim || configKey !== this.lastConfig) {
      const config: Phaser.Types.Animations.PlayAnimationConfig = {
        key: FILL_KEY,
        frameRate: args.frameRate,
        repeat: args.repeat,
        yoyo: args.yoyo,
      };
      if (args.reverse) {
        this.sprite.playReverse(config);
      } else {
        this.sprite.play(config);
      }
      this.lastConfig = configKey;
    }

    if (args.paused && state.isPlaying) {
      state.pause();
    } else if (!args.paused && state.isPaused) {
      state.resume();
    }
  }

  private report() {
    if (!this.sprite) {
      return;
    }
    const state = this.sprite.anims;
    const frame = state.currentFrame;

    this.emitSnapshot({
      isPlaying: String(state.isPlaying),
      // 暂停专用读数:pause 后 isPlaying 变 false,但 isPaused 为 true
      isPaused: String(state.isPaused),
      currentAnim: state.getName() || '(未加载)',
      textureFrame: String(frame?.textureFrame ?? '(无)'),
      indexInAnim: String(frame?.index ?? 0),
      totalFrames: String(state.getTotalFrames()),
      effective: `frameRate ${state.frameRate} · repeat ${state.repeat} · yoyo ${state.yoyo}`,
      msPerFrame: String(Math.round(state.msPerFrame)),
      forward: state.forward ? 'true(正放)' : 'false(倒放)',
      updateCount: String(this.updateCount),
      repeatCount: String(this.repeatCount),
      repeatLeft:
        state.repeat === -1
          ? '(repeat 为 -1,无限重播)'
          : String(state.repeatCounter),
    });
  }
}

export function createPlaybackLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PlaybackSnapshot) => void,
): PlaybackInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new PlaybackScene();
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
    applyPlayback(args: PlaybackParams) {
      scene.applyPlayback(args);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
