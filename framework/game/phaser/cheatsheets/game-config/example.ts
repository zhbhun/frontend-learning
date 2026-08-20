/**
 * 范例介绍:把 Game config 的缩放相关字段接到 Controls 上,实时观察 Scale Manager 的适配结果。
 * 输入:mode(七种缩放模式)、width/height(游戏分辨率)、zoom(NO_ZOOM/ZOOM_2X/ZOOM_4X/MAX_ZOOM)、autoCenter。
 * 操作:切换任意参数都会销毁并重建 Phaser.Game——缩放模式只在 boot 时解析,运行时没有 setter;
 *      连续拖动用防抖合并,避免频繁创建 WebGL 上下文。棋盘格框架充当"父容器",露出画布没盖住的部分。
 * 预期结果:读数实时显示 gameSize、displaySize、zoom、displayScale 与实际渲染器;
 *      FIT 留边、ENVELOP 溢出裁剪、RESIZE 改变 gameSize 并触发场景重排,一次看全。
 * 阅读主线:SCALE_MODES/ZOOMS/CENTERS 常量映射 → ScaleScene 画角标记并监听 resize →
 *      createGame() 组装 config(canvas 字段挂载自建画布)→ update() 防抖重建。
 */
import * as Phaser from 'phaser';

export type ScaleModeName =
  | 'NONE'
  | 'FIT'
  | 'ENVELOP'
  | 'RESIZE'
  | 'EXPAND'
  | 'WIDTH_CONTROLS_HEIGHT'
  | 'HEIGHT_CONTROLS_WIDTH';

export type ZoomName = 'NO_ZOOM' | 'ZOOM_2X' | 'ZOOM_4X' | 'MAX_ZOOM';

export type AutoCenterName =
  | 'NO_CENTER'
  | 'CENTER_BOTH'
  | 'CENTER_HORIZONTALLY'
  | 'CENTER_VERTICALLY';

export interface GameConfigOptions {
  mode: ScaleModeName;
  width: number;
  height: number;
  zoom: ZoomName;
  autoCenter: AutoCenterName;
}

export interface ScaleSnapshot {
  mode: string;
  gameSize: string;
  displaySize: string;
  zoom: number;
  displayScale: string;
  renderType: string;
}

export interface GameConfigInstance {
  update(options: GameConfigOptions): void;
  dispose(): void;
}

// 名字到 Phaser 常量的显式映射:mode/zoom/autoCenter 都只能在 boot 前写进 config。
const SCALE_MODES: Record<ScaleModeName, number> = {
  NONE: Phaser.Scale.NONE,
  FIT: Phaser.Scale.FIT,
  ENVELOP: Phaser.Scale.ENVELOP,
  RESIZE: Phaser.Scale.RESIZE,
  EXPAND: Phaser.Scale.EXPAND,
  WIDTH_CONTROLS_HEIGHT: Phaser.Scale.WIDTH_CONTROLS_HEIGHT,
  HEIGHT_CONTROLS_WIDTH: Phaser.Scale.HEIGHT_CONTROLS_WIDTH,
};

const ZOOMS: Record<ZoomName, number> = {
  NO_ZOOM: Phaser.Scale.NO_ZOOM,
  ZOOM_2X: Phaser.Scale.ZOOM_2X,
  ZOOM_4X: Phaser.Scale.ZOOM_4X,
  MAX_ZOOM: Phaser.Scale.MAX_ZOOM,
};

const CENTERS: Record<AutoCenterName, number> = {
  NO_CENTER: Phaser.Scale.NO_CENTER,
  CENTER_BOTH: Phaser.Scale.CENTER_BOTH,
  CENTER_HORIZONTALLY: Phaser.Scale.CENTER_HORIZONTALLY,
  CENTER_VERTICALLY: Phaser.Scale.CENTER_VERTICALLY,
};

/**
 * 演示场景:在游戏坐标系上画四角标记、中心十字与尺寸标注,再让一个圆点绕中心运动。
 * 角标记贴着 gameSize 四角——RESIZE/EXPAND 改变 gameSize 时,通过监听 resize 事件重画,
 * 这是"分辨率固定的模式只拉伸 CSS、跟随父容器的模式要自己重排"的直接证据。
 */
class ScaleScene extends Phaser.Scene {
  private readonly modeName: string;
  private readonly emitSnapshot: (snapshot: ScaleSnapshot) => void;
  private marks!: Phaser.GameObjects.Graphics;
  private sizeLabel!: Phaser.GameObjects.Text;
  private orbitDot!: Phaser.GameObjects.Arc;

  constructor(modeName: string, emitSnapshot: (snapshot: ScaleSnapshot) => void) {
    super('ScaleDemo');
    this.modeName = modeName;
    this.emitSnapshot = emitSnapshot;
  }

