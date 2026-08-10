/**
 * 范例介绍：演示 Konva 四种导出方法（toCanvas / toDataURL / toImage / toBlob）
 * 如何从同一个节点（Stage）产出不同格式的图像，以及 pixelRatio、mimeType、quality
 * 如何改变导出的像素尺寸与数据大小。
 *
 * 输入：method（导出方法）、pixelRatio（1–3）、mimeType（image/png / image/jpeg）、
 *   quality（0.1–1.0，仅 image/jpeg 有效）。
 * 主要操作：左侧维持一个带白底的 Konva 源舞台；每次更新按当前 method 调用对应导出
 *   方法，把产物（HTMLCanvasElement / base64 字符串 / Image / Blob）渲染到右侧预览，
 *   并测量产物的像素尺寸与数据大小。所有方法共用同一份 config，证明引擎等价。
 * 预期结果：切换 method 时「产物类型」与预览同步变化；pixelRatio 升高时导出像素
 *   尺寸按倍数放大、数据大小快速增加；png 切到 jpeg 后数据大小显著下降，quality
 *   越小 jpeg 越小。toImage / toBlob 标注为异步 Promise。
 * 阅读主线：createExport 建立源舞台与预览区 → exportScene 按 method 分派同步 / 异步
 *   分支 → report 校验令牌后刷新预览并汇报读数。
 */
import Konva from 'konva';
import {
  createResizeObserver,
} from '../../assets/canvas-runtime.js';

export interface ExportOptions {
  method: 'toCanvas' | 'toDataURL' | 'toImage' | 'toBlob';
  pixelRatio: number;
  mimeType: 'image/png' | 'image/jpeg';
  quality: number;
}

export interface ExportSnapshot {
  /** 导出方法名。 */
  method: string;
  /** 产物类型标签。 */
  typeName: string;
  /** 当前 pixelRatio。 */
  pixelRatio: number;
  /** 导出图像的像素宽度。 */
  width: number;
  /** 导出图像的像素高度。 */
  height: number;
  /** 数据大小标签，内存对象显示「—」。 */
  sizeLabel: string;
  /** 是否异步（Promise）。 */
  async: boolean;
}

export interface ExportInstance {
  update(options: ExportOptions): void;
  dispose(): void;
}

