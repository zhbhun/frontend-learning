/**
 * 范例:缓动曲线画廊——曲线图像 f(t) 与同一缓动驱动的轨道动画点对照。
 * 输入:「缓动家族」(Linear + 十个家族)、「变体」(easeIn/easeInOut/easeOut)、「时长」。
 * 主要操作:左侧 Graphics 画出当前缓动的完整曲线(0..1 网格,Back/Elastic 的
 * 出界段照画);右侧四条水平轨道的圆点全部用同一条缓动**字符串**驱动 tween
 * (x 从轨道左端到右端,yoyo 往返,repeat -1,依次错开 delay 形成相位波浪);
 * 曲线上的亮点与第一条轨道共用同一个 TweenData.progress,读 t、算 f(t) 同步移动。
 * 参数变化时先 killTweensOf 再按新 ease/duration 重建,曲线整块重画。
 * 预期结果:切家族/变体,曲线形状与四条轨道节奏同步改变;拖「时长」只改速度
 * 不改形状;readout 报告缓动名、解析到的函数路径、当前 t 与缓动值 f(t)。
 * 阅读主线:FAMILIES(键表)→ resolveEase(字符串→函数)→ applyParams(重建)
 * → drawCurve(画曲线)→ update(示点与读数)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

export type EaseVariant = 'easeIn' | 'easeInOut' | 'easeOut';

/** 画廊家族:Linear 无变体,其余十个共享 In/InOut/Out 三个变体。 */
export const FAMILY_LABELS = {
  Linear: 'Linear 匀速',
  Quad: 'Quad 二次',
  Cubic: 'Cubic 三次',
  Quart: 'Quart 四次',
  Quint: 'Quint 五次',
  Sine: 'Sine 正弦',
  Expo: 'Expo 指数',
  Circ: 'Circ 圆弧',
  Back: 'Back 过冲',
  Elastic: 'Elastic 弹簧',
  Bounce: 'Bounce 弹跳',
} as const;

export type FamilyKey = keyof typeof FAMILY_LABELS;

export const VARIANT_LABELS: Record<EaseVariant, string> = {
  easeIn: 'easeIn(慢起快收)',
  easeInOut: 'easeInOut(两端缓)',
  easeOut: 'easeOut(快起慢收)',
};

/** 字符串短名 → Phaser.Math.Easing 命名空间全名(Quad→Quadratic 等不一致在此翻译)。 */
const NAMESPACES: Record<Exclude<FamilyKey, 'Linear'>, string> = {
  Quad: 'Quadratic',
  Cubic: 'Cubic',
  Quart: 'Quartic',
  Quint: 'Quintic',
  Sine: 'Sine',
  Expo: 'Expo',
  Circ: 'Circular',
  Back: 'Back',
  Elastic: 'Elastic',
  Bounce: 'Bounce',
};

export interface CurveParams {
  family: FamilyKey;
  variant: EaseVariant;
  duration: number;
}

export interface CurveSnapshot {
  easeName: string;
  easePath: string;
  t: number;
  eased: number;
  duration: number;
}

export interface CurveInstance {
  update(params: CurveParams): void;
  dispose(): void;
}

/**
 * 曲线绘图区(左)与四条轨道(右)的布局常量。框高压缩到 132 是刻意的:
 * Elastic.Out 峰值约 1.71、Elastic.In 谷值约 -0.71(默认参数下振幅被钳到 1),
 * Back 过冲约 ±0.1——留足上下余量,出界段才画得出框又留在画布内。
 */
const PLOT = { x: 46, y: 140, w: 300, h: 132 };
const TRACK = { x0: 408, x1: 688 };
const TRACK_YS = [96, 168, 240, 312];
/** 四条轨道的启动间隔,错相形成同一条曲线的节奏波浪。 */
const STAGGER_MS = 260;

interface ResolvedEase {
  /** tween 用的字符串写法(Linear 无变体)。 */
  name: string;
  /** 解析到的命名空间路径,暴露短名/全名不一致。 */
  path: string;
  fn: (v: number) => number;
}

function resolveEase(family: FamilyKey, variant: EaseVariant): ResolvedEase {
  if (family === 'Linear') {
    return {
      name: 'Linear',
      path: 'Phaser.Math.Easing.Linear',
      fn: Phaser.Math.Easing.Linear,
    };
  }
  const ns = NAMESPACES[family];
  const group = (Phaser.Math.Easing as Record<string, unknown>)[ns] as Record<
    string,
    (v: number) => number
  >;
  return {
    name: `${family}.${variant}`,
    path: `Phaser.Math.Easing.${ns}.${variant.replace('ease', '')}`,
    fn: group[variant],
  };
}

