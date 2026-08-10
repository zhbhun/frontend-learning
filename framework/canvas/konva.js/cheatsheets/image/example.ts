/**
 * 范例介绍：演示 Konva.Image 的核心机制——图片源、裁剪区域与显示框的关系。
 *
 * 关系模型（最值得建立的直觉）：
 *   - image 属性接受 HTMLImageElement / HTMLCanvasElement / HTMLVideoElement 三种源。
 *     范例用一个绘制了「彩色四象限 + 网格」的离屏 canvas 作为源，既自包含（不依赖网络），
 *     又让任意裁剪区域的来源一眼可辨；同时证明 canvas 可以直接作为图片源。
 *   - cropX / cropY / cropWidth / cropHeight 用「源像素」坐标在源图上选一个矩形区域。
 *   - 节点的 width / height 是「显示框」，裁剪区域会被拉伸填满显示框——因此裁剪不保留宽高比。
 *
 * 输入：cropX、cropY、cropWidth、cropHeight（均为源像素）。
 * 操作：update(options) 应用 crop 后用 layer.batchDraw() 重绘；容器尺寸变化时重新布局。
 * 预期：左侧源图上的红色裁剪框随控件移动 / 缩放；右侧裁剪结果同步变化，并常被非等比拉伸；
 *   读数给出源尺寸、裁剪区域、显示框和两个方向的有效缩放（displaySize / cropSize）。
 * 阅读主线：buildSourceCanvas 生成源 canvas → 左侧源图缩略图 + 裁剪框 → 右侧 Konva.Image 应用 crop。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 源 canvas 尺寸（像素）。裁剪控件的取值范围以此为参考上界。
const SOURCE_WIDTH = 320;
const SOURCE_HEIGHT = 240;
// 右侧裁剪结果的显示框（正方形，便于观察非等比拉伸）。
const RESULT_BOX = 220;
// 左侧源图缩略图的显示宽度（高度按源图宽高比派生）。
const THUMB_WIDTH = 280;
const THUMB_HEIGHT = Math.round(THUMB_WIDTH * (SOURCE_HEIGHT / SOURCE_WIDTH));

// 四象限配色 + 标号，让任意裁剪区域的来源可辨。
const QUADRANTS = [
  { x: 0, y: 0, fill: '#bfdbfe', label: '1' },
  { x: SOURCE_WIDTH / 2, y: 0, fill: '#bbf7d0', label: '2' },
  { x: 0, y: SOURCE_HEIGHT / 2, fill: '#fed7aa', label: '3' },
  { x: SOURCE_WIDTH / 2, y: SOURCE_HEIGHT / 2, fill: '#fbcfe8', label: '4' },
];

export interface ImageOptions {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

export interface ImageSnapshot {
  sourceSize: string;
  cropRegion: string;
  displayBox: string;
  scaleX: string;
  scaleY: string;
}

export interface ImageInstance {
  update(options: ImageOptions): void;
  dispose(): void;
}

export function createImageLesson(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ImageSnapshot) => void,
): ImageInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.inset = '0';
  root.appendChild(wrapper);
  canvas.style.display = 'none';

  // 1. 源：绘制彩色四象限 + 网格的离屏 canvas。Konva.Image 的 image 属性可直接接受 canvas。
  const source = buildSourceCanvas();

  const initial = readCanvasSize(canvas);
  const stage = new Konva.Stage({
    container: wrapper,
    width: initial.width,
    height: initial.height,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  // 顶部说明。
  const title = new Konva.Text({
    text: '左：源图（canvas 源）+ 裁剪框    右：裁剪区域拉伸填入显示框',
    x: 20,
    y: 16,
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fill: '#475569',
    listening: false,
  });
  layer.add(title);

  // 2. 左侧：源图缩略图（用 canvas 作 image 源）。
  const thumb = new Konva.Image({
    image: source,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    stroke: '#cbd5e1',
    strokeWidth: 1,
  });
  layer.add(thumb);

  // 源图上的裁剪框叠层：与缩略图同坐标系，按缩略比把源像素换算到缩略图坐标。
  const cropOutline = new Konva.Rect({
    stroke: '#ef4444',
    strokeWidth: 2,
    dash: [4, 3],
    listening: false,
  });
  layer.add(cropOutline);

  const thumbLabel = new Konva.Text({
    text: `源 ${SOURCE_WIDTH} × ${SOURCE_HEIGHT}（缩略图）`,
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fill: '#94a3b8',
    listening: false,
  });
  layer.add(thumbLabel);

  // 3. 右侧：裁剪结果。crop 在源像素空间选区，width / height 是显示框。
  //    Konva 的实现等价于 drawImage(source, cropX, cropY, cropW, cropH, 0, 0, width, height)。
  const result = new Konva.Image({
    image: source,
    width: RESULT_BOX,
    height: RESULT_BOX,
    stroke: '#cbd5e1',
    strokeWidth: 1,
  });
  layer.add(result);

  const resultLabel = new Konva.Text({
    text: `显示框 ${RESULT_BOX} × ${RESULT_BOX}`,
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fill: '#94a3b8',
    align: 'center',
    width: RESULT_BOX,
    listening: false,
  });
  layer.add(resultLabel);

  let current: ImageOptions = {
    cropX: 40,
    cropY: 30,
    cropWidth: 160,
    cropHeight: 120,
  };

  function layout() {
    const w = stage.width();
    const h = stage.height();
    // 左侧缩略图贴左、右侧结果贴右；两块整体垂直居中。
    const contentH = Math.max(THUMB_HEIGHT, RESULT_BOX);
    const top = Math.max(48, Math.round((h - contentH) / 2));
    thumb.position({ x: 24, y: top });
    thumbLabel.position({ x: 24, y: top + THUMB_HEIGHT + 8 });

    const resultX = Math.max(24 + THUMB_WIDTH + 32, w - 24 - RESULT_BOX);
    const resultY = Math.max(48, Math.round((h - RESULT_BOX) / 2));
    result.position({ x: resultX, y: resultY });
    resultLabel.position({ x: resultX, y: resultY + RESULT_BOX + 8 });
  }

  function draw() {
    layout();

    // 把源像素的裁剪区域换算到缩略图坐标，画红色虚线框。
    const sx = THUMB_WIDTH / SOURCE_WIDTH;
    const sy = THUMB_HEIGHT / SOURCE_HEIGHT;
    cropOutline.setAttrs({
      x: thumb.x() + current.cropX * sx,
      y: thumb.y() + current.cropY * sy,
      width: current.cropWidth * sx,
      height: current.cropHeight * sy,
    });

    // 用复合 crop 对象一次设置四个裁剪属性（也可分别用 cropX / cropY / cropWidth / cropHeight）。
    (result as Konva.Node).setAttrs({
      crop: {
        x: current.cropX,
        y: current.cropY,
        width: current.cropWidth,
        height: current.cropHeight,
      },
    });

    layer.batchDraw();

    emit({
      sourceSize: `${SOURCE_WIDTH} × ${SOURCE_HEIGHT}`,
      cropRegion: `(${current.cropX}, ${current.cropY})  ${current.cropWidth}×${current.cropHeight}`,
      displayBox: `${RESULT_BOX} × ${RESULT_BOX}`,
      scaleX: (RESULT_BOX / current.cropWidth).toFixed(2),
      scaleY: (RESULT_BOX / current.cropHeight).toFixed(2),
    });
  }

  // 容器尺寸变化时重读宽高并重新布局（裁剪框叠层与结果节点都要重新定位）。
  const resizeObserver = createResizeObserver(canvas, draw);

  draw();

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
      wrapper.remove();
    },
  };
}

// 构建源 canvas：四象限配色 + 大号标号 + 网格线，让任意裁剪区域的来源可辨。
function buildSourceCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SOURCE_WIDTH;
  c.height = SOURCE_HEIGHT;
  const ctx = c.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  for (const q of QUADRANTS) {
    ctx.fillStyle = q.fill;
    ctx.fillRect(q.x, q.y, SOURCE_WIDTH / 2, SOURCE_HEIGHT / 2);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 56px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(q.label, q.x + SOURCE_WIDTH / 4, q.y + SOURCE_HEIGHT / 4);
  }

  // 网格线（每 40px），便于估读裁剪坐标。
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.lineWidth = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (let x = 40; x < SOURCE_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, SOURCE_HEIGHT);
    ctx.stroke();
  }
  for (let y = 40; y < SOURCE_HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(SOURCE_WIDTH, y + 0.5);
    ctx.stroke();
  }

  // 边框。
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, SOURCE_WIDTH - 2, SOURCE_HEIGHT - 2);

  return c;
}
