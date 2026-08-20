/**
 * 范例:EventEmitter 的 on / once / emit / off / removeAllListeners。
 * 输入:「发射次数」每加一,调用一次 this.events.emit('collect-coin', { n });
 *      「监听器操作」选择 off 移除 on 监听,或 removeAllListeners 清空该事件。
 * 主要操作:场景内注册一个 on 监听与一个 once 监听,emit 同步调用它们。
 * 预期结果:on 监听每次都收到,once 监听只收第一次;全部移除后 emit 返回
 * false(无监听),listenerCount 与日志同步反映这些差异。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

export type ListenerOp = 'none' | 'remove-on' | 'remove-all';

export interface CustomEventsSnapshot {
  emissions: number;
  onReceived: number;
  onceReceived: number;
  listenerCount: number;
  lastEmitResult: string;
  log: string;
}

export interface CustomEventsInstance {
  requestEmissions(count: number): void;
  performListenerOp(op: ListenerOp): void;
  dispose(): void;
}

interface CoinPayload {
  n: number;
}

class CoinScene extends Phaser.Scene {
  private emissions = 0;
  private onReceived = 0;
  private onceReceived = 0;
  private lastEmitResult = '尚未 emit';
  private logEntries: string[] = ['(尚未发射事件)'];
  private coin?: Phaser.GameObjects.Arc;
  private logText?: Phaser.GameObjects.Text;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: CustomEventsSnapshot) => void = () => {};

  constructor() {
    super({ key: 'Coin' });
  }

  create() {
    this.add.text(24, 20, "自定义事件:emit('collect-coin') → on / once / off", {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '18px',
      color: '#e2e8f0',
    });
    this.add.text(24, 48, 'on 每次都收到;once 只收第一次;移除后 emit 无监听', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '13px',
      color: '#8fa3c8',
    });

    this.coin = this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 12, 26, 0xf0b428);
    this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 12, 16, 0xf8d878);

    this.logText = this.add.text(24, GAME_HEIGHT - 92, '', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '13px',
      color: '#9fb6dd',
      lineSpacing: 4,
    });

    // 注册两个监听器:on 持续响应;once 只响应第一次,随后自动移除
    this.events.on('collect-coin', this.handleOn, this);
    this.events.once('collect-coin', this.handleOnce, this);

    this.renderLog();
    this.report();
  }

  /** on 监听:每次 emit 都会同步进入这里 */
  private handleOn(payload: CoinPayload) {
    this.onReceived += 1;
    this.pushLog(`on 收到 collect-coin #${payload.n}`);
    // 金币反馈:闪动一下
    this.coin?.setScale(0.6);
    this.tweens.add({ targets: this.coin, scale: 1, duration: 220, ease: 'Back.out' });
    this.report();
  }

  /** once 监听:只在第一次 emit 后进入一次,之后自动移除 */
  private handleOnce(payload: CoinPayload) {
    this.onceReceived += 1;
    this.pushLog(`once 收到 collect-coin #${payload.n}(自动移除)`);
    this.report();
  }

  /** 发射一次自定义事件;emit 同步调用监听器后返回「是否有监听」 */
  emitCoin() {
    this.emissions += 1;
    const payload: CoinPayload = { n: this.emissions };
    // handleOn / handleOnce 在 emit 返回前就已执行(日志顺序可证)
    const hadListeners = this.events.emit('collect-coin', payload);
    this.lastEmitResult = hadListeners ? 'true(有监听)' : 'false(无监听)';
    this.pushLog(`emit #${payload.n} 返回 ${this.lastEmitResult}`);
    this.report();
  }

  /** off 精确移除 on 监听(需要同一函数引用与 context) */
  removeOnListener() {
    this.events.off('collect-coin', this.handleOn, this);
    this.pushLog("off('collect-coin', handleOn)");
    this.report();
  }

  /** removeAllListeners 清空该事件的全部监听(含尚未触发的 once) */
  removeAllCoinListeners() {
    this.events.removeAllListeners('collect-coin');
    this.pushLog("removeAllListeners('collect-coin')");
    this.report();
  }

  private pushLog(entry: string) {
    this.logEntries.push(entry);
    if (this.logEntries.length > 4) {
      this.logEntries.shift();
    }
    this.renderLog();
  }

  private renderLog() {
    this.logText?.setText(this.logEntries.join('\n'));
  }

  private report() {
    this.emitSnapshot({
      emissions: this.emissions,
      onReceived: this.onReceived,
      onceReceived: this.onceReceived,
      listenerCount: this.events.listenerCount('collect-coin'),
      lastEmitResult: this.lastEmitResult,
      log: this.logEntries.join(' / '),
    });
  }
}

export function createCustomEvents(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CustomEventsSnapshot) => void,
): CustomEventsInstance {
  let appliedEmissions = 0;
  let appliedOp: ListenerOp = 'none';

  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [CoinScene],
  });

  const scene = game.scene.getScene('Coin') as CoinScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    requestEmissions(count) {
      while (appliedEmissions < count) {
        appliedEmissions += 1;
        scene?.emitCoin();
      }
    },
    performListenerOp(op) {
      if (op === appliedOp) {
        return;
      }
      appliedOp = op;
      if (op === 'remove-on') {
        scene?.removeOnListener();
      } else if (op === 'remove-all') {
        scene?.removeAllCoinListeners();
      }
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