export function createCurveGallery(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CurveSnapshot) => void,
): CurveInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [CurveGalleryScene],
  });

  // Game 的 boot 依赖 DOM 就绪时机:scene 可能暂不可得,首次 update 时补取
  let scene = game.scene.getScene('CurveGallery') as
    | CurveGalleryScene
    | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    update(params: CurveParams) {
      if (!scene) {
        scene = game.scene.getScene('CurveGallery') as
          | CurveGalleryScene
          | undefined;
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

class CurveGalleryScene extends Phaser.Scene {
  private grid!: Phaser.GameObjects.Graphics;
  private curve!: Phaser.GameObjects.Graphics;
  private marker!: Phaser.GameObjects.Arc;
  private dots: Phaser.GameObjects.Arc[] = [];
  private leadTween?: Phaser.Tweens.Tween;
  private resolved: ResolvedEase = resolveEase('Linear', 'easeOut');
  private params: CurveParams = {
    family: 'Linear',
    variant: 'easeOut',
    duration: 1200,
  };
  /** 场景就绪前暂存 Controls 参数;create 后按它建首组补间。 */
  private created = false;
  private pendingParams?: CurveParams;

  emitSnapshot: (snapshot: CurveSnapshot) => void = () => {};

  constructor() {
    super({ key: 'CurveGallery' });
  }

  create() {
    this.add
      .text(GAME_WIDTH / 2, 34, '曲线画廊:同一缓动,图像与运动对照', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '13px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);

    this.grid = this.add.graphics();
    this.curve = this.add.graphics();

    // 四条轨道的点一次建好;补间在 applyParams 里(重)建
    for (const y of TRACK_YS) {
      this.dots.push(this.add.circle(TRACK.x0, y, 9, 0x2dd4bf));
    }

    // 曲线示点:与第一条轨道共用同一 TweenData.progress,去程回程都贴着曲线走
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
    this.add
      .text((TRACK.x0 + TRACK.x1) / 2, 58, '同一缓动驱动 · 依次错开启动', {
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
    // TweenData.progress 是本程内未反转的进度;yoyo 回程时 ease 收到 1-t,
    // 示点因此沿同一条曲线滑回,与轨道点完全同步。
    const data = this.leadTween?.data?.[0] as Phaser.Tweens.TweenData | undefined;
    const t = data ? data.progress : 0;
    const eased = this.resolved.fn(t);
    this.marker.setPosition(
      PLOT.x + t * PLOT.w,
      PLOT.y + PLOT.h - eased * PLOT.h,
    );
    this.emitSnapshot({
      easeName: this.resolved.name,
      easePath: this.resolved.path,
      t,
      eased,
      duration: this.params.duration,
    });
  }

  applyParams(params: CurveParams) {
    this.params = params;
    if (!this.created) {
      this.pendingParams = params;
      return; // 场景尚未就绪,create() 会用 pendingParams 补建
    }
    this.resolved = resolveEase(params.family, params.variant);

    // 参数一变就整组重建:先停旧补间,再按新字符串与时长重发
    for (const dot of this.dots) {
      this.tweens.killTweensOf(dot);
    }
    this.dots.forEach((dot, index) => {
      dot.x = TRACK.x0;
      this.tweens.add({
        targets: dot,
        x: TRACK.x1,
        duration: params.duration,
        ease: this.resolved.name, // 走真实的字符串解析路径
        yoyo: true,
        repeat: -1,
        delay: index * STAGGER_MS,
      });
    });
    this.leadTween = this.tweens.getTweensOf(this.dots[0])[0];

    this.drawCurve();
    this.drawGrid();
  }

  /** 0..1 网格与 Linear 参考对角线,曲线出界段说明越界是真的。 */
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
    for (const ty of TRACK_YS) {
      g.lineBetween(TRACK.x0, ty, TRACK.x1, ty);
    }
  }

  /** 采样 128 点描出 f(t);不做任何裁剪,出界照画。 */
  private drawCurve() {
    const g = this.curve;
    g.clear();
    g.lineStyle(2.5, 0x2dd4bf, 1);
    g.beginPath();
    const steps = 128;
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
