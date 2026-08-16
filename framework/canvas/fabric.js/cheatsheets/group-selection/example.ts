/**
 * 范例介绍：两个"容器实验台"，核对 Group / ActiveSelection 的坐标吸收、变换叠加与布局策略——
 * 1. 容器实验台（GroupSelectionLab）：三个对象在 散件 / ActiveSelection 多选 / Group 成组 三种
 *    状态间切换。「成组」走干净配方（removeAll → discard → canvas.remove(...) → new Group → add），
 *    开「省略 canvas.remove」复现官方 managing-selection demo 的最简写法——子对象残留在画布列表，
 *    序列化四写、拖动组出现残影（读数「画布顶层」「序列化顶层」即为证据）。拖「容器 scaleX」
 *    核对组变换不改子对象自身属性（读数「红块缩放」自身恒 1、总缩放随组变化）。开
 *    「组内命中 subTargetCheck」后 Group#setCoords 级联子对象（读数「子对象 oCoords」由陈旧转新鲜）。
 *    画布上可直接点选、shift 多选、拖拽、缩放——读数全部实时联动。
 * 2. 布局实验台（LayoutStrategyLab）：同一组内容在 fit-content / fixed / clip-path 三种策略下建组，
 *    开「远处加一块」触发 added 布局：fit-content 组尺寸跟着内容变大；fixed 冻结初始尺寸不重排；
 *    clip-path 组尺寸恒等于裁剪框、远处块被裁掉。
 * 输入：Controls 面板控件（对应本课公开 API：Group / ActiveSelection / LayoutManager 策略 /
 *    subTargetCheck）；画布上可直接点选、shift 点选多选、拖拽、用手柄缩放。
 * 预期结果：两块画布的对象归属与可见区域联动变化，读数（画布顶层、活动对象、红块坐标/缩放、
 *    组尺寸、策略与序列化摘要）可逐项核对。
 * 阅读主线：Lab1 的 applyContainerState() 是状态机（三种切换配方）；applyContainerScale()
 * 演示组变换叠加；Lab2 的 buildStrategyGroup() 把控件映射成 layoutManager/clipPath 配置。
 */
import {
  ActiveSelection,
  Canvas,
  Circle,
  ClipPathLayout,
  FixedLayout,
  Group,
  LayoutManager,
  Rect,
  Triangle,
} from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };

/* -------------------------------------------------- 容器实验台 -------------------------------------------------- */

/** 读者输入：对应 Controls 面板（容器实验台） */
export interface GroupSelectionOptions {
  /** 场景状态：散件（重置）/ 多选 ActiveSelection / 成组 Group */
  sceneMode: 'scatter' | 'multi' | 'group';
  /** 容器 scaleX：作用于当前活动容器（Group 或 ActiveSelection） */
  containerScaleX: number;
  /** 组内命中 subTargetCheck：决定 Group#setCoords 是否级联子对象（配合 interactive 才能点选组内对象） */
  subTargetCheck: boolean;
  /** 省略 canvas.remove：复现官方 demo 最简写法——子对象残留画布列表（残影 / 序列化四写） */
  skipCanvasRemove: boolean;
}

/** 派生读数：由 readout 显示 */
export interface GroupSelectionSnapshot {
  canvasObjectsLabel: string;
  activeLabel: string;
  activeCountLabel: string;
  trackedCoordsLabel: string;
  trackedScaleLabel: string;
  trackedCenterLabel: string;
  containerSizeLabel: string;
  childCoordsLabel: string;
  serializedLabel: string;
}

export interface GroupSelectionInstance {
  update(options: GroupSelectionOptions): void;
  dispose(): void;
}

