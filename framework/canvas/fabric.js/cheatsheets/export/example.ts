/**
 * 范例介绍：一个"导出实验台"——读者组合 format / quality / multiplier / retina / 裁剪窗口 /
 * 视口缩放 / 导出目标，实时触发 canvas.toDataURL 或选中对象的 toDataURL，导出结果直接
 * 渲染为 Canvas 下方的 <img> 预览（棋盘格代表透明像素），readout 给出导出尺寸、实际编码
 * 格式（webp 不支持时静默回退 png 的直接证据）、dataURL 长度、导出耗时与缓冲内存估算。
 * 场景是透明背景画布 + 四个对象（渐变阴影块、圆、文字、半透明块）：
 * - jpeg 档下预览的空白区变黑（画布级导出不铺底，浏览器把透明合成到纯黑）；
 *   png 档保持透明（棋盘格可见）；
 * - 「导出目标」切到选中对象后 jpeg 底色变白（对象级 toCanvasElement 自动设
 *   backgroundColor '#fff'——与画布级行为的差异）、导出尺寸变成对象包围盒、预览无控件；
 * - 拖「视口缩放 zoom」画布显示与导出预览同步缩放、导出尺寸不变（vpt 参与导出）；
 * - 「倍率 multiplier」与「retina 高清导出」相乘改变导出尺寸与内存（读数「倍率构成」）；
 * - 「质量 quality」只在 jpeg / webp 下改变长度（png 无损，忽略 quality）。
 * 输入：Controls 面板 8 项；画布上可拖动、点选对象（选中变化时自动重导）。
 * 预期结果：预览图与读数逐项可核对；关闭「执行导出」停止重新导出（读数停在最后一次结果）。
 * 阅读主线：update() 是状态机——同步视口缩放后按需 scheduleExport()（30ms 合并连发请求）；
 * doExport() 看导出选项的两条组装路（画布级带裁剪、对象级免裁剪）与读数推导。
 */
import {
  Canvas,
  Circle,
  FabricText,
  Gradient,
  Rect,
  Shadow,
} from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };

export type ExportFormat = 'png' | 'jpeg' | 'webp';
export type CropPreset = 'full' | 'left-top' | 'center';
export type ExportTarget = 'canvas' | 'object';

/** 读者输入：对应 Controls 面板 */
export interface ExportOptions {
  /** 导出格式 format：png（默认）/ jpeg / webp */
  format: ExportFormat;
  /** 质量 quality（0–1）：只对 jpeg / webp 这类有损格式有效 */
  quality: number;
  /** 倍率 multiplier：导出尺寸与内存的放大系数 */
  multiplier: number;
  /** retina 高清导出 enableRetinaScaling：true 时额外乘 devicePixelRatio */
  retina: boolean;
  /** 裁剪窗口：left/top/width/height 的三档预设（视口像素） */
  crop: CropPreset;
  /** 视口缩放 zoom：改 viewportTransform，验证 vpt 参与导出 */
  zoom: number;
  /** 导出目标：整块画布 / 当前选中对象 */
  target: ExportTarget;
  /** 执行导出：false 时停止重新导出 */
  live: boolean;
}

/** 派生读数：由 readout 显示 */
export interface ExportSnapshot {
  targetLabel: string;
  sizeLabel: string;
  mimeLabel: string;
  lengthLabel: string;
  durationLabel: string;
  memoryLabel: string;
  scaleLabel: string;
}

export interface ExportInstance {
  update(options: ExportOptions): void;
  dispose(): void;
}

/** 导出预览容器：挂在共享舞台（cs-stage）之后，棋盘格背景代表透明像素 */
function createPreviewShell(): {
  wrap: HTMLDivElement;
  img: HTMLImageElement;
  note: HTMLParagraphElement;
} {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'margin-top:10px;padding:10px 12px;border:1px solid #dbe3f0;border-radius:8px;background:#f8fafc;';

  const title = document.createElement('p');
  title.textContent = '导出预览（棋盘格 = 透明像素；jpeg 会把透明区合成到黑色）';
  title.style.cssText =
    'margin:0 0 8px;color:#475569;font:12px/1.5 ui-sans-serif,system-ui,sans-serif;';

  const note = document.createElement('p');
  note.style.cssText =
    'margin:8px 0 0;color:#64748b;font:12px/1.5 ui-sans-serif,system-ui,sans-serif;';

  const img = document.createElement('img');
  img.alt = 'toDataURL 导出结果预览';
  img.style.cssText = [
    'display:block',
    'max-width:100%',
    'max-height:360px',
    'width:auto',
    'height:auto',
    'border:1px solid #cbd5e1',
    'border-radius:4px',
    // 棋盘格：让 png 的透明区域可辨认
    'background:repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 0 0 / 16px 16px',
  ].join(';');

  wrap.append(title, img, note);
  return { wrap, img, note };
}

