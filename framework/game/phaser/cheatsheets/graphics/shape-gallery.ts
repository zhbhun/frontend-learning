/**
 * 范例:Shape 形状家族——七个工厂成员在同一中心切换。
 * 输入:「形状」下拉(矩形/圆/椭圆/三角/多边形/星形/线段)、填充与描边两个开关、
 * 填充色、描边色、描边宽、尺寸。
 * 主要操作:七个成员预创建,setVisible 切换当前展示者;apply 只改属性——
 * 样式走 setFillStyle/setStrokeStyle(无参即关),尺寸走各成员专有 setter:
 * 矩形 setSize、圆 setRadius、椭圆 setSize、三角/多边形/线段 setTo 重给顶点、
 * 星形 setInnerRadius+setOuterRadius。全程没有"重画"。
 * 预期结果:开关各管各的(fillColor 与 isStroked 独立);Line 的填充开关无效;
 * readout 报告 isFilled/isStroked/fillColor/lineWidth/原生与显示尺寸/origin。
 * 阅读主线:create(七成员 + 工厂签名标签)→ applyParams(样式与尺寸)→ report。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

export type GalleryKind =
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'polygon'
  | 'star'
  | 'line';

export const GALLERY_LABELS: Record<GalleryKind, string> = {
  rectangle: '矩形 rectangle',
  circle: '圆 circle',
  ellipse: '椭圆 ellipse',
  triangle: '三角 triangle',
  polygon: '多边形 polygon',
  star: '星形 star',
  line: '线段 line',
};

export interface GalleryParams {
  shape: GalleryKind;
  filled: boolean;
  stroked: boolean;
  fillColor: number;
  strokeColor: number;
  strokeWidth: number;
  size: number;
}

export interface GallerySnapshot {
  shape: string;
  exists: boolean;
  isFilled: boolean;
  isStroked: boolean;
  fillColor: string;
  lineWidth: number;
  nativeSize: string;
  displaySize: string;
  origin: string;
}

export interface GalleryInstance {
  update(params: GalleryParams): void;
  dispose(): void;
}

const KINDS: GalleryKind[] = [
  'rectangle',
  'circle',
  'ellipse',
  'triangle',
  'polygon',
  'star',
  'line',
];

/** 六边形顶点(扁平数字数组格式),按 size 等比缩放。 */
function hexPoints(size: number): number[] {
  const scale = size / 2 / 56;
  return [-40, -28, 0, -56, 40, -28, 40, 28, 0, 56, -40, 28].map(
    (value) => value * scale,
  );
}

class GalleryScene extends Phaser.Scene {
  private members = new Map<GalleryKind, Phaser.GameObjects.Shape>();
  private factoryLabel!: Phaser.GameObjects.Text;
  private created = false;
  private pendingParams?: GalleryParams;
  private params: GalleryParams = {
    shape: 'rectangle',
    filled: true,
    stroked: true,
    fillColor: 0x2dd4bf,
    strokeColor: 0xe2e8f0,
    strokeWidth: 3,
    size: 150,
  };

  emitSnapshot: (snapshot: GallerySnapshot) => void = () => {};

  constructor() {
    super({ key: 'ShapeGallery' });
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 12;
    const p = this.params;

    // 七个成员一次建好;初始样式与尺寸统一由 applyParams 下发
    this.members.set('rectangle', this.add.rectangle(cx, cy));
    this.members.set('circle', this.add.circle(cx, cy));
    this.members.set('ellipse', this.add.ellipse(cx, cy));
    this.members.set(
      'triangle',
      this.add.triangle(cx, cy, 0, -60, -75, 60, 75, 60),
    );
    this.members.set('polygon', this.add.polygon(cx, cy, hexPoints(p.size)));
    this.members.set('star', this.add.star(cx, cy));
    this.members.set(
      'line',
      this.add.line(cx, cy, -75, 0, 75, 0, p.strokeColor, 1),
    );

    this.factoryLabel = this.add
      .text(cx, 40, '', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '13px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);

    this.created = true;
    // create 是异步启动的:story 的首次 apply 若先到,在这里补投
    this.applyParams(this.pendingParams ?? this.params);
  }

  applyParams(params: GalleryParams) {
    if (!this.created) {
      this.pendingParams = params;
      return;
    }
    this.params = params;

    for (const kind of KINDS) {
      const shape = this.members.get(kind)!;
      shape.setVisible(kind === params.shape);
      this.applySize(kind, shape, params.size);
      // 无参调用 = 关掉对应开关;setFillStyle 对 Line 只置标志,渲染仍只有描边
      if (params.filled) {
        shape.setFillStyle(params.fillColor, 1);
      } else {
        shape.setFillStyle();
      }
      if (params.stroked) {
        shape.setStrokeStyle(params.strokeWidth, params.strokeColor, 1);
      } else {
        shape.setStrokeStyle();
      }
    }

    this.factoryLabel.setText(
      `当前成员:${GALLERY_LABELS[params.shape]}(对象常驻,切换只是 setVisible)`,
    );
    this.report();
  }

  /** 尺寸走各成员的专有 setter——几何重算由它们负责。 */
  private applySize(
    kind: GalleryKind,
    shape: Phaser.GameObjects.Shape,
    size: number,
  ) {
    switch (kind) {
      case 'rectangle':
        (shape as Phaser.GameObjects.Rectangle).setSize(size, size * 0.75);
        break;
      case 'circle':
        (shape as Phaser.GameObjects.Arc).setRadius(size / 2);
        break;
      case 'ellipse':
        (shape as Phaser.GameObjects.Ellipse).setSize(size, size * 0.66);
        break;
      case 'triangle': {
        const half = size / 2;
        (shape as Phaser.GameObjects.Triangle).setTo(
          0,
          -half,
          -half,
          half,
          half,
          half,
        );
        break;
      }
      case 'polygon':
        (shape as Phaser.GameObjects.Polygon).setTo(hexPoints(size));
        break;
      case 'star':
        (shape as Phaser.GameObjects.Star)
          .setInnerRadius(size * 0.22)
          .setOuterRadius(size / 2);
        break;
      case 'line':
        (shape as Phaser.GameObjects.Line).setTo(-size / 2, 0, size / 2, 0);
        break;
    }
  }

  private report() {
    const shape = this.members.get(this.params.shape)!;
    this.emitSnapshot({
      shape: GALLERY_LABELS[this.params.shape],
      exists: this.children.list.includes(shape), // 关掉填充与描边后仍存在
      isFilled: shape.isFilled,
      isStroked: shape.isStroked,
      fillColor: `0x${shape.fillColor.toString(16).padStart(6, '0')}`,
      lineWidth: shape.lineWidth,
      nativeSize: `${shape.width} × ${shape.height}`,
      displaySize: `${shape.displayWidth} × ${shape.displayHeight}`,
      origin: `${shape.originX}, ${shape.originY}`,
    });
  }
}

export function createShapeGallery(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GallerySnapshot) => void,
): GalleryInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [GalleryScene],
  });

  const scene = game.scene.getScene('ShapeGallery') as
    | GalleryScene
    | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    update(params: GalleryParams) {
      scene?.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