export function createGroupSelectionLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: GroupSelectionSnapshot) => void,
): GroupSelectionInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#ffffff',
  });

  const initial: GroupSelectionOptions = {
    sceneMode: 'scatter',
    containerScaleX: 1,
    subTargetCheck: false,
    skipCanvasRemove: false,
  };

  /* 场景对象：红块是被跟踪对象（rect），另外两个用于多选 */
  let rect: Rect;
  let circle: Circle;
  let triangle: Triangle;
  /** 已应用的状态：场景模式与 skipCanvasRemove 变化时才重跑状态机 */
  let appliedMode: GroupSelectionOptions['sceneMode'] | null = null;
  let appliedSkip = false;

  /** 重建散件场景：新实例、原始位置，作为可复现的读数基准 */
  function resetScene() {
    fabricCanvas.discardActiveObject();
    fabricCanvas.remove(...fabricCanvas.getObjects());
    rect = new Rect({
      left: INITIAL_SIZE.width * 0.26,
      top: INITIAL_SIZE.height * 0.46,
      width: 120,
      height: 80,
      fill: '#f43f5e',
      stroke: '#0f172a',
      strokeWidth: 2,
    });
    circle = new Circle({
      left: INITIAL_SIZE.width * 0.52,
      top: INITIAL_SIZE.height * 0.42,
      radius: 48,
      fill: '#38bdf8',
      stroke: '#0f172a',
      strokeWidth: 2,
    });
    triangle = new Triangle({
      left: INITIAL_SIZE.width * 0.76,
      top: INITIAL_SIZE.height * 0.58,
      width: 110,
      height: 96,
      fill: '#fbbf24',
      stroke: '#0f172a',
      strokeWidth: 2,
    });
    fabricCanvas.add(rect, circle, triangle);
  }

  /**
   * 归一化到散件：解散现有 ActiveSelection / Group，对象回到画布顶层。
   * 退出容器时组（或选区）的变换被烘焙进对象自身，视觉位置不变。
   */
  function normalizeToLoose() {
    const active = fabricCanvas.getActiveObject();
    if (active instanceof ActiveSelection) {
      active.removeAll();
      fabricCanvas.discardActiveObject();
    }
    const groupOnCanvas = fabricCanvas
      .getObjects()
      .find((object): object is Group => object instanceof Group);
    if (groupOnCanvas) {
      fabricCanvas.discardActiveObject();
      fabricCanvas.remove(groupOnCanvas);
      const items = groupOnCanvas.removeAll();
      // 残留写法（skipCanvasRemove）下子对象本来就在画布列表上，避免重复 add
      const onCanvas = fabricCanvas.getObjects();
      const missing = items.filter((item) => !onCanvas.includes(item));
      fabricCanvas.add(...missing);
    }
  }

  /** 切到多选：ActiveSelection 是运行时容器，对象仍留在画布列表上 */
  function toMultiSelection() {
    normalizeToLoose();
    const selection = new ActiveSelection([rect, circle, triangle], {
      canvas: fabricCanvas,
    });
    fabricCanvas.setActiveObject(selection);
  }

  /**
   * 切到成组：new Group 吸收子对象坐标。skipRemove = true 复现官方 demo 的
   * 最简写法（不做 canvas.remove(...items)），子对象残留画布列表。
   */
  function toGroup(skipRemove: boolean) {
    normalizeToLoose();
    if (!skipRemove) {
      fabricCanvas.remove(rect, circle, triangle);
    }
    const group = new Group([rect, circle, triangle]);
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
  }

  function activeContainer(): Group | undefined {
    const active = fabricCanvas.getActiveObject();
    return active instanceof Group ? active : undefined;
  }

  function emitSnapshot() {
    const active = fabricCanvas.getActiveObject();
    const selection = active instanceof ActiveSelection ? active : undefined;
    const group = active instanceof Group && !selection ? active : undefined;
    const coordSystem = selection
      ? '相对选区中心'
      : rect.group instanceof Group
        ? '组局部坐标'
        : '画布场景坐标';
    const totalScaling = rect.getTotalObjectScaling();

    // 子对象 oCoords 新鲜度：缓存值 vs 现算值（calcOCoords）是否一致
    let childCoordsLabel = '—（无组）';
    if (rect.group instanceof Group) {
      const fresh = rect.calcOCoords().tl;
      const stored = rect.oCoords?.tl;
      const isFresh =
        stored !== undefined &&
        Math.abs(stored.x - fresh.x) < 0.5 &&
        Math.abs(stored.y - fresh.y) < 0.5;
      childCoordsLabel = selection
        ? '选区恒级联（ActiveSelection）'
        : isFresh
          ? '已随组更新'
          : '陈旧（subTargetCheck 未级联）';
    }

    // 序列化证据：残留写法下顶层与组内各出现一份
    const serialized = fabricCanvas.toObject().objects as Array<{
      type: string;
      objects?: unknown[];
    }>;
    const serializedLabel = serialized
      .map((entry) =>
        entry.objects
          ? `${entry.type.toLowerCase()}(${entry.objects.length})`
          : entry.type.toLowerCase(),
      )
      .join(' · ');

    emit({
      canvasObjectsLabel:
        fabricCanvas
          .getObjects()
          .map((object) => object.type.toLowerCase())
          .join(' · ') || '（空）',
      activeLabel: selection
        ? 'activeselection（运行时容器）'
        : group
          ? 'group（画布对象）'
          : 'undefined',
      activeCountLabel: String(fabricCanvas.getActiveObjects().length),
      trackedCoordsLabel: `(${Math.round(rect.left)}, ${Math.round(rect.top)}) ${coordSystem}`,
      trackedScaleLabel: `自身 ${rect.scaleX} / 总缩放 ${totalScaling.x.toFixed(2)}×${totalScaling.y.toFixed(2)}`,
      trackedCenterLabel: `(${Math.round(rect.getCenterPoint().x)}, ${Math.round(rect.getCenterPoint().y)}) 场景坐标`,
      containerSizeLabel:
        activeContainer() !== undefined
          ? `${Math.round((activeContainer() as Group).width)} × ${Math.round((activeContainer() as Group).height)}`
          : '—',
      childCoordsLabel,
      serializedLabel: serializedLabel || '（空）',
    });
  }

  function update(options: GroupSelectionOptions) {
    if (options.sceneMode !== appliedMode) {
      if (options.sceneMode === 'scatter') {
        resetScene();
      } else if (options.sceneMode === 'multi') {
        toMultiSelection();
      } else {
        toGroup(options.skipCanvasRemove);
      }
      appliedMode = options.sceneMode;
      appliedSkip = options.skipCanvasRemove;
    } else if (
      options.sceneMode === 'group' &&
      options.skipCanvasRemove !== appliedSkip
    ) {
      // 干净写法与残留写法互切：重跑成组状态机
      toGroup(options.skipCanvasRemove);
      appliedSkip = options.skipCanvasRemove;
    }

    // 容器变换：作用于当前活动容器；子对象自身属性不被改写
    const container = activeContainer();
    if (container) {
      container.set({ scaleX: options.containerScaleX });
      if (!(container instanceof ActiveSelection)) {
        container.subTargetCheck = options.subTargetCheck;
      }
      container.setCoords();
    }
    fabricCanvas.requestRenderAll();
    emitSnapshot();
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

  // 画布交互（点选 / shift 多选 / 拖拽 / 缩放）实时反映到读数
  const onLiveChange = () => emitSnapshot();
  fabricCanvas.on('selection:created', onLiveChange);
  fabricCanvas.on('selection:updated', onLiveChange);
  fabricCanvas.on('selection:cleared', onLiveChange);
  fabricCanvas.on('object:modified', onLiveChange);
  fabricCanvas.on('object:moving', onLiveChange);
  fabricCanvas.on('object:scaling', onLiveChange);
  fabricCanvas.on('object:layout:after', onLiveChange);

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  update(initial);

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}

