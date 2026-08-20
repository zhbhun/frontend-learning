/**
 * 范例:首屏最小集与按需加载(生产加载策略的运行时半边)。
 * 输入:Controls「关卡操作」(none / enter / exit)或画布内同款按钮。
 * 主要操作:preload 只排队首屏 2 个文件(boot-logo.png + boot-manifest.json);
 * 「进入关卡 1」后在 create 上下文手动排队关卡包(1 张图 + 音频候选数组
 * [bgm.ogg, bgm.mp3])并 this.load.start(),complete 后切到关卡视图。
 * 预期结果:readout 显示两轮的真实入队数与传输字节、进度;音频候选数组只
 * 入队 1 个文件,file.src 是设备选中的格式;二次进入关卡时入队 0 个(缓存命中);
 * 「运行模式」读数在开发服务下为 DEV,在静态构建的部署版手册里为 PROD。
 * 阅读主线:preload(首屏最小集)→ enterLevel(按需排队 + 手动 start)→
 * wireLoaderEvents(字节与格式读数)→ report(快照)。
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
import bootLogoUrl from './boot-logo.png?url&no-inline';
import bootManifestUrl from './boot-manifest.json?url&no-inline';
import levelBgUrl from './level-bg.png?url&no-inline';
import bgmOggUrl from './bgm.ogg?url&no-inline';
import bgmMp3Url from './bgm.mp3?url&no-inline';

/** Controls 直接驱动的动作:进入关卡触发按需加载,退出回到首屏视图。 */
export type BootBudgetAction = 'none' | 'enter' | 'exit';

/** readout 用的派生读数:全部来自加载器、缓存与 import.meta.env 的真实状态。 */
export interface BootBudgetSnapshot {
  phase: string;
  envMode: string;
  firstScreen: string;
  queued: string;
  progress: string;
  roundBytes: string;
  audioPick: string;
  audioCache: string;
  bgmState: string;
}

export interface BootBudgetInstance {
  perform(action: BootBudgetAction): void;
  dispose(): void;
}

type Phase = 'boot-loading' | 'boot-ready' | 'level-loading' | 'level-ready';

/** 同一份代码在两种构建下的身份证明:DEV 由开发服务注入,PROD 由 vite build 注入。 */
const ENV_MODE = import.meta.env.DEV
  ? 'DEV(开发服务,import.meta.env.DEV = true)'
  : 'PROD(静态构建,import.meta.env.PROD = true)';

const PHASE_LABEL: Record<Phase, string> = {
  'boot-loading': '首屏加载中(preload)',
  'boot-ready': '首屏就绪',
  'level-loading': '关卡包按需加载中',
  'level-ready': '关卡 1 就绪',
};

function kb(bytes: number): string {
  return bytes > 0 ? `${(bytes / 1024).toFixed(1)} KB` : '0(XHR 未上报)';
}

function basename(url: string): string {
  return url.split('/').pop()?.split('?')[0] ?? url;
}

class BootBudgetScene extends Phaser.Scene {
  private phase: Phase = 'boot-loading';
  private bootBytes = 0;
  private roundBytes = 0;
  private roundQueued = 0;
  private roundLabel = '(无)';
  private progress = 0;
  private audioPick = '(未进入关卡)';
  private playCount = 0;
  private bgmPlaying = false;

