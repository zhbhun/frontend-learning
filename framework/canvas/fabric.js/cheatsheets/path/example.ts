/**
 * 范例介绍：演示同一段路径数据怎样变成 Path 对象的轮廓、命令数组与边界读数——
 * 1. 构造输入支持 SVG path 字符串，内部归一化为 M/L/C/Q/Z 绝对命令存进 path 属性（S/T/A/h 等形态消失）；
 * 2. width/height/pathOffset 由命令几何算出，构造默认把几何放在路径坐标所示位置（left/top = pathOffset）；
 * 3. 拖动只改 left/top；setBoundingBox(true) 把对象中心重新放回 pathOffset。
 * 输入：预设路径（「路径数据」留空时生效）、路径数据 d（填写则优先）、锚点/控制点标记、重算包围盒开关。
 * 预期结果：轮廓与读数（命令数 / 存储命令 / width×height / pathOffset / left,top）同步变化；
 * 拖动后 left/top 改变而 pathOffset 不变；开启重算开关后对象跳回路径坐标对齐位。
 * 阅读主线：rebuildPath() 看构造与解析；drawMarkers() 在 after:render 上叠加命令点标记；
 * update() 的 realign 分支演示 setBoundingBox(true)。
 */
import { Canvas, Path, Point, util } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 预设路径：覆盖折线 / 三次贝塞尔 / 二次贝塞尔 / 圆弧 / 相对命令五个命令族 */
export const PATH_PRESETS = {
  polyline: 'M 60 240 L 170 100 L 280 240 L 390 100 L 500 240 Z',
  cubic: 'M 40 210 C 40 90 220 90 220 210 S 400 330 460 120',
  quad: 'M 40 230 Q 140 60 240 230 T 440 230',
  arc: 'M 90 230 A 130 90 -15 1 1 460 170 Z',
  relative: 'm 60 230 l 50 -110 l 50 110 l 50 -110 l 50 110 h 70 z',
} as const;

export type PathPreset = keyof typeof PATH_PRESETS;

/** 读者输入：对应 Controls 面板 */
export interface PathLessonOptions {
  /** 预设命令族；「路径数据」留空时使用对应 d 字符串 */
  preset: PathPreset;
  /** 直接编辑的路径数据；留空跟随预设，填写则优先生效 */
  d: string;
  /** 是否在轮廓上叠加锚点（红）与控制点（橙）标记 */
  showAnchors: boolean;
  /** 上升沿执行 setBoundingBox(true)：重算边界并把对象中心放回 pathOffset */
  realign: boolean;
}

/** 派生读数：由 readout 显示 */
export interface PathLessonSnapshot {
  commandCount: number;
  storedCommands: string;
  size: string;
  pathOffset: string;
  position: string;
}