/* -------------------------------------------------- 布局实验台 -------------------------------------------------- */

/** 读者输入：对应 Controls 面板（布局实验台） */
export interface LayoutStrategyOptions {
  /** 布局策略：fit-content（默认）/ fixed（冻结初始尺寸）/ clip-path（尺寸 = 裁剪框） */
  strategy: 'fit-content' | 'fixed' | 'clip-path';
  /** 远处加一块：group.add 远离内容的矩形，触发 added 布局（三种策略反应不同） */
  distantBlock: boolean;
}

/** 派生读数：由 readout 显示 */
export interface LayoutStrategySnapshot {
  strategyLabel: string;
  groupSizeLabel: string;
  groupPosLabel: string;
  objectCountLabel: string;
  clipWindowLabel: string;
  serializedLabel: string;
}

export interface LayoutStrategyInstance {
  update(options: LayoutStrategyOptions): void;
  dispose(): void;
}

/** 固定尺寸窗口：fixed 策略初始化时采用的组尺寸（大于内容包围盒，便于观察"冻结"） */
const FIXED_SIZE = { width: 320, height: 240 };
/** 裁剪窗口：clip-path 策略下组尺寸恒等于它（组局部坐标，锚定内容中心） */
const CLIP_SIZE = { width: 200, height: 140 };

