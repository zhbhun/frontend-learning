/**
 * 范例介绍：自定义对象实验台——定义一个完整的 FabricObject 子类 Cross（十字图形），
 * 读者通过五个公开输入观察"子类配方"的每个环节：
 * 1. 最小配方：static type / static ownDefaults / static getDefaults() / 构造三行
 *    （super → Object.assign(ownDefaults) → setOptions），v7 无 initialize 钩子；
 * 2. 自定义渲染：覆写 _render(ctx)——ctx 已平移到对象中心，构建路径后交给
 *    _renderPaintInOrder 复用 fill/stroke 管线；width/height 跟随 armLength，
 *    包围盒与控件框罩得住自绘内容；
 * 3. 缓存与 dirty：static cacheProperties 扩展 armLength/barWidth 后
 *    set('armLength') 自动标脏（滑块路径）；脉动相位 phase 是每帧推进的内部
 *    渲染态——不在 cacheProperties 里，必须每帧手动 dirty=true，否则
 *    objectCaching 开着时画面冻结（读数继续走）；
 * 4. 序列化往返：toObject 覆写把 armLength/barWidth 固化进白名单（phase /
 *    pulseScale 不落盘），classRegistry.setClass(Cross) 登记 'Cross' 与 'cross'
 *    两个名，loadFromJSON 凭 type 复活出新 Cross 实例。
 * 输入：臂长 armLength（走 set → cacheProperties 自动标脏）、脉动动画、每帧标记
 * dirty、对象缓存 objectCaching、执行往返；画布上可直接拖动对象。
 * 预期结果：读数给出静态/实例 type、注册表查询、导出条目键值、渲染状态
 * （phase / dirty / pulseScale）、缓存行为、往返后 instanceof 与字段对照；
 * 「缓存开 + 标脏关 + 脉动开」→ 画面冻结而 phase 读数继续走；缓存关掉后
 * dirty 不再需要，脉动照常动。
 * 阅读主线：文件顶部 Cross 类（完整配方）→ update() 的输入落点 →
 * doRoundtrip() 的 toObject → JSON.stringify → loadFromJSON 闭环。
 */
import {
  Canvas,
  FabricObject,
  Rect,
  classRegistry,
  type FabricObjectProps,
  type SerializedObjectProps,
  type TClassProperties,
} from 'fabric';
import {
  createRenderLoop,
  createResizeObserver,
} from '../../assets/canvas-runtime.js';

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };

/** Cross 的自有属性：只有这两个字段进序列化白名单 */
interface UniqueCrossProps {
  /** 横竖臂长（像素），也是包围盒边长 */
  armLength: number;
  /** 臂宽（像素） */
  barWidth: number;
}

interface CrossProps extends FabricObjectProps, UniqueCrossProps {}

interface SerializedCrossProps extends SerializedObjectProps, UniqueCrossProps {}

/** 本类默认值增量：只写 Cross 新增的字段，父类默认由 super 链落 */
const crossDefaultValues: Partial<TClassProperties<Cross>> = {
  armLength: 96,
  barWidth: 26,
};

export class Cross extends FabricObject<
  Partial<CrossProps>,
  SerializedCrossProps
> {
  /** 序列化 type 字段与 classRegistry 登记名的来源；实例 getter 返回小写 'cross' */
  static type = 'Cross';

  declare armLength: number;
  declare barWidth: number;

  /** 每帧推进的内部渲染态：不进 cacheProperties、不进 toObject，演示手动 dirty */
  phase = 0;
  pulseScale = 1;

  static ownDefaults = crossDefaultValues;

  /** 合并父类默认值：includeDefaultValues=false 剥默认键时按这份对照 */
  static getDefaults(): Record<string, any> {
    return { ...super.getDefaults(), ...Cross.ownDefaults };
  }

  /** 影响外观的自定义字段进缓存监听清单：set('armLength') 自动标脏 */
  static cacheProperties = [
    ...FabricObject.cacheProperties,
    'armLength',
    'barWidth',
  ];

  constructor(options: Partial<CrossProps> = {}) {
    super(); // 父类构造先落基类默认值并发放默认控件集
    Object.assign(this, Cross.ownDefaults); // 再落本类默认值
    this.setOptions(options); // 最后应用调用方选项（逐键走 set）
    this.syncDimensions();
  }

  /** width/height 决定包围盒与命中区域：跟随臂长，控件框才罩得住自绘内容 */
  syncDimensions() {
    this.width = this.armLength;
    this.height = this.armLength;
  }

  /**
   * 自定义渲染钩子：ctx 已平移/旋转到对象中心，围绕 (0,0) 画。
   * 构建路径后交给 _renderPaintInOrder，复用 fabric 的填充/描边管线
   * （fill / stroke / 渐变 / Pattern / paintFirst 顺序照常生效）。
   * 实际臂长 = armLength × pulseScale，脉动只改 pulseScale。
   */
  _render(ctx: CanvasRenderingContext2D) {
    const arm = this.armLength * this.pulseScale;
    const { barWidth } = this;
    ctx.beginPath();
    ctx.rect(-arm / 2, -barWidth / 2, arm, barWidth); // 横臂
    ctx.rect(-barWidth / 2, -arm / 2, barWidth, arm); // 竖臂
    this._renderPaintInOrder(ctx);
  }

  /** 固化白名单：调用方传什么都额外带上 Cross 的自有字段 */
  toObject(propertiesToInclude: any[] = []) {
    return super.toObject([...propertiesToInclude, 'armLength', 'barWidth']);
  }
}

