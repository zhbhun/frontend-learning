/**
 * 范例:计时器控制台(双场景)。
 * 输入(Controls):clockTimeScale(目标场景 Clock 的时间缩放);画布内按钮
 * 提供事件级与场景级操作:暂停/恢复事件、remove()/remove(true)/reset、
 * 新建、叠加新建(陷阱)、removeAllEvents、暂停/恢复目标场景。
 * 主要操作:TimerTargetScene 持有 delay 1000、repeat 3(共触发 4 次)的
 * 计时器;TimerConsoleScene 常驻运行,按钮直接操作目标事件或目标场景,
 * 并每帧把目标事件读数与两个场景的游戏时长送到 readout。
 * 预期结果:paused 属性冻结 elapsed;remove() 立即把 elapsed 顶到 delay、
 * 下一帧静默移除;remove(true) 先补触发一次再移除;reset 只重置事件本身;
 * 叠加新建让触发频率翻倍;Clock timeScale 0 冻结事件但游戏时长继续走;
 * 场景暂停后目标场景的 now 与 elapsed 一起冻结,恢复后从冻结处继续。
 * 阅读主线:TimerTargetScene.rebuild → ConsoleScene.addButtons(操作入口)
 * → ConsoleScene.update(每帧证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:作用于目标场景的 Clock。 */
export interface TimerConsoleParams {
  /** 目标场景 this.time.timeScale;0 冻结全部事件,2 时间加倍速 */
  clockTimeScale: number;
}

/** readout 用的派生读数:来自目标事件属性与两个场景的 Clock。 */
export interface TimerConsoleSnapshot {
  /** 已触发次数(回调计数) */
  fired: number;
  /** getRepeatCount():剩余重复次数 */
  repeatCount: number;
  /** getElapsed():当前轮累计 ms */
  elapsed: number;
  /** getProgress():当前轮进度 0–1 */
  progress: number;
  /** getRemaining():距下次触发 ms */
  remaining: number;
  /** 事件 paused 属性 */
  eventPaused: boolean;
  /** 目标场景 this.time.timeScale */
  clockTimeScale: number;
  /** 目标场景游戏时长 = time.now - time.startTime;场景暂停时冻结 */
  targetClockTime: number;
  /** 控制台场景游戏时长;永不暂停,作为对照组 */
  consoleClockTime: number;
}

export interface TimerConsoleInstance {
  applyClockScale(params: TimerConsoleParams): void;
  dispose(): void;
}

const BAR_X = 120;
const BAR_Y = 250;
const BAR_WIDTH = 480;
const BAR_HEIGHT = 14;
const DOTS_Y = 205;
const DELAY = 1000;
const REPEAT = 3;

/** 目标场景:持有被操作的计时器;被暂停时它的 update 与 Clock 一起停走。 */
class TimerTargetScene extends Phaser.Scene {
  timer?: Phaser.Time.TimerEvent;
  fired = 0;
  private gfx?: Phaser.GameObjects.Graphics;
  private firedText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'TimerTarget' });
  }

  create() {
    this.gfx = this.add.graphics();
    this.firedText = this.add
      .text(GAME_WIDTH - 16, DOTS_Y, '', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '13px',
        color: '#facc15',
      })
      .setOrigin(1, 0.5);
    this.add
      .text(
        12,
        GAME_HEIGHT - 20,
        '目标场景计时器 delay 1000 · repeat 3(共 4 次)· 按钮在上方控制台场景',
        {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '12px',
          color: '#8fa3c8',
        },
      )
      .setOrigin(0, 0.5);
    this.rebuild();
  }

  override update() {
    this.draw();
  }

  /** 新建(先清理):removeEvent 立即移除旧事件,再建一个全新的。 */
  rebuild() {
    if (this.timer) {
      this.time.removeEvent(this.timer);
    }
    this.fired = 0;
    this.timer = this.addEvent();
  }

  /** 陷阱演示:不清旧事件直接再 addEvent,两个循环并行,触发频率翻倍。 */
  stack() {
    this.time.addEvent({
      delay: DELAY,
      repeat: REPEAT,
      callback: () => this.onFire(),
    });
  }

  /** reset 只重置 TimerEvent 本身(elapsed / repeatCount),业务计数要自理。 */
  resetTimer() {
    // reset 会完整重建事件状态,callback 必须重新给,否则触发时无事发生
    this.timer?.reset({
      delay: DELAY,
      repeat: REPEAT,
      callback: () => this.onFire(),
    });
  }

  private addEvent(): Phaser.Time.TimerEvent {
    return this.time.addEvent({
      delay: DELAY,
      repeat: REPEAT,
      callback: () => this.onFire(),
    });
  }

  private onFire() {
    this.fired++;
  }

  private draw() {
    const g = this.gfx!;
    g.clear();

    g.fillStyle(0x253048, 1);
    g.fillRoundedRect(BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT, 4);
    const progress = this.timer
      ? Phaser.Math.Clamp(this.timer.getProgress(), 0, 1)
      : 0;
    if (progress > 0) {
      g.fillStyle(0x34d399, 1);
      g.fillRoundedRect(BAR_X, BAR_Y, BAR_WIDTH * progress, BAR_HEIGHT, 4);
    }

    // 预计触发 4 枚圆点;叠加新建后 fired 可超过 4,读数直接暴露翻倍
    const gap = BAR_WIDTH / (REPEAT + 1);
    for (let i = 0; i < REPEAT + 1; i++) {
      const cx = BAR_X + gap * (i + 0.5);
      g.fillStyle(i < this.fired ? 0xfacc15 : 0x3b4a6b, 1);
      g.fillCircle(cx, DOTS_Y, i < this.fired ? 7 : 5);
    }
    this.firedText!.setText(`已触发 ${this.fired} 次`);
  }
}

