/**
 * 范例:加载队列与进度事件。
 * 输入:「加载轮次」控件,每加一调用一次 this.scene.restart({ round: n }),
 * preload 用带轮次后缀的 key 重新排队,走真实网络加载。
 * 主要操作:preload 一次排队 7 个文件(image/spritesheet/atlas/audio/json),
 * 监听 Loader 的 start/progress/filecomplete/loaderror/complete 事件;
 * create 后逐个 key 检查 textures / cache 是否命中。
 * 预期结果:readout 显示进度百分比、本轮完成文件数、逐文件完成日志、
 * 缓存命中数;换轮后第 0 轮的 key 仍在缓存中(缓存跨轮保留)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  TEXT_STYLE,
  TITLE_STYLE,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';
import beachUrl from './beach.png?url&no-inline';
import crabUrl from './crab.png?url&no-inline';
import digitsUrl from './digits.png?url&no-inline';
import seagullUrl from './seagull.png?url&no-inline';
import seagullJsonUrl from './seagull.json?url&no-inline';
import coinUrl from './coin.wav?url&no-inline';
import scoresUrl from './scores.json?url&no-inline';

/** 本轮排队的 6 个资源 key 后缀检查项:4 个进纹理管理器,2 个进 cache */
const TEXTURE_KEYS = ['beach', 'crab', 'digits', 'seagull'] as const;
const CACHE_KEYS = [
  { name: 'scores', cache: 'json' },
  { name: 'coin', cache: 'audio' },
] as const;

export interface LoadProgressSnapshot {
  round: number;
  progress: string;
  filesDone: string;
  loading: boolean;
  recentFiles: string;
  failed: string;
  cacheHits: string;
  round0Kept: string;
}

export interface LoadProgressInstance {
  requestRounds(count: number): void;
  dispose(): void;
}

class LoadScene extends Phaser.Scene {
  private round = 0;
  private progress = 0;
  private recentFiles: string[] = [];
  private lastError = '(无)';

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout */
  emitSnapshot: (snapshot: LoadProgressSnapshot) => void = () => {};

  constructor() {
    super({ key: 'LoadDemo' });
  }

  init(data: { round?: number }) {
    this.round = data.round ?? 0;
    this.progress = 0;
    this.recentFiles = [];
    this.lastError = '(无)';

    // 场景重启时 LoaderPlugin 会保留旧监听器,先清空再注册,避免重复触发
    this.load.removeAllListeners();
    this.wireLoaderEvents();
    this.report();
  }

  preload() {
    const r = this.round;
    // 一次排 7 个文件(图集 = 图片 + json 两个文件),方法只排队、立即返回
    this.load.image(`beach-${r}`, beachUrl);
    this.load.spritesheet(`digits-${r}`, digitsUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.atlas(`seagull-${r}`, seagullUrl, seagullJsonUrl);
    this.load.audio(`coin-${r}`, coinUrl);
    this.load.json(`scores-${r}`, scoresUrl);
    this.load.image(`crab-${r}`, crabUrl);
    this.report();
  }

  create() {
    const r = this.round;
    const scores = this.cache.json.get(`scores-${r}`) as {
      player: string;
      coins: number;
    };
    const coin = this.cache.audio.get(`coin-${r}`) as AudioBuffer | undefined;

    this.add.image(0, 0, `beach-${r}`).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.35);
    this.add.text(24, 20, `第 ${r + 1} 轮加载完成`, TITLE_STYLE);
    this.add.text(24, 48, 'image · spritesheet · atlas · audio · json 全部来自缓存', TEXT_STYLE);

    // spritesheet:同一个 key,用帧号引用切好的每一帧
    for (let i = 0; i < 4; i++) {
      this.add.image(60 + i * 44, 130, `digits-${r}`, i);
    }
    // atlas:用帧名引用图集里的帧
    this.add.image(360, 130, `seagull-${r}`, 'gull');
    this.add.image(460, 130, `crab-${r}`).setScale(1.5);

    this.add.text(24, 180, `cache.json → scores.player = ${scores.player}`, TEXT_STYLE);
    this.add.text(24, 208, `cache.json → scores.coins = ${scores.coins}`, TEXT_STYLE);
    this.add.text(
      24,
      236,
      `cache.audio → coin${coin ? `.duration = ${coin.duration.toFixed(2)}s` : '(未解码为 AudioBuffer)'}`,
      TEXT_STYLE,
    );
    this.report();
  }

  private wireLoaderEvents() {
    const E = Phaser.Loader.Events;

    this.load.on(E.START, () => {
      this.recentFiles.push(`start(共 ${this.load.totalToLoad} 个文件)`);
      this.trimLog();
      this.report();
    });

    // progress 值为 0..1 小数,每个文件完成后触发一次
    this.load.on(E.PROGRESS, (value: number) => {
      this.progress = value;
      this.report();
    });

    // filecomplete 对队列里任何文件触发:(key, type, data)
    this.load.on(E.FILE_COMPLETE, (key: string, type: string) => {
      this.recentFiles.push(`${key}(${type})`);
      this.trimLog();
      this.report();
    });

    this.load.on(E.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.lastError = `${file.key}(${file.type})`;
      this.report();
    });

    this.load.on(E.COMPLETE, () => {
      this.progress = 1;
      this.report();
    });
  }

  private trimLog() {
    if (this.recentFiles.length > 4) {
      this.recentFiles = this.recentFiles.slice(-4);
    }
  }

  private countCacheHits(round: number): number {
    let hits = 0;
    for (const name of TEXTURE_KEYS) {
      if (this.textures.exists(`${name}-${round}`)) hits += 1;
    }
    for (const { name, cache } of CACHE_KEYS) {
      if (this.cache[cache].exists(`${name}-${round}`)) hits += 1;
    }
    return hits;
  }

  private report() {
    const r = this.round;
    const hits = this.countCacheHits(r);
    // 第 0 轮的 key 是否仍留在缓存:换轮后应保持命中
    const round0Kept = this.countCacheHits(0);

    this.emitSnapshot({
      round: r + 1,
      progress: `${Math.round(this.progress * 100)}%`,
      filesDone: `${this.load.totalComplete}/${this.load.totalToLoad}`,
      loading: this.load.isLoading(),
      recentFiles: this.recentFiles.join(' → '),
      failed: `${this.load.totalFailed} ${this.lastError}`,
      cacheHits: `${hits}/6`,
      round0Kept: r === 0 ? '(本轮即第 1 轮)' : `${round0Kept}/6 命中`,
    });
  }
}

export function createLoadProgress(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LoadProgressSnapshot) => void,
): LoadProgressInstance {
  let appliedRounds = 0;

  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [LoadScene],
  });

  const scene = game.scene.getScene('LoadDemo') as LoadScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    requestRounds(count: number) {
      while (appliedRounds < count) {
        appliedRounds += 1;
        game.scene.getScene('LoadDemo')?.scene.restart({ round: appliedRounds });
      }
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
