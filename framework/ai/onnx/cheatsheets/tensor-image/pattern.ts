/* 课程共用的演示图案：页面内生成，通道特征分明，供三个范例复用。 */

export const PATTERN_WIDTH = 32;
export const PATTERN_HEIGHT = 24;

/** 把 ImageData 包进离屏 canvas，供 drawImage 放大或继续加工。 */
export function imageDataToCanvas(image: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

/** 把 ImageData 放大绘制到目标矩形（关闭平滑，保持像素格清晰）。 */
export function drawImageDataScaled(
  context: CanvasRenderingContext2D,
  image: ImageData,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.imageSmoothingEnabled = false;
  context.drawImage(imageDataToCanvas(image), x, y, width, height);
  context.imageSmoothingEnabled = true;
  context.strokeStyle = 'rgba(148,163,184,0.4)';
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

/**
 * 生成演示图案：红色圆盘（R 通道高）、绿色斜带（G 通道高）、
 * 向右增强的蓝色渐变（B 通道高）。纯确定性绘制，方便读数核对。
 */
export function buildPatternImageData(
  width = PATTERN_WIDTH,
  height = PATTERN_HEIGHT,
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#1e3a8a');
  gradient.addColorStop(1, '#7dd3fc');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(width * 0.3, height * 0.38, height * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(width * 0.72, height * 0.62);
  ctx.rotate(-0.45);
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(-width * 0.32, -height * 0.1, width * 0.64, height * 0.2);
  ctx.restore();

  return ctx.getImageData(0, 0, width, height);
}
