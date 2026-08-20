/**
 * 范例:纹理图集——单图与图集帧的对照。
 * 输入:「当前帧」(Controls 下拉,含 __BASE 整图帧)与「显示单图对照」开关。
 * 主要操作:同一张 atlas-sheet.png 分别用两种方式加载——
 * JSON Array 以对象直传 this.load.atlas(Phaser 支持 atlasURL 直接传 JSON 对象),
 * JSON Hash 以 URL 交给加载器抓取;两者都应解析出同样的 6 帧。
 * 预期结果:右侧图集精灵随「当前帧」切换;setFrame('__BASE') 显示整张图集;
 * readout 同步帧名、帧数、frame 裁剪尺寸、sourceSize(realWidth/realHeight)、
 * 精灵显示尺寸与图集源尺寸;bar-purple 的 frame 24px 但 sourceSize 32px 验证 trim。
 * 阅读主线:preload(两种加载方式)→ create(单图/图集/帧条三组对照)
 * → setFrame(帧切换)→ report(readout 派生数据)。
 */
import Phaser from 'phaser';
import atlasPngUrl from './atlas-sheet.png?url';
import singlePngUrl from './single-block.png?url';
import atlasArraySource from './atlas.json?raw';
import atlasHashUrl from './atlas-hash.json?url';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** JSON Array 通路注册的纹理 key */
const ARRAY_KEY = 'shapes-array';
/** JSON Hash 通路注册的纹理 key */
const HASH_KEY = 'shapes-hash';
/** 单图(独立 PNG)注册的纹理 key */
const SINGLE_KEY = 'single-block';
/** 图集自带的整图帧名 */
const BASE_FRAME = '__BASE';

export interface AtlasDemoSnapshot {
  frameName: string;
  frameCount: number;
  frameTotal: number;
  frameSize: string;
  sourceSize: string;
  spriteSize: string;
  atlasSize: string;
  hashFrameCount: number;
}

export interface AtlasDemoInstance {
  setFrame(name: string): void;
  setSingleVisible(visible: boolean): void;
  dispose(): void;
}

class AtlasScene extends Phaser.Scene {
  /** Controls 变化先落到这里;create 完成前也能安全更新。 */
  private currentFrame = 'square-red';

  private atlasSprite?: Phaser.GameObjects.Image;
  private singleColumn?: Phaser.GameObjects.Container;
  private frameStrip: Phaser.GameObjects.Image[] = [];

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: AtlasDemoSnapshot) => void = () => {};

  constructor() {
    super({ key: 'AtlasDemo' });
  }

  preload() {
    // 通路一:JSON Array——atlasURL 直接传解析好的 JSON 对象(d.ts 明确支持)
    this.load.atlas(ARRAY_KEY, atlasPngUrl, JSON.parse(atlasArraySource));
    // 通路二:JSON Hash——传 URL,由加载器抓取;两种格式 load.atlas 自动识别
    this.load.atlas(HASH_KEY, atlasPngUrl, atlasHashUrl);
    // 对照组:同一块红方块单独一张 PNG,一个 key 一个纹理
    this.load.image(SINGLE_KEY, singlePngUrl);
  }

  create() {
    // 左列:单图——整张 PNG 就是一个纹理,无帧名可切
    const singleLabel = this.add.text(
      GAME_WIDTH / 4,
      62,
      "单图:load.image('single-block')",
      this.labelStyle(),
    );
    singleLabel.setOrigin(0.5);
    const singleSprite = this.add.image(GAME_WIDTH / 4, 150, SINGLE_KEY);
    const singleNote = this.add.text(
      GAME_WIDTH / 4,
      232,
      '整图即一帧,只能整张使用',
      this.labelStyle('#8fa3c8'),
    );
    singleNote.setOrigin(0.5);
    this.singleColumn = this.add.container(0, 0, [
      singleLabel,
      singleSprite,
      singleNote,
    ]);

    // 右列:图集帧——同一张 atlas-sheet.png,按帧名切出子矩形
    const atlasLabel = this.add.text(
      (GAME_WIDTH * 3) / 4,
      62,
      "图集:load.atlas + 帧名",
      this.labelStyle(),
    );
    atlasLabel.setOrigin(0.5);
    this.atlasSprite = this.add.image(
      (GAME_WIDTH * 3) / 4,
      150,
      ARRAY_KEY,
      this.currentFrame,
    );
    const atlasNote = this.add.text(
      (GAME_WIDTH * 3) / 4,
      292,
      "add.image(x, y, 'shapes-array', 帧名)",
      this.labelStyle('#8fa3c8'),
    );
    atlasNote.setOrigin(0.5);

    // 底部:图集全部命名帧,顶对齐排开,直观呈现"一张纹理、多个帧"
    const names = this.textures.get(ARRAY_KEY).getFrameNames();
    let cursorX = 24;
    for (const name of names) {
      const frameImage = this.add.image(cursorX, 316, ARRAY_KEY, name);
      frameImage.setOrigin(0, 0);
      this.frameStrip.push(frameImage);
      cursorX += frameImage.width + 12;
    }

    this.report();
  }

  /** 帧切换:setFrame 默认同步精灵尺寸;__BASE 即整张图集。 */
  setFrame(name: string) {
    this.currentFrame = name;
    if (this.atlasSprite) {
      this.atlasSprite.setFrame(name);
      this.report();
    }
  }

  setSingleVisible(visible: boolean) {
    this.singleColumn?.setVisible(visible);
  }

  private labelStyle(color = '#e2e8f0') {
    return {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '13px',
      color,
    };
  }

  private report() {
    if (!this.atlasSprite) {
      return;
    }
    const texture = this.textures.get(ARRAY_KEY);
    const names = texture.getFrameNames(); // 默认不含 __BASE
    const frame = texture.get(this.currentFrame);
    const source = texture.source[0];
    const hashTexture = this.textures.get(HASH_KEY);
    this.emitSnapshot({
      frameName: frame.name,
      frameCount: names.length,
      frameTotal: texture.frameTotal, // 含 __BASE
      frameSize: `${frame.width} × ${frame.height}`, // 图集里的裁剪区
      // realWidth/realHeight 即 JSON 的 sourceSize(未裁剪的原始逻辑尺寸)
      sourceSize: `${frame.realWidth} × ${frame.realHeight}`,
      spriteSize: `${this.atlasSprite.displayWidth} × ${this.atlasSprite.displayHeight}`,
      atlasSize: `${source.width} × ${source.height}`,
      hashFrameCount: hashTexture.getFrameNames().length,
    });
  }
}

export function createAtlasDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AtlasDemoSnapshot) => void,
): AtlasDemoInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [AtlasScene],
  });

  const scene = game.scene.getScene('AtlasDemo') as AtlasScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    setFrame(name: string) {
      scene?.setFrame(name);
    },
    setSingleVisible(visible: boolean) {
      scene?.setSingleVisible(visible);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
