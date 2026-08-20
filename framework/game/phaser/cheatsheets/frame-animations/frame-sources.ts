/**
 * 范例:动画帧的两种来源——雪碧图帧序号 vs 图集帧名。
 * 输入:「播放」开关(两个精灵同步播放/停止)。
 * 前置状态:同一张 gauge-sheet.png 以两种方式加载:
 *   load.spritesheet → 按等分格子切帧,帧用序号引用;
 *   load.atlas + gauge-atlas.json → 同一些格子获得名字 gauge_00…gauge_07。
 * 主要操作:左侧动画用 generateFrameNumbers(SHEET_KEY, { start: 0, end: 7 }),
 * 右侧用 generateFrameNames(ATLAS_KEY, { prefix, start, end, zeroPad }),
 * 两者播放完全相同的 8 帧序列。
 * 预期结果:readout 中左精灵 textureFrame 是数字序号、右精灵是字符串帧名,
 * 两边 index(动画内序号,从 1 计)与 getTotalFrames 完全一致——像素相同,
 * 只是帧的"地址"不同。
 * 阅读主线:preload(两种加载)→ create(两条生成通路)→ setPlayback → report。
 */
import Phaser from 'phaser';
import {
  ATLAS_KEY,
  BACKGROUND_COLOR,
  FRAME_COUNT,
  FRAME_PREFIX,
  FRAME_ZERO_PAD,
  GAME_HEIGHT,
  GAME_WIDTH,
  SHEET_KEY,
  TEXT_STYLE,
  TITLE_STYLE,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';
// 同一张 PNG 分别作为雪碧图与图集加载;Vite ?url&no-inline 保证拿到真实 HTTP URL
import gaugePngUrl from './gauge-sheet.png?url&no-inline';
import atlasJsonUrl from './gauge-atlas.json?url&no-inline';

/** 左右两个动画共用同一份播放参数,保证序列逐帧对齐 */
const PLAYBACK = { frameRate: 6, repeat: -1 } as const;
export const BY_INDEX_KEY = 'fill-by-index';
export const BY_NAME_KEY = 'fill-by-name';

export interface FrameSourcesSnapshot {
  playing: boolean;
  sheetAnimExists: boolean;
  atlasAnimExists: boolean;
  indexTextureFrame: string;
  nameTextureFrame: string;
  frameIndexInAnim: string;
  totalFrames: string;
  indexFrames: string;
  nameFrames: string;
}

export interface FrameSourcesInstance {
  setPlayback(playing: boolean): void;
  dispose(): void;
}

class FrameSourcesScene extends Phaser.Scene {
  private byIndex?: Phaser.GameObjects.Sprite;
  private byName?: Phaser.GameObjects.Sprite;
  private generatedCounts = { index: 0, name: 0 };

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout */
  emitSnapshot: (snapshot: FrameSourcesSnapshot) => void = () => {};

  constructor() {
    super({ key: 'FrameSources' });
  }

  preload() {
    // 同一张 PNG 走两条加载通路:雪碧图按 frameWidth 等分切帧,图集按 JSON 命名帧
    this.load.spritesheet(SHEET_KEY, gaugePngUrl, {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.atlas(ATLAS_KEY, gaugePngUrl, atlasJsonUrl);
  }

  create() {
    const label = (x: number, text: string) =>
      this.add.text(x, GAME_HEIGHT / 2 - 92, text, TEXT_STYLE).setOrigin(0.5);
    const title = (x: number, text: string) =>
      this.add.text(x, GAME_HEIGHT / 2 - 116, text, TITLE_STYLE).setOrigin(0.5);

    title(GAME_WIDTH / 2 - 170, '雪碧图 · 帧序号');
    title(GAME_WIDTH / 2 + 170, '图集 · 帧名');

    // 通路一:generateFrameNumbers——start/end 是帧序号(0 基)
    const indexFrames = this.anims.generateFrameNumbers(SHEET_KEY, {
      start: 0,
      end: FRAME_COUNT - 1,
    });
    this.generatedCounts.index = indexFrames.length;

    // 通路二:generateFrameNames——prefix + 数字 + zeroPad 拼出帧名
    const nameFrames = this.anims.generateFrameNames(ATLAS_KEY, {
      prefix: FRAME_PREFIX,
      start: 0,
      end: FRAME_COUNT - 1,
      zeroPad: FRAME_ZERO_PAD,
    });
    this.generatedCounts.name = nameFrames.length;

    this.anims.create({
      key: BY_INDEX_KEY,
      frames: indexFrames,
      ...PLAYBACK,
    });
    this.anims.create({
      key: BY_NAME_KEY,
      frames: nameFrames,
      ...PLAYBACK,
    });

    this.byIndex = this.add
      .sprite(GAME_WIDTH / 2 - 170, GAME_HEIGHT / 2 - 24, SHEET_KEY, 0)
      .setScale(2);
    this.byName = this.add
      .sprite(GAME_WIDTH / 2 + 170, GAME_HEIGHT / 2 - 24, ATLAS_KEY, `${FRAME_PREFIX}00`)
      .setScale(2);

    label(GAME_WIDTH / 2 - 170, 'generateFrameNumbers({ start: 0, end: 7 })');
    label(GAME_WIDTH / 2 + 170, `generateFrameNames({ prefix: '${FRAME_PREFIX}', zeroPad: ${FRAME_ZERO_PAD} })`);

    this.byIndex.play(BY_INDEX_KEY);
    this.byName.play(BY_NAME_KEY);
    this.report();
  }

  override update() {
    this.report();
  }

  /** Controls 入口:开 → 两个动画都从头播;关 → 停在当前帧 */
  setPlayback(playing: boolean) {
    if (playing) {
      this.byIndex?.play(BY_INDEX_KEY);
      this.byName?.play(BY_NAME_KEY);
    } else {
      this.byIndex?.stop();
      this.byName?.stop();
    }
  }

  private report() {
    if (!this.byIndex || !this.byName) {
      return;
    }
    const left = this.byIndex.anims;
    const right = this.byName.anims;

    this.emitSnapshot({
      playing: left.isPlaying,
      sheetAnimExists: this.anims.exists(BY_INDEX_KEY),
      atlasAnimExists: this.anims.exists(BY_NAME_KEY),
      // 雪碧图帧的 textureFrame 是数字;图集帧是字符串名
      indexTextureFrame: String(left.currentFrame?.textureFrame ?? '(无)'),
      nameTextureFrame: String(right.currentFrame?.textureFrame ?? '(无)'),
      frameIndexInAnim: `${left.currentFrame?.index ?? 0} / ${right.currentFrame?.index ?? 0}`,
      totalFrames: `${left.getTotalFrames()} / ${right.getTotalFrames()}`,
      indexFrames: `generateFrameNumbers → ${this.generatedCounts.index} 帧`,
      nameFrames: `generateFrameNames → ${this.generatedCounts.name} 帧`,
    });
  }
}

export function createFrameSources(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FrameSourcesSnapshot) => void,
): FrameSourcesInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new FrameSourcesScene();
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
    setPlayback(playing: boolean) {
      scene.setPlayback(playing);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
