/**
 * 范例:图形绘制两条通路——Graphics 画笔与 Shape 对象同屏对照。
 * 输入:Controls 的「填充色」「描边色」「描边宽」「尺寸」同时驱动上下两排。
 * 主要操作:上排用 1 个 Graphics 的命令缓冲画 3 个方块(fillRect+strokeRect);
 * 下排用 3 个独立的 add.rectangle 对象画同样内容。
 * 预期结果:两排视觉完全同步;readout 暴露机制差异——
 * Graphics 每次参数变化都 clear+整块重画(重画计数 +1,报告命令缓冲长度),
 * Shape 只改属性(重画计数恒 0,报告 isFilled/isStroked/fillColor/lineWidth);
 * 游戏对象数 1 对 3。
 * 阅读主线:create(两排创建)→ redraw(Graphics 整块重画)→
 * applyShape(Shape 只改属性)→ report(两套读数)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** 两排共用的绘制参数(由 Controls 传入) */
export interface BlockParams {
  fillColor: number;
  strokeColor: number;
  strokeWidth: number;
  size: number;
}

export interface CompareSnapshot {
  graphicsRedraws: number;
  shapeRedraws: number;
  commandBufferLength: number;
  graphicsObjectCount: number;
  shapeObjectCount: number;
  shapeFillColor: string;
  shapeIsFilled: boolean;
  shapeIsStroked: boolean;
  shapeLineWidth: number;
}

export interface CompareInstance {
  update(params: BlockParams): void;
  dispose(): void;
}

const TOP_LABEL_Y = 46;
const TOP_ROW_Y = 110;
const BOTTOM_ROW_Y = 275;

class CompareScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private blocks: Phaser.GameObjects.Rectangle[] = [];

  private graphicsRedraws = 0;
  private created = false;
  private pendingParams?: BlockParams;
  private params: BlockParams = {
    fillColor: 0x2dd4bf,
    strokeColor: 0xe2e8f0,
    strokeWidth: 3,
    size: 64,
  };

  emitSnapshot: (snapshot: CompareSnapshot) => void = () => {};

  constructor() {
    super({ key: 'GraphicsVsShape' });
  }

  create() {
    this.add
      .text(24, TOP_LABEL_Y - 26, '上排:Graphics——1 个对象,命令缓冲整块重画', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '13px',
        color: '#e2e8f0',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(
        24,
        GAME_HEIGHT / 2 + 14,
        '下排:Shape——3 个 add.rectangle,只改属性',
        {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '13px',
          color: '#e2e8f0',
        },
      )
      .setOrigin(0, 0.5);

    this.g = this.add.graphics();
    for (let i = 0; i < 3; i++) {
      this.blocks.push(this.add.rectangle(this.rowX(i), BOTTOM_ROW_Y, 64, 64));
    }

    this.created = true;
    // create 是异步启动的:story 的首次 apply 若先到,在这里补投
    this.applyParams(this.pendingParams ?? this.params);
  }

  /** Controls 变化入口:两条通路用同一组参数各自更新。 */
  applyParams(params: BlockParams) {
    if (!this.created) {
      this.pendingParams = params;
      return;
    }
    this.params = params;
    this.redrawGraphics();
    this.applyShapeParams();
    this.report();
  }

  private rowX(index: number) {
    return GAME_WIDTH / 2 + (index - 1) * 100;
  }

  /** Graphics 路径:clear 后把三块整体重画一遍,这就是它的全部更新方式。 */
  private redrawGraphics() {
    this.g.clear();
    this.g.lineStyle(this.params.strokeWidth, this.params.strokeColor, 1);
    this.g.fillStyle(this.params.fillColor, 1);
    for (let i = 0; i < 3; i++) {
      const x = this.rowX(i) - this.params.size / 2; // fillRect 的 x,y 是左上角
      const y = TOP_ROW_Y - this.params.size / 2;
      this.g.fillRect(x, y, this.params.size, this.params.size);
      this.g.strokeRect(x, y, this.params.size, this.params.size);
    }
    this.graphicsRedraws += 1;
  }

  /** Shape 路径:没有任何重画,只有属性赋值。 */
  private applyShapeParams() {
    for (const block of this.blocks) {
      block.setSize(this.params.size, this.params.size);
      block.setFillStyle(this.params.fillColor, 1);
      block.setStrokeStyle(this.params.strokeWidth, this.params.strokeColor, 1);
    }
  }

  private report() {
    const sample = this.blocks[0];
    const graphicsCount = this.children.list.filter(
      (child) => child instanceof Phaser.GameObjects.Graphics,
    ).length;
    const shapeCount = this.children.list.filter(
      (child) => child instanceof Phaser.GameObjects.Rectangle,
    ).length;
    this.emitSnapshot({
      graphicsRedraws: this.graphicsRedraws,
      shapeRedraws: 0, // Shape 路径没有重画这个概念
      commandBufferLength: this.g.commandBuffer.length,
      graphicsObjectCount: graphicsCount,
      shapeObjectCount: shapeCount,
      shapeFillColor: `0x${sample.fillColor.toString(16).padStart(6, '0')}`,
      shapeIsFilled: sample.isFilled,
      shapeIsStroked: sample.isStroked,
      shapeLineWidth: sample.lineWidth,
    });
  }
}

export function createGraphicsVsShape(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CompareSnapshot) => void,
): CompareInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [CompareScene],
  });

  const scene = game.scene.getScene('GraphicsVsShape') as
    | CompareScene
    | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    update(params: BlockParams) {
      scene?.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
