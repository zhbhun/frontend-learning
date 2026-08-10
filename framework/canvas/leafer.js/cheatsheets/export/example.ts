/**
 * 演示内容：LeaferJS 的三种导出 —— 场景序列化为 JSON、导出为图片、导出 SVG 路径，
 *           以及从 JSON 还原场景。
 * 输入/前置：canvasStory 传入一个 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *           顶部副作用导入 @leafer-in/export，为 UI 原型注入 export / syncExport，
 *           并把 canvas.toDataURL 从基类的空实现替换为真正可用的版本。
 *           本课公开输入为 形状 shape、元素数量 count、导出像素比 pixelRatio。
 * 主要操作：new Leafer({ view: canvas }) 复用传入 <canvas>；按 count 生成一排形状；
 *           update(options) 重建场景后，分别用 leafer.toString() 序列化、
 *           leafer.export('png', { pixelRatio }) 导出图片、
 *           shape.getPathString() 取 SVG 路径，把三项结果派发到读数。
 * 预期结果：切形状 → SVG 路径与 JSON 的 tag 同步变化；调数量 → JSON 字符数随之增减；
 *           调导出像素比 → 导出图片的宽高成比例变化。
 * 阅读主线：createExportDemo 搭场景 → rebuildScene 按 shape/count 重建
 *           → refreshReadout 跑三种导出并 emit → update / dispose。
 *
 * 导出要点（2.2.9 实测，见 @leafer/core、@leafer-ui/draw、@leafer-in/export）：
 *   toJSON()/toString() 内置于 Leaf 基类，免插件，递归含 tag + children，唯一选项 matrix。
 *   还原：new Leafer({view}, json) / parent.add(json) / leaf.set(json)（add/set 按 tag 还原类）。
 *   export()/syncExport() 由 @leafer-in/export 注入；filename 不含点且为图片类型时返回 base64
 *     data URL（IExportResult.data），含点触发浏览器下载，options 传 true 取 Blob，
 *     pixelRatio 放大输出，width/height 为物理像素。
 *   getPath()/getPathString() 内置于 @leafer-ui/draw，免插件，按元素几何生成路径命令 / SVG 字符串。
 */
import {
  Leafer,
  Rect,
  Ellipse,
  Star,
  Polygon,
  Text,
  type UI,
} from 'leafer-ui';
import '@leafer-in/export';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

type ShapeType = 'rect' | 'ellipse' | 'star' | 'polygon';

export interface ExportDemoOptions {
  shape: ShapeType;
  count: number;
  pixelRatio: number;
}

export interface ExportDemoSnapshot {
  /** JSON 字符串（toString）的字节数。 */
  jsonChars: string;
  /** 导出 PNG 的物理像素尺寸。 */
  imagePixels: string;
  /** getPathString 返回的 SVG 路径字符数。 */
  svgChars: string;
  /** SVG 路径前若干字符的预览。 */
  svgPreview: string;
}

export interface ExportDemoInstance {
  update(options: ExportDemoOptions): void;
  dispose(): void;
}

const PALETTE = ['#ff4d4d', '#ffb300', '#27c955', '#2b8cff', '#a855f7', '#06b6d4'];
const SHAPE_SIZE = 76;
const SHAPE_GAP = 30;

const SHAPE_LABEL: Record<ShapeType, string> = {
  rect: 'Rect',
  ellipse: 'Ellipse',
  star: 'Star',
  polygon: 'Polygon',
};

function createShape(type: ShapeType, fill: string): UI {
  switch (type) {
    case 'rect':
      return new Rect({
        width: SHAPE_SIZE,
        height: SHAPE_SIZE,
        cornerRadius: 18,
        fill,
      });
    case 'ellipse':
      return new Ellipse({ width: SHAPE_SIZE, height: SHAPE_SIZE, fill });
    case 'star':
      return new Star({
        width: SHAPE_SIZE,
        height: SHAPE_SIZE,
        corners: 5,
        innerRadius: 0.5,
        fill,
      });
    case 'polygon':
      return new Polygon({
        width: SHAPE_SIZE,
        height: SHAPE_SIZE,
        sides: 6,
        fill,
      });
  }
}

