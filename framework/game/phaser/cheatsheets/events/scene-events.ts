/**
 * 范例:scene.events 上的场景事件时间线。
 * 输入:「场景操作」下拉:保持运行、暂停、恢复、停止、重新启动。
 * 主要操作:场景在构造函数里(经 this.sys.events,注入前唯一可用入口)
 *   注册 boot/start/ready/create/pause/resume/shutdown/destroy 监听并记录日志;
 *   update 事件单独计数。apply 把操作映射为 this.scene.pause()/resume()/stop()/start()。
 * 预期结果:事件日志呈现 start → ready → create 的启动顺序与
 *   pause/resume/shutdown 的状态变化;stop 后 update 事件计数冻结;
 *   再次 start 时 start/ready/create 重走一遍而 boot 不再出现(boot 每实例一次)。
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

export type SceneEventsAction =
  | 'none'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'start';

export interface SceneEventsSnapshot {
  log: string;
  updateEventFrame: number;
  status: string;
}

export interface SceneEventsInstance {
  perform(action: SceneEventsAction): void;
  dispose(): void;
}

class WatchedScene extends Phaser.Scene {
  private updateEventFrame = 0;
  private logEntries: string[] = [];
  private logText?: Phaser.GameObjects.Text;
  private frameText?: Phaser.GameObjects.Text;
  /** shutdown 会清空显示列表;标记文本是否还活着,避免向已销毁对象写入 */
  private textsAlive = false;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: SceneEventsSnapshot) => void = () => {};

  constructor() {
    super({ key: 'Watched' });

    // 构造函数里注入还未发生,this.events 尚不存在;
    // this.sys.events 与注入后的 this.events 是同一实例,
    // 在这里注册才能捕获包括 boot 在内的完整首次时间线
    const events = this.sys.events;
    events.on('boot', () => this.pushLog('boot(每实例仅一次)'));
    events.on('start', () => this.pushLog('start'));
    events.on('ready', () => this.pushLog('ready'));
    events.on('create', () => this.pushLog('create'));
    events.on('pause', (_sys: unknown, data: { reason?: string }) =>
      this.pushLog(`pause${labelReason(data)}`),
    );
    events.on('resume', (_sys: unknown, data: { reason?: string }) =>
      this.pushLog(`resume${labelReason(data)}`),
    );
    events.on('shutdown', () => {
      this.pushLog('shutdown(监听器保留,显示列表清空)');
      this.report();
      this.textsAlive = false;
    });
    events.on('destroy', () => {
      this.pushLog('destroy');
      this.report();
      this.textsAlive = false;
    });
    // update 事件每帧触发;本场景没有 update 方法,计数照样增长
    events.on('update', () => {
      this.updateEventFrame += 1;
      if (this.updateEventFrame % 6 === 0 || this.updateEventFrame < 6) {
        this.report();
      }
    });
  }

  create() {
    this.add.text(24, 20, '场景事件时间线:低频事件记入日志,update 事件计数', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '18px',
      color: '#e2e8f0',
    });
    this.add.text(
      24,
      48,
      '本场景没有 update 方法,update 事件仍每帧触发(计数读数为证)',
      {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '13px',
        color: '#8fa3c8',
      },
    );

    this.logText = this.add.text(24, GAME_HEIGHT - 118, '', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '13px',
      color: '#9fb6dd',
      lineSpacing: 4,
    });
    this.frameText = this.add.text(24, 84, '', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '14px',
      color: '#f0b428',
    });

    this.textsAlive = true;
    this.renderTexts();
    this.report();
  }

  private pushLog(entry: string) {
    this.logEntries.push(entry);
    if (this.logEntries.length > 7) {
      this.logEntries.shift();
    }
    this.renderTexts();
  }

  private renderTexts() {
    if (this.textsAlive) {
      this.logText?.setText(this.logEntries.join('\n'));
      this.frameText?.setText(`update 事件已触发 ${this.updateEventFrame} 次`);
    }
  }

  private report() {
    this.emitSnapshot({
      log: this.logEntries.join(' → '),
      updateEventFrame: this.updateEventFrame,
      status:
        STATUS_LABELS[this.sys.settings.status] ??
        String(this.sys.settings.status),
    });
  }
}

function labelReason(data: { reason?: string } | undefined): string {
  return data?.reason ? `(reason=${data.reason})` : '()';
}

export function createSceneEvents(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SceneEventsSnapshot) => void,
): SceneEventsInstance {
  let appliedAction: SceneEventsAction = 'none';

  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [WatchedScene],
  });

  const scene = game.scene.getScene('Watched') as WatchedScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    perform(action) {
      if (action === appliedAction) {
        return;
      }
      appliedAction = action;

      const target = game.scene.getScene('Watched');
      if (!target) {
        return;
      }

      const data = { reason: '来自控件' };
      if (action === 'pause' && target.scene.isActive()) {
        target.scene.pause(undefined, data);
      } else if (action === 'resume' && target.scene.isPaused()) {
        target.scene.resume(undefined, data);
      } else if (action === 'stop') {
        target.scene.stop();
      } else if (action === 'start') {
        // 不带 key:先 shutdown 自己,再带完整启动流程重启
        target.scene.start();
      }
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