  create(): void {
    this.marks = this.add.graphics();
    this.sizeLabel = this.add
      .text(10, 10, '', {
        color: '#9fb4d8',
        fontSize: '13px',
        fontFamily: 'ui-monospace, Menlo, monospace',
      })
      .setDepth(1);
    this.orbitDot = this.add.circle(0, 0, 6, 0x4f8cff);

    // RESIZE/EXPAND 模式下父容器一变,gameSize 就变;重画标记演示场景该怎样重排。
    this.scale.on(Phaser.Scale.Events.RESIZE, this.redraw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.redraw, this);
    });
    this.redraw();
  }

  update(time: number): void {
    const { width, height } = this.scale.gameSize;
    const radius = Math.max(24, Math.min(width, height) * 0.28);
    const angle = time / 700;
    this.orbitDot.setPosition(
      width / 2 + Math.cos(angle) * radius,
      height / 2 + Math.sin(angle) * radius,
    );
    this.emitReadout();
  }

  private redraw(): void {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    const arm = Math.max(6, Math.min(width, height) / 6);
    const corners: Array<[number, number, number, number]> = [
      [0, 0, 1, 1],
      [width, 0, -1, 1],
      [0, height, 1, -1],
      [width, height, -1, -1],
    ];

    const g = this.marks;
    g.clear();
    g.lineStyle(2, 0x63e6be, 1);
    for (const [x, y, dx, dy] of corners) {
      g.lineBetween(x, y, x + arm * dx, y);
      g.lineBetween(x, y, x, y + arm * dy);
    }
    g.lineStyle(1, 0x63e6be, 0.35);
    g.lineBetween(width / 2, 0, width / 2, height);
    g.lineBetween(0, height / 2, width, height / 2);
    this.sizeLabel.setText(`${width} x ${height}`);
  }

  private emitReadout(): void {
    const scale = this.scale;
    this.emitSnapshot({
      mode: this.modeName,
      gameSize: `${scale.gameSize.width} x ${scale.gameSize.height}`,
      displaySize: `${Math.round(scale.displaySize.width)} x ${Math.round(scale.displaySize.height)}`,
      zoom: scale.zoom,
      displayScale: `${scale.displayScale.x.toFixed(2)} / ${scale.displayScale.y.toFixed(2)}`,
      renderType:
        this.game && this.game.config.renderType === Phaser.CANVAS ? 'CANVAS' : 'WEBGL',
    });
  }
}

const REBUILD_DELAY = 160;

/**
 * 创建范例实例。共享 helper 提供的 canvas 会被替换成一个棋盘格"父容器"框架:
 * 框架有确定尺寸、overflow: hidden,充当 Scale Manager 计算适配时的 parent;
 * 每次重建都用全新 canvas 元素(同一 canvas 不能绑定第二种渲染上下文)。
 */
export function createGameConfigExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ScaleSnapshot) => void,
): GameConfigInstance {
  const frame = document.createElement('div');
  frame.style.cssText = [
    'position: absolute',
    'inset: 0',
    'overflow: hidden',
    'background-image: repeating-conic-gradient(#e3e9f2 0% 25%, #f8fafc 0% 50%)',
    'background-size: 24px 24px',
  ].join('; ');
  canvas.replaceWith(frame);

  let current: GameConfigOptions = {
    mode: 'FIT',
    width: 640,
    height: 360,
    zoom: 'NO_ZOOM',
    autoCenter: 'NO_CENTER',
  };
  let game: Phaser.Game | null = null;
  let gameCanvas: HTMLCanvasElement | null = null;
  let rebuildTimer: ReturnType<typeof setTimeout> | undefined;

  function destroyGame(): void {
    if (game) {
      game.destroy(false); // 稍后在本帧循环里真正销毁;画布由我们自管
      game = null;
    }
    gameCanvas?.remove();
    gameCanvas = null;
  }

  function createGame(options: GameConfigOptions): void {
    gameCanvas = document.createElement('canvas');
    // NONE 模式下 Phaser 不写画布内联尺寸;先给出基准,避免共享样式把画布拉满父容器。
    gameCanvas.style.display = 'block';
    gameCanvas.style.width = `${options.width}px`;
    gameCanvas.style.height = `${options.height}px`;
    frame.append(gameCanvas);

    game = new Phaser.Game({
      type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
      backgroundColor: '#141a26',
      canvas: gameCanvas, // 自带画布时 parent 也要显式给,Scale Manager 才按框架算
      parent: frame,
      scale: {
        mode: SCALE_MODES[options.mode],
        width: options.width,
        height: options.height,
        zoom: ZOOMS[options.zoom],
        autoCenter: CENTERS[options.autoCenter],
        expandParent: false, // 框架尺寸由本范例控制,不让 Phaser 改写父级 CSS
      },
      scene: [new ScaleScene(options.mode, emit)],
    });
  }

  return {
    update(options) {
      current = options;
      // 缩放模式没有运行时 setter:参数变化一律销毁重建,防抖合并连续拖动。
      if (game === null && rebuildTimer === undefined) {
        createGame(current); // 首次进入直接创建,后续变化走防抖重建
        return;
      }
      if (rebuildTimer === undefined) {
        rebuildTimer = setTimeout(() => {
          rebuildTimer = undefined;
          destroyGame();
          createGame(current);
        }, REBUILD_DELAY);
      }
    },
    dispose() {
      if (rebuildTimer !== undefined) {
        clearTimeout(rebuildTimer);
        rebuildTimer = undefined;
      }
      if (game) {
        game.destroy(true);
        game = null;
      }
      gameCanvas?.remove();
      gameCanvas = null;
      frame.remove();
    },
  };
}


