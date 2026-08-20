/**
 * 范例:场景间传数据的三条通道。
 * 输入:「分数」写入 game.registry 的 score 键;
 *      「场景操作」由 Menu 场景执行 start('Hud', data) / launch('Hud', data) / stop('Hud')。
 * 主要操作:Hud 在 init(data) 记录启动参数;Menu 与 Hud 都监听
 *   registry.events 的 changedata 同步画面;Hud 再把值镜像进场景私有 data。
 * 预期结果:registry 任何时刻可写可读(无论 Hud 是否运行);
 *   start 传的 data 只在 Hud 启动时出现一次;launch 并行保留 Menu;
 *   registry 变化沿 changedata 事件流进运行中的场景,链条记入日志。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

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

export type DataAction = 'none' | 'start' | 'launch' | 'stop';

export interface SceneDataSnapshot {
  menuStatus: string;
  hudStatus: string;
  hudInitData: string;
  registryScore: string;
  hudDataScore: string;
  log: string;
}

export interface SceneDataExchangeInstance {
  setScore(score: number): void;
  perform(action: DataAction): void;
  dispose(): void;
}

/** 由工厂注入的日志出口:两个场景共用,把链路事件送进 readout。 */
type PushLog = (entry: string) => void;

class MenuScene extends Phaser.Scene {
  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  pushLog: PushLog = () => {};

  private scoreText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Menu' });
  }

  create() {
    this.add.text(24, 20, 'Menu 场景(第一个场景,自动启动)', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '18px',
      color: '#e2e8f0',
    });
    this.scoreText = this.add.text(24, 56, registryLabel(this.registry), {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '14px',
      color: '#f0b428',
    });

    // registry 是全局的:监听它的 changedata,让本场景画面即时跟随
    this.registry.events.on('changedata', this.onRegistryChange, this);
    // 对别人 emitter 的监听不会随场景 shutdown 自动消失,必须自己摘除
    this.events.once('shutdown', () => {
      this.registry.events.off('changedata', this.onRegistryChange, this);
    });
  }

  private onRegistryChange(_parent: unknown, key: string) {
    if (key !== 'score' || !this.scoreText) {
      return;
    }
    this.scoreText.setText(registryLabel(this.registry));
  }
}

class HudScene extends Phaser.Scene {
  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  pushLog: PushLog = () => {};

  private initText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  /** 最近一次 init(data) 收到的启动参数,工厂读它生成读数。 */
  lastInitData: Record<string, unknown> | undefined;

  constructor() {
    super({ key: 'Hud' });

    // 场景私有 data 的 setdata/changedata 发在本场景自己的 events 上;
    // 在构造函数里注册一次(经 this.sys.events),避免每次重启重复叠加
    const events = this.sys.events;
    events.on('setdata', (_parent: unknown, key: string, value: unknown) => {
      if (key === 'score') {
        this.pushLog(`Hud scene.data setdata: score = ${String(value)}`);
      }
    });
    events.on('changedata', (_parent: unknown, key: string, value: unknown) => {
      if (key === 'score') {
        this.pushLog(`Hud scene.data changedata: score = ${String(value)}`);
      }
    });
  }

  /** start/launch 的第二参数在这里到达 */
  init(data: Record<string, unknown>) {
    this.lastInitData = data;
    this.pushLog(`Hud init 收到 data = ${JSON.stringify(data)}`);
  }

  create() {
    this.add.text(24, 20, 'Hud 场景(接收方)', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '18px',
      color: '#e2e8f0',
    });
    this.add.text(
      24,
      56,
      `init 收到 data = ${JSON.stringify(this.lastInitData ?? {})}(一次性交接)`,
      {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '13px',
        color: '#9fb6dd',
      },
    );
    this.scoreText = this.add.text(24, 84, registryLabel(this.registry), {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '14px',
      color: '#f0b428',
    });

    // 把当前 registry 分数镜像进场景私有 data(触发 setdata/changedata 日志)
    this.data.set('score', (this.registry.get('score') as number) ?? 0);

    this.registry.events.on('changedata', this.onRegistryChange, this);
    this.events.once('shutdown', () => {
      this.registry.events.off('changedata', this.onRegistryChange, this);
    });
  }

  private onRegistryChange(_parent: unknown, key: string, value: unknown) {
    if (key !== 'score') {
      return;
    }
    this.pushLog(`registry changedata: score = ${String(value)}`);
    this.scoreText?.setText(registryLabel(this.registry));
    // 同步镜像到场景私有 data,演示第三条数据通道
    this.data.set('score', value as number);
  }
}

function registryLabel(registry: Phaser.Data.DataManager): string {
  const score = registry.get('score');
  return `registry score = ${
    score === undefined ? '(未设置)' : String(score)
  }`;
}

export function createSceneDataExchange(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SceneDataSnapshot) => void,
): SceneDataExchangeInstance {
  let appliedScore: number | null = null;
  let appliedAction: DataAction = 'none';

  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    // 数组第一个场景自动启动,Hud 只注册不启动,等 start/launch 唤起
    scene: [MenuScene, HudScene],
  });

  const menu = game.scene.getScene('Menu') as MenuScene | undefined;
  const hud = game.scene.getScene('Hud') as HudScene | undefined;

  const logEntries: string[] = ['Menu 自动启动;Hud 注册未启动'];

  function pushLog(entry: string) {
    logEntries.push(entry);
    if (logEntries.length > 6) {
      logEntries.shift();
    }
    report();
  }

  if (menu) {
    menu.pushLog = pushLog;
  }
  if (hud) {
    hud.pushLog = pushLog;
  }

  function statusLabel(scene: Phaser.Scene): string {
    return (
      STATUS_LABELS[scene.sys.settings.status] ??
      String(scene.sys.settings.status)
    );
  }

  function report() {
    emit({
      menuStatus: menu ? statusLabel(menu) : '(未注册)',
      hudStatus: hud ? statusLabel(hud) : '(未注册)',
      hudInitData:
        hud?.lastInitData === undefined
          ? '(Hud 尚未启动)'
          : JSON.stringify(hud.lastInitData),
      registryScore:
        game.registry.get('score') === undefined
          ? '(未设置)'
          : String(game.registry.get('score')),
      hudDataScore:
        hud?.data?.has('score') === true
          ? String(hud.data.get('score'))
          : '(未设置)',
      log: logEntries.join('\n'),
    });
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  report();

  return {
    setScore(score) {
      if (score === appliedScore) {
        return;
      }
      appliedScore = score;
      pushLog(`registry.set('score', ${score})`);
      // registry 是游戏级键值:与任何场景的运行状态无关
      game.registry.set('score', score);
    },
    perform(action) {
      if (action === appliedAction || !menu) {
        return;
      }
      appliedAction = action;

      // 启动参数:此刻的分数随 data 一起交接给 Hud
      const data = { score: appliedScore ?? 0, level: 3 };
      if (action === 'start') {
        pushLog(`Menu 执行 start('Hud', ${JSON.stringify(data)})`);
        // start 让 Menu 自己 shutdown,Hud 完整启动
        menu.scene.start('Hud', data);
      } else if (action === 'launch') {
        pushLog(`Menu 执行 launch('Hud', ${JSON.stringify(data)})`);
        // launch 不影响 Menu,Hud 并行启动
        menu.scene.launch('Hud', data);
      } else if (action === 'stop') {
        pushLog("Menu 执行 stop('Hud')");
        menu.scene.stop('Hud');
      }
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
