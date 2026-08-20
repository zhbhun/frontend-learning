/**
 * 范例:动画事件流、chain 队列与全局动画的移除。
 * 输入:「播放有限动画」开关;「移除全局动画 sweep-once」开关。
 * 前置状态:两个全局动画共用同一张雪碧图——sweep-once(repeat: 0,
 * 只播一遍)与 fill-loop(repeat: -1,无限循环);精灵未播放。
 * 主要操作:打开播放 → sprite.play('sweep-once') 并 chain('fill-loop'),
 * 有限动画走完触发 animationcomplete 后自动接续链上的 fill-loop;
 * 关闭播放 → stop(),对照 animationstop 与 animationcomplete 的区别;
 * 打开移除 → this.anims.remove('sweep-once'),exists 变 false,
 * 再播放同名 key 只会 console.warn('Missing animation') 而不播放。
 * 预期结果:readout 显示六类事件计数(start/update/repeat/complete/
 * complete-key/stop)、最近事件、当前动画与 nextAnim(链上待接续的动画)。
 * 阅读主线:create(两个动画 + 事件接线)→ setPlaying/setRemoved
 * (Controls 入口)→ report。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  FRAME_COUNT,
  GAME_HEIGHT,
  GAME_WIDTH,
  SHEET_KEY,
  TEXT_STYLE,
  TITLE_STYLE,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';
import sheetUrl from './gauge-sheet.png?url&no-inline';

export const ONCE_KEY = 'sweep-once';
export const LOOP_KEY = 'fill-loop';

export interface EventsSnapshot {
  counts: string;
  lastEvent: string;
  currentAnim: string;
  nextAnim: string;
  onceExists: string;
  managerPaused: string;
  frameNow: string;
}

export interface EventsInstance {
  setPlaying(playing: boolean): void;
  setRemoved(removed: boolean): void;
  dispose(): void;
}

interface EventsArgs {
  playing: boolean;
  removed: boolean;
}

const EVENT_LABELS = [
  ['animationstart', Phaser.Animations.Events.ANIMATION_START],
  ['animationupdate', Phaser.Animations.Events.ANIMATION_UPDATE],
  ['animationrepeat', Phaser.Animations.Events.ANIMATION_REPEAT],
  ['animationcomplete', Phaser.Animations.Events.ANIMATION_COMPLETE],
  ['animationstop', Phaser.Animations.Events.ANIMATION_STOP],
  ['animationrestart', Phaser.Animations.Events.ANIMATION_RESTART],
] as const;

class EventsScene extends Phaser.Scene {
  private sprite?: Phaser.GameObjects.Sprite;
  private counts: Record<string, number> = {};
  private completeKeyCount = 0;
  private lastEvent = '(未触发)';

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout */
  emitSnapshot: (snapshot: EventsSnapshot) => void = () => {};

  constructor() {
    super({ key: 'EventsLab' });
  }

  preload() {
    this.load.spritesheet(SHEET_KEY, sheetUrl, {
      frameWidth: 64,
      frameHeight: 64,
    });
  }

  create() {
    // 两个全局动画:一个有限(repeat: 0 播一遍就 complete),一个无限循环
    this.anims.create({
      key: ONCE_KEY,
      frames: this.anims.generateFrameNumbers(SHEET_KEY, {
        start: 0,
        end: FRAME_COUNT - 1,
      }),
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: LOOP_KEY,
      frames: this.anims.generateFrameNumbers(SHEET_KEY, {
        start: FRAME_COUNT - 1,
        end: 0,
      }),
      frameRate: 6,
      repeat: -1,
    });

    this.sprite = this.add
      .sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 44, SHEET_KEY, 0)
      .setScale(3);
    this.add
      .text(GAME_WIDTH / 2, 28, 'play(有限) → chain(循环):complete 后自动接续', TITLE_STYLE)
      .setOrigin(0.5);
    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 24,
        'sweep-once: repeat 0,正向 8 帧;fill-loop: 反向 8 帧,repeat -1',
        TEXT_STYLE,
      )
      .setOrigin(0.5);

    // 事件接线全部在精灵上;回调参数统一是 (anim, frame, gameObject, frameKey)
    for (const [label, event] of EVENT_LABELS) {
      this.counts[label] = 0;
      this.sprite.on(event, (anim: Phaser.Animations.Animation) => {
        this.counts[label] += 1;
        this.lastEvent = `${label}(${anim.key})`;
      });
    }
    // 按 key 订阅变体:animationcomplete- + 动画 key
    this.sprite.on(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + ONCE_KEY,
      () => {
        this.completeKeyCount += 1;
      },
    );

    this.report();
  }

  override update() {
    this.report();
  }

  /** Controls 入口:开 → 播有限动画并排入链;关 → 清空链后 stop 触发 animationstop */
  setPlaying(playing: boolean) {
    if (!this.sprite) {
      return;
    }
    if (playing) {
      this.sprite.play(ONCE_KEY);
      // 当前动画进入完成/停止状态后接续 fill-loop;链是精灵自己的,不影响全局
      this.sprite.chain(LOOP_KEY);
    } else if (this.sprite.anims.isPlaying || this.sprite.anims.isPaused) {
      // stop 会消费链队列并立即接续下一个动画;先 chain() 清空队列才是"彻底停住"
      this.sprite.chain();
      this.sprite.stop();
    }
  }

  /** Controls 入口:移除/重建全局动画,演示 exists 与 Missing animation 警告 */
  setRemoved(removed: boolean) {
    if (!this.anims) {
      // 首次 apply 可能早于场景 boot(anims 尚未注入),Controls 后续变化会重新进入
      return;
    }
    if (removed) {
      this.anims.remove(ONCE_KEY);
    } else if (!this.anims.exists(ONCE_KEY)) {
      this.createOnceAnim();
    }
  }

  private createOnceAnim() {
    this.anims.create({
      key: ONCE_KEY,
      frames: this.anims.generateFrameNumbers(SHEET_KEY, {
        start: 0,
        end: FRAME_COUNT - 1,
      }),
      frameRate: 8,
      repeat: 0,
    });
  }

  private report() {
    if (!this.sprite) {
      return;
    }
    const state = this.sprite.anims;

    this.emitSnapshot({
      counts: EVENT_LABELS.map(([label]) => `${label} ${this.counts[label] ?? 0}`).join(
        ' · ',
      ) + ` · complete-key ${this.completeKeyCount}`,
      lastEvent: this.lastEvent,
      currentAnim: state.getName() || '(未加载)',
      // nextAnim:链上待接续的动画,完成/停止后取走并清空
      nextAnim:
        (typeof state.nextAnim === 'string' ? state.nextAnim : '(配置对象)') ||
        '(空)',
      onceExists: String(this.anims.exists(ONCE_KEY)),
      managerPaused: String(this.anims.paused),
      frameNow: String(state.currentFrame?.textureFrame ?? '(无)'),
    });
  }
}

export function createEventsLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EventsSnapshot) => void,
): EventsInstance {
  let playing = false;
  let removed = false;

  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new EventsScene();
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
    // 移除后仍然照常尝试 play:控制台出现 Missing animation 警告,精灵不播放
    setPlaying(value: boolean) {
      playing = value;
      scene.setPlaying(playing);
    },
    setRemoved(value: boolean) {
      removed = value;
      scene.setRemoved(removed);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}

export type { EventsArgs };