export interface PathLessonInstance {
  update(options: PathLessonOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
const MARKER_ANCHOR = '#e11d48';
const MARKER_CONTROL = '#f59e0b';

export function createPathLesson(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: PathLessonSnapshot) => void,
): PathLessonInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#ffffff',
  });

  let currentD = '';
  let currentPath: Path | null = null;
  let showAnchors = true;
  let realignLatched = false;

  function fmt(n: number): string {
    return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : '—';
  }

  function emitSnapshot() {
    if (!currentPath) {
      emit({
        commandCount: 0,
        storedCommands: '（无有效命令）',
        size: '—',
        pathOffset: '—',
        position: '—',
      });
      return;
    }
    const joined = util.joinPath(currentPath.path, 1); // 读数按 1 位小数舍入
    emit({
      commandCount: currentPath.complexity(),
      storedCommands:
        joined.length > 46 ? `${joined.slice(0, 46)}…` : joined,
      size: `${fmt(currentPath.width)}×${fmt(currentPath.height)}`,
      pathOffset: `${fmt(currentPath.pathOffset.x)}, ${fmt(currentPath.pathOffset.y)}`,
      position: `${fmt(currentPath.left)}, ${fmt(currentPath.top)}`,
    });
  }

  function rebuildPath(d: string) {
    if (currentPath) {
      fabricCanvas.remove(currentPath);
      currentPath = null;
    }
    // 解析不出任何命令（空串 / 全非法字母）时保留空画布，读数归零
    if (util.parsePath(d).length === 0) {
      currentD = '';
      return;
    }
    currentD = d;
    // 构造默认对齐：几何落在路径坐标所示位置，left/top = pathOffset
    currentPath = new Path(d, {
      fill: '#4f7cff',
      opacity: 0.3,
      stroke: '#1e40af',
      strokeWidth: 2,
      strokeLineJoin: 'round',
    });
    fabricCanvas.add(currentPath); // renderOnAddRemove 默认 true，自动请求重绘
  }

  /** 在下层整帧重绘之后叠加命令点标记：锚点画端点，橙圈画贝塞尔控制点 */
  function drawMarkers(ctx: CanvasRenderingContext2D) {
    if (!currentPath || !showAnchors) {
      return;
    }
    const path = currentPath;
    // 路径局部点（命令坐标 − pathOffset）→ 对象变换 → 视口变换
    const matrix = util.multiplyTransformMatrices(
      fabricCanvas.viewportTransform,
      path.calcTransformMatrix(),
    );
    const toCanvas = (x: number, y: number): Point | null =>
      Number.isFinite(x) && Number.isFinite(y)
        ? util.transformPoint(
            new Point(x - path.pathOffset.x, y - path.pathOffset.y),
            matrix,
          )
        : null;

    ctx.save();
    // after:render 时视口变换已还原；这里按 retina 倍率把物理像素换算回 CSS 像素再画
    const retina = fabricCanvas.getRetinaScaling();
    ctx.setTransform(retina, 0, 0, retina, 0, 0);

    const drawDot = (p: Point, color: string, hollow = false) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      if (hollow) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.fill();
      }
    };
    const drawControlLine = (from: Point, to: Point) => {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    let cur = new Point(0, 0); // 路径坐标系里的当前点
    let substart = new Point(0, 0); // 最近一个 M 的位置，Z 回到这里
    for (const cmd of path.path) {
      switch (cmd[0]) {
        case 'M': {
          const p = toCanvas(cmd[1], cmd[2]);
          if (p) drawDot(p, MARKER_ANCHOR);
          cur = new Point(cmd[1], cmd[2]);
          substart = cur;
          break;
        }
        case 'L': {
          const p = toCanvas(cmd[1], cmd[2]);
          if (p) drawDot(p, MARKER_ANCHOR);
          cur = new Point(cmd[1], cmd[2]);
          break;
        }
        case 'C': {
          // 从曲线两端各引一条细线到对应控制点，便于读出“拉拽方向”
          const begin = toCanvas(cur.x, cur.y);
          const c1 = toCanvas(cmd[1], cmd[2]);
          const c2 = toCanvas(cmd[3], cmd[4]);
          const end = toCanvas(cmd[5], cmd[6]);
          if (begin && c1) drawControlLine(begin, c1);
          if (end && c2) drawControlLine(end, c2);
          if (c1) drawDot(c1, MARKER_CONTROL, true);
          if (c2) drawDot(c2, MARKER_CONTROL, true);
          if (end) drawDot(end, MARKER_ANCHOR);
          cur = new Point(cmd[5], cmd[6]);
          break;
        }
        case 'Q': {
          const begin = toCanvas(cur.x, cur.y);
          const c = toCanvas(cmd[1], cmd[2]);
          const end = toCanvas(cmd[3], cmd[4]);
          if (begin && c) drawControlLine(begin, c);
          if (c) drawDot(c, MARKER_CONTROL, true);
          if (end) drawDot(end, MARKER_ANCHOR);
          cur = new Point(cmd[3], cmd[4]);
          break;
        }
        case 'Z':
          cur = substart;
          break;
      }
    }
    ctx.restore();
  }

  // 只在下层整帧重绘后叠加标记；renderTop（上层瞬态）触发的 after:render 跳过
  fabricCanvas.on('after:render', (event) => {
    if (event.ctx !== fabricCanvas.contextContainer) {
      return;
    }
    drawMarkers(event.ctx);
    emitSnapshot();
  });

  function syncSize() {
    // wrapperEl 的父级就是共享舞台；createResizeObserver 观察的正是“传入元素的父级”
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    fabricCanvas.setDimensions({ width, height }); // 自动 requestRenderAll，标记随之重画
  }

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  function update(options: PathLessonOptions) {
    // 「路径数据」填写则优先，留空跟随预设
    const nextD = options.d.trim() || PATH_PRESETS[options.preset];
    if (nextD !== currentD) {
      rebuildPath(nextD);
      fabricCanvas.requestRenderAll();
    }

    if (options.showAnchors !== showAnchors) {
      showAnchors = options.showAnchors;
      // 标记画在 after:render 里，显隐变化需要请求一次重绘
      fabricCanvas.requestRenderAll();
    }

    if (options.realign && !realignLatched && currentPath) {
      // 重算 width/height/pathOffset，并把对象中心放回 pathOffset（路径坐标对齐位）
      currentPath.setBoundingBox(true);
      currentPath.setCoords();
      fabricCanvas.requestRenderAll();
    }
    realignLatched = options.realign;

    emitSnapshot();
  }

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      fabricCanvas.off('after:render');
      void fabricCanvas.dispose();
    },
  };
}
