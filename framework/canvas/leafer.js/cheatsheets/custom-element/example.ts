/**
 * 演示内容：注册一个自定义 UI 元素 StarBadge，并复用内核能力渲染实例。
 *   - 通过 StarBadge.registerUI() 注册元素，__tag = 'StarBadge' 作为全局唯一标识。
 *   - 继承 Group 复用内核能力：渲染、事件、变换、子节点管理、序列化（toJSON / UI.one）。
 *   - 自定义数据层 StarBadgeData extends GroupData，setScore 成为 score 属性的写入钩子，
 *     score 变化时自动调用 createStars() 重建星星子节点（命令式等价 @dataProcessor + @boundsType）。
 *   - 星星用内置 Star 元素渲染，证明自定义元素可自由组合内置图形。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM，CSS 100% 撑满舞台）。
 *   公开输入：score（自定义属性 score，0–5）。
 * 主要操作：
 *   - 定义 StarBadgeData（setScore 钩子）→ 定义 StarBadge（createStars 重建子节点）→
 *     命令式注册（registerUI / registerData / addAttr）→ new StarBadge({ score }) 加入 leafer。
 *   - update 时给 badge.score 赋值，setScore 自动触发 createStars 重建星星，读数同步刷新。
 * 预期结果：
 *   - 调整 score：星星数量随之增减（0–5 颗五角星）。
 *   - 读出注册标识 __tag='StarBadge'、自定义属性 score、子星数、数据层类型 StarBadgeData。
 * 阅读主线：StarBadgeData.setScore → StarBadge.createStars → 命令式注册三连 →
 *           createBadgeScene（new StarBadge）→ update（赋值 score 触发重建）→ dispose。
 */
import {
  Leafer,
  Group,
  GroupData,
  Star,
  Text,
  boundsType,
  UICreator,
  type IUIData,
} from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// ====================================================================
// 第一步：定义数据层
// ====================================================================
// 自定义元素的数据层必须继承对应基类的 Data 类（Group → GroupData），避免污染父类数据。
// 定义 set + 属性名（setScore）的方法，会成为该属性的写入钩子：赋值时自动调用。
// 内部约定：计算变量用单下划线（_score）；钩子内可用 this.__leaf 访问元素实例。
class StarBadgeData extends GroupData {
  protected _score = 0;

  // 成为 score 属性的 setter（框架自动连接，不要调用 super.setScore）：
  // 存储值后让元素重建星星子节点。
  protected setScore(value: number): void {
    this._score = value;
    (this.__leaf as StarBadge).createStars();
  }
}

// ====================================================================
// 第二步：定义元素类
// ====================================================================
// 继承 Group 即复用内核能力：渲染、命中、事件、变换、子节点管理、序列化。
// __tag 是全局唯一标识，用于按 tag 反查创建（UI.one / UICreator.get / leafer.add({tag})）。
class StarBadge extends Group {
  public get __tag() {
    return 'StarBadge';
  }

  // 自定义属性 score：用 declare 声明类型，实际 get/set 由 addAttr 注册。
  declare public score: number;

  constructor(data?: Record<string, unknown>) {
    super(data as any);
    // 初始 data 中的 score 会经 setScore 触发一次 createStars；此处兜底确保渲染。
    this.createStars();
  }

  // 根据 score 重建星星子节点：先清空，再用内置 Star 逐颗摆放。
  // 读取 this.score 经数据层 getter 拿到当前值；removeAll(true) 同时销毁旧节点。
  public createStars(): void {
    const score = this.score;
    this.removeAll(true);

    const size = 38;
    const gap = 12;
    const total = score * size + Math.max(0, score - 1) * gap;

    for (let i = 0; i < score; i++) {
      this.add(
        new Star({
          x: -total / 2 + i * (size + gap),
          y: -size / 2,
          width: size,
          height: size,
          corners: 5,
          innerRadius: 0.5,
          fill: '#fbbf24',
          stroke: '#d97706',
          strokeWidth: 1.5,
          shadow: [{ x: 0, y: 2, blur: 4, color: 'rgba(180,83,9,0.35)' }],
        }),
      );
    }
  }
}

// ====================================================================
// 第三步：命令式注册（等价 @registerUI + @dataProcessor + @boundsType）
// ====================================================================
// TS 装饰器写法见 README；这里用无装饰器的命令式 API，兼容任意编译配置。
// 顺序要求：registerData 必须早于 addAttr——addAttr 连接 setScore 时需要数据层已绑定。
// registerData 的官方类型标注为实例类型 IUIData，运行时实际需要数据类构造器，故做一次类型断言。
StarBadge.registerUI();
StarBadge.registerData(StarBadgeData as unknown as IUIData);
StarBadge.addAttr('score', 0, boundsType);

// ====================================================================
// 范例场景：实例化自定义元素并接入 canvasStory
// ====================================================================

export interface BadgeOptions {
  score: number;
}

export interface BadgeSnapshot {
  /** 注册标识 __tag，证明元素已注册。 */
  tag: string;
  /** 自定义属性 score 的当前值。 */
  score: number;
  /** 子星数（createStars 重建后的 children.length）。 */
  starCount: number;
  /** 数据层是否为自定义 StarBadgeData（证明 @dataProcessor 生效）。 */
  customData: boolean;
  /** 按 tag 反查能否找到注册类（证明序列化 / UI.one 可用）。 */
  registered: boolean;
}

export interface BadgeInstance {
  update(options: BadgeOptions): void;
  dispose(): void;
}

export function createBadgeScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BadgeSnapshot) => void,
): BadgeInstance {
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#ffffff',
  });

  // 直接构造自定义元素：构造参数里给 score，setScore 在 super(data) 阶段就会触发 createStars。
  // draggable / fill 等都是继承自 Group/UI 的内核属性，开箱即用。
  const badge = new StarBadge({
    x: initial.width / 2,
    y: initial.height / 2,
    score: 3,
    draggable: true,
  });
  leafer.add(badge);

  leafer.add(
    new Text({
      text: 'StarBadge · registerUI 注册的自定义元素',
      x: 16,
      y: 12,
      fontSize: 13,
      fill: '#64748b',
    }),
  );

  leafer.add(
    new Text({
      text: '拖动元素验证继承的事件与交互能力',
      x: 16,
      y: 32,
      fontSize: 12,
      fill: '#94a3b8',
    }),
  );

  let current: BadgeOptions = { score: 3 };

  // 注册在模块加载时已完成；这里只查一次注册表，避免每次 readout 都构造临时实例。
  // UICreator.list 以 __tag 为键存放已注册类，能查到即说明可按 tag 反查创建。
  const registered = !!UICreator.list['StarBadge'];

  function syncReadout() {
    emit({
      tag: (badge as StarBadge).__tag,
      score: badge.score,
      starCount: badge.children?.length ?? 0,
      customData: badge.__ instanceof StarBadgeData,
      registered,
    });
  }

  syncReadout();
  leafer.nextRender(syncReadout);

  const resizeObserver = createResizeObserver(canvas, () => {
    const { width, height } = readCanvasSize(canvas);
    leafer.resize({ width, height });
    badge.x = width / 2;
    badge.y = height / 2;
    syncReadout();
  });

  return {
    update(options) {
      current = options;
      // 给自定义属性赋值：setScore 钩子自动重建星星，无需手动调 createStars。
      badge.score = options.score;
      syncReadout();
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
