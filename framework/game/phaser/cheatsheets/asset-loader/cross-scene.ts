/**
 * 范例:跨场景共享缓存。
 * 输入:「场景操作」单选控件:启动或停止 Consumer 场景。
 * 主要操作:LoaderScene 在 preload 里加载 beach/crab/scores;
 * ConsumerScene 没有 preload,create 里直接用纹理和 cache.json。
 * 预期结果:两个场景的 this.textures / this.cache 是同一实例
 * (都来自 game),ConsumerScene 未启动时缓存检查就已命中,
 * 启动后能直接画出 LoaderScene 加载的资源。
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
import scoresUrl from './scores.json?url&no-inline';

const STATUS_LABELS = [
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

export type CrossSceneAction = 'none' | 'launch' | 'stop';

export interface CrossSceneSnapshot {
  action: string;
  loaderLoaded: string;
  consumerStatus: string;
  consumerSeesTexture: string;
  consumerSeesJson: string;
  sameTextureInstance: string;
}

export interface CrossSceneInstance {
  perform(action: CrossSceneAction): void;
  dispose(): void;
}

class LoaderScene extends Phaser.Scene {
  emitSnapshot: (snapshot: CrossSceneSnapshot) => void = () => {};

  constructor() {
    super({ key: 'LoaderSide' });
  }

  preload() {
    this.load.image('shared-beach', beachUrl);
    this.load.image('shared-crab', crabUrl);
    this.load.json('shared-scores', scoresUrl);
  }

  create() {
    this.add.image(0, 0, 'shared-beach').setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.35);
    this.add.text(24, 20, 'LoaderSide:本场景加载了 3 个资源', TITLE_STYLE);
    this.add.text(24, 48, 'ConsumerSide 没有 preload,启动后直接使用这些缓存', TEXT_STYLE);
    this.report();
  }

  private report() {
    const consumer = this.scene.get('ConsumerSide') as ConsumerScene;
    this.emitSnapshot(buildSnapshot('初始加载', this, consumer));
  }
}

class ConsumerScene extends Phaser.Scene {
  emitSnapshot: (snapshot: CrossSceneSnapshot) => void = () => {};

  constructor() {
    // active: false → 注册但不自动启动,由 Controls 决定何时 launch
    super({ key: 'ConsumerSide', active: false });
  }

  create() {
    // 没有任何 load.*:纹理与 json 全部来自 LoaderScene 的加载
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 480, 170, 0x0f1420, 0.85);
    this.add.image(70, GAME_HEIGHT / 2, 'shared-crab').setScale(2.5);
    this.add.text(110, 152, 'ConsumerSide:无 preload,直接使用缓存', TITLE_STYLE);
    this.add.text(110, 186, `textures.exists('shared-beach') = ${this.textures.exists('shared-beach')}`, TEXT_STYLE);
    const scores = this.cache.json.get('shared-scores') as { player: string; coins: number };
    this.add.text(110, 214, `cache.json.get('shared-scores').player = ${scores.player}`, TEXT_STYLE);
    this.report('launch 后');
  }

  private report(action: string) {
    const loader = this.scene.get('LoaderSide') as LoaderScene;
    this.emitSnapshot(buildSnapshot(action, loader, this));
  }
}

function buildSnapshot(
  action: string,
  loader: LoaderScene,
  consumer: ConsumerScene,
): CrossSceneSnapshot {
  const loaded =
    loader.textures.exists('shared-beach') &&
    loader.textures.exists('shared-crab') &&
    loader.cache.json.exists('shared-scores');

  // 场景未启动时实例已存在,缓存检查同样可执行
  const consumerSeesTexture = consumer.textures.exists('shared-beach');
  const consumerScores = consumer.cache.json.get('shared-scores') as
    | { player: string }
    | null;

  const sameInstance =
    loader.textures === consumer.textures && consumer.textures === consumer.game.textures;

  return {
    action,
    loaderLoaded: loaded ? '3/3 已入缓存' : '加载中',
    consumerStatus:
      STATUS_LABELS[consumer.sys.settings.status] ??
      String(consumer.sys.settings.status),
    consumerSeesTexture: consumerSeesTexture ? 'true(命中)' : 'false',
    consumerSeesJson: consumerScores ? `player = ${consumerScores.player}` : '(空)',
    sameTextureInstance: sameInstance ? '是,同一 TextureManager' : '否',
  };
}

export function createCrossScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CrossSceneSnapshot) => void,
): CrossSceneInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const loader = new LoaderScene();
  const consumer = new ConsumerScene();
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [loader, consumer],
  });

  loader.emitSnapshot = emit;
  consumer.emitSnapshot = emit;

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    perform(action) {
      if (action === 'launch') {
        loader.scene.launch('ConsumerSide');
      } else if (action === 'stop') {
        loader.scene.stop('ConsumerSide');
        emit(buildSnapshot('stop 后', loader, consumer));
      }
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
