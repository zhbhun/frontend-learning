/**
 * 范例介绍：演示 RenderLayer 如何把对象的「渲染归属」从「逻辑父子」中剥离。
 *
 * 演示内容：world 容器上挂了 AlphaFilter（半透明），里面有 3 个会上下浮动的角色，每个角色
 * 自带一个 UI 标签。标签的逻辑父仍是角色（变换跟随角色移动），但渲染归属可切换：
 *   - 关：标签留在角色容器里 → 被 world 的 AlphaFilter 拖成半透明。
 *   - 开：标签 attach 到顶层 RenderLayer → 不再受 world 滤镜影响，清晰且永远在最上层。
 *
 * 输入：useRenderLayer（是否把标签 attach 到 RenderLayer）。
 * 主要操作：apply 切换每个角色标签的 attach / detach；标签仍是角色的子节点，所以位置跟随角色，
 * 但渲染走 RenderLayer，从而绕开 world 的滤镜与渲染顺序。
 *
 * 预期结果：
 *   - useRenderLayer=false：3 个标签和角色一样半透明，叠在 world 内部。
 *   - useRenderLayer=true：3 个标签恢复完全不透明、浮在所有内容之上，且仍随角色上下浮动。
 *   - 读数显示「标签渲染归属」与「是否受 world 滤镜」的切换。
 *
 * 阅读主线：先看 world 如何挂 AlphaFilter、角色如何由 body + label 组成，再看 applyLayer 如何
 * 用 renderLayer.attach / detach 切换标签的渲染归属，最后对照画面看标签清晰度与读数。
 */
import {
  AlphaFilter,
  Application,
  Container,
  Graphics,
  RenderLayer,
  Text,
} from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface RenderLayerOptions {
  useRenderLayer: boolean;
}

export interface RenderLayerSnapshot {
  attached: boolean;
  filtered: boolean;
}

export interface RenderLayerInstance {
  update(options: RenderLayerOptions): void;
  dispose(): void;
}

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

interface Character {
  root: Container;
  label: Container;
  baseY: number;
  phase: number;
}

export function createRenderLayerDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RenderLayerSnapshot) => void,
): RenderLayerInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: RenderLayerOptions = { useRenderLayer: true };

  // world 挂 AlphaFilter，让「留在 world 内」的对象整体半透明——这是 RenderLayer 要规避的效果。
  const world = new Container();
  world.filters = [new AlphaFilter({ alpha: 0.4 })];

  const worldBg = new Graphics();
  worldBg.roundRect(0, 0, 360, 200, 16).stroke({
    color: 0x334155,
    width: 1,
    alpha: 0.6,
  });

  const title = new Text({
    text: 'RenderLayer：标签渲染归属切换',
    style: { ...MONO, fontSize: 16, fill: 0xe2e8f0 },
  });
  title.anchor.set(0.5, 0);

  const hint = new Text({
    text: '开启后标签脱离 world 滤镜、清晰置顶；关闭后标签随 world 半透明',
    style: { ...MONO, fontSize: 12, fill: 0x94a3b8 },
  });
  hint.anchor.set(0.5, 0);

  const colors = [0x60a5fa, 0x34d399, 0xfbbf24];
  const names = ['A', 'B', 'C'];
  const characters: Character[] = [];

  // 每个角色：root（含 body）+ label。label 是 root 的子节点，变换跟随角色；
  // 是否 attach 到 RenderLayer 只改变它的渲染归属，不改变逻辑父子。
  for (let i = 0; i < 3; i++) {
    const root = new Container();

    const body = new Graphics();
    body.roundRect(-30, -30, 60, 60, 10).fill({ color: colors[i] });
    const bodyTag = new Text({
      text: names[i],
      style: { ...MONO, fontSize: 22, fontWeight: '700', fill: 0x0f172a },
    });
    bodyTag.anchor.set(0.5);
    root.addChild(body, bodyTag);

    // UI 标签：白底药丸 + 文字。它会被 attach 到 RenderLayer。
    const label = new Container();
    const pill = new Graphics();
    pill.roundRect(-34, -12, 68, 24, 12).fill({ color: 0xf8fafc });
    const pillText = new Text({
      text: `UI ${names[i]}`,
      style: { ...MONO, fontSize: 12, fontWeight: '700', fill: 0x0f172a },
    });
    pillText.anchor.set(0.5);
    label.addChild(pill, pillText);
    label.position.set(0, -48);

    root.addChild(label);
    characters.push({ root, label, baseY: 0, phase: i * 1.6 });
  }

  world.addChild(worldBg, ...characters.map((c) => c.root));

  // 顶层 RenderLayer：attach 进来的对象按它在 stage 中的位置渲染（最后 = 最上层）。
  const renderLayer = new RenderLayer();

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    const cx = w / 2;
    title.position.set(cx, h * 0.1);
    hint.position.set(cx, h * 0.1 + 24);

    worldBg.position.set(cx - 180, h * 0.32);
    const spread = 96;
    characters.forEach((c, i) => {
      c.root.position.set(cx - spread + i * spread, h * 0.32 + 100);
      c.baseY = c.root.y;
    });
  }

  // 核心机制：attach 把标签的渲染从 world（带滤镜）移到 renderLayer（顶层、无滤镜）。
  // 注意标签的逻辑父仍是角色 root，所以位置变换继续跟随角色——这正是 RenderLayer 的价值。
  function applyLayer(opts: RenderLayerOptions) {
    current = opts;
    if (!ready) {
      return;
    }
    for (const c of characters) {
      if (opts.useRenderLayer) {
        renderLayer.attach(c.label);
      } else {
        renderLayer.detach(c.label);
      }
    }
    emit({ attached: opts.useRenderLayer, filtered: !opts.useRenderLayer });
  }

  const initial = readCanvasSize(canvas);
  const initPromise = app.init({
    canvas,
    width: Math.max(320, initial.width),
    height: Math.max(240, initial.height),
    preference: 'webgl',
    background: '#0f172a',
    antialias: true,
  });

  initPromise.then(() => {
    if (disposed) {
      destroyAll();
      return;
    }
    ready = true;
    app.stage.addChild(world, renderLayer, title, hint);
    layout();
    applyLayer(current);

    // 角色上下浮动：证明标签 attach 后位置仍跟随角色（变换归属未变）。
    let t = 0;
    app.ticker.add((ticker) => {
      t += ticker.deltaMS / 1000;
      for (const c of characters) {
        c.root.y = c.baseY + Math.sin(t * 1.6 + c.phase) * 14;
      }
    });
  });

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    app.destroy(true, { children: true });
  }

  // 离屏暂停渲染循环省 GPU；回到视口恢复。
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!ready) {
        return;
      }
      if (entries.at(-1)?.isIntersecting) {
        app.start();
      } else {
        app.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas);

  const resizeObserver = createResizeObserver(canvas, () => {
    if (!app.renderer) {
      return;
    }
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height);
    layout();
  });

  return {
    update(options) {
      applyLayer(options);
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      if (app.renderer) {
        destroyAll();
      } else {
        initPromise.then(destroyAll);
      }
    },
  };
}
