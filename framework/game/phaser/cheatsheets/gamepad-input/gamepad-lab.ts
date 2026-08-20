/**
 * 范例:手柄实验台——连接状态、轴读数、死区、按钮与振动的证据汇总。
 * 输入(Controls):simX / simY(模拟轴,无实体手柄时用同一套驱动链路
 * 驱动画面中的移动对象——「输入来源」抽象成函数,真实手柄与模拟滑块共用)、
 * deadzone(径向死区半径 0..0.5,越界部分重映射回 0..1)、vibrate
 * (false→true 变化沿对 pad1 调一次原生振动 API)。
 * 前置状态:浏览器通常要求用户先按手柄任意键,才通过 navigator.getGamepads
 * 暴露手柄(权限模型);无手柄时全部读数来自模拟轴。Game config 已开
 * input.gamepad(默认是关的,不开 this.input.gamepad 为 null)。
 * 主要操作:插入手柄并按任意键 → 状态行与 pad 读数变化;推左摇杆 →
 * 十字读数白点(原始)移动、绿点(死区后)跟随,对象同步移动;按标准映射
 * 按钮 → 按钮格点亮、down 计数 +1;半按扳机 → value 连续变化但按不满
 * 不发 down 事件;拖模拟轴 / 调死区 → 无手柄也能验证「读轴→死区→驱动」链路。
 * 预期结果:readout 同步 pad 总数、id、前四轴原始值、leftStick(threshold
 * 后)、死区后驱动向量、输入来源、坐标、按钮证据与振动结果。
 * 阅读主线:create(挂事件)→ update(读轴 + 死区 + 驱动)→
 * applyParams(Controls 入口与振动触发)→ report(每帧证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即时生效,不重建任何输入对象。 */
export interface GamepadLabParams {
  /** 模拟轴 X,-1..1;与真实手柄 leftStick 相加后进入同一驱动链路 */
  simX: number;
  /** 模拟轴 Y,-1..1 */
  simY: number;
  /** 径向死区半径,0..0.5;向量长度不超过它时归零,超出部分重映射回 0..1 */
  deadzone: number;
  /** 触发振动:false→true 的变化沿对 pad1 调一次 playEffect */
  vibrate: boolean;
}

/** readout 用的派生读数:全部来自 pad 真实属性、事件计数与驱动链路。 */
export interface GamepadLabSnapshot {
  /** gamepad.total:已连接(且被浏览器暴露)的手柄数 */
  total: number;
  /** pad1 的 index 与 id(截断);未连接为 '—' */
  padId: string;
  /** axes[0..3] 原始 value(未经 threshold):左摇杆 H/V + 右摇杆 H/V */
  axisValues: [number, number, number, number];
  /** pad.leftStick:Phaser 按 Axis.threshold(默认 0.1)硬截断后的读数 */
  leftStick: { x: number; y: number };
  /** 手柄 + 模拟合成后、再过径向死区(含重映射)的驱动向量 */
  drive: { x: number; y: number };
  /** 驱动来源判定:手柄摇杆有读数为「手柄」,否则看模拟轴 */
  source: '手柄' | '模拟' | '无';
  /** 移动对象坐标 */
  x: number;
  y: number;
  /** 插件 down 事件累计次数(所有 pad、所有按钮) */
  buttonDownCount: number;
  /** 最近一次 down 的按钮:index 与按下瞬间的 value */
  lastButton: string;
  /** pressed 为 true 的按钮 index 列表 */
  pressedIndices: string;
  /** connected / disconnected 事件计数 */
  connectCount: number;
  disconnectCount: number;
  /** 振动结果:playEffect 的 Promise 结果或失败原因 */
  vibResult: string;
  /** 当前死区参数回显 */
  deadzone: number;
}

export interface GamepadLabInstance {
  applyParams(params: GamepadLabParams): void;
  dispose(): void;
}

/**
 * 径向死区 + 重映射:长度 <= deadzone 归零;超出部分按 (m - dz) / (1 - dz)
 * 重映射,让「刚出死区」到「推满」仍然是 0..1 的连续输出——比 Phaser 内置
 * getValue() 的硬截断(小于阈值直接归零,超出后从原值起步)手感更线性。
 */
