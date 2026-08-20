/**
 * 范例:KeyCombo 序列输入——科乐美密码 ↑↑↓↓←→←→BA。
 * 输入(Controls):maxKeyDelay(相邻两键的最大间隔 ms,0 不限)、
 * resetOnWrongKey(按错是否从头再来)。
 * 前置状态:同键盘实验台——先点击画布让 iframe 获得焦点。
 * 主要操作:按序列输入方向键与 B、A;故意按错或放慢速度观察进度复位。
 * 预期结果:画布内格子逐格点亮(readout 同步 combo.progress 与 index),
 * 完整匹配时 keycombomatch 触发并显示提示;按错(resetOnWrongKey=true)
 * 或超过 maxKeyDelay 时进度归零重来。
 * 阅读主线:create(建 combo 与挂 keycombomatch)→ rebuild(Controls 变化
 * 重建)→ draw(每帧进度格)→ report(证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即销毁旧 combo 按新配置重建。 */
export interface KeyComboParams {
  /** 相邻两键的最大间隔 ms;超过则进度复位,0 表示不限 */
  maxKeyDelay: number;
  /** 按到序列外的键是否把进度复位到开头 */
  resetOnWrongKey: boolean;
}

/** readout 用的派生读数:全部来自 KeyCombo 真实属性。 */
export interface KeyComboSnapshot {
  /** combo.progress:0–1 完成度 */
  progress: number;
  /** 当前等待第几键(0 起)与序列总长 */
  index: number;
  size: number;
  /** keycombomatch 事件累计触发次数(重建不清零) */
  matchCount: number;
  maxKeyDelay: number;
  resetOnWrongKey: boolean;
}

export interface KeyComboInstance {
  applyParams(params: KeyComboParams): void;
  dispose(): void;
}

const { UP, DOWN, LEFT, RIGHT, B, A } = Phaser.Input.Keyboard.KeyCodes;
/** 科乐美密码:↑ ↑ ↓ ↓ ← → ← → B A */
const COMBO_CODES = [UP, UP, DOWN, DOWN, LEFT, RIGHT, LEFT, RIGHT, B, A];
const SLOT = 34;
const SLOT_GAP = 10;
const SLOT_Y = 190;

class KeyComboScene extends Phaser.Scene {
  private combo?: Phaser.Input.Keyboard.KeyCombo;
  private matchCount = 0;
  private matchFlashUntil = 0;
  private params: KeyComboParams = { maxKeyDelay: 0, resetOnWrongKey: true };
  private slots: Phaser.GameObjects.Rectangle[] = [];
  private matchText?: Phaser.GameObjects.Text;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: KeyComboSnapshot) => void = () => {};

  constructor() {
    super({ key: 'KeyCombo' });
  }

  create() {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    // 方向键与空格进入全局捕获,避免页面滚动吃掉按键
    keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');

    this.add
      .text(GAME_WIDTH / 2, 120, '输入 ↑ ↑ ↓ ↓ ← → ← → B  A', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '18px',
        color: '#dbe6f5',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        148,
        '(先点击画布获得焦点 · 按错或超时会按配置复位)',
        {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '12px',
          color: '#8fa3c8',
        },
      )
      .setOrigin(0.5);

    this.buildSlots();
    this.matchText = this.add
      .text(GAME_WIDTH / 2, 250, '', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '16px',
        color: '#4ade80',
      })
      .setOrigin(0.5);

    // keycombomatch 的参数是 (combo, event),这里只用到触发时机
    keyboard.on('keycombomatch', () => {
      this.matchCount++;
      this.matchFlashUntil = this.time.now + 1500;
    });

    this.rebuild(this.params);
  }

  override update(): void {
    this.draw();
    this.report();
  }

  /** Controls 入口:配置变化即销毁旧 combo 重建,进度从零开始。 */
  applyParams(params: KeyComboParams) {
    this.params = params;
    // 首次 apply 可能早于场景 boot(input 插件尚未注入),create 完成后会按 params 重建
    if (!this.input) {
      return;
    }
    this.rebuild(params);
  }

  private rebuild(params: KeyComboParams) {
    this.combo?.destroy();
    this.combo = this.input.keyboard?.createCombo(COMBO_CODES, {
      maxKeyDelay: params.maxKeyDelay,
      resetOnWrongKey: params.resetOnWrongKey,
      resetOnMatch: false,
      deleteOnMatch: false,
    });
  }

  /** 十个进度格:已按过的点亮,当前等待中的高亮描边。 */
  private buildSlots() {
    const total = COMBO_CODES.length;
    const totalWidth = total * SLOT + (total - 1) * SLOT_GAP;
    const startX = (GAME_WIDTH - totalWidth) / 2 + SLOT / 2;

    COMBO_CODES.forEach((_code, i) => {
      const rect = this.add.rectangle(startX + i * (SLOT + SLOT_GAP), SLOT_Y, SLOT, SLOT);
      rect.setStrokeStyle(2, 0x3b4a6b, 1);
      this.slots.push(rect);
    });
  }

  private draw() {
    const combo = this.combo;
    if (!combo) {
      return;
    }

    this.slots.forEach((rect, i) => {
      const done = i < combo.index;
      const current = i === combo.index;
      rect.setFillStyle(done ? 0x4ade80 : 0x253048, done || current ? 1 : 0);
      rect.setStrokeStyle(2, current ? 0xfacc15 : 0x3b4a6b, 1);
    });

    const matched = this.time.now < this.matchFlashUntil;
    this.matchText?.setText(
      matched ? `COMBO MATCHED!(${this.matchCount} 次)` : '',
    );
  }

  private report() {
    const combo = this.combo;
    if (!combo) {
      return;
    }

    this.emitSnapshot({
      progress: combo.progress,
      index: combo.index,
      size: combo.size,
      matchCount: this.matchCount,
      maxKeyDelay: this.params.maxKeyDelay,
      resetOnWrongKey: this.params.resetOnWrongKey,
    });
  }
}

export function createKeyCombo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: KeyComboSnapshot) => void,
): KeyComboInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new KeyComboScene();
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
    applyParams(params: KeyComboParams) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
