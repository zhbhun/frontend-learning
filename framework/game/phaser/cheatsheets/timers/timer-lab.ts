/**
 * 范例:计时器配置实验台。
 * 输入(Controls):delay、repeat(-1 无限)、loop、startAt(预置 elapsed)、
 * timeScale(事件级时间缩放)、paused(以暂停状态创建)。
 * 主要操作:任一 Controls 参数变化 → applyTimer 先 removeEvent 旧事件,
 * 再按当前参数 addEvent 重建;每次触发点亮一枚圆点并计数。
 * 预期结果:进度条按 elapsed/delay 展示当前轮进度;repeat + 1 枚圆点逐次
 * 点亮;loop 与 repeat: -1 的 repeatCount 都是巨大整数;startAt 让进度条
 * 出生即有读数、首轮提前触发;timeScale > 1 进度加速;paused 冻结 elapsed。
 * 阅读主线:applyTimer(Controls 入口,重建)→ onFire(触发证据)
 * → report(每帧证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的 TimerEventConfig 子集,变化即重建计时器。 */
export interface TimerLabParams {
  /** 每轮触发间隔,ms */
  delay: number;
  /** 额外重复次数,共触发 repeat + 1 次;-1 无限 */
  repeat: number;
  /** 无限循环,等价 repeat: -1 */
  loop: boolean;
  /** 预置 elapsed,让首轮提前触发,不影响后续轮次 */
  startAt: number;
  /** 事件级时间缩放,与 Clock.timeScale 相乘生效 */
  timeScale: number;
  /** 以暂停状态创建,elapsed 冻结在 startAt */
  paused: boolean;
}

/** readout 用的派生读数:全部来自 TimerEvent 真实属性与触发计数。 */
export interface TimerLabSnapshot {
  /** 已触发次数(回调计数) */
  fired: number;
  /** 预计触发总数;loop / repeat: -1 时为 Infinity */
  expected: number;
  /** getRepeatCount():剩余重复次数;无限时为 999999999999 */
  repeatCount: number;
  /** getElapsed():当前轮累计 ms(含 startAt 预置) */
  elapsed: number;
  /** getProgress():当前轮进度 0–1 */
  progress: number;
  /** getOverallProgress():全程进度;无限时退化为当前轮 */
  overallProgress: number;
  /** getRemaining():距下次触发 ms */
  remaining: number;
  /** 事件 paused 属性 */
  paused: boolean;
}

export interface TimerLabInstance {
  applyTimer(params: TimerLabParams): void;
  dispose(): void;
}

const BAR_X = 120;
const BAR_Y = 230;
const BAR_WIDTH = 480;
const BAR_HEIGHT = 14;
const DOTS_Y = 185;

class TimerLabScene extends Phaser.Scene {
  private timer?: Phaser.Time.TimerEvent;
  private fired = 0;
  private expected = 1;
  /** 场景就绪前暂存 Controls 参数;create 后按它建首个计时器。 */
  private pendingParams?: TimerLabParams;
  private created = false;
  private gfx?: Phaser.GameObjects.Graphics;
  private infiniteText?: Phaser.GameObjects.Text;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: TimerLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'TimerLab' });
  }

  create() {
    this.created = true;
    this.gfx = this.add.graphics();
    this.infiniteText = this.add
      .text(BAR_X + 68, DOTS_Y, '', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '13px',
        color: '#facc15',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(
        12,
        24,
        '进度条 = 当前轮 elapsed / delay · 圆点 = 已触发 / 预计触发 · 参数变化即重建',
        {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '12px',
          color: '#8fa3c8',
        },
      )
      .setOrigin(0, 0.5);
    this.add
      .text(
        12,
        GAME_HEIGHT - 20,
        'this.time.addEvent({ delay, repeat, loop, startAt, timeScale, paused })',
        {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '12px',
          color: '#8fa3c8',
        },
      )
      .setOrigin(0, 0.5);

    if (this.pendingParams) {
      this.applyTimer(this.pendingParams);
    }
    this.report();
  }

  override update() {
    this.report();
  }

  /** Controls 入口:立即移除旧事件,按当前参数重建。 */
  applyTimer(params: TimerLabParams) {
    this.pendingParams = params;
    if (!this.created) {
      return; // 场景尚未就绪,create() 会用 pendingParams 补建
    }

    if (this.timer) {
      // removeEvent 立即从 Clock 的所有内部列表移除,适合"重建前清理"
      this.time.removeEvent(this.timer);
    }
    this.fired = 0;
    this.expected =
      params.loop || params.repeat === -1 ? Infinity : params.repeat + 1;
    this.timer = this.time.addEvent({
      delay: params.delay,
      repeat: params.repeat,
      loop: params.loop,
      startAt: params.startAt,
      timeScale: params.timeScale,
      paused: params.paused,
      callback: () => this.onFire(),
    });
  }

  /** 触发证据:计数并由圆点 / ∞ 文本呈现。 */
  private onFire() {
    this.fired++;
  }

  private report() {
    const timer = this.timer;
    if (!timer || !this.gfx) {
      return;
    }

    this.emitSnapshot({
      fired: this.fired,
      expected: this.expected,
      repeatCount: timer.getRepeatCount(),
      elapsed: timer.getElapsed(),
      progress: timer.getProgress(),
      overallProgress: timer.getOverallProgress(),
      remaining: timer.getRemaining(),
      paused: timer.paused,
    });
    this.draw(timer);
  }

  /** 轨道底、进度条、预计触发圆点;每帧重画,读数即证据。 */
  private draw(timer: Phaser.Time.TimerEvent) {
    const g = this.gfx!;
    g.clear();

    // 进度轨道
    g.fillStyle(0x253048, 1);
    g.fillRoundedRect(BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT, 4);
    // 当前进度:无限事件触发后 elapsed 回落,进度条随之回卷
    const progress = Phaser.Math.Clamp(timer.getProgress(), 0, 1);
    if (progress > 0) {
      g.fillStyle(0x60a5fa, 1);
      g.fillRoundedRect(BAR_X, BAR_Y, BAR_WIDTH * progress, BAR_HEIGHT, 4);
    }

    // 预计触发圆点:有限总数逐枚点亮;无限画 ∞ 标记与计数
    if (Number.isFinite(this.expected)) {
      const count = Math.max(1, this.expected);
      const gap = BAR_WIDTH / count;
      for (let i = 0; i < count; i++) {
        const cx = BAR_X + gap * (i + 0.5);
        g.fillStyle(i < this.fired ? 0xfacc15 : 0x3b4a6b, 1);
        g.fillCircle(cx, DOTS_Y, i < this.fired ? 7 : 5);
      }
    } else {
      g.fillStyle(0x3b4a6b, 1);
      g.fillCircle(BAR_X + 24, DOTS_Y, 5);
      g.lineStyle(2, 0x3b4a6b, 1);
      g.strokeCircle(BAR_X + 48, DOTS_Y, 8);
    }
    this.infiniteText!
      .setVisible(!Number.isFinite(this.expected))
      .setText(`∞ 已触发 ${this.fired} 次`);
  }
}

export function createTimerLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TimerLabSnapshot) => void,
): TimerLabInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new TimerLabScene();
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
    applyTimer(params: TimerLabParams) {
      scene.applyTimer(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