export function createExportDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExportDemoSnapshot) => void,
): ExportDemoInstance {
  let current: ExportDemoOptions = {
    shape: 'star',
    count: 3,
    pixelRatio: 2,
  };

  // view 直接传 HTMLCanvasElement 时，Leafer 复用该 <canvas>；尺寸由舞台客户端尺寸决定。
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#1e293b',
  });

  let shapes: UI[] = [];
  let title: Text | null = null;
  // 导出是异步的（会等待视图就绪），用 token 丢弃过期的导出结果，避免拖动时读到旧值。
  let exportToken = 0;

  function syncSize() {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });
  }

  function clearScene() {
    for (const shape of shapes) {
      leafer.remove(shape);
      shape.destroy();
    }
    shapes = [];
    if (title) {
      leafer.remove(title);
      title.destroy();
      title = null;
    }
  }

  // 按 shape/count 重建一排居中的形状 + 顶部标签。around 默认 top-left，x/y 即左上角。
  function rebuildScene() {
    clearScene();

    const cw = leafer.canvas.width;
    const ch = leafer.canvas.height;
    const n = current.count;
    const totalWidth = n * SHAPE_SIZE + (n - 1) * SHAPE_GAP;
    const startX = (cw - totalWidth) / 2;
    const y = ch / 2 - SHAPE_SIZE / 2;

    // 文本默认左上角对齐；around:'center' 后 x/y 即中心点，便于水平居中。
    title = new Text({
      text: `${n} × ${SHAPE_LABEL[current.shape]}`,
      fontSize: 16,
      fill: '#94a3b8',
      textAlign: 'center',
      around: 'center',
      x: cw / 2,
      y: Math.max(28, y - 52),
    });
    leafer.add(title);

    for (let i = 0; i < n; i++) {
      const shape = createShape(current.shape, PALETTE[i % PALETTE.length]);
      shape.x = startX + i * (SHAPE_SIZE + SHAPE_GAP);
      shape.y = y;
      leafer.add(shape);
      shapes.push(shape);
    }
  }

  // 跑三种导出并把结果派发到读数。toJSON / getPathString 是同步的；
  // export('png') 异步（插件内部会等视图就绪再渲染到离屏画布），用 token 丢弃过期结果。
  async function refreshReadout(): Promise<void> {
    const token = ++exportToken;

    // 1) JSON：toString() = JSON.stringify(toJSON())，递归含 tag + children。
    const jsonChars = leafer.toString().length;

    // 2) SVG 路径：getPathString() 把 getPath() 的命令数组 stringify 成 SVG path d 字符串。
    const pathStr = shapes[0] ? shapes[0].getPathString() : '';

    // 3) 图片：export('png', { pixelRatio })。filename 不含点 → 返回 base64，不触发下载。
    //    width/height 为物理像素 = 逻辑尺寸 × pixelRatio。
    let imagePixels = '导出中…';
    try {
      const result = await leafer.export('png', {
        pixelRatio: current.pixelRatio,
      });
      if (token !== exportToken) {
        return;
      }
      if (result && result.error) {
        imagePixels = '导出失败';
      } else if (result) {
        imagePixels = `${result.width} × ${result.height} px`;
      }
    } catch {
      if (token !== exportToken) {
        return;
      }
      imagePixels = '导出失败';
    }

    emit({
      jsonChars: `${jsonChars} 字符`,
      imagePixels,
      svgChars: `${pathStr.length} 字符`,
      svgPreview:
        pathStr.length > 28 ? `${pathStr.slice(0, 28)}…` : pathStr || '—',
    });
  }

  function apply(options: ExportDemoOptions) {
    current = options;
    rebuildScene();
    void refreshReadout();
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    syncSize();
    apply(current);
  });

  syncSize();
  apply(current);

  return {
    update(options) {
      apply(options);
    },
    dispose() {
      exportToken++; // 让进行中的导出失效，避免 dispose 后再 emit
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
