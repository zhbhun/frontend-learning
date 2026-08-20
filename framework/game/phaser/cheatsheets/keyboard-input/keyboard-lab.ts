/**
 * 范例:键盘状态实验台——Key 对象轮询 + 键盘事件的证据汇总。
 * 输入(Controls):speed(移动速度 px/s)、emitOnRepeat(W 键 Key 对象的
 * 'down' 事件是否随系统重复持续触发)、enabled(this.input.keyboard 总开关)。
 * 前置状态:键盘事件默认挂在 window 上,Storybook Canvas 是 iframe——
 * 读者须先点击画布让 iframe 获得焦点,按键才会到达本范例。
 * 主要操作:光标键 / WASD 移动方块;按住 W 对比 keydown-W 与 Key 'down'
 * 两套计数;按住未注册 Key 的 K 键对比全局 keydown 的重复派发;
 * 观察 JustDown / getDuration() / duration 的派生状态。
 * 预期结果:readout 同步各键 isDown、最近按下 / 抬起键名、事件计数、
 * JustDown 每次按下恰好 +1、按住期间 getDuration() 增长而抬起后归 0、
 * duration 定格为上一轮按住时长;关闭 enabled 后键盘读数全部冻结。
 * 阅读主线:create(创建 Key 与挂事件)→ update(轮询移动 + JustDown)
 * → applyParams(Controls 入口)→ report(每帧证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即时生效,不重建 Key。 */
export interface KeyboardLabParams {
  /** 移动速度,px/s;update 里乘以帧间隔换算位移 */
  speed: number;
  /** W 键 Key 对象的 emitOnRepeat:按住时 'down' 事件是否随系统重复持续触发 */
  emitOnRepeat: boolean;
  /** this.input.keyboard.enabled 总开关;false 时事件不派发、Key 状态不更新 */
  enabled: boolean;
}

/** readout 用的派生读数:全部来自 Key 真实属性与事件计数。 */
export interface KeyboardLabSnapshot {
  keyboardEnabled: boolean;
  cursor: { left: boolean; right: boolean; up: boolean; down: boolean };
  wasd: { w: boolean; a: boolean; s: boolean; d: boolean };
  x: number;
  y: number;
  lastDown: string;
  lastUp: string;
  /** 全局 keydown / keyup 事件计数(插件级) */
  keydownCount: number;
  keyupCount: number;
  /** keydown-W 点分事件计数:W 已注册 Key,按住重复不重发 */
  keydownWCount: number;
  /** W 键 Key 对象自身 'down' 事件计数:受 emitOnRepeat 控制 */
  keyDownEventCount: number;
  /** JustDown(W) 为 true 的次数:每次按下恰好一次 */
  justDownCount: number;
  /** W.getDuration():按住期间持续增长,抬起后为 0 */
  wGetDuration: number;
  /** W.duration:上一次完整按住的时长,抬起时定格 */
  wDuration: number;
  /** 最近一次全局 keydown 的原生 event.repeat */
  lastRepeat: boolean;
}

export interface KeyboardLabInstance {
  applyParams(params: KeyboardLabParams): void;
  dispose(): void;
}

const PLAYER_KEY = 'kb-lab-player';
const MARGIN = 26;
const TOP_MARGIN = 52;

/** keyCode → KeyCodes 名称的反查表,只用于把事件读数显示成键名。 */
const codeNameMap = new Map<number, string>();

function keyName(event: KeyboardEvent): string {
  if (codeNameMap.size === 0) {
    const codes = Phaser.Input.Keyboard.KeyCodes as unknown as Record<
      string,
      number
    >;
    for (const name of Object.keys(codes)) {
      const code = codes[name];
      if (!codeNameMap.has(code)) {
        codeNameMap.set(code, name);
      }
    }
  }
  return codeNameMap.get(event.keyCode) ?? `#${event.keyCode}`;
}

class KeyboardLabScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Image;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  private speed = 240;
  private counts = {
    keydown: 0,
    keyup: 0,
    keydownW: 0,
    keyDownEvent: 0,
    justDown: 0,
  };
  private lastDown = '—';
  private lastUp = '—';
  private lastRepeat = false;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: KeyboardLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'KeyboardLab' });
  }

  create() {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    this.makeTextures();
    this.drawBounds();

    // 三种创建 Key 的方式:createCursorKeys(六个键)与 addKeys('W,S,A,D')
    // 都默认 enableCapture=true,即按键会进入全局捕获列表(preventDefault)
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;

    // Key 对象自己的 'down' 事件:参数是 (key, event),受 emitOnRepeat 控制
    this.wasd.W.on('down', () => this.counts.keyDownEvent++);

    // 插件级事件:全局 keydown / keyup(ANY_KEY),参数只有原生 event
    keyboard.on('keydown', (event: KeyboardEvent) => {
      this.counts.keydown++;
      this.lastDown = keyName(event);
      this.lastRepeat = event.repeat;
    });
    keyboard.on('keyup', (event: KeyboardEvent) => {
      this.counts.keyup++;
      this.lastUp = keyName(event);
    });

    // keydown-<KEY> 点分事件:W 已注册 Key,按住期间系统重复不会重发
    keyboard.on('keydown-W', () => this.counts.keydownW++);

    this.player = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, PLAYER_KEY);
    this.report();
  }

  override update(_time: number, delta: number): void {
    // JustDown:每帧检查,标志位被消费一次后即失效——按住只 +1,
    // 松开再按下才会再次返回 true
    if (this.wasd && Phaser.Input.Keyboard.JustDown(this.wasd.W)) {
      this.counts.justDown++;
    }

    this.move(delta);
    this.report();
  }

  /** Controls 入口:三个参数都即时生效,不销毁 Key。 */
  applyParams(params: KeyboardLabParams) {
    this.speed = params.speed;
    // 首次 apply 可能早于场景 boot(input 插件尚未注入),跳过等 Controls 下次变化
    if (!this.input) {
      return;
    }
    const keyboard = this.input.keyboard;
    if (!keyboard || !this.wasd) {
      return;
    }
    keyboard.enabled = params.enabled;
    this.wasd.W.setEmitOnRepeat(params.emitOnRepeat);
  }

  /** 轮询移动:光标键与 WASD 取或,斜向归一化保持等速,出界夹回边界。 */
  private move(delta: number) {
    const { player, cursors, wasd } = this;
    if (!player || !cursors || !wasd) {
      return;
    }

    const vx =
      (cursors.left.isDown || wasd.A.isDown ? -1 : 0) +
      (cursors.right.isDown || wasd.D.isDown ? 1 : 0);
    const vy =
      (cursors.up.isDown || wasd.W.isDown ? -1 : 0) +
      (cursors.down.isDown || wasd.S.isDown ? 1 : 0);

    const step = this.speed * (delta / 1000);
    const diagonal = vx !== 0 && vy !== 0 ? Math.SQRT1_2 : 1;
    player.x += vx * step * diagonal;
    player.y += vy * step * diagonal;
    player.x = Phaser.Math.Clamp(player.x, MARGIN, GAME_WIDTH - MARGIN);
    player.y = Phaser.Math.Clamp(player.y, TOP_MARGIN, GAME_HEIGHT - MARGIN);
  }

  private report() {
    const { player, cursors, wasd } = this;
    if (!player || !cursors || !wasd) {
      return;
    }

    this.emitSnapshot({
      keyboardEnabled: this.input.keyboard?.enabled ?? false,
      cursor: {
        left: cursors.left.isDown,
        right: cursors.right.isDown,
        up: cursors.up.isDown,
        down: cursors.down.isDown,
      },
      wasd: {
        w: wasd.W.isDown,
        a: wasd.A.isDown,
        s: wasd.S.isDown,
        d: wasd.D.isDown,
      },
      x: Math.round(player.x),
      y: Math.round(player.y),
      lastDown: this.lastDown,
      lastUp: this.lastUp,
      keydownCount: this.counts.keydown,
      keyupCount: this.counts.keyup,
      keydownWCount: this.counts.keydownW,
      keyDownEventCount: this.counts.keyDownEvent,
      justDownCount: this.counts.justDown,
      wGetDuration: wasd.W.getDuration(),
      wDuration: wasd.W.duration,
      lastRepeat: this.lastRepeat,
    });
  }

  /** 自包含素材:Graphics 画完 generateTexture 烘焙成普通纹理。 */
  private makeTextures() {
    if (this.textures.exists(PLAYER_KEY)) {
      return;
    }
    const g = this.make.graphics();
    g.fillStyle(0x4ade80, 1);
    g.fillRoundedRect(1, 1, 26, 26, 6);
    g.lineStyle(2, 0x141a26, 1);
    g.strokeRoundedRect(1, 1, 26, 26, 6);
    g.generateTexture(PLAYER_KEY, 28, 28);
    g.destroy();
  }

  /** 活动边界 + 操作提示:K 键故意不注册 Key,用于对比重复派发行为。 */
  private drawBounds() {
    const bounds = this.add.graphics();
    bounds.lineStyle(1, 0x3b4a6b, 1);
    bounds.strokeRect(
      MARGIN - 14,
      TOP_MARGIN - 14,
      GAME_WIDTH - (MARGIN - 14) * 2,
      GAME_HEIGHT - TOP_MARGIN - MARGIN + 28,
    );

    this.add
      .text(
        12,
        18,
        '先点击画布获得焦点 · 光标键 / WASD 移动 · 按住 W 与按住 K(未注册 Key)对比计数',
        {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '12px',
          color: '#8fa3c8',
        },
      )
      .setOrigin(0, 0.5);
  }
}

export function createKeyboardLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: KeyboardLabSnapshot) => void,
): KeyboardLabInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new KeyboardLabScene();
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
    applyParams(params: KeyboardLabParams) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
