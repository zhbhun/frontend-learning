/**
 * 范例:Text 与 BitmapText 同屏对比。
 * 前置状态:preload 里 load.bitmapFont('arcade', arcade.png, arcade.fnt)
 * (素材是本目录里的 128×108 像素字模图 + XML 字形表,经 Vite ?url 发真实请求;
 * 字体只含空格、% + - . : 、数字 0-9、大写 A-Z,共 42 个字形)。
 * 输入:「内容」单选(含小写与中文字形缺失样本)、「字号」、「字间距」控件。
 * 主要操作:同一参数分别写入 Text(setText/setFontSize/setLetterSpacing)
 * 与 BitmapText(setText/setFontSize/setLetterSpacing)。
 * 预期结果:两者外观并排对比;readout 显示各自 width/height、位图字体缺失字形、
 * Text 的 updateText 重栅格化计数与 BitmapText「无内部画布」的对照。
 * 阅读主线:preload(字体怎么来)→ create(两种对象怎么建)→ apply(动态更新)
 * → report(读数怎么算)。
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
import arcadePngUrl from './arcade.png?url&no-inline';
import arcadeFntUrl from './arcade.fnt?url&no-inline';

export interface TextVsBitmapParams {
  content: 'score' | 'gameover' | 'lowercase' | 'chinese';
  fontSize: number;
  letterSpacing: number;
}

export interface TextVsBitmapSnapshot {
  content: string;
  textSize: string;
  bitmapSize: string;
  bitmapScale: string;
  missingGlyphs: string;
  textRaster: string;
  bitmapRaster: string;
}

export interface TextVsBitmapInstance {
  apply(params: TextVsBitmapParams): void;
  dispose(): void;
}

const CONTENT_OPTIONS: Record<TextVsBitmapParams['content'], string> = {
  score: 'SCORE 1024',
  gameover: 'GAME OVER +100%',
  lowercase: 'score 1024 small',
  chinese: '得分:1024',
};

class TextVsBitmapScene extends Phaser.Scene {
  private sampleText!: Phaser.GameObjects.Text;
  private sampleBitmap!: Phaser.GameObjects.BitmapText;
  private frameText!: Phaser.GameObjects.Graphics;
  private frameBitmap!: Phaser.GameObjects.Graphics;
  private rasterCount = 0;
  private lastApplied?: TextVsBitmapParams;
  private pendingParams?: TextVsBitmapParams;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout */
  emitSnapshot: (snapshot: TextVsBitmapSnapshot) => void = () => {};

  constructor() {
    super({ key: 'TextVsBitmap' });
  }

  preload() {
    // 位图字体 = 一张 PNG 字模 + 一份 XML 字形表,加载层见 2.1.1 资源加载器
    this.load.bitmapFont('arcade', arcadePngUrl, arcadeFntUrl);
  }

  create() {
    this.add.text(24, 20, 'Text 与 BitmapText:同一段文字,两条渲染路径', TITLE_STYLE);
    this.add.text(
      24,
      48,
      '上:Text 每次改动重画内部画布;下:BitmapText 只查表拼贴字形纹理',
      TEXT_STYLE,
    );

    this.add.text(48, 108, 'Text(系统字体,画布栅格化)', {
      ...TEXT_STYLE,
      color: '#e2e8f0',
    });
    this.sampleText = this.add.text(48, 132, CONTENT_OPTIONS.score, {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: '32px',
      color: '#e2e8f0',
    });

    this.add.text(48, 232, "BitmapText(自制像素字体 'arcade',纯纹理)", {
      ...TEXT_STYLE,
      color: '#e2e8f0',
    });
    this.sampleBitmap = this.add.bitmapText(48, 258, 'arcade', CONTENT_OPTIONS.score);

    this.frameText = this.add.graphics();
    this.frameBitmap = this.add.graphics();

    const original = this.sampleText.updateText.bind(this.sampleText);
    (this.sampleText as unknown as { updateText: () => void }).updateText = () => {
      this.rasterCount++;
      original();
    };

    if (this.pendingParams) {
      this.apply(this.pendingParams);
      this.pendingParams = undefined;
    } else {
      this.apply({ content: 'score', fontSize: 32, letterSpacing: 0 });
    }
  }

  apply(params: TextVsBitmapParams) {
    if (!this.sampleText || !this.sampleBitmap) {
      this.pendingParams = params;
      return;
    }

    // 只调发生变化的 setter:让 Text 的重栅格化计数精确对应读者动的那个控件
    const prev = this.lastApplied;
    const changed = <K extends keyof TextVsBitmapParams>(key: K): boolean =>
      prev === undefined || prev[key] !== params[key];

    const content = CONTENT_OPTIONS[params.content];

    if (changed('content')) {
      this.sampleText.setText(content);
      this.sampleBitmap.setText(content);
    }
    if (changed('fontSize')) {
      this.sampleText.setFontSize(params.fontSize);
      this.sampleBitmap.setFontSize(params.fontSize);
    }
    if (changed('letterSpacing')) {
      this.sampleText.setLetterSpacing(params.letterSpacing);
      this.sampleBitmap.setLetterSpacing(params.letterSpacing);
    }

    this.lastApplied = { ...params };
    this.drawFrames();
    this.report(params);
  }

  private drawFrames() {
    this.frameText.clear();
    this.frameText.lineStyle(1, 0xe74c3c, 0.9);
    this.frameText.strokeRect(
      this.sampleText.x,
      this.sampleText.y,
      this.sampleText.width,
      this.sampleText.height,
    );

    this.frameBitmap.clear();
    this.frameBitmap.lineStyle(1, 0x4cc9f0, 0.9);
    this.frameBitmap.strokeRect(
      this.sampleBitmap.x,
      this.sampleBitmap.y,
      this.sampleBitmap.width,
      this.sampleBitmap.height,
    );
  }

  private report(params: TextVsBitmapParams) {
    const content = CONTENT_OPTIONS[params.content];
    const chars = this.sampleBitmap.fontData.chars;

    // 逐字符查表:不在字形表里的字符被静默跳过(不绘制、不报错)
    const missing = [
      ...new Set(content.replace(/\n/g, '').split('')),
    ].filter((ch) => chars[ch.charCodeAt(0)] === undefined);

    this.emitSnapshot({
      content,
      textSize: `${Math.round(this.sampleText.width)} × ${Math.round(this.sampleText.height)}`,
      bitmapSize: `${Math.round(this.sampleBitmap.width)} × ${Math.round(
        this.sampleBitmap.height,
      )}`,
      bitmapScale: `${params.fontSize} / 字体基准 ${this.sampleBitmap.fontData.size} = ${(
        params.fontSize / this.sampleBitmap.fontData.size
      ).toFixed(2)}(缩放字形,不重制纹理)`,
      missingGlyphs: missing.length > 0 ? missing.join(' ') : '无(全部字形命中)',
      textRaster: `updateText 共 ${this.rasterCount} 次(每次改动重画画布)`,
      bitmapRaster: '无内部画布:setText 只更新字形串,渲染时逐字贴图',
    });
  }
}

export function createTextVsBitmap(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TextVsBitmapSnapshot) => void,
): TextVsBitmapInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [TextVsBitmapScene],
  });

  const scene = game.scene.getScene('TextVsBitmap') as TextVsBitmapScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    apply(params) {
      scene?.apply(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