// 注册进 JSON 复活通道：不带别名时登记 'Cross' 与小写 'cross' 两条
classRegistry.setClass(Cross);

/** 读者输入：对应 Controls 面板 */
export interface CustomObjectOptions {
  /** 臂长 armLength：set() 路径，命中扩展后的 cacheProperties 自动标脏 */
  armLength: number;
  /** 脉动动画：每帧推进 phase 并更新 pulseScale（内部渲染态，不序列化） */
  pulsate: boolean;
  /** 每帧标记 dirty：关闭后 objectCaching 开着时缓存不重建，画面冻结 */
  markDirty: boolean;
  /** 对象缓存 objectCaching：关掉后 render 直接调 _render，dirty 不再需要 */
  useCaching: boolean;
  /** 执行往返：toObject → JSON.stringify → loadFromJSON；关掉即重建初始场景 */
  roundtrip: boolean;
}

/** 派生读数：由 readout 显示 */
export interface CustomObjectSnapshot {
  typeLabel: string;
  registryLabel: string;
  exportLabel: string;
  renderLabel: string;
  cacheLabel: string;
  roundtripLabel: string;
  objectsLabel: string;
}

export interface CustomObjectInstance {
  update(options: CustomObjectOptions): void;
  dispose(): void;
}

export function createCustomObjectLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: CustomObjectSnapshot) => void,
): CustomObjectInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#f8fafc',
  });

  const initial: CustomObjectOptions = {
    armLength: 96,
    pulsate: false,
    markDirty: true,
    useCaching: true,
    roundtrip: false,
  };

  /** 当前生效的 Cross 引用：往返后会被还原出的新实例替换 */
  let cross: Cross | null = null;
  /** 已推进的动画帧数：画面冻结时它还在走，是"状态在推进、缓存不刷新"的证据 */
  let advancedFrames = 0;
  /** 往返是否已施加到当前画布 */
  let roundtripApplied = false;
  /** 往返令牌：开关快速切换时丢弃过期的异步结果 */
  let roundtripToken = 0;

  /** 重建初始场景：自定义 Cross + 内置 Rect 对照（复活通道各查各的注册名） */
  function rebuildScene() {
    fabricCanvas.discardActiveObject();
    fabricCanvas.remove(...fabricCanvas.getObjects());
    advancedFrames = 0;
    cross = new Cross({
      left: 150,
      top: 110,
      angle: 8,
      armLength: current.armLength,
      fill: '#38bdf8',
      stroke: '#0f172a',
      strokeWidth: 2,
    });
    const backer = new Rect({
      left: 420,
      top: 130,
      width: 130,
      height: 130,
      fill: '#fbbf24',
      stroke: '#0f172a',
      strokeWidth: 2,
    });
    fabricCanvas.backgroundColor = '#f8fafc';
    fabricCanvas.add(cross, backer);
  }

  function findCross(): Cross | null {
    return (
      (fabricCanvas
        .getObjects()
        .find((object) => object instanceof Cross) as Cross | undefined) ??
      null
    );
  }

  /** 静态 type：从实例上读 constructor.type 需要窄化到具体类 */
  function staticTypeOf(target: Cross): string {
    return String((target.constructor as typeof Cross).type);
  }

  /** 计算当前时刻的导出快照并推送读数 */
  function emitSnapshot() {
    const target = cross ?? findCross();
    const dump = target ? (target.toObject() as Record<string, unknown>) : null;

    let roundtripLabel = '（未往返）';
    if (roundtripApplied) {
      const revived = findCross();
      if (revived) {
        roundtripLabel = `instanceof Cross ✓ · type=${staticTypeOf(revived)} · armLength=${revived.armLength} · pulseScale=${revived.pulseScale}（内部态未随行）`;
      } else {
        roundtripLabel = '（复活结果里没有 Cross——注册被跳过？）';
      }
    }

    emit({
      typeLabel: target
        ? `静态 ${staticTypeOf(target)} · 实例 ${target.type}（getter 小写）`
        : '（无实例）',
      registryLabel: `getClass('Cross') 命中：${String(
        classRegistry.getClass('Cross') === Cross,
      )} · getClass('cross') 命中：${String(
        classRegistry.getClass('cross') === Cross,
      )}`,
      exportLabel: dump
        ? `type=${String(dump.type)} · armLength=${String(
            dump.armLength,
          )} · barWidth=${String(dump.barWidth)} · 含 phase/pulseScale：${String(
            'phase' in dump || 'pulseScale' in dump,
          )}`
        : '（无导出条目）',
      renderLabel: target
        ? `phase=${target.phase.toFixed(2)} · dirty=${String(target.dirty)} · pulseScale=${target.pulseScale.toFixed(2)} · 已推进 ${advancedFrames} 帧`
        : '（无实例）',
      cacheLabel: target
        ? `objectCaching=${String(target.objectCaching)} · 每帧标脏=${String(
            current.markDirty,
          )}`
        : '（无实例）',
      roundtripLabel,
      objectsLabel:
        fabricCanvas
          .getObjects()
          .map((object) => object.type.toLowerCase())
          .join(' · ') || '（空）',
    });
  }

  /** 完整闭环：toObject → JSON.stringify → loadFromJSON(Promise) → requestRenderAll */
  async function doRoundtrip() {
    const token = ++roundtripToken;
    const json = JSON.stringify(fabricCanvas.toObject());
    await fabricCanvas.loadFromJSON(json);
    if (token !== roundtripToken) {
      return; // 开关已切走，丢弃过期结果
    }
    cross = findCross();
    roundtripApplied = true;
    fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  function update(options: CustomObjectOptions) {
    if (!options.roundtrip && roundtripApplied) {
      // 关掉「执行往返」：重建初始场景，读数回到基准
      roundtripApplied = false;
      roundtripToken++;
      rebuildScene();
    }
    if (!cross || !fabricCanvas.getObjects().includes(cross)) {
      rebuildScene();
    }

    // 输入 1：臂长走 set() 路径——armLength 已进 Cross.cacheProperties，自动标脏
    if (cross && cross.armLength !== options.armLength) {
      cross.set('armLength', options.armLength);
      cross.syncDimensions(); // 包围盒跟随臂长
      cross.setCoords(); // 已在画布上：重算控件坐标
    }

    // 输入 2/3/4：脉动与标脏在渲染循环里逐帧处理；停脉动时恢复静止比例
    if (cross) {
      cross.objectCaching = options.useCaching;
      if (!options.pulsate) {
        cross.pulseScale = 1;
      }
    }

    fabricCanvas.requestRenderAll();
    emitSnapshot();

    // 输入 5：执行往返（false → true 的跳变触发一次）
    if (options.roundtrip && !roundtripApplied) {
      void doRoundtrip();
    }
  }

  function syncSize() {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    fabricCanvas.setDimensions({ width, height });
  }

  /** 渲染循环：离屏自动暂停（createRenderLoop），关脉动时帧内直接返回 */
  const renderLoop = createRenderLoop(
    fabricCanvas.wrapperEl,
    (delta: number) => {
      if (!current.pulsate) {
        return;
      }
      const target = cross ?? findCross();
      if (!target) {
        return;
      }
      target.phase += delta * 2.2; // 每帧推进内部状态
      target.pulseScale = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(target.phase));
      advancedFrames++;
      // phase 不在 cacheProperties 里：objectCaching 开着时必须手动标脏，
      // 否则 renderCache 认为缓存仍新鲜，画面冻结在读数之外
      if (target.objectCaching && current.markDirty) {
        target.dirty = true;
      }
      fabricCanvas.requestRenderAll();
      emitSnapshot();
    },
  );

  // 画布上拖动对象时读数联动（left/top 等进导出条目）
  const onLiveChange = () => emitSnapshot();
  fabricCanvas.on('object:modified', onLiveChange);
  fabricCanvas.on('object:moving', onLiveChange);

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  /** 当前输入的同步引用：渲染循环与 update 共用 */
  let current: CustomObjectOptions = initial;

  const wrappedUpdate = (options: CustomObjectOptions) => {
    current = options;
    update(options);
  };

  rebuildScene();
  wrappedUpdate(initial);
  renderLoop.renderOnce();

  return {
    update: wrappedUpdate,
    dispose() {
      resizeObserver.disconnect();
      renderLoop.dispose();
      void fabricCanvas.dispose();
    },
  };
}