export function applyRadialDeadzone(
  x: number,
  y: number,
  deadzone: number,
): { x: number; y: number } {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= deadzone) {
    return { x: 0, y: 0 };
  }
  const scaled = (magnitude - deadzone) / (1 - deadzone);
  return { x: (x / magnitude) * scaled, y: (y / magnitude) * scaled };
}

const MOVER_KEY = 'gp-lab-mover';
const DOT_RAW_KEY = 'gp-lab-dot-raw';
const DOT_DRIVE_KEY = 'gp-lab-dot-drive';
const FIELD = { x: 224, y: 66, w: 476, h: 250 };
const BOX = { x: 44, y: 92, size: 140 };
const CELL = 24;
const CELL_GAP = 6;
const CELL_COUNT = 17;
const CELL_Y = 352;
const MOVER_SPEED = 240;

class GamepadLabScene extends Phaser.Scene {
  private params: GamepadLabParams = { simX: 0, simY: 0, deadzone: 0.15, vibrate: false };

  private mover?: Phaser.GameObjects.Image;
  private dotRaw?: Phaser.GameObjects.Image;
  private dotDrive?: Phaser.GameObjects.Image;
  private deadzoneRing?: Phaser.GameObjects.Graphics;
  private statusText?: Phaser.GameObjects.Text;
  private cells: Phaser.GameObjects.Rectangle[] = [];

