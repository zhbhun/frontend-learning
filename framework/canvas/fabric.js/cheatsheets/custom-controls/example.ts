/**
 * 范例介绍：自定义控件试验台（参考官方 Custom controls / Polygon Controls demo 形态）——
 * 矩形装上「删除 / 复制」点击型按钮控件与圆环渲染的角落控件，多边形可进入
 * createPolyControls 的顶点编辑模式；readout 同步两份控件集摘要、最近动作与对象数——
 * 1. controls 表：v6+ 每对象独立实例，controlsUtils.createObjectDefaultControls()
 *    克隆默认集后增删键、逐项换 render；
 * 2. 生命周期：hover → cursorStyleHandler；down → mouseDownHandler；move → actionHandler；
 *    up → mouseUpHandler——按钮控件不提供 actionHandler，动作在 up 时一次触发；
 * 3. 渲染约定：render(ctx, left, top, styleOverride, fabricObject) 的 ctx 未平移未旋转，
 *    先 translate(left, top)，要随对象旋转再 rotate(getTotalAngle())；
 * 4. 顶点编辑：createPolyControls(poly) 逐顶点建控件（actionName 'modifyPoly'），
 *    拖动顶点即改 points；换控件集后 setCoords 重算 oCoords，新键才可交互；
 * 5. clone() 不携带控件（controls 不参与序列化）——复制出的对象要重新安装控件集。
 * 输入：删除按钮、复制按钮、圆环角落渲染、顶点编辑控件、锁定旋转。
 * 预期结果：先点选对象控件才可交互；点按钮后最近动作与对象数变化；
 * 开「顶点编辑控件」后多边形控件集从默认 9 键变为 p0…p4。
 * 阅读主线：renderDeleteIcon / renderCloneIcon / renderRingControl →
 * applyRectControls() 的克隆改造 → update() 的开关落点。
 */
import {
  Canvas,
  Control,
  Polygon,
  Rect,
  controlsUtils,
  util,
  type ControlRenderingStyleOverride,
  type InteractiveFabricObject,
} from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 读者输入：对应 Controls 面板 */
export interface CustomControlsOptions {
  /** tr 角外的删除按钮控件（mouseUpHandler 点击型） */
  showDeleteControl: boolean;
  /** br 角外的复制按钮控件（mouseUpHandler 点击型） */
  showCloneControl: boolean;
  /** 把四个角落控件的 render 换成自定义圆环（对比默认方块渲染） */
  ringCornerRender: boolean;
  /** 多边形进入 createPolyControls 顶点编辑模式 */
  polyEditMode: boolean;
  /** rect.lockRotation：内置 mtr 的 rotationStyleHandler 返回 not-allowed，拖动无效 */
  lockRotation: boolean;
}

/** 派生读数：由 readout 显示 */
export interface CustomControlsSnapshot {
  /** 矩形当前控件集摘要（默认 N + 自定义键） */
  rectControls: string;
  /** 多边形当前控件集摘要 */
  polyControls: string;
  /** 最近一次动作：action@控件键 */
  lastAction: string;
  /** 画布对象数 */
  objectCount: number;
}

export interface CustomControlsInstance {
  update(options: CustomControlsOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
/** 默认控件集的 9 个键：摘要里区分默认键与自定义键 */
const DEFAULT_CONTROL_KEYS = [
  'ml',
  'mr',
  'mt',
  'mb',
  'tl',
  'tr',
  'bl',
  'br',
  'mtr',
];
const CORNER_KEYS = ['tl', 'tr', 'bl', 'br'] as const;

export function createCustomControls(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: CustomControlsSnapshot) => void,
): CustomControlsInstance {
  const stage = canvasEl.parentElement ?? canvasEl;
  const canvas = new Canvas(canvasEl, { ...INITIAL_SIZE });

  // ---- 场景：矩形（按钮控件 + 自定义角落渲染）与多边形（顶点编辑）
  const rect = new Rect({
    width: 176,
    height: 128,
    fill: '#93c5fd',
  });
  const poly = new Polygon(
    [
      { x: 62, y: 0 },
      { x: 124, y: 45 },
      { x: 100, y: 122 },
      { x: 24, y: 122 },
      { x: 0, y: 45 },
    ],
    // cornerStyle 是对象级样式（4.3 的配置面）：作用于所有用默认 render 的控件
    { fill: '#86efac', cornerStyle: 'circle' },
  );
  canvas.add(rect, poly);

  let current: CustomControlsOptions = {
    showDeleteControl: true,
    showCloneControl: true,
    ringCornerRender: true,
    polyEditMode: false,
    lockRotation: false,
  };

  let snapshot: CustomControlsSnapshot = {
    rectControls: '—',
    polyControls: '—',
    lastAction: '等待交互…',
    objectCount: 0,
  };

  const describeControls = (obj: { controls: Record<string, Control> }) => {
    const keys = Object.keys(obj.controls);
    const custom = keys.filter((key) => !DEFAULT_CONTROL_KEYS.includes(key));
    const base = `默认${keys.length - custom.length}`;
    return custom.length > 0 ? `${base} + ${custom.join(',')}` : base;
  };

  const record = (action: string, corner: string) => {
    snapshot.lastAction = `${action}@${corner}`;
    emit({ ...snapshot });
  };

  const syncCount = () => {
    snapshot.objectCount = canvas.getObjects().length;
    emit({ ...snapshot });
  };

  // ---- 订阅：变换结束时 object:modified 的 action 来自控件的 actionName
  canvas.on('object:modified', (opt) => {
    record(opt.action ?? '—', opt.transform?.corner || '—');
  });
  canvas.on('object:added', syncCount);
  canvas.on('object:removed', syncCount);

  // ---- 自定义渲染：ctx 未平移未旋转，先平移到 (left, top)；
  // 要随对象旋转再补 rotate（getTotalAngle 已含分组与画布旋转）
  function renderDeleteIcon(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: ControlRenderingStyleOverride | undefined,
    fabricObject: InteractiveFabricObject,
  ) {
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(util.degreesToRadians(fabricObject.getTotalAngle()));
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, 4);
    ctx.moveTo(4, -4);
    ctx.lineTo(-4, 4);
    ctx.stroke();
    ctx.restore();
  }

