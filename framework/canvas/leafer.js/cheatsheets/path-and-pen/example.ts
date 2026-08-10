/**
 * 演示内容：Path 与 Pen 两种矢量路径方式。
 *   - Path：用 SVG 路径字符串（path 属性，如 M/L/Z）声明一个五角星形状，
 *     通过 windingRule（nonzero / evenodd）切换自相交路径的填充规则。
 *   - Pen：用命令式 API（drawPoints）绘制一条穿过 N 个采样点的闭合曲线，
 *     通过 pointCount 调整点数、curve 调整平滑度（0=折线，>0=二次贝塞尔平滑）。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM，CSS 100% 撑满舞台）。
 *   - Path 范例公开输入：windingRule（填充规则）。
 *   - Pen 范例公开输入：pointCount（采样点数）、curve（平滑度 0–1）。
 * 主要操作：
 *   - createPathScene：new Path({ path: STAR_PATH, windingRule, fill, stroke })，设 path 后
 *     元素按路径几何自动定界（__usePathBox），update 时改 path.windingRule 触发重绘。
 *   - createPenScene：new Pen() → pen.setStyle({...}) 创建带样式的子路径（pathElement）→
 *     pen.drawPoints(points, curve, true) 命令式写入路径数据；update 时 pen.clearPath() 清空后重画。
 * 预期结果：
 *   - Path：切到 evenodd → 五角星中心出现五边形孔洞；nonzero → 实心。读出命令数与字符数。
 *   - Pen：增减 pointCount → 红色采样点与拟合曲线随之增减；拖动 curve → 折线↔平滑曲线。读出数据长度。
 * 阅读主线：STAR_PATH / wavyRingPoints → createPathScene / createPenScene → setStyle + drawPoints →
 *           update（改 windingRule / clearPath+drawPoints）→ dispose。
 */
import { Leafer, Path, Pen, Text, Group, Ellipse } from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 五角星路径（自相交）：M 起笔，连续 L 到其余 9 个顶点，Z 闭合。
// 大写命令为绝对坐标；自相交使 nonzero / evenodd 产生不同填充结果。
const STAR_PATH =
  'M 0 -90 L 21 -29 L 86 -28 L 34 11 L 53 73 L 0 36 L -53 73 L -34 11 L -86 -28 L -21 -29 Z';

/** 统计路径字符串中的命令字母数（M/L/C/Q/Z 等），用于 readout。 */
function countPathCommands(pathStr: string): number {
  const matches = pathStr.match(/[MLHVCSTAQZ]/gi);
  return matches ? matches.length : 0;
}

// ====================================================================
// Path 范例：声明式 SVG 路径字符串
// ====================================================================

export interface PathOptions {
  windingRule: 'nonzero' | 'evenodd';
}

export interface PathSnapshot {
  /** 当前填充规则。 */
  windingRule: string;
  /** 路径字符串中的命令字母数。 */
  commandCount: number;
  /** 路径字符串长度（字符数）。 */
  charCount: number;
}

export interface PathInstance {
  update(options: PathOptions): void;
  dispose(): void;
}

