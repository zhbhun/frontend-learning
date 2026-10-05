/**
 * 预处理模块：RGBA 像素缓冲 → 模型输入张量（纯函数，不碰 DOM、不碰会话）。
 * 演示内容：把「图像与 Tensor 互转」课的三步改写（通道 / 布局 / 值域）封装成可单独核对
 * 的应用模块；几何变换（缩放 + 中心裁剪）留在 drawImage，由应用外壳完成。
 * 输入：224×224 的 RGBA 缓冲（ImageData 即满足 RgbaImage 契约）。
 * 操作：normalize 模式 imagenet（模型约定）/ divide（只÷255）/ raw（0–255 原值），
 * 后两档用于演示「错而不报」。
 * 预期结果：imagenet 模式下输入张量取值落在理论范围 [-2.12, 2.64]；错误模式不报任何错，
 * 但输出读数不可信——证据见课程正文「预处理」一节。
 * 阅读主线：rgbaToTensor 的三步改写循环；valueRange 供读数核对。
 */
import { Tensor } from 'onnxruntime-web';

/** SqueezeNet 1.1 的输入边长：签名 float[1,3,224,224]。 */
export const INPUT_SIZE = 224;

/** ImageNet 归一化常量：Model Zoo SqueezeNet 页的预处理约定。 */
export const MEAN = [0.485, 0.456, 0.406];
export const STD = [0.229, 0.224, 0.225];

/** imagenet 归一化下的理论取值界：(0−mean)/std 与 (1−mean)/std 的全局最小 / 最大。 */
export const IMAGENET_RANGE = { min: -2.12, max: 2.64 } as const;

/** 预处理的输入契约：只承诺一份 RGBA 像素与尺寸，因此脱离浏览器 DOM 也能复用与核对。 */
export interface RgbaImage {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

/** 归一化模式：imagenet 是模型约定；divide / raw 是「错而不报」的对照档。 */
export type NormalizeMode = 'imagenet' | 'divide' | 'raw';

export const NORMALIZE_LABELS: Record<NormalizeMode, string> = {
  imagenet: 'ImageNet mean/std（模型约定）',
  divide: '只 ÷255（缺 mean/std）',
  raw: '0–255 原值（完全错域）',
};

/**
 * RGBA → float32 [1,3,H,W]。三步改写：丢 alpha 取 RGB → HWC 交错改 CHW 分面 →
 * 按约定归一。调用方必须先把它缩放裁剪到目标尺寸；这里只负责像素改写。
 */
export function rgbaToTensor(image: RgbaImage, mode: NormalizeMode = 'imagenet'): Tensor {
  const { data, width: W, height: H } = image;
  const plane = W * H;
  const out = new Float32Array(3 * plane);

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4; // RGBA 交错，A 在 i+3，直接丢弃
      for (let c = 0; c < 3; c += 1) {
        const pixel = data[i + c];
        let value: number;
        if (mode === 'imagenet') {
          value = (pixel / 255 - MEAN[c]) / STD[c];
        } else if (mode === 'divide') {
          value = pixel / 255;
        } else {
          value = pixel;
        }
        out[c * plane + y * W + x] = value; // HWC → CHW：通道分面
      }
    }
  }
  return new Tensor('float32', out, [1, 3, H, W]);
}

/** min / max 范围读数：核对归一化是否按约定执行的最直接证据。 */
export function valueRange(data: ArrayLike<number>): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < data.length; i += 1) {
    const value = data[i];
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }
  return { min, max };
}