export function createLayoutStrategyLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: LayoutStrategySnapshot) => void,
): LayoutStrategyInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#ffffff',
  });

  const initial: LayoutStrategyOptions = {
    strategy: 'fit-content',
    distantBlock: false,
  };

  let group: Group;
  let distant: Rect;
  let appliedStrategy: LayoutStrategyOptions['strategy'] | null = null;
  let distantApplied = false;

  function baseObjects() {
    return [
      new Rect({
        left: INITIAL_SIZE.width * 0.3,
        top: INITIAL_SIZE.height * 0.45,
        width: 140,
        height: 90,
        fill: '#38bdf8',
        stroke: '#0f172a',
        strokeWidth: 2,
      }),
      new Circle({
        left: INITIAL_SIZE.width * 0.56,
        top: INITIAL_SIZE.height * 0.5,
        radius: 40,
        fill: '#f43f5e',
        stroke: '#0f172a',
        strokeWidth: 2,
      }),
    ];
  }

  /** 把策略控件映射成建组配置：fixed 需显式尺寸，clip-path 需组 clipPath */
  function buildStrategyGroup(
    strategy: LayoutStrategyOptions['strategy'],
  ): Group {
    const items = baseObjects();
    if (strategy === 'fixed') {
      return new Group(items, {
        ...FIXED_SIZE,
        layoutManager: new LayoutManager(new FixedLayout()),
      });
    }
    if (strategy === 'clip-path') {
      return new Group(items, {
        layoutManager: new LayoutManager(new ClipPathLayout()),
        clipPath: new Rect({
          left: 0,
          top: 0,
          width: CLIP_SIZE.width,
          height: CLIP_SIZE.height,
          strokeWidth: 0,
        }),
      });
    }
    return new Group(items);
  }

  function rebuild(strategy: LayoutStrategyOptions['strategy']) {
    fabricCanvas.discardActiveObject();
    fabricCanvas.remove(...fabricCanvas.getObjects());
    distant = new Rect({
      left: INITIAL_SIZE.width * 0.88,
      top: INITIAL_SIZE.height * 0.18,
      width: 80,
      height: 60,
      fill: '#a78bfa',
      stroke: '#0f172a',
      strokeWidth: 2,
    });
    group = buildStrategyGroup(strategy);
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
  }

  function emitSnapshot() {
    const strategyType = group.layoutManager.strategy.constructor.type;
    const serialized = group.toObject();
    emit({
      strategyLabel: `${strategyType}${
        strategyType === 'fit-content' ? '（默认）' : ''
      }`,
      groupSizeLabel: `${Math.round(group.width)} × ${Math.round(group.height)}`,
      groupPosLabel: `(${Math.round(group.left)}, ${Math.round(group.top)})`,
      objectCountLabel: String(group.getObjects().length),
      clipWindowLabel:
        group.clipPath instanceof Rect
          ? `${Math.round(group.clipPath.width)} × ${Math.round(group.clipPath.height)}（组局部，锚定内容中心）`
          : '—',
      serializedLabel: serialized.layoutManager
        ? JSON.stringify(serialized.layoutManager)
        : '（未序列化）',
    });
  }

  function update(options: LayoutStrategyOptions) {
    if (options.strategy !== appliedStrategy) {
      rebuild(options.strategy);
      appliedStrategy = options.strategy;
      distantApplied = false;
    }
    if (options.distantBlock !== distantApplied) {
      // added / removed 布局：fit-content 重排；fixed / clip-path 不重排
      if (options.distantBlock) {
        group.add(distant);
      } else {
        group.remove(distant);
      }
      distantApplied = options.distantBlock;
    }
    fabricCanvas.requestRenderAll();
    emitSnapshot();
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

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  update(initial);

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}
