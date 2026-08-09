/**
 * 范例：纹理采样——包裹、过滤、UV 缩放与 Y 翻转的可视化。
 * 输入：
 *   - wrapU / wrapV：'CLAMP' | 'WRAP' | 'MIRROR'（对应 Texture 的 *_ADDRESSMODE 常量）。
 *   - uScale / vScale：UV 缩放；> 1 时 UV 越界，触发 wrap 行为，三种包裹差异才看得见。
 *   - samplingMode：'NEAREST' | 'BILINEAR' | 'TRILINEAR'（对应 Texture 的 *_SAMPLINGMODE）。
 *   - invertY：上传时是否翻转 Y 轴（默认 true，与 Texture 构造一致）。
 * 主要操作：
 *   - paintGridPixels 在 DynamicTexture 的 2D canvas 上画「4×4 彩色格子 + 向上箭头 + 四角标记」，
 *     避开远程贴图依赖（headless / 离线也能跑）；箭头与角标让 invertY 翻转肉眼可分。
 *   - 把 texture 挂到 StandardMaterial.diffuseTexture，配合 disableLighting 让贴图原色显示，
 *     不被光照数学干扰采样观察。
 *   - wrap/scale 直接写 texture 属性即时生效；samplingMode 变化要重建贴图（GPU sampling state 在
 *     创建时确定）；invertY 变化要重新 update(invertY)。
 * 预期结果：
 *   - WRAP + uScale=2：平面出现 2×2 共 4 份格子（平铺）。
 *   - MIRROR + uScale=2：相邻格子左右 / 上下镜像（箭头朝向交替反向）。
 *   - CLAMP + uScale=2：左下角一份完整格子，其余区域被边缘像素拉满（钳制）。
 *   - NEAREST：格子边缘锯齿；TRILINEAR：边缘平滑。
 *   - 关闭 invertY：箭头与文字上下翻转（因为 canvas 原点在左上、UV 原点在左下）。
 * 阅读主线：paintGridPixels → makeGridTexture → createTexturesExample 里的 material/texture 装配 → applyOptions。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DynamicTexture,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

const TEX_SIZE = 256;

export type WrapModeName = 'CLAMP' | 'WRAP' | 'MIRROR';
export type SamplingModeName = 'NEAREST' | 'BILINEAR' | 'TRILINEAR';

export interface TexturesOptions {
  wrapU: WrapModeName;
  wrapV: WrapModeName;
  uScale: number;
  vScale: number;
  samplingMode: SamplingModeName;
  invertY: boolean;
}

export interface TexturesSnapshot {
  wrapU: WrapModeName;
  wrapV: WrapModeName;
  uScale: number;
  vScale: number;
  samplingMode: SamplingModeName;
  invertY: boolean;
  fps: number;
}

export interface TexturesInstance {
  update(options: TexturesOptions): void;
  dispose(): void;
}

// 字符串入参 → Babylon 数值常量。Controls 用字符串便于阅读，真正写进 Texture 的是数值常量。
const WRAP_CONST: Record<WrapModeName, number> = {
  CLAMP: Texture.CLAMP_ADDRESSMODE,
  WRAP: Texture.WRAP_ADDRESSMODE,
  MIRROR: Texture.MIRROR_ADDRESSMODE,
};
const SAMPLING_CONST: Record<SamplingModeName, number> = {
  NEAREST: Texture.NEAREST_SAMPLINGMODE,
  BILINEAR: Texture.BILINEAR_SAMPLINGMODE,
  TRILINEAR: Texture.TRILINEAR_SAMPLINGMODE,
};

// 16 色调色板，行优先填进 4×4 格子；颜色差异让 wrap / mirror 一眼可分。
const PALETTE = [
  '#e23c4d', '#e0a82e', '#3ca45a', '#3d6fd6',
  '#9b51e0', '#1ab2c4', '#e07a2e', '#d64f9a',
  '#5a8de0', '#7cb342', '#f0c419', '#ef5350',
  '#26a69a', '#8d6e63', '#78909c', '#bdbdbd',
];

// 在贴图的 2D canvas 上画格子 + 箭头 + 角标；只动像素，不调 update。
function paintGridPixels(ctx: CanvasRenderingContext2D): void {
  const cells = 4;
  const cell = TEX_SIZE / cells;

  ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);

  // 4×4 彩色底格。
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      ctx.fillStyle = PALETTE[r * cells + c];
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }

  // 白色分隔线，强化「平铺 / 镜像」的视觉边界。
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 4;
  for (let i = 1; i < cells; i++) {
    line(ctx, i * cell, 0, i * cell, TEX_SIZE);
    line(ctx, 0, i * cell, TEX_SIZE, i * cell);
  }

  // 中心向上箭头：invertY 翻转时它会变成朝下，比纯格子更直观。
  drawUpArrow(ctx, TEX_SIZE / 2, TEX_SIZE / 2, TEX_SIZE * 0.26);

  // 四角字母，让「平铺了几份」和「是否镜像」直接可数。
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.font = 'bold 26px sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('TL', 10, 8);
  ctx.textAlign = 'right';
  ctx.fillText('TR', TEX_SIZE - 10, 8);
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillText('BL', 10, TEX_SIZE - 8);
  ctx.textAlign = 'right';
  ctx.fillText('BR', TEX_SIZE - 10, TEX_SIZE - 8);
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawUpArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.6, size * 0.45);
  ctx.lineTo(size * 0.24, size * 0.45);
  ctx.lineTo(size * 0.24, size * 0.9);
  ctx.lineTo(-size * 0.24, size * 0.9);
  ctx.lineTo(-size * 0.24, size * 0.45);
  ctx.lineTo(-size * 0.6, size * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// 构造一张程序化的 DynamicTexture：开启 mipmap 让 TRILINEAR 有层级可用。
// 注意 DynamicTexture 的 wrapU/wrapV 在构造里被强制设成 CLAMP，这里每次创建后再覆盖回所需值。
function makeGridTexture(scene: Scene, samplingMode: number): DynamicTexture {
  const tex = new DynamicTexture(
    'gridTex',
    { width: TEX_SIZE, height: TEX_SIZE },
    scene,
    true, // generateMipMaps：TRILINEAR 需要；NEAREST/BILINEAR 不会被采样
    samplingMode,
  );
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  paintGridPixels(ctx);
  tex.update(); // 默认 invertY=true，与 Texture 构造默认一致
  return tex;
}

// 重新画像素并以指定 invertY 上传：invertY 翻转开关走这条路径，不必重建贴图。
function repaint(tex: DynamicTexture, invertY: boolean): void {
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  paintGridPixels(ctx);
  tex.update(invertY);
}

export function createTexturesExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TexturesSnapshot) => void,
): TexturesInstance {
  let current: TexturesOptions = {
    wrapU: 'WRAP',
    wrapV: 'WRAP',
    uScale: 2,
    vScale: 2,
    samplingMode: 'TRILINEAR',
    invertY: true,
  };

  // 把需要跨 update / 帧回调共享的对象收进 holder，避免闭包失效。
  const holder: {
    scene: Scene | null;
    material: StandardMaterial | null;
    texture: DynamicTexture | null;
    lastSampling: SamplingModeName | null;
    lastInvertY: boolean;
  } = { scene: null, material: null, texture: null, lastSampling: null, lastInvertY: true };

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.12, 0.14, 0.16, 1);
    holder.scene = scene;

    // ArcRotateCamera 放在 -Z 方向、略微俯视；attachControl 后可鼠标拖拽 / 滚轮缩放。
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2.3,
      4.5,
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 半球光：本范例 disableLighting，光只用于「存在」以满足受光材质的最低预期，不影响颜色。
    new HemisphericLight('light', new Vector3(0.3, 1, 0.4), scene);

    // 平面：默认位于 XY 平面、法线 +Z；绕 Y 转 π 让正面朝向 -Z 的相机。
    const plane = MeshBuilder.CreatePlane('plane', { width: 4, height: 4 }, scene);
    plane.rotation.y = Math.PI;

    const mat = new StandardMaterial('planeMat', scene);
    mat.diffuseColor = new Color3(1, 1, 1); // 不染色，让贴图原色显示
    mat.disableLighting = true; // 跳过光照数学，直接输出 diffuseTexture × diffuseColor
    plane.material = mat;
    holder.material = mat;

    // 首张贴图按 current.samplingMode 构建，再写入 wrap/scale。
    holder.texture = makeGridTexture(scene, SAMPLING_CONST[current.samplingMode]);
    mat.diffuseTexture = holder.texture;
    holder.lastSampling = current.samplingMode;
    holder.lastInvertY = current.invertY;
    applyTexState(current);

    scene.onBeforeRenderObservable.add(() => {
      emit({
        wrapU: current.wrapU,
        wrapV: current.wrapV,
        uScale: current.uScale,
        vScale: current.vScale,
        samplingMode: current.samplingMode,
        invertY: current.invertY,
        fps: Math.round(1000 / Math.max(engine.getDeltaTime(), 1)),
      });
    });

    return scene;
  });

  // wrap / scale 是 texture 的可写属性，每帧都直接生效。
  function applyTexState(opts: TexturesOptions): void {
    const tex = holder.texture;
    if (!tex) return;
    tex.wrapU = WRAP_CONST[opts.wrapU];
    tex.wrapV = WRAP_CONST[opts.wrapV];
    tex.uScale = opts.uScale;
    tex.vScale = opts.vScale;
  }

  // samplingMode 变化要重建贴图（GPU sampling state 在 createDynamicTexture 时确定）；
  // invertY 变化只需 update(invertY) 重新上传像素；其余靠 applyTexState。
  function applyOptions(opts: TexturesOptions): void {
    const scene = holder.scene;
    if (!scene) return;

    if (opts.samplingMode !== holder.lastSampling) {
      const old = holder.texture;
      holder.texture = makeGridTexture(scene, SAMPLING_CONST[opts.samplingMode]);
      if (holder.material) {
        holder.material.diffuseTexture = holder.texture;
      }
      old?.dispose();
      holder.lastSampling = opts.samplingMode;
      holder.lastInvertY = true; // makeGridTexture 内 update() 用的是默认 true
    }

    if (opts.invertY !== holder.lastInvertY && holder.texture) {
      repaint(holder.texture, opts.invertY);
      holder.lastInvertY = opts.invertY;
    }

    applyTexState(opts);
  }

  return {
    update(options) {
      current = options;
      applyOptions(options);
    },
    dispose() {
      runtime.dispose();
    },
  };
}
