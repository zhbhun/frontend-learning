/**
 * 范例:播放台——一个 Sound 实例的完整传输控制。
 * 输入(Controls):volume(实例音量 0..1)、loop、rate(0.5..2)、detune(-1200..1200 音分)。
 * 主要操作(画布内按钮,首次点击同时完成浏览器手势解锁):播放 / 暂停 / 继续 /
 * 停止 / 重播(同一实例再次 play = 从头重播);seek 到 0.8s(第二音)与
 * 1.6s(第三音);静音切换。
 * 预期结果:readout 显示 isPlaying/isPaused、currentTime(读 seek 属性,Phaser 4
 * 无公开 currentTime 属性)/ totalDuration、实际音量(实例 × 管理器)、totalRate
 * (rate 与 detune 合成)、播放/完成/循环计数、locked 与 AudioContext.state;
 * 把窗口焦点切走再切回,pauseOnBlur 生效:currentTime 冻结、回到焦点后从断点继续。
 * 阅读主线:create(add 实例 + 事件接线 + 按钮)→ applyParams(Controls 即时改属性)
 * → update(进度条 + 快照)。
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
import themeUrl from './theme.wav?url&no-inline';

/** Controls 直接驱动的参数:变化即时生效,作用于同一个 Sound 实例。 */
export interface SoundConsoleParams {
  volume: number;
  loop: boolean;
  rate: number;
  detune: number;
}

/** readout 用的派生读数:全部来自 Sound / SoundManager 真实属性与事件计数。 */
export interface SoundConsoleSnapshot {
  state: string;
  isPlaying: string;
  currentTime: string;
  totalDuration: string;
  volume: string;
  totalRate: string;
  loop: string;
  playCount: string;
  recentEvents: string;
  locked: string;
  contextState: string;
}

export interface SoundConsoleInstance {
  applyParams(params: SoundConsoleParams): void;
  dispose(): void;
}

/** 与 stories 的默认 args 保持一致;create 前的首次 apply 由它兜底。 */
const DEFAULT_PARAMS: SoundConsoleParams = { volume: 0.8, loop: false, rate: 1, detune: 0 };

/** this.sound.add 的返回类型:三种实现管理器下分别是这三个类。 */
type AnySound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