export function createPathScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PathSnapshot) => void,
): PathInstance {
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#ffffff',
  });

  // 设了 path 后，Path 的包围盒由路径几何决定（__usePathBox），无需手填 width/height。
  // x/y 把路径的本地原点定位到画布中心，使以 (0,0) 为中心定义的星形居中显示。
  const star = new Path({
    x: initial.width / 2,
    y: initial.height / 2,
    path: STAR_PATH,
    windingRule: 'nonzero',
    fill: '#4f7cff',
    stroke: '#1e3a8a',
    strokeWidth: 2,
    strokeAlign: 'inside',
  });
  leafer.add(star);

  leafer.add(
    new Text({
      text: 'Path · path 字符串声明形状',
      x: 16,
      y: 12,
      fontSize: 13,
      fill: '#64748b',
    }),
  );

  let current: PathOptions = { windingRule: 'nonzero' };

  function syncReadout() {
    emit({
      windingRule: current.windingRule,
      commandCount: countPathCommands(STAR_PATH),
      charCount: STAR_PATH.length,
    });
  }

  syncReadout();
  leafer.nextRender(syncReadout);

  const resizeObserver = createResizeObserver(canvas, () => {
    const { width, height } = readCanvasSize(canvas);
    leafer.resize({ width, height });
    star.x = width / 2;
    star.y = height / 2;
    syncReadout();
  });

  return {
    update(options) {
      current = options;
      // 给属性赋值即触发重绘：windingRule 改变自相交路径的填充判定。
      star.windingRule = options.windingRule;
      syncReadout();
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}

// ====================================================================
// Pen 范例：命令式自由绘制
// ====================================================================

export interface PenOptions {
  pointCount: number;
  curve: number;
}

export interface PenSnapshot {
  /** 采样点数（drawPoints 的输入点数）。 */
  pointCount: number;
  /** 平滑度（0=折线，0–1=二次贝塞尔平滑度，true=0.5）。 */
  curve: number;
  /** pen.path 的数据长度（扁平 number[] 长度），证明命令已被写入。 */
  dataLength: number;
}

export interface PenInstance {
  update(options: PenOptions): void;
  dispose(): void;
}

/** 生成围绕原点的波浪环采样点（5 瓣花形），返回扁平 [x,y, x,y, ...]。 */
function wavyRingPoints(count: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r = 80 + 28 * Math.sin(5 * a);
    pts.push(
      Math.round(r * Math.cos(a) * 100) / 100,
      Math.round(r * Math.sin(a) * 100) / 100,
    );
  }
  return pts;
}

export function createPenScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PenSnapshot) => void,
): PenInstance {
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#ffffff',
  });

  const centerX = initial.width / 2;
  const centerY = initial.height / 2;

  // Pen 继承自 Group，混入 PathCreator 的命令式 API。
  // setStyle 设定描边/填充并创建一条带样式的子路径（pathElement）；
  // 随后的 drawPoints 命令写入 pen.path（与 pathElement.path 共享同一数组）。
  const pen = new Pen();
  pen.x = centerX;
  pen.y = centerY;
  pen.setStyle({
    stroke: '#4f7cff',
    strokeWidth: 3,
    fill: 'rgba(79, 124, 255, 0.15)',
  });
  pen.drawPoints(wavyRingPoints(6), 0.5, true);
  leafer.add(pen);

  // 采样点标记层：与 pen 共享本地坐标系（同样的中心定位），
  // 把每个采样点画成小圆点，使 pointCount 的增减肉眼可数。
  const markerLayer = new Group({ x: centerX, y: centerY });
  leafer.add(markerLayer);

  function rebuildMarkers(points: number[]) {
    markerLayer.removeAll(true);
    for (let i = 0; i < points.length; i += 2) {
      markerLayer.add(
        new Ellipse({
          x: points[i] - 4,
          y: points[i + 1] - 4,
          width: 8,
          height: 8,
          fill: '#ef4444',
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
      );
    }
  }
  rebuildMarkers(wavyRingPoints(6));

  leafer.add(
    new Text({
      text: 'Pen · 命令式 drawPoints 自由绘制',
      x: 16,
      y: 12,
      fontSize: 13,
      fill: '#64748b',
    }),
  );

  let current: PenOptions = { pointCount: 6, curve: 0.5 };

  function syncReadout() {
    emit({
      pointCount: current.pointCount,
      curve: current.curve,
      // pen.path 是只读 getter，返回当前命令数据（扁平 number[]）。
      dataLength: pen.path.length,
    });
  }

  syncReadout();
  leafer.nextRender(syncReadout);

  const resizeObserver = createResizeObserver(canvas, () => {
    const { width, height } = readCanvasSize(canvas);
    leafer.resize({ width, height });
    pen.x = width / 2;
    pen.y = height / 2;
    markerLayer.x = width / 2;
    markerLayer.y = height / 2;
    syncReadout();
  });

  return {
    update(options) {
      current = options;
      const points = wavyRingPoints(options.pointCount);
      // clearPath 原地清空共享命令数组（等价 beginPath），再 drawPoints 重新写入；
      // pen.path 为只读，不能直接赋值，必须用命令式方法修改。
      pen.clearPath();
      pen.drawPoints(points, options.curve, true);
      rebuildMarkers(points);
      syncReadout();
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
