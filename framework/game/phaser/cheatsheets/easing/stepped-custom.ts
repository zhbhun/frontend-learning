/**
 * 范例:Stepped 阶梯与自定义函数——ease 三种形态里的「参数化」与「自写函数」。
 * 输入:「模式」(stepped 阶梯 / custom 自定义 / linear 匀速对照)、「阶梯数」(1..10,
 * 仅 stepped 生效)。
 * 主要操作:stepped 用 ease: 'Stepped' + easeParams: [steps] 驱动(真实的参数转发
 * 路径);custom 直接传自写的 smoothstep 函数 (v) => v*v*(3-2*v);linear 作匀速
 * 参照。曲线与轨道点同源驱动:轨道点走 tween,曲线示点读同一 TweenData.progress
 * 后自算 f(t)。Stepped 的跳变发生在每格开头:输出 (((steps*t)|0)+1)/steps。
 * 预期结果:stepped 曲线呈阶梯、轨道点逐格瞬移,steps=1 时一步到底;custom 的
 * smoothstep 与 Sine.easeInOut 形似但两端更平;readout 报告当前 t、f(t) 与所在档。
 * 阅读主线:EASE_EXPRS(三种写法)→ resolveEase → applyParams(重建)→ drawCurve。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

export type StepMode = 'stepped' | 'custom' | 'linear';

export const STEP_MODE_LABELS: Record<StepMode, string> = {
  stepped: 'Stepped 阶梯',
  custom: '自定义函数',
  linear: 'Linear 匀速对照',
};

/** smoothstep:两端平缓的 S 形,两端值恰为 0 与 1,是自写缓动的经典起点。 */
function smoothstep(v: number): number {
  return v * v * (3 - 2 * v);
}

export interface StepParams {
  mode: StepMode;
  steps: number;
}

export interface StepSnapshot {
  mode: string;
  easeExpr: string;
  t: number;
  eased: number;
  stepNote: string;
}

export interface StepInstance {
  update(params: StepParams): void;
  dispose(): void;
}

const PLOT = { x: 46, y: 84, w: 300, h: 250 };
const TRACK = { x0: 408, x1: 688, y: 200 };
const DURATION_MS = 1600;

interface ResolvedStepEase {
  /** tween 配置里 ease 的实际写法(readout 展示)。 */
  expr: string;
  fn: (v: number) => number;
  /** tween 的 ease 参数:字符串或函数本体。 */
  ease: string | ((v: number) => number);
  easeParams?: number[];
}

function resolveStepEase(params: StepParams): ResolvedStepEase {
  switch (params.mode) {
    case 'stepped':
      return {
        expr: `ease: 'Stepped', easeParams: [${params.steps}]`,
        fn: (v) => Phaser.Math.Easing.Stepped(v, params.steps),
        ease: 'Stepped',
        easeParams: [params.steps],
      };
    case 'custom':
      return {
        expr: 'ease: (v) => v * v * (3 - 2 * v)',
        fn: smoothstep,
        ease: smoothstep,
      };
    default:
      return {
        expr: "ease: 'Linear'",
        fn: Phaser.Math.Easing.Linear,
        ease: 'Linear',
      };
  }
}

export function createStepCustom(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StepSnapshot) => void,
): StepInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [StepScene],
  });

  // Game 的 boot 依赖 DOM 就绪时机:scene 可能暂不可得,首次 update 时补取
  let scene = game.scene.getScene('StepCustom') as StepScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    update(params: StepParams) {
      if (!scene) {
        scene = game.scene.getScene('StepCustom') as StepScene | undefined;
        if (scene) {
          scene.emitSnapshot = emit;
        }
      }
      scene?.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}

class StepScene extends Phaser.Scene {
  private grid!: Phaser.GameObjects.Graphics;
  private curve!: Phaser.GameObjects.Graphics;
  private marker!: Phaser.GameObjects.Arc;
  private dot!: Phaser.GameObjects.Arc;
  private tween?: Phaser.Tweens.Tween;
  private resolved: ResolvedStepEase = resolveStepEase({
    mode: 'linear',
    steps: 4,
  });
  private params: StepParams = { mode: 'linear', steps: 4 };
  /** 场景就绪前暂存 Controls 参数;create 后按它建首个补间。 */
  private created = false;
  private pendingParams?: StepParams;

