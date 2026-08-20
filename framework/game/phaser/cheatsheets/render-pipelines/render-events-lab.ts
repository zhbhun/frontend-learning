/**
 * 范例:渲染循环事件计数台——把一帧拆成可数的阶段。
 * 输入(Controls):secondCamera(是否加第二台摄像机)。
 * 主要操作:观察 readout 中各事件计数的增长速度;打开第二台摄像机后
 * 注意 game 级 PRE_RENDER / POST_RENDER 仍每帧一次,而 renderer 级
 * RENDER 事件每台摄像机一次(计数速度翻倍)。
 * 预期结果:readout 展示 game.events 上 PRE_STEP / STEP / POST_STEP /
 * PRE_RENDER / POST_RENDER 的累计计数与每秒频率,renderer.events 上
 * PRE_RENDER_CLEAR / RENDER / POST_RENDER 的计数,以及已运行秒数;
 * 关系:game 级事件按「一帧一轮」增长,renderer 级 RENDER 随摄像机数量增长。
 * 阅读主线:EventsScene(create 里挂事件计数)→ applyParams(加/减摄像机)
 * → report(快照)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  HUD_STYLE,
  LABEL_STYLE,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

export interface RenderEventsParams {
  /** 是否添加第二台摄像机(RENDER 事件每台摄像机一次) */
  secondCamera: boolean;
}

/** 单个事件的读数:累计次数 + 每秒次数。 */
export interface EventCount {
  name: string;
  total: number;
  perSecond: number;
}

export interface RenderEventsSnapshot {
  /** game.events 上的五个阶段事件 */
  gameEvents: EventCount[];
  /** renderer.events 上的渲染器事件(RENDER 每台摄像机一次) */
  rendererEvents: EventCount[];
  /** 当前摄像机数量 */
  cameraCount: number;
  /** 已运行秒数(离屏暂停时停止增长) */
  elapsedSeconds: number;
}

export interface RenderEventsInstance {
  applyParams(params: RenderEventsParams): void;
  dispose(): void;
}

interface Counter {
  total: number;
  lastTotal: number;
  perSecond: number;
}

const GAME_EVENT_NAMES = [
  'prestep',
  'step',
  'poststep',
  'prerender',
  'postrender',
] as const;

const RENDERER_EVENT_NAMES = [
  'prerenderclear',
  'render',
  'postrender',
] as const;

export function createRenderEventsLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RenderEventsSnapshot) => void,
): RenderEventsInstance {
  let suspender: LoopSuspender | null = null;
  let labScene: Phaser.Scene | null = null;
  let extraCamera: Phaser.Cameras.Scene2D.Camera | null = null;
  /** 计数起始时刻(scene.time.now),用于换算每秒频率 */
  let sampleStart = 0;

  const gameCounters = new Map<string, Counter>();
  const rendererCounters = new Map<string, Counter>();
  for (const name of GAME_EVENT_NAMES) {
    gameCounters.set(name, { total: 0, lastTotal: 0, perSecond: 0 });
  }
  for (const name of RENDERER_EVENT_NAMES) {
    rendererCounters.set(name, { total: 0, lastTotal: 0, perSecond: 0 });
  }

  class EventsScene extends Phaser.Scene {
    create() {
      labScene = this;
      this.add.text(
        12,
        10,
        '每帧一轮:prestep → step → 场景 update → poststep → 渲染',
        LABEL_STYLE,
      );

      // 装饰画面:让摄像机有东西可渲染
      const chip = this.make.graphics({ x: 0, y: 0 }, false);
      chip.fillStyle(0x2b8bd8, 1);
      chip.fillCircle(20, 20, 18);
      chip.generateTexture('events-dot', 40, 40);
      chip.destroy();

      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        this.add.image(
          GAME_WIDTH / 2 + Math.cos(angle) * 130,
          GAME_HEIGHT / 2 + Math.sin(angle) * 90,
          'events-dot',
        );
      }
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'render', HUD_STYLE)
        .setOrigin(0.5);

      // game 级事件:挂在 game.events 上,一帧各触发一次
      for (const name of GAME_EVENT_NAMES) {
        this.game.events.on(name, () => {
          gameCounters.get(name)!.total++;
        });
      }
      // renderer 级事件:挂在渲染器(本身是 EventEmitter)上,RENDER 每台摄像机一次
      const renderer = this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
      for (const name of RENDERER_EVENT_NAMES) {
        renderer.on(name, () => {
          rendererCounters.get(name)!.total++;
        });
      }

      sampleStart = this.time.now;
    }

    update() {
      report(this);
    }
  }

  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    parent: undefined,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [EventsScene],
  });
  suspender = createGameLoopSuspender(game, canvas);

  function countersToReadout(
    counters: Map<string, Counter>,
    names: readonly string[],
  ): EventCount[] {
    return names.map((name) => {
      const counter = counters.get(name)!;
      return { name, total: counter.total, perSecond: counter.perSecond };
    });
  }

  /** perSecond 按累计数 / 已运行秒数换算;readout 外壳自带 100ms 节流。 */
  function report(scene: Phaser.Scene) {
    const elapsed = Math.max((scene.time.now - sampleStart) / 1000, 0.001);
    for (const counter of [
      ...gameCounters.values(),
      ...rendererCounters.values(),
    ]) {
      counter.perSecond = Math.round(counter.total / elapsed);
    }

    emit({
      gameEvents: countersToReadout(gameCounters, GAME_EVENT_NAMES),
      rendererEvents: countersToReadout(rendererCounters, RENDERER_EVENT_NAMES),
      cameraCount: scene.cameras.getTotal(),
      elapsedSeconds: Math.floor(elapsed),
    });
  }

  return {
    applyParams(next: RenderEventsParams) {
      if (!labScene) {
        return;
      }
      if (next.secondCamera && !extraCamera) {
        // 画中画小视口:RENDER 事件从此每帧两次
        const w = 180;
        const h = Math.round((w * GAME_HEIGHT) / GAME_WIDTH);
        extraCamera = labScene.cameras.add(
          GAME_WIDTH - w - 8,
          8,
          w,
          h,
          false,
          'pip',
        );
        extraCamera.setBackgroundColor('rgba(0,0,0,0.35)');
      } else if (!next.secondCamera && extraCamera) {
        labScene.cameras.remove(extraCamera, true);
        extraCamera = null;
      }
    },
    dispose() {
      suspender?.dispose();
      game.destroy(true);
    },
  };
}
