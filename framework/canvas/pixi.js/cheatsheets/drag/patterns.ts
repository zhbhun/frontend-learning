/**
 * 范例介绍：演示拖拽的常见交互模式——约束到画布边界、释放时对齐网格、拾取时置顶，以及多个对象同时可拖。
 * 输入：是否约束边界（constrain）、是否对齐网格（snap）、是否拾取置顶（bringToFront）。
 * 主要操作：每个卡片各自挂 globalpointermove + pointerup + pointerupoutside，靠自身 dragging 标志区分；
 *           按下时按需置顶；移动时按需把中心坐标 clamp 到画布；抬手时按需 round 到网格。
 * 预期结果：拖任意卡片都流畅；开约束后拖不出画布；开对齐后抬手跳到网格点；开置顶后被拾卡片盖在其它之上。
 * 阅读主线：先看 makeCard 里 globalpointermove + offset 的标准拖拽；再看 constrain 的 clamp、snap 的 round、
 *           bringToFront 的重新 addChild（移到末尾即顶层）；最后看 update 热更与 dispose 释放、离屏暂停。
 */
import {
  Application,
  Graphics,
  FederatedPointerEvent,
} from 'pixi.js';

export interface PatternsDemoArgs {
  constrain: boolean;
  snap: boolean;
  bringToFront: boolean;
}

export interface PatternsDemoSnapshot {
  constrain: string;
  snap: string;
  bringToFront: string;
  top: string;
}

export interface PatternsDemoInstance {
  update(args: PatternsDemoArgs): void;
  dispose(): void;
}

const CARD_W = 140;
const CARD_H = 90;
const GRID = 40;
const MARGIN = 8;

interface CardDef {
  color: number;
  label: string;
}

interface CardState {
  card: Graphics;
  color: number;
  label: string;
  dragging: boolean;
  ox: number;
  oy: number;
}

const CARDS: CardDef[] = [
  { color: 0x4f7cff, label: '蓝' },
  { color: 0xff5a7a, label: '粉' },
  { color: 0x66d9a0, label: '绿' },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function createPatternsDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PatternsDemoSnapshot) => void,
): PatternsDemoInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  // 用一个共享 state 对象持有热更开关，回调闭包读取它即可即时生效。
  const state: PatternsDemoArgs & { top: string } = {
    constrain: true,
    snap: false,
    bringToFront: true,
    top: CARDS[0].label,
  };

  function emitSnapshot() {
    if (!ready) {
      return;
    }
    emit({
      constrain: state.constrain ? '开' : '关',
      snap: state.snap ? '开' : '关',
      bringToFront: state.bringToFront ? '开' : '关',
      top: state.top,
    });
  }

  function makeCard(def: CardDef, x: number, y: number): CardState {
    const card = new Graphics();
    // 卡片以原点为中心绘制：card.x / card.y 即中心点，clamp 时用半宽 / 半高。
    card
      .roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14)
      .fill(def.color)
      .stroke({ width: 2, color: 0xf8fafc });
    card.rect(-CARD_W / 2, -CARD_H / 2, CARD_W, 12).fill({
      color: 0xffffff,
      alpha: 0.18,
    });

    card.x = x;
    card.y = y;
    card.eventMode = 'static';
    card.cursor = 'grab';

    const self: CardState = {
      card,
      color: def.color,
      label: def.label,
      dragging: false,
      ox: 0,
      oy: 0,
    };

    card.on('pointerdown', (e: FederatedPointerEvent) => {
      self.dragging = true;
      card.cursor = 'grabbing';
      self.ox = e.global.x - card.x;
      self.oy = e.global.y - card.y;
      // 重新 addChild 已有子节点会把它移到末尾——渲染顺序最末即最顶层。
      if (state.bringToFront) {
        app.stage.addChild(card);
      }
      state.top = self.label;
      emitSnapshot();
    });

    // 每个对象各自监听 globalpointermove，靠自身 dragging 标志判断是否在拖——多对象同时可拖的基础。
    card.on('globalpointermove', (e: FederatedPointerEvent) => {
      if (!self.dragging) {
        return;
      }
      let nx = e.global.x - self.ox;
      let ny = e.global.y - self.oy;
      // 约束：把中心坐标限制在画布内（留一点边距）。
      if (state.constrain) {
        nx = clamp(nx, MARGIN + CARD_W / 2, app.screen.width - MARGIN - CARD_W / 2);
        ny = clamp(ny, MARGIN + CARD_H / 2, app.screen.height - MARGIN - CARD_H / 2);
      }
      card.x = nx;
      card.y = ny;
    });

    const release = () => {
      if (!self.dragging) {
        return;
      }
      self.dragging = false;
      card.cursor = 'grab';
      // 对齐：抬手时把坐标 round 到最近网格点（先对齐再约束，避免跳出画布）。
      if (state.snap) {
        let sx = Math.round(card.x / GRID) * GRID;
        let sy = Math.round(card.y / GRID) * GRID;
        sx = clamp(sx, MARGIN + CARD_W / 2, app.screen.width - MARGIN - CARD_W / 2);
        sy = clamp(sy, MARGIN + CARD_H / 2, app.screen.height - MARGIN - CARD_H / 2);
        card.x = sx;
        card.y = sy;
      }
    };
    card.on('pointerup', release);
    card.on('pointerupoutside', release);

    return self;
  }

  app
    .init({
      canvas,
      background: '#1a1a2e',
      antialias: true,
      resizeTo: canvas.parentElement ?? window,
    })
    .then(() => {
      if (disposed) {
        app.destroy();
        return;
      }
      ready = true;

      const cx = app.screen.width / 2;
      const cy = app.screen.height / 2;
      // 三张卡片错位叠放，方便观察置顶与遮挡关系。
      const positions = [
        { x: cx - 50, y: cy - 30 },
        { x: cx + 10, y: cy + 6 },
        { x: cx - 20, y: cy + 42 },
      ];
      CARDS.map((def, i) => makeCard(def, positions[i].x, positions[i].y)).forEach(
        (s) => app.stage.addChild(s.card),
      );
      state.top = CARDS[CARDS.length - 1].label;

      emitSnapshot();
    })
    .catch(() => {
      // 渲染器初始化失败时画布保持空白。
    });

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!ready) {
        return;
      }
      const visible = entries.at(-1)?.isIntersecting ?? false;
      if (visible) {
        app.start();
      } else {
        app.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas.parentElement ?? canvas);

  return {
    update(args) {
      state.constrain = args.constrain;
      state.snap = args.snap;
      state.bringToFront = args.bringToFront;
      emitSnapshot();
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      if (ready) {
        app.destroy();
      }
    },
  };
}