export function createExportLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: ExportSnapshot) => void,
): ExportInstance {
  // 透明背景：jpeg 档下空白区变黑的演示前提
  const fabricCanvas = new Canvas(canvasEl, { ...INITIAL_SIZE });

  const gradientRect = new Rect({
    left: 56,
    top: 48,
    width: 150,
    height: 96,
    angle: 8,
    fill: new Gradient({
      type: 'linear',
      gradientUnits: 'percentage',
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0, color: '#f43f5e' },
        { offset: 1, color: '#7dd3fc' },
      ],
    }),
    shadow: new Shadow({
      color: 'rgba(15, 23, 42, 0.35)',
      blur: 12,
      offsetX: 10,
      offsetY: 8,
    }),
  });
  const blue = new Circle({
    left: 468,
    top: 64,
    radius: 46,
    fill: '#38bdf8',
    stroke: '#0f172a',
    strokeWidth: 2,
  });
  const label = new FabricText('导出实验台', {
    left: 60,
    top: 250,
    fontSize: 30,
    fill: '#0f172a',
  });
  const veil = new Rect({
    left: 372,
    top: 216,
    width: 150,
    height: 92,
    fill: 'rgba(167, 139, 250, 0.45)',
    stroke: '#7c3aed',
    strokeWidth: 2,
    strokeDashArray: [8, 5],
  });
  fabricCanvas.add(gradientRect, blue, label, veil);

  const preview = createPreviewShell();
  // 预览是课程证据的一部分：挂在共享舞台之后（Canvas 外的 DOM img）
  const mountPreview = (attempt = 0) => {
    const stage = fabricCanvas.wrapperEl.parentElement;
    const host = stage?.parentElement;
    if (host) {
      host.insertBefore(preview.wrap, stage.nextSibling);
    } else if (attempt < 2) {
      requestAnimationFrame(() => mountPreview(attempt + 1));
    }
  };
  requestAnimationFrame(() => mountPreview());

  let lastOptions: ExportOptions | undefined;
  let appliedZoom = 1;
  let exportTimer: number | undefined;
  let lastSrc = '';
  let lastNatural: { width: number; height: number } | null = null;
  let exportStartedAt = 0;

  // 导出尺寸从预览图 naturalWidth/naturalHeight 读出（对画布级与对象级都准确）；
  // 耗时以 doExport 的起点计算（onload 晚于同步导出完成，含图片解码）
  preview.img.onload = () => {
    lastNatural = {
      width: preview.img.naturalWidth,
      height: preview.img.naturalHeight,
    };
    if (lastOptions) {
      emitSnapshot(lastOptions, performance.now() - exportStartedAt);
    }
  };

  /** 裁剪预设 → left/top/width/height（视口像素；完整画布时不传裁剪键） */
  function resolveCrop(preset: CropPreset) {
    if (preset === 'full') {
      return {};
    }
    const width = fabricCanvas.getWidth();
    const height = fabricCanvas.getHeight();
    if (preset === 'left-top') {
      return {
        left: 0,
        top: 0,
        width: Math.round(width / 2),
        height: Math.round(height / 2),
      };
    }
    return {
      left: Math.round(width / 4),
      top: Math.round(height / 4),
      width: Math.round(width / 2),
      height: Math.round(height / 2),
    };
  }

  function formatBytes(bytes: number): string {
    if (bytes >= 1048576) {
      return `≈ ${(bytes / 1048576).toFixed(1)} MB`;
    }
    return `≈ ${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  /** 推导并推送读数；duration 由调用方传入（同步导出路径），尺寸用 lastNatural */
  function emitSnapshot(options: ExportOptions, durationMs: number) {
    const actualMime = lastSrc
      ? lastSrc.slice(5, lastSrc.indexOf(';'))
      : '—';
    const fallback =
      options.format === 'webp' && actualMime === 'image/png'
        ? '（当前浏览器不支持 webp 编码，已回退 png）'
        : '';
    const dpr = fabricCanvas.getRetinaScaling();
    const factor = options.retina ? dpr : 1;
    const binary = lastSrc ? lastSrc.length * 0.75 : 0;
    const memory =
      lastNatural
        ? lastNatural.width * lastNatural.height * 4
        : 0;

    let targetLabel = '整块画布';
    if (options.target === 'object') {
      const active = fabricCanvas.getActiveObject();
      targetLabel = active
        ? `选中对象（${active.type}）`
        : '选中对象（未选中）';
    }

    emit({
      targetLabel,
      sizeLabel: lastNatural
        ? `${lastNatural.width} × ${lastNatural.height} px`
        : '—',
      mimeLabel: actualMime === '—' ? '—' : `${actualMime}${fallback}`,
      lengthLabel: lastSrc
        ? `${lastSrc.length.toLocaleString('zh-Hans-CN')} 字符（${formatBytes(binary)} 二进制）`
        : '—',
      durationLabel: `${durationMs.toFixed(1)} ms`,
      memoryLabel: memory
        ? `${formatBytes(memory)}（宽×高×4）`
        : '—',
      scaleLabel: `${options.multiplier} × ${
        options.retina ? `retina ${dpr}` : 'retina 关'
      } = ${options.multiplier * factor}`,
    });
  }

  function doExport(options: ExportOptions) {
    exportStartedAt = performance.now();
    const started = exportStartedAt;
    let dataURL: string;
    if (options.target === 'object') {
      const active = fabricCanvas.getActiveObject();
      if (!active) {
        preview.img.removeAttribute('src');
        preview.img.style.display = 'none';
        lastSrc = '';
        lastNatural = null;
        preview.note.textContent =
          '尚未选中对象——点选画布上的对象后自动导出。';
        emit({
          targetLabel: '选中对象（未选中）',
          sizeLabel: '—',
          mimeLabel: '—',
          lengthLabel: '—',
          durationLabel: '—',
          memoryLabel: '—',
          scaleLabel: `${options.multiplier} × ${
            options.retina ? `retina ${fabricCanvas.getRetinaScaling()}` : 'retina 关'
          } = ${
            options.multiplier *
            (options.retina ? fabricCanvas.getRetinaScaling() : 1)
          }`,
        });
        return;
      }
      preview.img.style.display = 'block';
      preview.note.textContent =
        '对象级导出：尺寸 = 对象包围盒（含阴影外扩）× 倍率；jpeg 自动铺白底。';
      dataURL = active.toDataURL({
        multiplier: options.multiplier,
        format: options.format,
        quality: options.quality,
        enableRetinaScaling: options.retina,
      });
    } else {
      preview.img.style.display = 'block';
      preview.note.textContent =
        '画布级导出：视口缩放与平移原样进入导出；裁剪窗口按屏幕像素计。';
      // 画布级 toDataURL：TS 类型里 multiplier 必填，运行时默认 1——这里始终显式传
      dataURL = fabricCanvas.toDataURL({
        multiplier: options.multiplier,
        format: options.format,
        quality: options.quality,
        enableRetinaScaling: options.retina,
        ...resolveCrop(options.crop),
      });
    }

    if (dataURL !== lastSrc) {
      lastSrc = dataURL;
      lastNatural = null;
      preview.img.src = dataURL; // onload 里补尺寸并推送读数
    } else {
      // 同产物（如 png 下调 quality 重复编码出相同串）：耗时仍真实，直接推送
      emitSnapshot(options, performance.now() - started);
    }
  }

  /** 合并连续请求：滑块拖动时 30ms 内的重复导出只执行最后一次 */
  function scheduleExport() {
    if (exportTimer !== undefined) {
      window.clearTimeout(exportTimer);
    }
    exportTimer = window.setTimeout(() => {
      exportTimer = undefined;
      if (lastOptions) {
        doExport(lastOptions);
      }
    }, 30);
  }

  function update(options: ExportOptions) {
    lastOptions = options;
    // 视口缩放：vpt 参与导出的证据——屏幕与导出同步变化，导出尺寸不变
    if (options.zoom !== appliedZoom) {
      appliedZoom = options.zoom;
      fabricCanvas.setViewportTransform([
        options.zoom,
        0,
        0,
        options.zoom,
        0,
        0,
      ]);
    }
    if (options.live) {
      scheduleExport();
    }
  }

  // 选中状态变化：对象档导出的对象来源
  fabricCanvas.on('selection:created', () => {
    if (lastOptions?.live && lastOptions.target === 'object') {
      scheduleExport();
    }
  });
  fabricCanvas.on('selection:updated', () => {
    if (lastOptions?.live && lastOptions.target === 'object') {
      scheduleExport();
    }
  });
  fabricCanvas.on('selection:cleared', () => {
    if (lastOptions?.live && lastOptions.target === 'object') {
      scheduleExport();
    }
  });
  // 拖动对象后预览联动（画布档：内容变了；对象档：包围盒可能变了）
  fabricCanvas.on('object:modified', () => {
    if (lastOptions?.live) {
      scheduleExport();
    }
  });

  function syncSize() {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    fabricCanvas.setDimensions({ width, height });
    if (lastOptions?.live) {
      scheduleExport();
    }
  }

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  update({
    format: 'png',
    quality: 1,
    multiplier: 1,
    retina: false,
    crop: 'full',
    zoom: 1,
    target: 'canvas',
    live: true,
  });

  return {
    update,
    dispose() {
      if (exportTimer !== undefined) {
        window.clearTimeout(exportTimer);
      }
      resizeObserver.disconnect();
      preview.wrap.remove();
      void fabricCanvas.dispose();
    },
  };
}