  emitSnapshot: (snapshot: StepSnapshot) => void = () => {};

  constructor() {
    super({ key: 'StepCustom' });
  }

  create() {
    this.add
      .text(GAME_WIDTH / 2, 34, 'Stepped 阶梯 与 自定义函数', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '13px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);

    this.grid = this.add.graphics();
    this.curve = this.add.graphics();
    this.dot = this.add.circle(TRACK.x0, TRACK.y, 9, 0x2dd4bf);
    this.marker = this.add.circle(PLOT.x, PLOT.y + PLOT.h, 6, 0xfacc15);

    this.add
      .text(PLOT.x + PLOT.w / 2, PLOT.y + PLOT.h + 22, 't = elapsed / duration →', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '11px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);
    this.add
      .text(PLOT.x + PLOT.w / 2, PLOT.y - 14, '↑ v = f(t)', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '11px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    this.created = true;
    // create 是异步启动的:story 的首次 apply 若先到,在这里补投
    this.applyParams(this.pendingParams ?? this.params);
  }

  update() {
    const data = this.tween?.data?.[0] as Phaser.Tweens.TweenData | undefined;
    const t = data ? data.progress : 0;
    const eased = this.resolved.fn(t);
    this.marker.setPosition(
      PLOT.x + t * PLOT.w,
      PLOT.y + PLOT.h - eased * PLOT.h,
    );
    this.emitSnapshot({
      mode: STEP_MODE_LABELS[this.params.mode],
      easeExpr: this.resolved.expr,
      t,
      eased,
      stepNote: this.stepNote(t),
    });
  }

  applyParams(params: StepParams) {
    this.params = params;
    if (!this.created) {
      this.pendingParams = params;
      return; // 场景尚未就绪,create() 会用 pendingParams 补建
    }
    this.resolved = resolveStepEase(params);

    this.tweens.killTweensOf(this.dot);
    this.dot.x = TRACK.x0;
    this.tweens.add({
      targets: this.dot,
      x: TRACK.x1,
      duration: DURATION_MS,
      ease: this.resolved.ease, // 字符串 / 函数 / 字符串+easeParams 三路真实分派
      easeParams: this.resolved.easeParams,
      yoyo: true,
      repeat: -1,
    });
    this.tween = this.tweens.getTweensOf(this.dot)[0];

    this.drawGrid();
    this.drawCurve();
  }

  /** Stepped 的跳变在每格开头:报告「第几档 / 共几档」。 */
  private stepNote(t: number): string {
    if (this.params.mode !== 'stepped' || t <= 0 || t >= 1) {
      return '—';
    }
    const steps = this.params.steps;
    return `${(((steps * t) | 0) + 1)} / ${steps} 档`;
  }

  private drawGrid() {
    const g = this.grid;
    g.clear();
    const { x, y, w, h } = PLOT;
    g.lineStyle(1, 0x334155, 1);
    g.strokeRect(x, y, w, h);
    g.lineBetween(x + w / 2, y, x + w / 2, y + h);
    g.lineBetween(x, y + h / 2, x + w, y + h / 2);
    g.lineStyle(1, 0x475569, 0.8);
    g.lineBetween(x, y + h, x + w, y); // Linear 参考:f(t) = t
    g.lineStyle(1, 0x334155, 1);
    g.lineBetween(TRACK.x0, TRACK.y, TRACK.x1, TRACK.y);
  }

  /** Stepped 的水平段画成实线、跳变处直接竖直连接,阶梯形状一目了然。 */
  private drawCurve() {
    const g = this.curve;
    g.clear();
    g.lineStyle(2.5, 0x2dd4bf, 1);
    g.beginPath();
    const steps = this.params.mode === 'stepped' ? this.params.steps * 8 : 128;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = PLOT.x + t * PLOT.w;
      const py = PLOT.y + PLOT.h - this.resolved.fn(t) * PLOT.h;
      if (i === 0) {
        g.moveTo(px, py);
      } else {
        g.lineTo(px, py);
      }
    }
    g.strokePath();
  }
}