class SoundConsoleScene extends Phaser.Scene {
  private params: SoundConsoleParams = { ...DEFAULT_PARAMS };
  private theme!: AnySound;
  private progress!: Phaser.GameObjects.Graphics;
  private lockHint!: Phaser.GameObjects.Text;
  private recentEvents: string[] = [];
  private counts = { play: 0, complete: 0, looped: 0 };

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: SoundConsoleSnapshot) => void = () => {};

  constructor() {
    super({ key: 'SoundConsole' });
  }

  preload() {
    // 加载器层(2.1.1):XHR 下载 + decodeAudioData → AudioBuffer 进 cache.audio
    this.load.audio('theme', themeUrl);
  }

  create() {
    this.add.text(24, 20, '播放台:theme(2.4s,三音旋律)', TITLE_STYLE);
    this.add.text(
      24,
      46,
      '首次点击画布内按钮 = 解锁音频(浏览器 autoplay 政策)',
      TEXT_STYLE,
    );

    // 长驻实例:add 返回由 this.sound 管理的 Sound,不自毁
    this.theme = this.sound.add('theme', {
      volume: this.params.volume,
      loop: this.params.loop,
      rate: this.params.rate,
      detune: this.params.detune,
    });
    this.wireSoundEvents(this.theme);

    const row1 = 120;
    const buttons1: Array<[number, string, () => void]> = [
      [80, '播放', () => void this.theme.play()],
      [190, '暂停', () => void this.theme.pause()],
      [300, '继续', () => void this.theme.resume()],
      [410, '停止', () => void this.theme.stop()],
      [560, '重播(同实例)', () => void this.theme.play()],
    ];
    for (const [x, label, fn] of buttons1) {
      makeTextButton(this, x, row1, label, fn);
    }

    const row2 = 164;
    const buttons2: Array<[number, string, () => void]> = [
      [120, 'seek 0.8s(第二音)', () => this.theme.setSeek(0.8)],
      [320, 'seek 1.6s(第三音)', () => this.theme.setSeek(1.6)],
      [500, '静音切换', () => this.theme.setMute(!this.theme.mute)],
    ];
    for (const [x, label, fn] of buttons2) {
      makeTextButton(this, x, row2, label, fn);
    }

    // 画布内进度条:currentTime / totalDuration 的可视化
    this.progress = this.add.graphics();
    this.lockHint = this.add.text(24, 196, '', TEXT_STYLE).setColor('#fbbf24');
    this.events.on(Phaser.Scenes.Events.UPDATE, this.drawFrame, this);
  }

  /** Controls 入口:直接改实例属性,立即生效,不需要重建任何对象。 */
  applyParams(params: SoundConsoleParams) {
    this.params = { ...params };
    if (!this.theme) {
      return; // create 尚未执行,DEFAULT_PARAMS 已在 add 时兜底
    }
    this.theme.setVolume(params.volume);
    this.theme.setLoop(params.loop);
    this.theme.setRate(params.rate);
    this.theme.setDetune(params.detune);
  }

  private wireSoundEvents(sound: Phaser.Sound.BaseSound) {
    const E = Phaser.Sound.Events;
    const names: Array<[string, string]> = [
      [E.PLAY, 'play'],
      [E.PAUSE, 'pause'],
      [E.RESUME, 'resume'],
      [E.STOP, 'stop'],
      [E.COMPLETE, 'complete'],
      [E.LOOPED, 'looped'],
      [E.SEEK, 'seek'],
    ];
    for (const [event, name] of names) {
      sound.on(event, () => {
        this.recentEvents.push(name);
        if (this.recentEvents.length > 6) {
          this.recentEvents = this.recentEvents.slice(-6);
        }
        if (name === 'play') this.counts.play += 1;
        if (name === 'complete') this.counts.complete += 1;
        if (name === 'looped') this.counts.looped += 1;
      });
    }
  }

  /**
   * 位置读法:Phaser 4 无公开 currentTime 属性,读 seek 属性——
   * 播放中返回实时位置(WebAudio 内部即 getCurrentTime),暂停返回冻结断点,停止返回 0。
   * 暂停态直接调 getCurrentTime() 会得到随墙上时钟增长的错误值(内部 playTime 已清零)。
   */
  private positionOf(sound: AnySound): number {
    return sound.seek;
  }

  private drawFrame() {
    const pos = this.positionOf(this.theme);
    const ratio = this.theme.isPlaying || this.theme.isPaused
      ? Math.min(1, pos / this.theme.totalDuration)
      : 0;

    // 轨道 + 已播放进度 + 0.8s / 1.6s 两段旋律的分界刻度
    this.progress.clear();
    this.progress.fillStyle(0x1f2937, 1).fillRoundedRect(24, 230, GAME_WIDTH - 48, 14, 7);
    if (ratio > 0) {
      this.progress.fillStyle(0x4cc9f0, 1).fillRoundedRect(24, 230, (GAME_WIDTH - 48) * ratio, 14, 7);
    }
    for (const frac of [0.8 / 2.4, 1.6 / 2.4]) {
      this.progress.fillStyle(0x8fa3c8, 1).fillRect(24 + (GAME_WIDTH - 48) * frac - 1, 226, 2, 22);
    }

    this.lockHint.setText(
      this.sound.locked ? '音频仍锁定(this.sound.locked = true),点击任意按钮解锁' : '',
    );

    this.report();
  }

  private report() {
    const sound = this.theme;
    const pos = this.positionOf(sound);
    const webAudio = this.game.sound instanceof Phaser.Sound.WebAudioSoundManager;
    const state = sound.isPlaying ? '播放中' : sound.isPaused ? '已暂停' : '停止';

    this.emitSnapshot({
      state,
      isPlaying: `${sound.isPlaying ? 1 : 0} / ${sound.isPaused ? 1 : 0}`,
      currentTime: `${pos.toFixed(2)}s(暂停时冻结在断点)`,
      totalDuration: `${sound.totalDuration.toFixed(2)}s`,
      volume: `${sound.volume.toFixed(2)}(实例)× ${this.sound.volume.toFixed(2)}(管理器)`,
      totalRate: `${sound.totalRate.toFixed(2)}(rate ${this.params.rate} + detune ${this.params.detune} 音分)`,
      loop: sound.loop ? `开(已循环 ${this.counts.looped} 次)` : '关',
      playCount: `play ${this.counts.play} 次 / complete ${this.counts.complete} 次`,
      recentEvents: this.recentEvents.join(' → ') || '(无)',
      locked: `${this.sound.locked ? 'locked(等待首次手势)' : 'unlocked'}`,
      contextState: webAudio
        ? (this.game.sound as Phaser.Sound.WebAudioSoundManager).context.state
        : '非 WebAudio 通路',
    });
  }
}

export function createSoundConsole(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SoundConsoleSnapshot) => void,
): SoundConsoleInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new SoundConsoleScene();
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
