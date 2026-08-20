/**
 * 范例:Graphics 命令绘制——形状族、路径与弧扇共用一支画笔。
 * 输入:「形状」下拉(矩形/圆/椭圆/圆角矩形/三角/路径五边形/弧/扇形)、
 * 填充色、描边色、描边宽、尺寸,以及只作用于弧/扇形的「扫过角度」。
 * 主要操作:每次变化 clear() 后按当前形状整块重画——
 * 基本形状走 fillXxx+strokeXxx 成对调用;路径走 beginPath/moveTo/lineTo/closePath;
 * 弧走 beginPath+arc(弧度),扇形走 slice(自带闭合)。
 * 预期结果:同一对象在 8 种图形间切换;readout 报告命令缓冲长度、
 * 本次绘制调用笔数与重画次数,证明"命令数随绘制调用变化、不随参数值变化"。
 * 阅读主线:create(画笔与标签)→ redraw(switch 分发各形状)→ report。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

export type CommandShapeKind =
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'rounded'
  | 'triangle'
  | 'path'
  | 'arc'
  | 'slice';

export const COMMAND_SHAPE_LABELS: Record<CommandShapeKind, string> = {
  rectangle: '矩形 fillRect',
  circle: '圆 fillCircle',
  ellipse: '椭圆 fillEllipse',
  rounded: '圆角矩形 fillRoundedRect',
  triangle: '三角 fillTriangle',
  path: '路径五边形 path',
  arc: '弧 arc',
  slice: '扇形 slice',
};

export interface CommandParams {
  shape: CommandShapeKind;
  fillColor: number;
  strokeColor: number;
  strokeWidth: number;
  size: number;
  sweepDegrees: number;
}

export interface CommandsSnapshot {
  shape: string;
  commandBufferLength: number;
  drawCalls: number;
  redraws: number;
  sweepNote: string;
}

export interface CommandsInstance {
  update(params: CommandParams): void;
  dispose(): void;
}

class CommandsScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private params: CommandParams = {
    shape: 'rectangle',
    fillColor: 0x2dd4bf,
    strokeColor: 0xe2e8f0,
    strokeWidth: 3,
    size: 150,
    sweepDegrees: 270,
  };
  private redraws = 0;
  private drawCalls = 0;
  private created = false;
  private pendingParams?: CommandParams;

  emitSnapshot: (snapshot: CommandsSnapshot) => void = () => {};

  constructor() {
    super({ key: 'GraphicsCommands' });
  }

  create() {
    this.g = this.add.graphics();
    this.created = true;
    // create 是异步启动的:story 的首次 apply 若先到,在这里补投
    this.applyParams(this.pendingParams ?? this.params);
  }

  applyParams(params: CommandParams) {
    if (!this.created) {
      this.pendingParams = params;
      return;
    }
    this.params = params;
    this.redraw();
  }

  private cx() {
    return GAME_WIDTH / 2;
  }

  private cy() {
    return GAME_HEIGHT / 2 + 8;
  }

  /** 每次参数变化:clear + 按形状整块重画。绘制调用经 draw() 计数。 */
  private redraw() {
    const { shape, fillColor, strokeColor, strokeWidth, size, sweepDegrees } =
      this.params;
    const cx = this.cx();
    const cy = this.cy();
    this.drawCalls = 0;
    this.g.clear();
    this.g.fillStyle(fillColor, 1);
    this.g.lineStyle(strokeWidth, strokeColor, 1);

    if (shape === 'rectangle') {
      this.draw(2, () => {
        this.g.fillRect(cx - size / 2, cy - size / 2, size, size);
        this.g.strokeRect(cx - size / 2, cy - size / 2, size, size);
      });
    } else if (shape === 'circle') {
      this.draw(2, () => {
        this.g.fillCircle(cx, cy, size / 2);
        this.g.strokeCircle(cx, cy, size / 2);
      });
    } else if (shape === 'ellipse') {
      this.draw(2, () => {
        // 宽高是直径,不是半径
        this.g.fillEllipse(cx, cy, size, size * 0.66);
        this.g.strokeEllipse(cx, cy, size, size * 0.66);
      });
    } else if (shape === 'rounded') {
      this.draw(2, () => {
        this.g.fillRoundedRect(
          cx - size / 2,
          cy - size * 0.3,
          size,
          size * 0.6,
          16,
        );
        this.g.strokeRoundedRect(
          cx - size / 2,
          cy - size * 0.3,
          size,
          size * 0.6,
          16,
        );
      });
    } else if (shape === 'triangle') {
      this.draw(2, () => {
        this.g.fillTriangle(cx, cy - size / 2, cx - size / 2, cy + size / 2, cx + size / 2, cy + size / 2);
        this.g.strokeTriangle(cx, cy - size / 2, cx - size / 2, cy + size / 2, cx + size / 2, cy + size / 2);
      });
    } else if (shape === 'path') {
      // 任意多边形:路径就是 Graphics 里的"多边形命令"
      const points = this.polygonPoints(cx, cy, size / 2, 5, -Math.PI / 2);
      // moveTo + 4×lineTo + closePath + fillPath + strokePath = 8 笔
      this.draw(8, () => {
        this.g.beginPath();
        this.g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          this.g.lineTo(points[i].x, points[i].y);
        }
        this.g.closePath();
        this.g.fillPath();
        this.g.strokePath();
      });
    } else if (shape === 'arc') {
      // 弧:追加进当前路径;填充按弦闭合(弓形),角度是弧度
      const end = Phaser.Math.DegToRad(sweepDegrees);
      // beginPath + arc + closePath + fillPath + strokePath = 5 笔
      this.draw(5, () => {
        this.g.beginPath();
        this.g.arc(cx, cy, size / 2, 0, end);
        this.g.closePath();
        this.g.fillPath();
        this.g.strokePath();
      });
    } else {
      // 扇形:自带 beginPath/closePath,从圆心出发的饼图切片
      const end = Phaser.Math.DegToRad(sweepDegrees);
      // slice + fillPath + strokePath = 3 笔
      this.draw(3, () => {
        this.g.slice(cx, cy, size / 2, 0, end);
        this.g.fillPath();
        this.g.strokePath();
      });
    }

    this.redraws += 1;
    this.report();
  }

  private draw(count: number, fn: () => void) {
    fn();
    this.drawCalls = count;
  }

  /** 正多边形顶点:展示 moveTo/lineTo 的典型数据来源。 */
  private polygonPoints(
    cx: number,
    cy: number,
    radius: number,
    sides: number,
    startAngle: number,
  ) {
    return Array.from({ length: sides }, (_, i) => {
      const angle = startAngle + (i * Math.PI * 2) / sides;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
  }

  private report() {
    const usesSweep = this.params.shape === 'arc' || this.params.shape === 'slice';
    this.emitSnapshot({
      shape: COMMAND_SHAPE_LABELS[this.params.shape],
      commandBufferLength: this.g.commandBuffer.length,
      drawCalls: this.drawCalls,
      redraws: this.redraws,
      sweepNote: usesSweep
        ? `扫过 ${this.params.sweepDegrees}°(DegToRad 换算)`
        : '—(仅弧/扇形生效)',
    });
  }
}

export function createGraphicsCommands(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CommandsSnapshot) => void,
): CommandsInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [CommandsScene],
  });

  const scene = game.scene.getScene('GraphicsCommands') as
    | CommandsScene
    | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    update(params: CommandParams) {
      scene?.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
