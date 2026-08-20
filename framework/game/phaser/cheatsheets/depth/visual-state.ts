/**
 * 范例:tint / alpha / blend mode 视觉状态实验台(运行在 WebGL 下,AUTO 首选)。
 * 输入:tintMode(MULTIPLY/FILL/ADD/SCREEN/OVERLAY)、tint 颜色、cornerTint
 * (四角不同色)、alpha(对象)、containerAlpha(所在容器)、blendMode。
 * 前置状态:左侧小图是未施加任何状态的原纹理参照(灰阶 + 彩条);
 * 右侧主体放在独立 Container 中,全部状态只施加在主体上。
 * 主要操作:调节 Controls,对照右侧主体与左侧参照的差异;readout 显示
 * tint 实际数值、tintMode、blendMode 及其 WebGL 映射情况、有效 alpha 乘积。
 * 预期结果:tint=白(0xffffff)时 MULTIPLY 下画面与参照一致(白=无着色),
 * FILL 下变纯色板;乘法 tint 让灰阶只剩 tint 通道的明暗;四角 tint 渐变;
 * 有效 alpha = 容器 alpha × 对象 alpha;blendMode 只有
 * NORMAL/ADD/MULTIPLY/SCREEN/ERASE 在 WebGL 有真实映射,OVERLAY 表现同 NORMAL。
 * 阅读主线:makeTestTexture → create(参照 + 容器 + 主体)→ apply → report。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

export type TintModeName = 'MULTIPLY' | 'FILL' | 'ADD' | 'SCREEN' | 'OVERLAY';
export type BlendModeName = 'NORMAL' | 'ADD' | 'MULTIPLY' | 'SCREEN' | 'ERASE' | 'OVERLAY';

/** Controls 直接驱动的视觉状态参数,运行中修改立即生效。 */
export interface VisualStateParams {
  tintMode: TintModeName;
  /** 单色 tint 的十六进制字符串,如 "0xff4444";cornerTint 开启时此值被忽略 */
  tintColor: string;
  /** 四角不同色(左上红/右上绿/左下蓝/右下黄),展示顶点渐变 */
  cornerTint: boolean;
  /** 对象自身不透明度 0–1 */
  alpha: number;
  /** 所在容器的不透明度 0–1,渲染时与对象 alpha 相乘 */
  containerAlpha: number;
  blendMode: BlendModeName;
}

/** readout 用的派生读数:全部来自对象与容器真实属性。 */
export interface VisualStateSnapshot {
  /** tintTopLeft 的 hex 表示,如 "#ff4444" */
  tintHex: string;
  /** 四角 tint 是否各不相同 */
  cornerTintActive: boolean;
  tintModeName: string;
  tintModeValue: number;
  blendModeName: string;
  blendModeValue: number;
  /** 该 blendMode 在 WebGL 渲染器下是否有真实映射 */
  blendWebglMapped: boolean;
  alphaSelf: number;
  alphaContainer: number;
  /** 有效 alpha = 容器 alpha × 对象 alpha(渲染时的乘法传播) */
  alphaEffective: number;
}

export interface VisualStateInstance {
  apply(params: VisualStateParams): void;
  dispose(): void;
}

const TEX_KEY = 'tint-target';
const TEX_WIDTH = 240;
const TEX_HEIGHT = 260;
/** WebGL 下有真实混合映射的 blendMode 名称(其余 Canvas 专用,WebGL 表现同 NORMAL)。 */
const WEBGL_MAPPED = new Set<BlendModeName>(['NORMAL', 'ADD', 'MULTIPLY', 'SCREEN', 'ERASE']);
const CORNER_TINT = [0xff4444, 0x44ff44, 0x4444ff, 0xffd24a];

