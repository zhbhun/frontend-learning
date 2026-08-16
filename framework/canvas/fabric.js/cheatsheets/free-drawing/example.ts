/**
 * 范例介绍：笔刷实验台——四种内置笔刷切换 + 颜色 / 宽度 / 抽稀三个公开参数 +
 * isDrawingMode 开关；readout 呈现最近一次 path:created 的结果对象快照——
 * 1. 挂载：canvas.isDrawingMode = true 只把鼠标事件转交笔刷，真正干活的是
 *    canvas.freeDrawingBrush（默认 undefined，不挂就画不出东西）；换笔刷 = 换挂载实例；
 * 2. 产出对象：PencilBrush / PatternBrush 产出 Path（fill: null、stroke = color、
 *    strokeWidth = width，PatternBrush 的 stroke 是 Pattern 实例）；
 *    CircleBrush / SprayBrush 产出 Group（分别由随机圆点 Circle / 小方块 Rect 组成），
 *    event.path 字段就是加入画布的那个对象；
 * 3. 命令数证据：PencilBrush 松手前先按 decimate 抽稀（距离按 zoom 折算），
 *    再把点转成 M/Q/L 平滑路径；按住 shift（straightLineKey，默认 'shiftKey'）
 *    拖出直线，命令数缩到 2；
 * 4. 空路径保护：按下后不动、没有 move 就松手，不产生对象、不触发 path:created；
 * 5. 编辑态切换：isDrawingMode 关掉后已绘制对象恢复点选 / 拖动（对象默认 selectable），
 *    重新打开时按下会丢弃当前选中——绘制态与编辑态互斥。
 * 输入：笔刷选择、绘制模式开关、颜色、宽度、抽稀距离。
 * 预期结果：每次松手 readout 刷新最近一次 path:created 的类型 / 命令数 / 属性快照；
 * 切到 Group 系笔刷后 path 命令数显示 —、子对象数出现数值。
 * 阅读主线：update() 的挂载与参数落点 → describeCreated() 的结果对象分析。
 */
import {
  Canvas,
  CircleBrush,
  Group,
  // Pattern 与 Path 作为值导入：readout 里用 instanceof 判断结果对象类型
  Pattern,
  Path,
  PatternBrush,
  PencilBrush,
  SprayBrush,
  type BaseBrush,
  type FabricObject,
} from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 读者输入：对应 Controls 面板 */
export interface FreeDrawingOptions {
  /** 挂到 freeDrawingBrush 上的笔刷类 */
  brush: 'PencilBrush' | 'CircleBrush' | 'SprayBrush' | 'PatternBrush';
  /** canvas.isDrawingMode：true 绘制、false 编辑 */
  drawingMode: boolean;
  /** brush.color */
  color: string;
  /** brush.width */
  width: number;
  /** PencilBrush.decimate：0 关闭抽稀（CircleBrush / SprayBrush 无此属性） */
  decimate: number;
}

/** 派生读数：由 readout 显示 */
export interface FreeDrawingSnapshot {
  /** 绘制模式状态 */
  mode: string;
  /** 当前挂载的笔刷类名 */
  brushName: string;
  /** 最近一次结果事件，或提示尚未绘制 */
  lastEvent: string;
  /** event.path 的对象类型（Path / Group） */
  objectType: string;
  /** Path 的 path 命令数；Group 系为 — */
  pathCommands: number | string;
  /** Group 的子对象数；Path 为 — */
  groupSize: number | string;
  /** Path 的 stroke（颜色或 Pattern）；Group 系为 — */
  stroke: string;
  /** Path 的 strokeWidth */
  strokeWidth: number | string;
  /** Path 的 pathOffset（包围盒中心，路径数据保持场景坐标） */
  pathOffset: string;
  /** 画布对象总数 */
  objectCount: number;
}

