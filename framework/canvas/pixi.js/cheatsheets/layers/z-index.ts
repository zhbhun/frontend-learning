/**
 * 范例介绍：演示 zIndex + sortableChildren 如何改变同一容器内子节点的渲染顺序。
 *
 * 演示内容：4 张交错的彩色卡片（A/B/C/P），P 的 zIndex 可调、sortableChildren 可开关。
 * 关闭 sortableChildren 时 zIndex 被忽略，按 addChild 顺序叠放（P 最后添加 → 最上层）；
 * 开启后按 zIndex 升序绘制，zIndex 越大越靠上。
 *
 * 输入：sortableChildren（容器是否按 zIndex 自动排序）、playerZIndex（P 卡片的 zIndex）。
 * 主要操作：apply 把 sortableChildren 映射到 container.sortableChildren、playerZIndex 映射到
 * P.zIndex；需要排序时显式调用 sortChildren() 让读数立即反映新顺序。
 *
 * 预期结果：
 *   - sortableChildren=false：无论 P.zIndex 多少，P 始终在最上层（addChild 顺序决定渲染栈）。
 *   - sortableChildren=true：P.zIndex<0 时 P 沉到底层；>2 时 P 浮到最顶层。
 *   - 读数「渲染栈（下→上）」随排序实时变化，与画面叠放一致。
 *
 * 阅读主线：先看循环如何构造 4 张卡片并固定 A/B/C 的 zIndex，再看 applyOrder 如何
 * 切换 sortableChildren 与 P.zIndex，最后看读数里渲染栈顺序是否和画面叠放吻合。
 */
import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ZIndexOptions {
  sortableChildren: boolean;
  playerZIndex: number;
}

export interface ZIndexSnapshot {
  sortable: boolean;
  playerZ: number;
  stack: string;
}

export interface ZIndexInstance {
  update(options: ZIndexOptions): void;
  dispose(): void;
}

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

// 卡片定义：A/B/C 的 zIndex 固定，P 的 zIndex 由控件调节。
const CARDS = [
  { key: 'A', color: 0x60a5fa, zIndex: 0 },
  { key: 'B', color: 0x34d399, zIndex: 1 },
  { key: 'C', color: 0xfbbf24, zIndex: 2 },
  { key: 'P', color: 0xf472b6, zIndex: 1 },
] as const;

export function createZIndexDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ZIndexSnapshot) => void,
): ZIndexInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: ZIndexOptions = { sortableChildren: true, playerZIndex: 1 };

  // 卡片本体：圆角方块 + 名称 + zIndex 标注。zIndex 标注随 P 的当前值更新。
  const cards: Container[] = [];
  const zLabels: Text[] = [];
  for (const def of CARDS) {
    const card = new Container();

    const body = new Graphics();
    body.roundRect(-54, -36, 108, 72, 12).fill({ color: def.color });

    const name = new Text({
      text: def.key,
      style: { ...MONO, fontSize: 26, fontWeight: '700', fill: 0x0f172a },
    });
    name.anchor.set(0.5);

    const zTag = new Text({
      text: `z = ${def.zIndex}`,
      style: { ...MONO, fontSize: 12, fill: 0x0f172a, fontWeight: '600' },
    });
    zTag.anchor.set(0.5);
    zTag.position.set(0, 22);

    card.addChild(body, name, zTag);
    cards.push(card);
    zLabels.push(zTag);
  }

  const title = new Text({
    text: 'zIndex + sortableChildren',
    style: { ...MONO, fontSize: 16, fill: 0xe2e8f0 },
  });
  title.anchor.set(0.5, 0);

  const hint = new Text({
    text: '关闭 sortableChildren 后拖动 P 的 zIndex，观察是否还生效',
    style: { ...MONO, fontSize: 12, fill: 0x94a3b8 },
  });
  hint.anchor.set(0.5, 0);

  // 把卡片交错排开，露出叠放关系；addChild 顺序固定为 A→B→C→P（P 最后 = 默认最上层）。
  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    const cx = w / 2;
    title.position.set(cx, h * 0.12);
    hint.position.set(cx, h * 0.12 + 24);

    const startY = h * 0.42;
    cards[0].position.set(cx - 96, startY - 12);
    cards[1].position.set(cx - 32, startY + 12);
    cards[2].position.set(cx + 32, startY - 12);
    cards[3].position.set(cx + 96, startY + 12);
  }

  // 卡片单独放在 cardLayer，和 title/hint 分开，避免排序时把文字也卷进去。
  const cardLayer = new Container();

  // 核心机制：sortableChildren 开启时 PixiJS 按 zIndex 升序重排 children；关闭则按 addChild 顺序。
  // 注意 PixiJS 关掉 sortableChildren 后不会自动「撤销」上一次排序——数组会停在最后一次排序的样子，
  // 所以这里在关闭分支用 addChild 显式把卡片重排回 A→B→C→P，让读数和画面都回到 addChild 顺序。
  function applyOrder(opts: ZIndexOptions) {
    current = opts;
    cards[3].zIndex = opts.playerZIndex;
    zLabels[3].text = `z = ${opts.playerZIndex}`;
    cardLayer.sortableChildren = opts.sortableChildren;
    if (opts.sortableChildren) {
      cardLayer.sortChildren();
    } else {
      // addChild 已存在的子节点会把它移到末尾，按 A→B→C→P 顺序调用即恢复 addChild 顺序。
      cardLayer.addChild(cards[0], cards[1], cards[2], cards[3]);
    }
    if (ready) {
      emit({
        sortable: opts.sortableChildren,
        playerZ: opts.playerZIndex,
        // children[0] 最先绘制（最底层），最后一个绘制在最顶层
        stack: cardLayer.children
          .map((c) => (c as Container & { name?: string }).name ?? '?')
          .join(' → '),
      });
    }
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
    // 命名用于读数回显渲染栈
    CARDS.forEach((def, i) => (cards[i].name = def.key));
    cardLayer.addChild(...cards);
    app.stage.addChild(cardLayer, title, hint);
    // 场景静态：停掉 Ticker，只在参数变化时手动渲染一次，省 GPU。
    app.stop();
    layout();
    applyOrder(current);
    app.render();
  });

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    app.destroy(true, { children: true });
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    if (!app.renderer) {
      return;
    }
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height);
    layout();
    if (ready) {
      app.render();
    }
  });

  return {
    update(options) {
      applyOrder(options);
      if (ready) {
        app.render();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      if (app.renderer) {
        destroyAll();
      } else {
        initPromise.then(destroyAll);
      }
    },
  };
}