class VisualStateScene extends Phaser.Scene {
  private subject?: Phaser.GameObjects.Image;
  private container?: Phaser.GameObjects.Container;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: VisualStateSnapshot) => void = () => {};

  constructor() {
    super({ key: 'VisualState' });
  }

  preload() {
    this.makeTestTexture();
  }

  create() {
    // 左侧参照:原纹理缩小版,不施加任何视觉状态,供前后对照
    this.add
      .image(110, GAME_HEIGHT / 2, TEX_KEY)
      .setScale(0.5)
      .setName('reference');

    // 右侧主体放在独立 Container 中:容器 alpha 渲染时与子对象 alpha 相乘
    this.container = this.add.container(430, GAME_HEIGHT / 2);
    this.subject = this.add.image(0, 0, TEX_KEY);
    this.container.add(this.subject);

    this.add
      .text(12, GAME_HEIGHT - 20, '左:原纹理参照 · 右:tint / alpha / blend mode 施加对象', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#8fa3c8',
      })
      .setOrigin(0, 0.5)
      .setDepth(10);

    this.report();
  }

  override update() {
    this.report();
  }

  /** Controls 入口:链式把视觉状态施加到主体;容器 alpha 独立施加。 */
  apply(params: VisualStateParams) {
    const subject = this.subject;
    if (!subject || !this.container) {
      return;
    }

    if (params.cornerTint) {
      subject.setTint(CORNER_TINT[0], CORNER_TINT[1], CORNER_TINT[2], CORNER_TINT[3]);
    } else {
      const tint = Number.parseInt(params.tintColor, 16);
      subject.setTint(Number.isNaN(tint) ? 0xffffff : tint);
    }

    subject
      .setTintMode(Phaser.TintModes[params.tintMode])
      .setAlpha(params.alpha)
      .setBlendMode(Phaser.BlendModes[params.blendMode]);
    this.container.setAlpha(params.containerAlpha);
  }

  private report() {
    const subject = this.subject;
    if (!subject || !this.container) {
      return;
    }

    const tint = subject.tintTopLeft;
    const tintHex = `#${tint.toString(16).padStart(6, '0')}`;
    const corners = [
      subject.tintTopLeft,
      subject.tintTopRight,
      subject.tintBottomLeft,
      subject.tintBottomRight,
    ];
    const cornerTintActive = corners.some((value) => value !== tint);
    const blendValue = Number(subject.blendMode);
    const blendNames = Phaser.BlendModes as unknown as Record<number, string>;
    const blendName = blendNames[blendValue] ?? String(blendValue);

    this.emitSnapshot({
      tintHex,
      cornerTintActive,
      tintModeName: this.tintModeName(subject.tintMode),
      tintModeValue: subject.tintMode,
      blendModeName: blendName,
      blendModeValue: blendValue,
      blendWebglMapped: WEBGL_MAPPED.has(blendName as BlendModeName),
      alphaSelf: subject.alpha,
      alphaContainer: this.container.alpha,
      alphaEffective: subject.alpha * this.container.alpha,
    });
  }

  private tintModeName(mode: number): string {
    const modes = Phaser.TintModes as unknown as Record<string, number>;
    const found = Object.keys(modes).find((key) => modes[key] === mode);
    return found ?? String(mode);
  }

  /**
   * 自包含素材:上半是 8 级灰阶(乘法 tint 下只剩 tint 通道的明暗),
   * 下半是纯色条(红绿蓝黄品红青灰,观察通道滤除与 FILL/ADD 的差异)。
   */
  private makeTestTexture() {
    if (this.textures.exists(TEX_KEY)) {
      return;
    }
    const texture = this.textures.createCanvas(TEX_KEY, TEX_WIDTH, TEX_HEIGHT);
    if (!texture) {
      return;
    }
    const ctx = texture.context;
    const half = TEX_HEIGHT / 2;
    const step = TEX_WIDTH / 8;

    // 上半:黑到白的 8 级灰阶
    for (let i = 0; i < 8; i++) {
      const level = Math.round((i / 7) * 255);
      ctx.fillStyle = `rgb(${level}, ${level}, ${level})`;
      ctx.fillRect(i * step, 0, step, half);
    }

    // 下半:纯色条
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#808080'];
    const swatch = TEX_WIDTH / colors.length;
    colors.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(index * swatch, half, swatch, TEX_HEIGHT - half);
    });

    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.strokeRect(2, 2, TEX_WIDTH - 4, TEX_HEIGHT - 4);
    texture.refresh();
  }
}

export function createVisualState(
  canvas: HTMLCanvasElement,
  emit: (snapshot: VisualStateSnapshot) => void,
): VisualStateInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new VisualStateScene();
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
    apply(params: VisualStateParams) {
      scene.apply(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