export function createExport(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExportSnapshot) => void,
): ExportInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('找不到画布父容器。');
  }

  // canvasStory 已在 .cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会清空
  // container（_buildDOM 的 container.innerHTML = ''），因此用独立包裹层承接源
  // 舞台；默认 canvas 隐藏，由 Konva 图层 canvas 承载绘制。源舞台占左半。
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.top = '0';
  wrapper.style.bottom = '0';
  wrapper.style.left = '0';
  wrapper.style.width = '50%';
  root.appendChild(wrapper);
  canvas.style.display = 'none';

  // 右半为导出产物预览区；棋盘格背景可让透明区域（png）被察觉。
  const preview = document.createElement('div');
  preview.style.position = 'absolute';
  preview.style.top = '0';
  preview.style.bottom = '0';
  preview.style.right = '0';
  preview.style.width = '50%';
  preview.style.display = 'flex';
  preview.style.alignItems = 'center';
  preview.style.justifyContent = 'center';
  preview.style.padding = '24px';
  preview.style.boxSizing = 'border-box';
  preview.style.overflow = 'hidden';
  preview.style.background =
    'repeating-conic-gradient(#e2e8f0 0% 25%, #f8fafc 0% 50%) 50% / 16px 16px';
  root.appendChild(preview);

  let stage: Konva.Stage | null = null;
  let current: ExportOptions = {
    method: 'toDataURL',
    pixelRatio: 2,
    mimeType: 'image/png',
    quality: 0.8,
  };

  // 异步导出（toImage / toBlob）的令牌：丢弃用户切换后过期的 Promise 结果。
  let runId = 0;
  // toBlob 预览用到的 object URL，每次重建前回收，避免泄漏。
  let previewObjectUrl: string | null = null;

  function buildStage(width: number, height: number) {
    if (stage) {
      stage.destroy();
      stage = null;
    }

    const next = new Konva.Stage({ container: wrapper, width, height });
    const layer = new Konva.Layer();
    next.add(layer);

    // 白底填满舞台：getClientRect 自然取到整个舞台，导出尺寸 = 舞台尺寸 × pixelRatio；
    // 同时让 png / jpeg 预览都干净（jpeg 无 alpha）。
    layer.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width,
        height,
        fill: '#ffffff',
        listening: false,
      }),
    );

    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) * 0.18;

    layer.add(
      new Konva.Circle({
        x: cx - r * 0.9,
        y: cy,
        radius: r,
        fill: '#4f7cff',
        stroke: '#1e3a8a',
        strokeWidth: 2,
      }),
    );

    layer.add(
      new Konva.Star({
        x: cx + r * 0.9,
        y: cy,
        numPoints: 5,
        innerRadius: r * 0.5,
        outerRadius: r,
        fill: '#f59e0b',
        stroke: '#b45309',
        strokeWidth: 2,
      }),
    );

    stage = next;
    stage.batchDraw();
  }

  function clearPreview() {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
    preview.replaceChildren();
  }

  // 把产物（canvas / img）放进预览区，按比例缩放到容器内。
  function placePreview(el: HTMLElement) {
    el.style.maxWidth = '100%';
    el.style.maxHeight = '100%';
    el.style.border = '1px solid #cbd5e1';
    el.style.borderRadius = '4px';
    preview.replaceChildren(el);
  }

  // 构造四种方法共享的导出 config：显式固定为整个舞台区域，确保产物尺寸确定。
  function buildConfig() {
    if (!stage) {
      return { pixelRatio: current.pixelRatio };
    }
    return {
      x: 0,
      y: 0,
      width: stage.width(),
      height: stage.height(),
      pixelRatio: current.pixelRatio,
      mimeType: current.mimeType,
      quality: current.quality,
    };
  }

  function report(
    token: number,
    method: string,
    typeName: string,
    width: number,
    height: number,
    sizeLabel: string,
    async: boolean,
  ) {
    if (token !== runId) {
      return; // 已过期：用户在异步导出未完成时又切换了选项
    }
    emit({
      method,
      typeName,
      pixelRatio: current.pixelRatio,
      width,
      height,
      sizeLabel,
      async,
    });
  }

  function exportScene() {
    if (!stage) {
      return;
    }
    const token = ++runId;
    const method = current.method;
    const pixelRatio = current.pixelRatio;
    const cfg = buildConfig();
    const stageW = stage.width();
    const stageH = stage.height();

    if (method === 'toCanvas') {
      // 同步：返回 HTMLCanvasElement，其 width/height 属性 = 舞台尺寸 × pixelRatio。
      const out = stage.toCanvas(cfg);
      clearPreview();
      placePreview(out);
      report(
        token,
        'toCanvas',
        'HTMLCanvasElement',
        out.width,
        out.height,
        '—（内存对象）',
        false,
      );
      return;
    }

    if (method === 'toDataURL') {
      // 同步：返回 base64 data URL 字符串。解码后字节数 ≈ payload 长度 × 3/4。
      const url = stage.toDataURL(cfg);
      const bytes = estimateBase64Bytes(url);
      clearPreview();
      const img = new Image();
      img.src = url;
      placePreview(img);
      report(
        token,
        'toDataURL',
        'string（base64）',
        stageW * pixelRatio,
        stageH * pixelRatio,
        formatBytes(bytes),
        false,
      );
      return;
    }

    if (method === 'toImage') {
      // 异步：返回 Promise<HTMLImageElement>，图像加载完成后才可用。
      stage
        .toImage(cfg)
        .then((img) => {
          if (token !== runId) {
            return;
          }
          clearPreview();
          placePreview(img);
          report(
            token,
            'toImage',
            'HTMLImageElement',
            img.naturalWidth,
            img.naturalHeight,
            '—（内存对象）',
            true,
          );
        })
        .catch(() => {
          if (token !== runId) {
            return;
          }
          report(token, 'toImage', 'HTMLImageElement（失败）', 0, 0, '—', true);
        });
      return;
    }

    // toBlob：异步，返回 Promise<Blob>。blob.size 是真实字节数，适合比较体积。
    // Konva 的 toBlob 类型声明为 Promise<unknown>，断言为 Promise<Blob> 以获得正确类型。
    (stage.toBlob(cfg) as Promise<Blob>)
      .then((blob) => {
        if (token !== runId) {
          return;
        }
        clearPreview();
        previewObjectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.src = previewObjectUrl;
        placePreview(img);
        report(
          token,
          'toBlob',
          `Blob（${blob.type}）`,
          stageW * pixelRatio,
          stageH * pixelRatio,
          formatBytes(blob.size),
          true,
        );
      })
      .catch(() => {
        if (token !== runId) {
          return;
        }
        report(token, 'toBlob', 'Blob（失败）', 0, 0, '—', true);
      });
  }

  function render() {
    // 源舞台只占左半，按包裹层实际宽高构建。
    const width = Math.floor(wrapper.clientWidth || 0);
    const height = Math.floor(wrapper.clientHeight || 0);
    if (width < 2 || height < 2) {
      return; // 尚未布局，等 ResizeObserver 触发
    }
    buildStage(width, height);
    exportScene();
  }

  const resizeObserver = createResizeObserver(canvas, render);

  render();

  return {
    update(options) {
      current = options;
      exportScene();
    },
    dispose() {
      // 让在途的 Promise 全部过期，避免离开页面后还回调。
      runId++;
      if (stage) {
        stage.destroy();
        stage = null;
      }
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
      }
      resizeObserver.disconnect();
      wrapper.remove();
      preview.remove();
    },
  };
}

// 估算 data URL 中 base64 部分解码后的字节数：payload 长度 × 3/4 再减去末尾 = 填充。
function estimateBase64Bytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}
