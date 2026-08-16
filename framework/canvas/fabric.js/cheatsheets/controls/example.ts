/**
 * 范例介绍：控件配置实验台——矩形应用 Controls 面板的手柄 / 边框样式与行为配置，
 * 圆保持 fabric 默认样式作对照；读者在画布上真实拖角、拖中点、拖旋转手柄验证：
 * 1. 角落样式：cornerStyle（rect / circle）、cornerSize、cornerColor、cornerStrokeColor、
 *    transparentCorners（true 镂空描边、false 实心填充）、padding 外扩边框与手柄；
 * 2. 边框：borderScaleFactor 同时加粗边框与 mtr 连接线；
 * 3. 可见性：hasControls / hasBorders 是整组开关，与逐手柄 isControlVisible 相互独立
 *    （关掉「显示手柄」后 readout 的「可见手柄」清单不变——两层开关互不越界）；
 * 4. 行为：centeredScaling 让拖角绕中心两翼同缩，snapAngle 让 mtr 旋转按步吸附；
 *    修饰键不在面板里、按住即生效——Shift 翻转等比或切换倾斜（uniScaleKey /
 *    altActionKey）、Alt 临时居中（centeredKey），三者是画布级默认值。
 * 输入：上述配置项，只作用于矩形；圆为 fabric 默认样式的对照对象。
 * 预期结果：readout 的「当前手柄 / 最近动作 / 矩形变换值」与拖拽过程逐项对应正文断言。
 * 阅读主线：update() 的配置落点（改 cornerSize / padding 后 setCoords 重算命中区）→
 * wireReadout() 的手柄跟踪（悬停 getActiveControl + 变换族 transform.corner）。
 */
import { Canvas, Circle, Rect } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 读者输入：对应 Controls 面板（画布级键位不进面板，按住修饰键即生效） */
export interface ControlsLabOptions {
  /** cornerStyle：手柄形状（官方已标 deprecated，rect / circle 仍可用） */
  cornerStyle: 'rect' | 'circle';
  /** cornerSize：手柄边长（px） */
  cornerSize: number;
  /** cornerColor：transparentCorners 为 true 时作描边色，false 时作填充色 */
  cornerColor: string;
  /** cornerStrokeColor：仅 transparentCorners 为 false 时生效的描边色 */
  cornerStrokeColor: string;
  /** transparentCorners：true 镂空、false 实心 */
  transparentCorners: boolean;
  /** padding：边框 / 手柄 / 命中区整体外扩的距离 */
  padding: number;
  /** borderScaleFactor：边框与 mtr 连接线的线宽倍数 */
  borderScaleFactor: number;
  /** hasControls：整组显示 / 隐藏手柄 */
  hasControls: boolean;
  /** hasBorders：整组显示 / 隐藏边框 */
  hasBorders: boolean;
  /** centeredScaling：拖角是否绕中心两翼同缩 */
  centeredScaling: boolean;
  /** snapAngle：mtr 旋转吸附步进（0 不吸附） */
  snapAngle: number;
}

/** 派生读数：由 readout 显示 */
export interface ControlsLabSnapshot {
  /** 悬停或拖拽中的手柄键（tl/tr/br/bl/ml/mt/mr/mb/mtr） */
  corner: string;
  /** 最近一次 object:modified 的动作名 */
  action: string;
  /** 矩形当前变换值（角度 · 缩放 · 倾斜） */
  transform: string;
  /** 当前生效的手柄样式快照 */
  style: string;
  /** 矩形上逐手柄 isControlVisible 为 true 的键清单 */
  visible: string;
}

export interface ControlsLabInstance {
  update(options: ControlsLabOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
/** 默认控件集的九个键（v6+ 每实例一份） */
const CONTROL_KEYS = [
  'tl',
  'tr',
  'br',
  'bl',
  'ml',
  'mt',
  'mr',
  'mb',
  'mtr',
];

export function createControlsLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: ControlsLabSnapshot) => void,
): ControlsLabInstance {
  const stage = canvasEl.parentElement ?? canvasEl;
  const fabricCanvas = new Canvas(canvasEl, { ...INITIAL_SIZE });

  // ---- 场景：矩形应用读者配置；圆保持 fabric 默认，对照同一交互在默认样式下的样子
  const rect = new Rect({
    width: 210,
    height: 150,
    fill: '#6366f1',
    stroke: '#1e293b',
    strokeWidth: 2,
  });
  const circle = new Circle({ radius: 56, fill: '#22c55e', opacity: 0.9 });
  fabricCanvas.add(rect, circle);

  const snapshot: ControlsLabSnapshot = {
    corner: '—',
    action: '—',
    transform: '0° · 1.00 × 1.00 · skew 0/0',
    style: 'rect · 13px · 透明开',
    visible: CONTROL_KEYS.join(','),
  };

  const transformText = () =>
    `${Math.round(rect.angle)}° · ${rect.scaleX.toFixed(2)} × ${rect.scaleY.toFixed(2)} · skew ${Math.round(rect.skewX)}/${Math.round(rect.skewY)}`;

  // ---- 手柄与变换跟踪：悬停读 getActiveControl，拖拽中读 transform.corner
  function wireReadout() {
    fabricCanvas.on('mouse:move', () => {
      const active = fabricCanvas.getActiveObject();
      const key = active?.getActiveControl()?.key ?? '—';
      if (key !== snapshot.corner) {
        snapshot.corner = key;
        emit({ ...snapshot });
      }
    });
    (
      [
        'object:moving',
        'object:scaling',
        'object:rotating',
        'object:skewing',
      ] as const
    ).forEach((eventName) => {
      fabricCanvas.on(eventName, (opt) => {
        snapshot.corner = opt.transform?.corner || snapshot.corner;
        snapshot.transform = transformText();
        emit({ ...snapshot });
      });
    });
    fabricCanvas.on('object:modified', (opt) => {
      snapshot.action = opt.action ?? '—';
      snapshot.transform = transformText();
      emit({ ...snapshot });
    });
    fabricCanvas.on('selection:created', () => {
      snapshot.action = '—';
      emit({ ...snapshot });
    });
  }

  // ---- 布局与尺寸：画布铺满舞台，两对象左右分布
  function applyLayout(width: number, height: number) {
    rect.set({ left: width * 0.09, top: height * 0.26 });
    circle.set({ left: width * 0.58, top: height * 0.28 });
  }

  function syncSize() {
    if (!stage.isConnected) {
      return;
    }
    const width = Math.max(280, Math.floor(stage.clientWidth) - 14);
    const height = Math.max(220, Math.floor(stage.clientHeight) - 14);
    applyLayout(width, height);
    fabricCanvas.wrapperEl.style.margin = '7px';
    // setDimensions 自动 requestRenderAll；位置改动由它一并带回画面
    fabricCanvas.setDimensions({ width, height });
  }

  function update(options: ControlsLabOptions) {
    rect.set({ ...options });
    // cornerSize / padding 参与手柄命中四边形（oCoords.corner / touchCorner）的计算，
    // 改完必须 setCoords 重算，否则命中区停留在旧尺寸
    rect.setCoords();
    snapshot.style = `${options.cornerStyle} · ${options.cornerSize}px · 透明${options.transparentCorners ? '开' : '关'}`;
    snapshot.visible = CONTROL_KEYS.filter((key) =>
      rect.isControlVisible(key),
    ).join(',');
    fabricCanvas.requestRenderAll();
    emit({ ...snapshot });
  }

  wireReadout();
  applyLayout(INITIAL_SIZE.width, INITIAL_SIZE.height);
  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );
  syncSize();
  emit({ ...snapshot });

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}