export interface FreeDrawingInstance {
  update(options: FreeDrawingOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };

const round = (value: number) => Math.round(value * 10) / 10;

export function createFreeDrawingLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: FreeDrawingSnapshot) => void,
): FreeDrawingInstance {
  const stage = canvasEl.parentElement ?? canvasEl;
  // 自由绘制属于交互层：用 Canvas（SelectableCanvas 一系），StaticCanvas 没有 isDrawingMode
  const canvas = new Canvas(canvasEl, { ...INITIAL_SIZE });

  // 四种内置笔刷各建一个实例常驻：切笔刷 = 换挂载引用，参数写在实例上
  const brushes: Record<FreeDrawingOptions['brush'], BaseBrush> = {
    PencilBrush: new PencilBrush(canvas),
    CircleBrush: new CircleBrush(canvas),
    SprayBrush: new SprayBrush(canvas),
    PatternBrush: new PatternBrush(canvas),
  };

  let current: FreeDrawingOptions = {
    brush: 'PencilBrush',
    drawingMode: true,
    color: '#2563eb',
    width: 8,
    decimate: 0.4,
  };

  let snapshot: FreeDrawingSnapshot = {
    mode: '开（绘制中）',
    brushName: 'PencilBrush',
    lastEvent: '尚未绘制',
    objectType: '—',
    pathCommands: '—',
    groupSize: '—',
    stroke: '—',
    strokeWidth: '—',
    pathOffset: '—',
    objectCount: 0,
  };

  // ---- path:created：四种笔刷统一在这里交出结果对象（event.path）
  function describeCreated(obj: FabricObject) {
    snapshot.lastEvent = 'path:created';
    snapshot.objectType = (obj.constructor as { type?: string }).type ?? '—';
    if (obj instanceof Group) {
      // CircleBrush / SprayBrush：结果是一群 Circle / Rect 组成的 Group
      snapshot.pathCommands = '—';
      snapshot.groupSize = obj.size();
      snapshot.stroke = '—（填充在子对象上）';
      snapshot.strokeWidth = '—';
      snapshot.pathOffset = '—';
    } else if (obj instanceof Path) {
      // PencilBrush / PatternBrush：结果是一条描边轮廓 Path
      snapshot.pathCommands = obj.path.length;
      snapshot.groupSize = '—';
      snapshot.stroke =
        obj.stroke instanceof Pattern ? 'Pattern（图案）' : String(obj.stroke);
      snapshot.strokeWidth = obj.strokeWidth;
      snapshot.pathOffset = `(${round(obj.pathOffset.x)}, ${round(obj.pathOffset.y)})`;
    }
    snapshot.objectCount = canvas.size();
    emit({ ...snapshot });
  }

  canvas.on('path:created', (opt) => describeCreated(opt.path));
  canvas.on('object:removed', () => {
    snapshot.objectCount = canvas.size();
    emit({ ...snapshot });
  });

  function update(options: FreeDrawingOptions) {
    current = { ...options };
    const brush = brushes[current.brush];
    // BaseBrush 公共配置：直接写在笔刷实例上，下一次落笔即生效
    brush.color = current.color;
    brush.width = current.width;
    // decimate 是 PencilBrush 系的抽稀距离（PatternBrush 继承自 PencilBrush）
    if (brush instanceof PencilBrush) {
      brush.decimate = current.decimate;
    }
    // 换笔刷 = 换挂载实例；isDrawingMode 决定鼠标事件是否转交笔刷
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = current.drawingMode;
    snapshot.mode = current.drawingMode ? '开（绘制中）' : '关（可编辑）';
    snapshot.brushName = current.brush;
    snapshot.objectCount = canvas.size();
    emit({ ...snapshot });
  }

  // ---- 布局与尺寸：跟随舞台自适应
  function syncSize() {
    if (!stage.isConnected) {
      return;
    }
    const width = Math.max(240, Math.floor(stage.clientWidth) - 14);
    const height = Math.max(200, Math.floor(stage.clientHeight) - 14);
    canvas.wrapperEl.style.margin = '7px';
    canvas.setDimensions({ width, height });
  }

  const resizeObserver = createResizeObserver(canvas.wrapperEl, () => syncSize());
  syncSize();
  update(current);

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      void canvas.dispose();
    },
  };
}
