/**
 * 范例介绍：对齐参考线实验台。没有导入 'fabric/extensions'——该入口硬依赖
 * westures，而 7.4.0 的 fabric 未声明这个依赖、工作区也未安装，导入即失败
 * （见正文「定位与导入」）。实例按官方 AligningGuidelines 扩展的源码思路，
 * 用公开 API 手写同机制的最小对齐线：
 * 1. 吸附：object:moving 时取拖动对象与其他对象各自的 4 角 + 中心（getCoords +
 *    getCenterPoint），逐轴找最近距离；距离 ≤ margin（默认 4，与扩展一致，按
 *    zoom 折算）就把对象平移到完全对齐——距离归零，参考线连接两个对齐点；
 * 2. 绘制：before:render 清空 contextTop、after:render 重画——参考线只在
 *    交互层，不进主画布、不进 toDataURL 导出；
 * 3. 清理：mouse:up 清空参考线（对应扩展的 mouseUp 钩子）；
 * 4. 生命周期：「启用对齐」开关对应 new AligningGuidelines(canvas) 的挂接与
 *    dispose() 的卸载。简化点：每轴只取最近一对点（扩展会对全部等距点画线），
 *    候选集不递归进 Group 子对象（扩展会递归）。
 * 输入：启用对齐（布尔）、吸附距离 margin（2–12，默认 4 = 扩展默认值）。
 * 预期结果：拖动蓝色矩形靠近灰色对象的边或中心时出现红色参考线并吸附，
 * 读数同步最近吸附的轴、点对与吸附前距离；关闭开关后自由拖动。
 * 阅读主线：snapAxis() 的吸附算法 → onAfterRender() 的 contextTop 绘制 →
 * attach()/detach() 的挂接卸载 → update() 的开关落点。
 */
import {
  Canvas,
  Circle,
  Point,
  Rect,
  type BasicTransformEvent,
  type FabricObject,
} from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 读者输入：对应 Controls 面板 */
export interface ExtensionsOptions {
  /** 对齐参考线开关：开 = 挂接事件（new AligningGuidelines），关 = 卸载（dispose） */
  snapEnabled: boolean;
  /** 吸附触发距离：AligningGuidelines 的 margin，官方默认 4 */
  snapMargin: number;
}

/** 派生读数：由 readout 显示 */
export interface ExtensionsSnapshot {
  /** 对齐状态：未启用 / 已启用（margin N） */
  alignStatus: string;
  /** 最近一次吸附：轴 + 点对 + 吸附前距离 */
  lastSnap: string;
  /** mouse:up 时累计的吸附次数 */
  snapCount: number;
  /** 当前画出的参考线数 */
  guideCount: number;
}