  private counts = { down: 0, connected: 0, disconnected: 0 };
  private lastButton = '—';
  private vibResult = '未触发';
  private prevVibrate = false;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: GamepadLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'GamepadLab' });
  }

  create() {
    // config 里 input: { gamepad: true } 已开启;未开启时这里是 null
    const gamepad = this.input.gamepad;
    if (!gamepad) {
      return;
    }

    this.makeTextures();
    this.drawBounds();

    this.statusText = this.add
      .text(12, 18, '', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#8fa3c8',
      })
      .setOrigin(0, 0.5);

    // connected / disconnected 参数是 (pad, event):pad 是 Phaser 的
    // Gamepad 对象,event 是原生 GamepadEvent;在游戏步的 update 里派发
    gamepad.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.counts.connected++;
      void pad;
    });
    gamepad.on('disconnected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.counts.disconnected++;
      void pad;
    });

    // 插件级 down 事件参数是 (pad, button, value):覆盖所有已连接手柄,
    // 只有按钮 value 跨越 Button.threshold(默认 1)那一刻才派发
    gamepad.on(
      'down',
      (
        _pad: Phaser.Input.Gamepad.Gamepad,
        button: Phaser.Input.Gamepad.Button,
        value: number,
      ) => {
        this.counts.down++;
        this.lastButton = `#${button.index} value ${value.toFixed(2)}`;
      },
    );

    this.report();
  }

  override update(_time: number, delta: number): void {
    const gamepad = this.input.gamepad;
    // pad1 每帧现取:手柄可能在任意时刻被用户激活或拔出
    const pad = gamepad?.pad1;
    const total = gamepad?.total ?? 0;

    // 轴读数:axes[i].value 是原始值(-1..1);leftStick 已过 threshold
    const axisValues: [number, number, number, number] = [
      pad?.axes[0]?.value ?? 0,
      pad?.axes[1]?.value ?? 0,
      pad?.axes[2]?.value ?? 0,
      pad?.axes[3]?.value ?? 0,
    ];
    const stickX = pad?.leftStick.x ?? 0;
    const stickY = pad?.leftStick.y ?? 0;

    // 输入来源抽象:真实手柄与模拟滑块合成同一个向量,再走同一套死区
    const rawX = stickX + this.params.simX;
    const rawY = stickY + this.params.simY;
    const drive = applyRadialDeadzone(rawX, rawY, this.params.deadzone);

    const handActive = stickX !== 0 || stickY !== 0;
    const simActive = this.params.simX !== 0 || this.params.simY !== 0;
    const source: GamepadLabSnapshot['source'] = handActive
      ? '手柄'
      : simActive
        ? '模拟'
        : '无';

    this.move(drive, delta);
    this.draw(total, pad, rawX, rawY, drive);
    this.report(total, pad, axisValues, { x: stickX, y: stickY }, drive, source);
  }

  /** 坐标驱动:位移 = 驱动向量 × 速度 × 帧间隔,与帧率解耦,出界夹回。 */
  private move(drive: { x: number; y: number }, delta: number) {
    const mover = this.mover;
    if (!mover) {
      return;
    }
    const step = MOVER_SPEED * (delta / 1000);
    mover.x += drive.x * step;
    mover.y += drive.y * step;
    mover.x = Phaser.Math.Clamp(mover.x, FIELD.x + 14, FIELD.x + FIELD.w - 14);
    mover.y = Phaser.Math.Clamp(mover.y, FIELD.y + 14, FIELD.y + FIELD.h - 14);
  }

  /**
   * Controls 入口:模拟轴与死区即时生效;vibrate 只在 false→true 的
   * 变化沿触发一次,避免拖动开关时重复调用振动。
   */
  applyParams(params: GamepadLabParams) {
    this.params = params;
    if (params.vibrate && !this.prevVibrate) {
      this.fireVibration();
    }
    this.prevVibrate = params.vibrate;
  }

  /** 对 pad1 触发一次原生双马达振动;返回值是 Promise,异步回填结果。 */
  private fireVibration() {
    const pad = this.input.gamepad?.pad1;
    if (!pad) {
      this.vibResult = '无手柄,未调用';
      return;
    }
    // pad.vibration 就是原生 GamepadHapticActuator(pad.vibrationActuator),
    // 只有设备与浏览器都支持时才存在,调用前必须检测
    const actuator = pad.vibration;
    if (!actuator) {
      this.vibResult = '设备/浏览器不支持';
      return;
    }
    this.vibResult = '调用中…';
    actuator
      .playEffect('dual-rumble', {
        duration: 300,
        strongMagnitude: 0.9,
        weakMagnitude: 0.5,
      })
      .then((result: string) => {
        this.vibResult = `playEffect → ${result}`;
      })
      .catch(() => {
        this.vibResult = 'playEffect 被拒绝';
      });
  }

  /** 每帧证据:全部读数取自 pad 真实属性与事件计数。 */
  private report(
    total = 0,
    pad?: Phaser.Input.Gamepad.Gamepad,
    axisValues: [number, number, number, number] = [0, 0, 0, 0],
    leftStick: { x: number; y: number } = { x: 0, y: 0 },
    drive: { x: number; y: number } = { x: 0, y: 0 },
    source: GamepadLabSnapshot['source'] = '无',
  ) {
    const pressed = (pad?.buttons ?? [])
      .map((button, index) => (button.pressed ? String(index) : ''))
      .filter(Boolean)
      .join(' ');

    this.emitSnapshot({
      total,
      padId: pad ? `${pad.index}: ${pad.id.slice(0, 36)}` : '—',
      axisValues,
      leftStick,
      drive,
      source,
      x: Math.round(this.mover?.x ?? 0),
      y: Math.round(this.mover?.y ?? 0),
      buttonDownCount: this.counts.down,
      lastButton: this.lastButton,
      pressedIndices: pressed || '—',
      connectCount: this.counts.connected,
      disconnectCount: this.counts.disconnected,
      vibResult: this.vibResult,
      deadzone: this.params.deadzone,
    });
  }

  /** 状态行、十字读数(原始/死区后两个点 + 死区圈)与按钮格的每帧绘制。 */
  private draw(
    total: number,
    pad: Phaser.Input.Gamepad.Gamepad | undefined,
    rawX: number,
    rawY: number,
    drive: { x: number; y: number },
  ) {
    const hint = pad
      ? `已连接 ${total} 台:${pad.id.slice(0, 40)}(index ${pad.index})· 按钮 ${pad.getButtonTotal()} · 轴 ${pad.getAxisTotal()}`
      : `未检测到手柄(${total} 台)——插入手柄并按任意键激活;无手柄时用 Controls 模拟轴驱动同一套链路`;

    this.statusText?.setText(hint);

    // 十字读数:白点 = 手柄 + 模拟的合成原始向量(仅显示时夹到边界),
    // 绿点 = 死区后驱动向量;圆圈 = 当前死区半径
    const cx = BOX.x + BOX.size / 2;
    const cy = BOX.y + BOX.size / 2;
    const half = BOX.size / 2 - 8;
    this.dotRaw?.setPosition(
      cx + Phaser.Math.Clamp(rawX, -1, 1) * half,
      cy + Phaser.Math.Clamp(rawY, -1, 1) * half,
    );
    this.dotDrive?.setPosition(cx + drive.x * half, cy + drive.y * half);
    this.deadzoneRing?.clear();
    this.deadzoneRing?.lineStyle(1, 0xfacc15, 0.8);
    this.deadzoneRing?.strokeCircle(cx, cy, Math.min(this.params.deadzone, 1) * half);

    // 按钮格:标准映射 index 0..16,pressed 点亮;半按扳机时可用旁边
    // readout 的 value 读数对照 threshold 语义
    const buttons = pad?.buttons ?? [];
    this.cells.forEach((cell, index) => {
      const pressed = buttons[index]?.pressed ?? false;
      cell.setFillStyle(pressed ? 0x4ade80 : 0x253048, 1);
    });
  }

  /** 自包含素材:Graphics 画完 generateTexture 烘焙成普通纹理。 */
  private makeTextures() {
    if (!this.textures.exists(MOVER_KEY)) {
      const mover = this.make.graphics();
      mover.fillStyle(0x4ade80, 1);
      mover.fillCircle(12, 12, 11);
      mover.lineStyle(2, 0x141a26, 1);
      mover.strokeCircle(12, 12, 11);
      mover.generateTexture(MOVER_KEY, 24, 24);
      mover.destroy();
    }
    if (!this.textures.exists(DOT_RAW_KEY)) {
      const dot = this.make.graphics();
      dot.fillStyle(0xe2e8f0, 1);
      dot.fillCircle(5, 5, 5);
      dot.generateTexture(DOT_RAW_KEY, 10, 10);
      dot.destroy();
    }
    if (!this.textures.exists(DOT_DRIVE_KEY)) {
      const dot = this.make.graphics();
      dot.fillStyle(0x4ade80, 1);
      dot.fillCircle(5, 5, 5);
      dot.generateTexture(DOT_DRIVE_KEY, 10, 10);
      dot.destroy();
    }
  }

  /** 活动边界、十字读数框与按钮格:静态装饰只建一次。 */
  private drawBounds() {
    const { x, y, w, h } = FIELD;
    const bounds = this.add.graphics();
    bounds.lineStyle(1, 0x3b4a6b, 1);
    bounds.strokeRect(x, y, w, h);
    bounds.strokeRect(BOX.x, BOX.y, BOX.size, BOX.size);
    bounds.lineBetween(
      BOX.x + BOX.size / 2,
      BOX.y,
      BOX.x + BOX.size / 2,
      BOX.y + BOX.size,
    );
    bounds.lineBetween(
      BOX.x,
      BOX.y + BOX.size / 2,
      BOX.x + BOX.size,
      BOX.y + BOX.size / 2,
    );

    this.deadzoneRing = this.add.graphics();
    this.dotRaw = this.add.image(0, 0, DOT_RAW_KEY);
    this.dotDrive = this.add.image(0, 0, DOT_DRIVE_KEY);
    this.mover = this.add.image(x + w / 2, y + h / 2, MOVER_KEY);

    const labelStyle = {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '12px',
      color: '#8fa3c8',
    };
    this.add
      .text(BOX.x, BOX.y - 14, '十字读数:白 = 原始,绿 = 死区后', labelStyle)
      .setOrigin(0, 0.5);

    const cellsWidth = CELL_COUNT * CELL + (CELL_COUNT - 1) * CELL_GAP;
    const startX = (GAME_WIDTH - cellsWidth) / 2 + CELL / 2;
    for (let i = 0; i < CELL_COUNT; i++) {
      const cell = this.add.rectangle(
        startX + i * (CELL + CELL_GAP),
        CELL_Y,
        CELL,
        CELL,
      );
      cell.setStrokeStyle(1, 0x3b4a6b, 1);
      cell.setFillStyle(0x253048, 1);
      this.cells.push(cell);
    }
    this.add
      .text(12, GAME_HEIGHT - 12, '按钮格 = 标准映射 index 0-16(pressed 点亮;12-15 为十字键)', {
        ...labelStyle,
      })
      .setOrigin(0, 0.5);
  }
}

export function createGamepadLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GamepadLabSnapshot) => void,
): GamepadLabInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new GamepadLabScene();
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    // 手柄插件默认关闭:不在 config 开启,this.input.gamepad 会是 null
    input: { gamepad: true },
    scene: [scene],
  });

  scene.emitSnapshot = emit;

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    applyParams(params: GamepadLabParams) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}

