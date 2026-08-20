/**
 * 范例:实例与并发——一次性播放、同一实例重播、多实例叠加与批量管理。
 * 输入(Controls):burstCount(1..6,每次点击批量播放的份数)。
 * 主要操作(画布内按钮):
 * - fire-and-forget:this.sound.play('ping') × N,每次新建实例、可叠加、完播自动销毁;
 * - 同实例连播:一个长驻实例连按 play() × N,每次从头重播(不叠加);
 * - stopAll / removeAll:批量停止 / 移除并销毁全部实例。
 * 预期结果:readout 显示 getAll('ping').length(实例数)在叠加后立即 +N、随完播
 * 自毁回落;同实例连播时实例数恒为 1、重播计数 +N;画布圆点 = 当前活动实例数。
 * 阅读主线:create(held 实例 + 按钮)→ update(轮询 getAll 画圆点 + 快照)。
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
import pingUrl from './ping.wav?url&no-inline';

export interface SoundInstancesParams {
  burstCount: number;
}

export interface SoundInstancesSnapshot {
  lastAction: string;
  burstCount: number;
  pingInstances: string;
  playingCount: string;
  fireCalls: number;
  samePlays: number;
  heldState: string;
  totalSounds: string;
}

export interface SoundInstancesInstance {
  applyParams(params: SoundInstancesParams): void;
  dispose(): void;
}

const DEFAULT_PARAMS: SoundInstancesParams = { burstCount: 3 };

type AnySound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

class SoundInstancesScene extends Phaser.Scene {
  private params: SoundInstancesParams = { ...DEFAULT_PARAMS };
  private held!: AnySound;
  private heldAlive = false;
  private dots!: Phaser.GameObjects.Graphics;
  private lastAction = '(无)';
  private fireCalls = 0;
  private samePlays = 0;
  private heldComplete = 0;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: SoundInstancesSnapshot) => void = () => {};

  constructor() {
    super({ key: 'SoundInstances' });
  }

  preload() {
    this.load.audio('ping', pingUrl);
  }

  create() {
    this.add.text(24, 20, '实例与并发:ping(0.3s 短音)', TITLE_STYLE);
    this.add.text(24, 46, '画布圆点 = getAll("ping").length,完播自毁后逐个消失', TEXT_STYLE);

    // 长驻实例:由 add 创建,自己持有引用,不会自动销毁
    this.spawnHeld();

    makeTextButton(this, 120, 120, 'fire-and-forget play(key)', () => {
      for (let i = 0; i < this.params.burstCount; i++) {
        this.sound.play('ping'); // add + play + 完播自动 destroy
        this.fireCalls += 1;
      }
      this.lastAction = `play(key) × ${this.params.burstCount}(每次新实例)`;
    });
    makeTextButton(this, 360, 120, '同实例连播 held.play()', () => {
      this.ensureHeld();
      for (let i = 0; i < this.params.burstCount; i++) {
        this.held.play(); // 同一实例再次 play = 从头重播,不叠加
        this.samePlays += 1;
      }
      this.lastAction = `held.play() × ${this.params.burstCount}(重头播放)`;
    });
    makeTextButton(this, 140, 164, 'stopAll 停止全部', () => {
      this.sound.stopAll();
      this.lastAction = 'stopAll()';
    });
    makeTextButton(this, 340, 164, 'removeAll 移除并销毁', () => {
      this.sound.removeAll();
      this.lastAction = 'removeAll()(held 随之销毁,需重新 add)';
    });

    this.dots = this.add.graphics();
    this.events.on(Phaser.Scenes.Events.UPDATE, this.drawFrame, this);
  }

  /** Controls 入口:只改 burstCount,下一次按钮点击生效。 */
  applyParams(params: SoundInstancesParams) {
    this.params = { ...params };
  }

  /** 建一个长驻实例并接线完播/销毁计数;removeAll 销毁后由 ensureHeld 重建。 */
  private spawnHeld() {
    this.held = this.sound.add('ping');
    this.heldAlive = true;
    this.held.on(Phaser.Sound.Events.COMPLETE, () => {
      this.heldComplete += 1;
    });
    this.held.once(Phaser.Sound.Events.DESTROY, () => {
      this.heldAlive = false;
    });
  }

  private ensureHeld() {
    if (!this.heldAlive) {
      this.spawnHeld();
    }
  }

  private drawFrame() {
    const alive = this.sound.getAll<AnySound>('ping');
    this.dots.clear();
    // 每个活动 ping 实例一枚圆点:fire-and-forget 叠加后逐个出现、完播自毁后消失
    for (let i = 0; i < Math.min(alive.length, 12); i++) {
      this.dots.fillStyle(
        alive[i].isPlaying ? 0x4ade80 : 0x8fa3c8,
        1,
      );
      this.dots.fillCircle(48 + i * 32, 240, 9);
    }

    this.emitSnapshot({
      lastAction: this.lastAction,
      burstCount: this.params.burstCount,
      pingInstances: `${this.sound.getAll('ping').length}(圆点同步)`,
      playingCount: `${this.sound.getAllPlaying<Phaser.Sound.BaseSound>().length}(管理器全部声音)`,
      fireCalls: this.fireCalls,
      samePlays: this.samePlays,
      heldState: `${this.held.isPlaying ? '播放中' : this.held.isPaused ? '已暂停' : '停止'} / 完播 ${this.heldComplete} 次`,
      totalSounds: `${(this.sound as Phaser.Sound.BaseSoundManager).getAll<Phaser.Sound.BaseSound>().length}`,
    });
  }
}

export function createSoundInstances(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SoundInstancesSnapshot) => void,
): SoundInstancesInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new SoundInstancesScene();
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