export interface ExtensionsInstance {
  update(options: ExtensionsOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
/** 每个对象参与对齐的点：4 角 + 中心（getCoords 顺序 tl/tr/br/bl） */
const POINT_NAMES = ['tl', 'tr', 'br', 'bl', 'center'] as const;

interface NamedPoint {
  name: string;
  point: Point;
}

/** 一条参考线：a、b 是对齐后同轴的两点，线段自然垂直 / 水平 */
interface Guide {
  a: Point;
  b: Point;
}

export function createAligningGuidelineLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: ExtensionsSnapshot) => void,
): ExtensionsInstance {
  const stage = canvasEl.parentElement ?? canvasEl;
  const canvas = new Canvas(canvasEl, { ...INITIAL_SIZE });

  // ---- 场景：三个灰色参考对象 + 一个可拖的蓝色矩形
  const refA = new Rect({ width: 150, height: 110, fill: '#cbd5e1' });
  const refB = new Circle({ radius: 54, fill: '#94a3b8' });
  const refC = new Rect({ width: 104, height: 150, fill: '#cbd5e1' });
  const draggable = new Rect({
    width: 130,
    height: 96,
    fill: '#4f7cff',
    borderColor: '#1e3a8a',
  });
  canvas.add(refA, refB, refC, draggable);

  let current: ExtensionsOptions = { snapEnabled: true, snapMargin: 4 };

  let guides: Guide[] = [];
  let attached = false;
  let dragging = false;
  /** 本次拖拽中最近一次吸附（吸附前距离、轴、点对），mouse:up 时落账 */
  let pendingSnap: string | null = null;

  let snapshot: ExtensionsSnapshot = {
    alignStatus: '—',
    lastSnap: '—',
    snapCount: 0,
    guideCount: 0,
  };

  /** 对象的 5 个对齐点：4 角 + 中心，带名字便于读数定位 */
  function alignPoints(object: FabricObject): NamedPoint[] {
    const coords = object.getCoords();
    return [
      { name: POINT_NAMES[0], point: coords[0] },
      { name: POINT_NAMES[1], point: coords[1] },
      { name: POINT_NAMES[2], point: coords[2] },
      { name: POINT_NAMES[3], point: coords[3] },
      { name: POINT_NAMES[4], point: object.getCenterPoint() },
    ];
  }

  /**
   * 单轴吸附：找拖动对象与候选点之间 ≤ margin 的最近点对，把对象平移到
   * 完全对齐（距离归零）。平移量与 originX/originY 无关，对旋转对象同样成立。
   */
  function snapAxis(
    target: FabricObject,
    candidates: NamedPoint[],
    axis: 'x' | 'y',
  ) {
    const margin = current.snapMargin / canvas.getZoom();
    let best: {
      d: number;
      from: NamedPoint;
      to: NamedPoint;
    } | null = null;

    for (const own of alignPoints(target)) {
      for (const other of candidates) {
        const d = Math.abs(own.point[axis] - other.point[axis]);
        if (d <= margin && (!best || d < best.d)) {
          best = { d, from: other, to: own };
        }
      }
    }
    if (!best) {
      return;
    }

    // 平移到完全对齐：吸附后两个点在该轴上重合
    const delta = best.from.point[axis] - best.to.point[axis];
    target.set({
      left: target.left + (axis === 'x' ? delta : 0),
      top: target.top + (axis === 'y' ? delta : 0),
    });
    target.setCoords();

    // 参考线连接对齐点与吸附后的自身点：x 轴对齐画竖线，y 轴对齐画横线
    const snapped = best.to.point.clone();
    snapped[axis] += delta;
    guides.push({ a: best.from.point, b: snapped });
    pendingSnap = `${axis} 轴 ${best.to.name} ↔ ${best.from.name}，吸附前 ${best.d.toFixed(1)}px`;
  }

  // 事件载荷带 target（fireEvent 注入）；类型写法与官方扩展的 TransformEvent 一致
  type MovingEvent = BasicTransformEvent & { target: FabricObject };

  function onMoving(e: MovingEvent) {
    const target = e.target;
    target.setCoords();
    guides = [];
    pendingSnap = null;

    // 候选集：画布上除拖动对象外的可见对象（扩展版会递归 Group 子对象）
    const candidates = canvas
      .getObjects()
      .filter((object) => object !== target && object.visible)
      .flatMap((object) => alignPoints(object));

    snapAxis(target, candidates, 'x');
    snapAxis(target, candidates, 'y');

    // 吸附即时反映到读数；次数在 mouse:up 落账（一次拖拽计一次）
    if (pendingSnap) {
      snapshot.lastSnap = pendingSnap;
    }
    snapshot.guideCount = guides.length;
    emit({ ...snapshot });
  }

  function drawXMark(
    ctx: CanvasRenderingContext2D,
    point: Point,
    zoom: number,
  ) {
    const size = 2.4 / zoom;
    ctx.beginPath();
    ctx.moveTo(point.x - size, point.y - size);
    ctx.lineTo(point.x + size, point.y + size);
    ctx.moveTo(point.x + size, point.y - size);
    ctx.lineTo(point.x - size, point.y + size);
    ctx.stroke();
  }

  function onBeforeRender() {
    // 交互层在每帧渲染前清空——参考线永不残留到主画布
    canvas.clearContext(canvas.contextTop);
  }

  function onAfterRender() {
    if (!attached || guides.length === 0) {
      return;
    }
    const ctx = canvas.getTopContext();
    const zoom = canvas.getZoom();
    ctx.save();
    ctx.transform(...canvas.viewportTransform);
    ctx.lineWidth = 1 / zoom;
    ctx.strokeStyle = 'rgba(239,68,68,0.9)';
    for (const guide of guides) {
      ctx.beginPath();
      ctx.moveTo(guide.a.x, guide.a.y);
      ctx.lineTo(guide.b.x, guide.b.y);
      ctx.stroke();
      drawXMark(ctx, guide.a, zoom);
      drawXMark(ctx, guide.b, zoom);
    }
    ctx.restore();
  }

  function onMouseUp() {
    if (!dragging) {
      return;
    }
    dragging = false;
    if (pendingSnap) {
      snapshot.lastSnap = pendingSnap;
      snapshot.snapCount += 1;
    }
    guides = [];
    snapshot.guideCount = 0;
    canvas.requestRenderAll();
    emit({ ...snapshot });
  }

  // mouse:down 只是标记拖拽开始，让 mouse:up 的吸附落账只对拖拽生效
  function onMouseDown() {
    dragging = true;
  }

  // ---- 挂接 / 卸载：对应 new AligningGuidelines(canvas) 与 dispose()
  function attach() {
    if (attached) {
      return;
    }
    attached = true;
    canvas.on('mouse:down', onMouseDown);
    canvas.on('object:moving', onMoving);
    canvas.on('before:render', onBeforeRender);
    canvas.on('after:render', onAfterRender);
    canvas.on('mouse:up', onMouseUp);
  }

  function detach() {
    if (!attached) {
      return;
    }
    attached = false;
    canvas.off('mouse:down', onMouseDown);
    canvas.off('object:moving', onMoving);
    canvas.off('before:render', onBeforeRender);
    canvas.off('after:render', onAfterRender);
    canvas.off('mouse:up', onMouseUp);
    // renderAll 只在 contextTopDirty 时才清交互层，卸载时必须显式清掉残留参考线
    canvas.clearContext(canvas.contextTop);
    guides = [];
    snapshot.guideCount = 0;
    canvas.requestRenderAll();
  }

  function update(options: ExtensionsOptions) {
    current = { ...options };
    snapshot.alignStatus = current.snapEnabled
      ? `已启用（margin ${current.snapMargin}）`
      : '未启用';
    if (current.snapEnabled) {
      attach();
    } else {
      detach();
    }
    emit({ ...snapshot });
  }

  // ---- 布局与尺寸：跟随舞台自适应
  function applyLayout(width: number, height: number) {
    refA.set({ left: width * 0.07, top: height * 0.12 });
    refB.set({ left: width * 0.66, top: height * 0.16 });
    refC.set({ left: width * 0.44, top: height * 0.48 });
    draggable.set({ left: width * 0.12, top: height * 0.55 });
  }

  function syncSize() {
    if (!stage.isConnected) {
      return;
    }
    const width = Math.max(240, Math.floor(stage.clientWidth) - 14);
    const height = Math.max(200, Math.floor(stage.clientHeight) - 14);
    applyLayout(width, height);
    canvas.wrapperEl.style.margin = '7px';
    // setDimensions 自动 requestRenderAll；位置改动由它一并带回画面
    canvas.setDimensions({ width, height });
  }

  applyLayout(INITIAL_SIZE.width, INITIAL_SIZE.height);
  const resizeObserver = createResizeObserver(canvas.wrapperEl, () => syncSize());
  syncSize();
  update(current);

  return {
    update,
    dispose() {
      detach();
      resizeObserver.disconnect();
      void canvas.dispose();
    },
  };
}
