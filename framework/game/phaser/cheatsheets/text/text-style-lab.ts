/**
 * 范例:文本样式实验台(Text 与 TextStyle)。
 * 输入:「字号/颜色/描边/阴影/对齐/换行宽度/高级换行/最大行数/分辨率」控件。
 * 主要操作:applyStyle 把参数逐项写入同一个 Text 对象
 * (setFontSize/setColor/setStroke/setShadow/setAlign/setWordWrapWidth/setMaxLines/setResolution),
 * 每个 setter 都会触发一次 updateText 重栅格化,由计数器记录。
 * 预期结果:文字外观即时变化;readout 显示 width/height、按行高推导的行数、
 * 内部画布尺寸(= 对象尺寸 × resolution)与重栅格化计数。
 * 阅读主线:applyStyle → report(派生读数如何算)→ drawFrame(红框=width/height)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  TEXT_STYLE,
  TITLE_STYLE,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** 三行固定文本:让对齐、换行、maxLines 都有可观证据 */
const LAB_TEXT = '第一行 PHASER 4 TEXT LAB\n第二行 SECOND LINE IS LONGER\n第三行 LAST LINE';

export interface TextStyleParams {
  fontSize: number;
  color: string;
  strokeThickness: number;
  shadow: boolean;
  align: 'left' | 'center' | 'right';
  wordWrapWidth: number;
  advancedWrap: boolean;
  maxLines: number;
  resolution: number;
}

export interface TextStyleLabSnapshot {
  content: string;
  fontSize: string;
  size: string;
  lines: string;
  lineHeight: string;
  canvas: string;
  resolution: string;
  rasterCount: string;
  rasterDelta: string;
}

export interface TextStyleLabInstance {
  applyStyle(params: TextStyleParams): void;
  dispose(): void;
}

class StyleLabScene extends Phaser.Scene {
  private labText!: Phaser.GameObjects.Text;
  private frame!: Phaser.GameObjects.Graphics;
  private rasterCount = 0;
  private rasterDelta = 0;
  private lastApplied?: TextStyleParams;
  /** Controls 可能在场景 create 之前就推送参数:先存,create 完成后统一应用 */
  private pendingParams?: TextStyleParams;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout */
  emitSnapshot: (snapshot: TextStyleLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'TextStyleLab' });
  }

  create() {
    this.add.text(24, 20, '文本样式实验台:同一个 Text 对象', TITLE_STYLE);
    this.add.text(
      24,
      48,
      '红框 = text.width × text.height;每个样式 setter 都重栅格化一次内部画布',
      TEXT_STYLE,
    );

    this.frame = this.add.graphics();
    this.labText = this.add.text(48, 130, LAB_TEXT, {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '24px',
      color: '#e2e8f0',
    });

    // 实例级包一层 updateText:内部画布每重画一次就 +1,
    // 作为「这次调节有没有触发重栅格化」的可核对证据。
    const original = this.labText.updateText.bind(this.labText);
    (this.labText as unknown as { updateText: () => void }).updateText = () => {
      this.rasterCount++;
      this.rasterDelta++;
      original();
    };

    // 首帧报告默认样式下的读数
    this.drawFrame();
    this.report();

    if (this.pendingParams) {
      this.applyStyle(this.pendingParams);
      this.pendingParams = undefined;
    }
  }

  applyStyle(params: TextStyleParams) {
    if (!this.labText) {
      this.pendingParams = params;
      return;
    }

    // 只调发生变化的 setter:让「本次调节重栅格化次数」能精确对应读者动的那个控件
    const prev = this.lastApplied;
    const changed = (key: keyof TextStyleParams): boolean =>
      prev === undefined || prev[key] !== params[key];

    this.rasterDelta = 0;

    if (changed('fontSize')) {
      this.labText.setFontSize(params.fontSize);
    }
    if (changed('color')) {
      this.labText.setColor(params.color);
    }
    // strokeThickness 为 0 表示关描边;> 0 时描边同时加高每一行(行高 = 字高 + 描边厚)
    if (changed('strokeThickness')) {
      this.labText.setStroke(
        '#000000',
        params.strokeThickness > 0 ? params.strokeThickness : 0,
      );
    }
    if (changed('shadow')) {
      if (params.shadow) {
        this.labText.setShadow(0, 4, 'rgba(0,0,0,0.75)', 4, false, true);
      } else {
        this.labText.setShadow(0, 0, '#000', 0, false, false);
      }
    }
    if (changed('align')) {
      this.labText.setAlign(params.align);
    }
    // 0 表示关闭换行:传 null 移除宽度约束;advancedWrap 随宽度一起生效
    if (changed('wordWrapWidth') || changed('advancedWrap')) {
      this.labText.setWordWrapWidth(
        params.wordWrapWidth > 0 ? params.wordWrapWidth : null,
        params.advancedWrap,
      );
    }
    if (changed('maxLines')) {
      this.labText.setMaxLines(params.maxLines);
    }
    if (changed('resolution')) {
      this.labText.setResolution(params.resolution);
    }

    this.lastApplied = { ...params };
    this.drawFrame();
    this.report();
  }

  /** 红框贴着文字包围盒(text 原点在左上角,直接从 x/y 画起) */
  private drawFrame() {
    this.frame.clear();
    this.frame.lineStyle(1, 0xe74c3c, 0.9);
    this.frame.strokeRect(
      this.labText.x,
      this.labText.y,
      this.labText.width,
      this.labText.height,
    );
  }

  private report() {
    const style = this.labText.style;
    const metrics = style.getTextMetrics();
    const padding = this.labText.padding;
    // 行数推导:height = 行数 × 行高 + 上下 padding,行高 = 实测字高 + strokeThickness
    const lineHeight = metrics.fontSize + style.strokeThickness;
    const bodyHeight =
      this.labText.height - (padding.top ?? 0) - (padding.bottom ?? 0);
    const lineCount = Math.max(1, Math.round(bodyHeight / lineHeight));

    this.emitSnapshot({
      content: `${LAB_TEXT.split('\n').length} 行固定文本`,
      fontSize: String(style.fontSize),
      size: `${Math.round(this.labText.width)} × ${Math.round(this.labText.height)}`,
      lines: `${lineCount} 行(按 height ÷ 行高推导)`,
      lineHeight: `${Math.round(lineHeight)}px = 字高 ${Math.round(
        metrics.fontSize,
      )} + 描边 ${style.strokeThickness}`,
      canvas: `${this.labText.canvas.width} × ${this.labText.canvas.height}(内部画布,已乘 resolution)`,
      resolution: `${style.resolution}(对象尺寸 × resolution = 画布尺寸)`,
      rasterCount: `updateText 共 ${this.rasterCount} 次(含创建时)`,
      rasterDelta:
        this.rasterDelta > 0
          ? `本次调节重栅格化 ${this.rasterDelta} 次`
          : '本次调节未重栅格化',
    });
  }
}

export function createTextStyleLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TextStyleLabSnapshot) => void,
): TextStyleLabInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [StyleLabScene],
  });

  const scene = game.scene.getScene('TextStyleLab') as StyleLabScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    applyStyle(params) {
      scene?.applyStyle(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
