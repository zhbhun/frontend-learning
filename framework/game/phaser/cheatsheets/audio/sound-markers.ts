/**
 * 范例:标记与音频精灵——一份音频文件按时间切片播放。
 * 输入(Controls):mode(manual=手动 addMarker 后 play(markerName);
 * sprite=load.audioSprite 的 json spritemap + playAudioSprite)。
 * 前置状态:chime.wav = C4(0–0.5s)/ E4(0.5–1.0s)/ G4(1.0–1.5s)三个音,
 * 两种模式共用同一份 wav,区别只在标记从哪来。
 * 主要操作(画布内按钮):low / mid / high 播对应标记,整段播放不指定标记。
 * 预期结果:标记播放时 duration=0.50s(marker.duration)而 totalDuration=1.60s;
 * currentMarker 读数显示段名,进度条只在对应段内推进;sprite 模式每次
 * playAudioSprite 新建一次性实例、完播自毁。
 * 阅读主线:preload(audio + audioSprite)→ create(手动 addMarker + 按钮)
 * → drawFrame(positionOf 轮询 + 快照)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  TEXT_STYLE,
  TITLE_STYLE,
  createGameLoopSuspender,
  makeTextButton,
  type LoopSuspender,
} from './story-support';
import chimeUrl from './chime.wav?url&no-inline';
import chimeJsonUrl from './chime.json?url&no-inline';

export type MarkerMode = 'manual' | 'sprite';

export interface SoundMarkersParams {
  mode: MarkerMode;
}

export interface SoundMarkersSnapshot {
  mode: string;
  markers: string;
  currentMarker: string;
  duration: string;
  currentTime: string;
  lastAction: string;
  spriteSounds: string;
}

export interface SoundMarkersInstance {
  applyParams(params: SoundMarkersParams): void;
  dispose(): void;
}

const DEFAULT_PARAMS: SoundMarkersParams = { mode: 'manual' };

/** 三个标记的时间定义;manual 模式手动 addMarker,sprite 模式来自 chime.json。 */
const SEGMENTS: Array<{ name: string; label: string; start: number }> = [
  { name: 'low', label: 'low C4(0–0.5s)', start: 0 },
  { name: 'mid', label: 'mid E4(0.5–1.0s)', start: 0.5 },
  { name: 'high', label: 'high G4(1.0–1.5s)', start: 1.0 },
];
const SEGMENT_LENGTH = 0.5;
const TOTAL = 1.6;

type AnySound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

class SoundMarkersScene extends Phaser.Scene {
  private params: SoundMarkersParams = { ...DEFAULT_PARAMS };
  private chime!: AnySound;
  private progress!: Phaser.GameObjects.Graphics;
  private lastAction = '(无)';

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: SoundMarkersSnapshot) => void = () => {};

  constructor() {
    super({ key: 'SoundMarkers' });
  }

  preload() {
    this.load.audio('chime', chimeUrl);
    // audioSprite:json 进 cache.json,audio 进 cache.audio,key 同为 'chime-sprite'
    this.load.audioSprite('chime-sprite', chimeJsonUrl, chimeUrl);
  }

  create() {
    this.add.text(24, 20, '标记与音频精灵:chime(1.6s,三个音)', TITLE_STYLE);
    this.add.text(24, 46, '同一份 wav,手动 addMarker 或 json spritemap 切片', TEXT_STYLE);

    // manual 模式:长驻实例 + 手动标记;duration 缺省 = totalDuration - start
    this.chime = this.sound.add('chime');
    for (const seg of SEGMENTS) {
      this.chime.addMarker({ name: `m-${seg.name}`, start: seg.start, duration: SEGMENT_LENGTH });
    }

    for (const seg of SEGMENTS) {
      makeTextButton(this, 110 + SEGMENTS.indexOf(seg) * 200, 120, seg.label, () => {
        this.playSegment(seg.name);
      });
    }
    makeTextButton(this, 200, 164, '整段播放(不指定标记)', () => {
      if (this.params.mode === 'manual') {
        this.chime.play();
        this.lastAction = 'chime.play()(整段,currentMarker = null)';
      } else {
        this.sound.play('chime-sprite');
        this.lastAction = "this.sound.play('chime-sprite')(一次性整段)";
      }
    });

    this.progress = this.add.graphics();
    this.events.on(Phaser.Scenes.Events.UPDATE, this.drawFrame, this);
  }

  private playSegment(name: string) {
    if (this.params.mode === 'manual') {
      // 标记播放:play(markerName);duration 切换为 marker.duration
      this.chime.play(`m-${name}`);
      this.lastAction = `chime.play('m-${name}')`;
    } else {
      // audioSprite:playAudioSprite 一次性实例,标记来自 json 的 spritemap
      this.sound.playAudioSprite('chime-sprite', name);
      this.lastAction = `playAudioSprite('chime-sprite', '${name}')(完播自毁)`;
    }
  }

  /** Controls 入口:切换标记来源,按钮行为随之改变,实例与标记不重建。 */
  applyParams(params: SoundMarkersParams) {
    this.params = { ...params };
  }

  /** 位置读法同播放台:读 seek 属性(播放中 = 实时,暂停 = 断点,停止 = 0)。 */
  private positionOf(sound: AnySound): number {
    return sound.seek;
  }

  private drawFrame() {
    const sound = this.chime;
    const pos = this.positionOf(sound);
    const marker = sound.currentMarker;

    // 进度条:标记播放时只画该段区间(0.5s 一格),整段播放画全程
    const start = marker ? (marker.start ?? 0) : 0;
    const span = marker ? (marker.duration ?? sound.totalDuration) : sound.totalDuration;
    const ratio = sound.isPlaying || sound.isPaused ? Math.min(1, pos / Math.max(span, 0.001)) : 0;

    this.progress.clear();
    this.progress.fillStyle(0x1f2937, 1).fillRoundedRect(24, 230, GAME_WIDTH - 48, 14, 7);
    if (ratio > 0) {
      const trackX = 24 + ((GAME_WIDTH - 48) * start) / TOTAL;
      const trackW = ((GAME_WIDTH - 48) * span) / TOTAL;
      this.progress.fillStyle(0x4cc9f0, 1).fillRoundedRect(trackX, 230, trackW * ratio, 14, 7);
    }
    for (const frac of [0.5 / TOTAL, 1.0 / TOTAL]) {
      this.progress.fillStyle(0x8fa3c8, 1).fillRect(24 + (GAME_WIDTH - 48) * frac - 1, 226, 2, 22);
    }

    const markerNames = Object.keys(sound.markers);
    this.emitSnapshot({
      mode:
        this.params.mode === 'manual'
          ? 'manual:this.sound.add + addMarker + play(name)'
          : 'sprite:load.audioSprite + playAudioSprite',
      markers: `${markerNames.length} 个(${markerNames.join(', ')})`,
      currentMarker: marker ? `${marker.name}(start ${marker.start}s)` : 'null(整段)',
      duration: `${sound.duration.toFixed(2)}s(marker 生效时=段长)/ 总长 ${sound.totalDuration.toFixed(2)}s`,
      currentTime: `${pos.toFixed(2)}s`,
      lastAction: this.lastAction,
      spriteSounds: `'chime-sprite' 活动实例:${this.sound.getAll('chime-sprite').length}(每次 playAudioSprite +1,完播归零)`,
    });
  }
}

export function createSoundMarkers(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SoundMarkersSnapshot) => void,
): SoundMarkersInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new SoundMarkersScene();
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
    applyParams(params) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