/** 控制台场景:常驻运行,按钮与 readout 都在这里,目标场景暂停也不受影响。 */
class TimerConsoleScene extends Phaser.Scene {
  private target?: TimerTargetScene;
  /** 由工厂注入:应用暂存的 Clock 缩放(Controls 可能先于 boot 到达)。 */
  applyStoredScale: () => void = () => {};

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: TimerConsoleSnapshot) => void = () => {};

  constructor() {
    super({ key: 'TimerConsole' });
  }

  create() {
    this.target = this.scene.get('TimerTarget') as TimerTargetScene;
    this.addButtons();
    this.applyStoredScale();
  }

  override update() {
    const target = this.target;
    if (!target) {
      return;
    }

    // 目标场景被暂停时它的 update 停走,但对象仍可读取——读数全部冻结,
    // 而控制台自己的 Clock 继续走,两相对照即是"场景级暂停"的证据。
    this.emitSnapshot({
      fired: target.fired,
      repeatCount: target.timer?.getRepeatCount() ?? 0,
      elapsed: target.timer?.getElapsed() ?? 0,
      progress: target.timer?.getProgress() ?? 0,
      remaining: target.timer?.getRemaining() ?? 0,
      eventPaused: target.timer?.paused ?? false,
      clockTimeScale: target.time.timeScale,
      targetClockTime: target.time.now - target.time.startTime,
      consoleClockTime: this.time.now - this.time.startTime,
    });
  }

  /** 事件级与场景级操作入口,全部直达对应 API。 */
  private addButtons() {
    const rows: Array<Array<[string, () => void]>> = [
      [
        ['暂停/恢复事件', () => this.toggleEventPaused()],
        ['remove()', () => this.target?.timer?.remove()],
        ['remove(true)', () => this.target?.timer?.remove(true)],
        ['reset()', () => this.target?.resetTimer()],
        ['新建(清理)', () => this.target?.rebuild()],
      ],
      [
        ['叠加新建(陷阱)', () => this.target?.stack()],
        ['removeAllEvents', () => this.target?.time.removeAllEvents()],
        ['场景暂停', () => this.scene.pause('TimerTarget')],
        ['场景恢复', () => this.scene.resume('TimerTarget')],
      ],
    ];

    rows.forEach((row, r) => {
      row.forEach(([label, onClick], i) => {
        const btn = this.add
          .text(76 + i * 148, 46 + r * 46, label, {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: '13px',
            color: '#dbe6f5',
            backgroundColor: '#253048',
            padding: { x: 10, y: 6 },
          })
          .setOrigin(0.5);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerdown', onClick);
      });
    });

    this.add
      .text(12, 18, '上排:事件级操作 · 下排:Clock / 场景级操作', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#8fa3c8',
      })
      .setOrigin(0, 0.5);
  }

  /** Phaser 4 的 TimerEvent 没有 pause()/resume() 方法,直接切 paused 属性。 */
  private toggleEventPaused() {
    const timer = this.target?.timer;
    if (timer) {
      timer.paused = !timer.paused;
    }
  }
}

export function createTimerConsole(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TimerConsoleSnapshot) => void,
): TimerConsoleInstance {
  // Phaser 4 场景注册是异步 boot:直接把 ConsoleScene 实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot / applyStoredScale。
  const scene = new TimerConsoleScene();
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [TimerTargetScene, scene],
  });

  scene.emitSnapshot = emit;

  // Controls 可能先于场景就绪到达:目标场景拿不到时先暂存,
  // ConsoleScene.create 里通过 applyStoredScale 补应用。
  let pendingScale: number | undefined;
  const applyScale = (scale: number) => {
    const target = game.scene.getScene('TimerTarget') as
      | TimerTargetScene
      | undefined;
    if (target?.time) {
      target.time.timeScale = scale;
    } else {
      pendingScale = scale;
    }
  };
  scene.applyStoredScale = () => {
    if (pendingScale !== undefined) {
      applyScale(pendingScale);
    }
  };

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    applyClockScale(params: TimerConsoleParams) {
      applyScale(params.clockTimeScale);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
