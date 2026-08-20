/**
 * 范例:generateTexture 栅格化——烘焙是快照,不是实时链接。
 * 输入:「画笔颜色」(只重画左侧 Graphics)与「重新烘焙」计数(每加一触发一次重烘焙)。
 * 主要操作:Graphics 以 (0,0) 起的命令坐标画一枚徽章(圆角矩形+圆+三角),
 * generateTexture(KEY, 120, 84) 把命令经 Canvas 2D 栅格化成 canvas 纹理,
 * 右侧 add.image 消费该纹理;重烘焙前先 textures.remove(KEY) 避免叠加。
 * 预期结果:改画笔颜色,左侧立刻变色、右侧精灵不动(快照语义);
 * 重新烘焙后右侧同步;readout 报告烘焙次数、纹理源类型(HTMLCanvasElement)
 * 与纹理尺寸。
 * 阅读主线:create(画笔+精灵+首次烘焙)→ repaint(只改画笔)→
 * bake(remove+generateTexture+setTexture)→ report。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** 烘焙出的纹理 key */
const BADGE_KEY = 'baked-badge';
/** 徽章纹理尺寸(命令坐标都在这个范围内) */
const BADGE_WIDTH = 120;
const BADGE_HEIGHT = 84;

export interface BakeParams {
  paintColor: number;
  bakes: number;
}

export interface BakeSnapshot {
  paintColor: string;
  bakeCount: number;
  textureExists: boolean;
  sourceType: string;
  textureSize: string;
}

export interface BakeInstance {
  update(params: BakeParams): void;
  dispose(): void;
}

class BakeScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private consumer?: Phaser.GameObjects.Image;
  private rightX = 0;
  private rightY = 0;
  private paintColor = 0x2dd4bf;
  private bakeCount = 0;
  private lastBakes = 0;
  private created = false;
  private pendingParams?: BakeParams;

  emitSnapshot: (snapshot: BakeSnapshot) => void = () => {};

  constructor() {
    super({ key: 'BakeTexture' });
  }

  create() {
    const left = { x: GAME_WIDTH / 4, y: GAME_HEIGHT / 2 + 14 };
    const right = { x: (GAME_WIDTH * 3) / 4, y: GAME_HEIGHT / 2 + 14 };
    const labelStyle = (color = '#e2e8f0') => ({
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '13px',
      color,
    });

    this.add
      .text(left.x, 74, '左:Graphics 画笔(实时重画)', labelStyle())
      .setOrigin(0.5, 0);
    this.add
      .text(
        right.x,
        74,
        '右:generateTexture 烘焙出的纹理精灵(快照)',
        labelStyle(),
      )
      .setOrigin(0.5, 0);
    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 26,
        "改「画笔颜色」只动左边;「重新烘焙」+1 后右边才同步(generateTexture 前先 textures.remove)",
        labelStyle('#8fa3c8'),
      )
      .setOrigin(0.5);

    // 画笔本体:命令坐标从 (0,0) 画起,再整体 setPosition 摆放——
    // 烘焙用的是命令坐标,与对象摆在哪里无关
    this.g = this.add.graphics();
    this.g.setPosition(left.x - BADGE_WIDTH / 2, left.y - BADGE_HEIGHT / 2);
    this.repaint();

    this.rightX = right.x;
    this.rightY = right.y;
    this.bake();

    this.created = true;
    // create 是异步启动的:story 的首次 apply 若先到,在这里补投
    this.applyParams(this.pendingParams ?? { paintColor: this.paintColor, bakes: this.lastBakes });
  }

  applyParams(params: BakeParams) {
    if (!this.created) {
      this.pendingParams = params;
      return;
    }
    if (params.paintColor !== this.paintColor) {
      this.paintColor = params.paintColor;
      this.repaint(); // 只重画画笔,纹理不动——这就是快照语义
    }
    if (params.bakes > this.lastBakes) {
      this.lastBakes = params.bakes;
      this.bake();
    }
    this.report();
  }

  /** 徽章:圆角矩形底 + 圆 + 三角,多笔命令整体进纹理。 */
  private repaint() {
    this.g.clear();
    this.g.fillStyle(this.paintColor, 1);
    this.g.fillRoundedRect(0, 0, BADGE_WIDTH, BADGE_HEIGHT, 12);
    this.g.fillStyle(0xe2e8f0, 1);
    this.g.fillCircle(28, 30, 12);
    this.g.fillTriangle(76, 18, 62, 44, 90, 44);
    this.g.fillStyle(0x141a26, 1);
    this.g.fillRoundedRect(16, 54, 88, 14, 7);
  }

  /** 重烘焙:先移除旧 canvas 纹理,否则新命令会叠加画在旧画布上。 */
  private bake() {
    if (this.textures.exists(BADGE_KEY)) {
      this.textures.remove(BADGE_KEY);
    }
    this.g.generateTexture(BADGE_KEY, BADGE_WIDTH, BADGE_HEIGHT);
    if (!this.consumer) {
      this.consumer = this.add.image(this.rightX, this.rightY, BADGE_KEY);
    } else {
      this.consumer.setTexture(BADGE_KEY);
    }
    this.bakeCount += 1;
  }

  private report() {
    const exists = this.textures.exists(BADGE_KEY);
    const source = exists ? this.textures.get(BADGE_KEY).getSourceImage() : null;
    this.emitSnapshot({
      paintColor: `0x${this.paintColor.toString(16).padStart(6, '0')}`,
      bakeCount: this.bakeCount,
      textureExists: exists,
      sourceType: source ? source.constructor.name : '—',
      textureSize: source ? `${source.width} × ${source.height}` : '—',
    });
  }
}

export function createBakeTexture(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BakeSnapshot) => void,
): BakeInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [BakeScene],
  });

  const scene = game.scene.getScene('BakeTexture') as BakeScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    update(params: BakeParams) {
      scene?.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