  function renderCloneIcon(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: ControlRenderingStyleOverride | undefined,
    fabricObject: InteractiveFabricObject,
  ) {
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(util.degreesToRadians(fabricObject.getTotalAngle()));
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#059669';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 4);
    ctx.stroke();
    ctx.restore();
  }

  function renderRingControl(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: ControlRenderingStyleOverride | undefined,
    fabricObject: InteractiveFabricObject,
  ) {
    // 尺寸回退链与内置渲染一致：styleOverride.cornerSize → 对象 cornerSize
    const size = styleOverride?.cornerSize ?? fabricObject.cornerSize;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(util.degreesToRadians(fabricObject.getTotalAngle()));
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ---- 点击型按钮控件：不提供 actionHandler（拖动无动作），动作放 mouseUpHandler；
  // offsetX/offsetY 把按钮放到角落外，不与默认控件重叠
  function makeDeleteControl(): Control {
    return new Control({
      x: 0.5,
      y: -0.5,
      offsetX: 20,
      offsetY: -20,
      cursorStyle: 'pointer',
      actionName: 'delete',
      mouseUpHandler(eventData, transform) {
        canvas.remove(transform.target);
        record('delete', 'delete');
        return true;
      },
      render: renderDeleteIcon,
    });
  }

  function makeCloneControl(): Control {
    return new Control({
      x: 0.5,
      y: 0.5,
      offsetX: 20,
      offsetY: 20,
      cursorStyle: 'pointer',
      actionName: 'clone',
      mouseUpHandler(eventData, transform) {
        const target = transform.target as Rect;
        void target.clone().then((copy) => {
          // clone 走 toObject → fromObject：controls 不参与序列化，克隆体拿到默认集，
          // 要重新安装（applyRectControls 内部读取当前开关）
          copy.set({ left: target.left + 24, top: target.top + 24 });
          applyRectControls(copy);
          canvas.add(copy);
        });
        record('clone', 'clone');
        return true;
      },
      render: renderCloneIcon,
    });
  }

  // ---- 克隆改造模式：每次从工厂拿全新默认集，增删键、换钩子后整表替换
  function applyRectControls(target: Rect) {
    const controls = controlsUtils.createObjectDefaultControls();
    if (current.ringCornerRender) {
      for (const key of CORNER_KEYS) {
        controls[key].render = renderRingControl;
      }
    }
    if (current.showDeleteControl) {
      controls.delete = makeDeleteControl();
    }
    if (current.showCloneControl) {
      controls.clone = makeCloneControl();
    }
    target.controls = controls;
    target.lockRotation = current.lockRotation;
    if (target.canvas) {
      // 已在画布上：重算 oCoords，新增键才可交互、可渲染
      target.setCoords();
    }
  }

  function applyPolyControls() {
    poly.controls = current.polyEditMode
      ? controlsUtils.createPolyControls(poly)
      : controlsUtils.createObjectDefaultControls();
    poly.setCoords();
  }

  function update(options: CustomControlsOptions) {
    current = { ...options };
    applyRectControls(rect);
    applyPolyControls();
    snapshot.rectControls = describeControls(rect);
    snapshot.polyControls = describeControls(poly);
    syncCount();
    canvas.requestRenderAll();
    emit({ ...snapshot });
  }

  // ---- 布局与尺寸：跟随舞台自适应
  function applyLayout(width: number, height: number) {
    rect.set({ left: width * 0.08, top: height * 0.2 });
    poly.set({ left: width * 0.58, top: height * 0.14 });
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
  emit({ ...snapshot });

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      void canvas.dispose();
    },
  };
}