  /** 首屏视图专属的显示对象:进入关卡时隐藏,退出时恢复。 */
  private bootObjects: (Phaser.GameObjects.Image | Phaser.GameObjects.Text)[] = [];
  /** 关卡阶段专属的显示对象:退出关卡时整体隐藏,不销毁(资源仍在缓存)。 */
  private levelObjects: (Phaser.GameObjects.Image | Phaser.GameObjects.Text)[] = [];
  private bar!: Phaser.GameObjects.Graphics;
  private statusLine!: Phaser.GameObjects.Text;
  private bgm?: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: BootBudgetSnapshot) => void = () => {};

  constructor() {
    super({ key: 'BootBudget' });
  }

  preload() {
    // 字节读数来自 XHR ProgressEvent:小文件至少在完成时上报一次 Content-Length
    this.load.on(Phaser.Loader.Events.FILE_LOAD, (file: Phaser.Loader.File) => {
      this.roundBytes += file.bytesLoaded || file.bytesTotal || 0;
      if (file.key === 'bgm') {
        // 候选数组里只有被设备选中格式的那个文件真正入队,file.src 即选中的 URL
        const name = basename(file.src);
        this.audioPick = `${name}(候选第 ${name.endsWith('.ogg') ? 1 : 2} 个)`;
      }
    });
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      this.progress = value;
      this.report();
    });

    // 首屏最小集:只有 logo 与清单两个文件,关卡资源全部推迟到按需加载
    this.load.image('boot-logo', bootLogoUrl);
    this.load.json('boot-manifest', bootManifestUrl);
    this.roundLabel = '首屏';
    this.roundQueued = this.load.list.size;
    this.report();
  }

  create() {
    this.bootBytes = this.roundBytes; // 首屏这轮的传输字节固定下来

    const manifest = this.cache.json.get('boot-manifest') as {
      firstScreen: string[];
      levelPack: string[];
    };

    this.add.text(24, 20, '首屏最小集 → 按需加载', TITLE_STYLE);
    this.add
      .text(
        24,
        48,
        `preload 只带 ${manifest.firstScreen.length} 个文件;关卡 ${manifest.levelPack.length} 项点击时才排队`,
        TEXT_STYLE,
      )
      .setWordWrapWidth(400);

    // 左列:首屏内容
    this.add.image(80, 140, 'boot-logo').setDisplaySize(96, 96);
    this.add
      .text(
        150,
        116,
        [
          `boot-manifest.json → firstScreen: ${manifest.firstScreen.join(', ')}`,
          `boot-manifest.json → levelPack: ${manifest.levelPack.join(', ')}`,
          '运行模式(见 readout):同一份代码,dev 与 build 两个值',
        ].join('\n'),
        TEXT_STYLE,
      );

    this.bar = this.add.graphics();
    this.statusLine = this.add
      .text(460, 196, '', { ...TEXT_STYLE, fontSize: '11px' })
      .setWordWrapWidth(230);

    // 右列上半:首屏视图的入口按钮与说明
    this.bootObjects.push(
      makeTextButton(this, 560, 120, '进入关卡 1(按需加载)', () =>
        this.perform('enter'),
      ),
      this.add
        .text(560, 150, 'bgm 候选:[bgm.ogg, bgm.mp3]\n设备选中哪个才下载哪个', {
          ...TEXT_STYLE,
          fontSize: '11px',
        })
        .setOrigin(0.5, 0),
    );

    this.phase = 'boot-ready';
    this.report();
  }

  /** 关卡操作入口:Controls 与画布内按钮都走这里;非首屏状态时安全忽略。 */
  perform(action: BootBudgetAction) {
    if (action === 'enter' && this.phase === 'boot-ready') {
      this.enterLevel();
    } else if (action === 'exit' && this.phase === 'level-ready') {
      this.levelObjects.forEach((obj) => obj.setVisible(false));
      this.levelObjects = [];
      this.bootObjects.forEach((obj) => obj.setVisible(true));
      this.statusLine.setText('');
      this.phase = 'boot-ready';
      this.report();
    }
  }

  private enterLevel() {
    this.phase = 'level-loading';
    this.progress = 0;
    this.roundBytes = 0;
    this.roundLabel = '关卡包';
    this.bar.clear();
    this.bootObjects.forEach((obj) => obj.setVisible(false));
    this.statusLine.setText('按需加载中…');

    // preload 之外排队:方法只入队,必须手动 start(机制见 2.1.1 资源加载器)
    this.load.image('level-bg', levelBgUrl);
    this.load.audio('bgm', [bgmOggUrl, bgmMp3Url]);
    this.roundQueued = this.load.list.size;

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.progress = 1;
      this.showLevel();
    });
    this.load.start();
    this.report();
  }

  private showLevel() {
    this.phase = 'level-ready';
    this.bar.clear();
    this.statusLine.setText(
      this.roundQueued === 0
        ? '缓存命中,零下载直接就绪'
        : '下载完成,资源已入缓存',
    );

    this.levelObjects.push(
      this.add.image(560, 116, 'level-bg').setDisplaySize(200, 113),
      this.add
        .text(560, 178, 'level-bg.png(按需加载)', {
          ...TEXT_STYLE,
          fontSize: '11px',
        })
        .setOrigin(0.5, 0),
      makeTextButton(this, 560, 224, '播放 bgm(画布内点击解锁音频)', () => {
        if (!this.bgm) {
          this.bgm = this.sound.add('bgm');
          this.bgm.on(Phaser.Sound.Events.COMPLETE, () => {
            this.bgmPlaying = false;
            this.report();
          });
        }
        this.bgm.play();
        this.bgmPlaying = true;
        this.playCount += 1;
        this.report();
      }),
      makeTextButton(this, 560, 258, '回到首屏(再次进入将零下载)', () =>
        this.perform('exit'),
      ),
    );
    this.report();
  }

  private report() {
    const buffer = this.cache.audio.get('bgm') as AudioBuffer | undefined;
    this.emitSnapshot({
      phase: PHASE_LABEL[this.phase],
      envMode: ENV_MODE,
      firstScreen: `2 个文件 / ${kb(this.bootBytes)}`,
      queued: `${this.roundLabel} ${this.roundQueued} 个`,
      progress: `${Math.round(this.progress * 100)}%`,
      roundBytes: kb(this.roundBytes),
      audioPick: this.audioPick,
      audioCache: buffer
        ? `AudioBuffer ${buffer.duration.toFixed(2)}s`
        : '(未加载)',
      bgmState: this.bgmPlaying
        ? `播放中(第 ${this.playCount} 次)`
        : this.playCount > 0
          ? `已播 ${this.playCount} 次`
          : '未播放',
    });
  }

  /** 进度条只在加载阶段绘制;关卡就绪后清空。 */
  update() {
    if (this.phase !== 'level-loading') {
      return;
    }
    this.bar.clear();
    this.bar.fillStyle(0x4cc9f0, 1);
    this.bar.fillRect(460, 116, 200 * this.progress, 8);
  }
}

export function createBootBudget(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BootBudgetSnapshot) => void,
): BootBudgetInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [BootBudgetScene],
  });

  const scene = game.scene.getScene('BootBudget') as BootBudgetScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    perform(action) {
      scene?.perform(action);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
