/**
 * 范例介绍：演示 Babylon.js 默认左手坐标系、局部/世界空间差异，以及画布尺寸与硬件缩放。
 * 输入：
 *   - 坐标空间：useRightHanded（坐标系开关）、parentRotationY（父节点绕 Y 旋转，度）。
 *   - 画布与缩放：scalingLevel（engine.setHardwareScalingLevel 的倍率）。
 * 主要操作：
 *   - 切换 scene.useRightHandedSystem，观察 AxesViewer 三色轴与剔除方向。
 *   - 改父节点 rotation.y，子节点 position 恒定，对比 getAbsolutePosition() 的世界读数。
 *   - 改硬件缩放级别，渲染分辨率随 CSS 尺寸 / 级别变化，CSS 尺寸不变。
 * 预期结果：readout 同步给出坐标系、局部坐标、世界坐标、CSS 尺寸与渲染分辨率。
 * 阅读主线：createCoordinateSpaceExample（坐标空间）→ createCanvasScalingExample（画布与缩放）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  ArcRotateCamera,
  AxesViewer,
  Color3,
  Color4,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

// 把 Vector3 格式化成 (x, y, z) 两位小数，便于 readout 阅读。
function formatVector(v: Vector3): string {
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

// 一组相机角度：在原点斜上方观察，+X 偏右、+Y 朝上、+Z 朝画面深处（默认左手系）。
const CAMERA_ALPHA = -Math.PI / 2.2;
const CAMERA_BETA = Math.PI / 2.7;
const CAMERA_RADIUS = 13;

/* ---------------- 坐标空间：坐标系开关 + 局部/世界 ---------------- */

export interface CoordinateSpaceOptions {
  useRightHanded: boolean;
  parentRotationY: number; // 度
}

export interface CoordinateSpaceSnapshot {
  handedness: string;
  childLocal: string;
  childWorld: string;
}

export interface CoordinateSpaceInstance {
  update(options: CoordinateSpaceOptions): void;
  dispose(): void;
}

export function createCoordinateSpaceExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CoordinateSpaceSnapshot) => void,
): CoordinateSpaceInstance {
  let current: CoordinateSpaceOptions = {
    useRightHanded: false,
    parentRotationY: 0,
  };

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    // ArcRotateCamera：绕原点的轨道相机，鼠标/触摸可拖动调整观察方向。
    const camera = new ArcRotateCamera(
      'camera',
      CAMERA_ALPHA,
      CAMERA_BETA,
      CAMERA_RADIUS,
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 半球光：给基础照明，避免 StandardMaterial 全黑。
    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // AxesViewer：在原点显示三色世界轴——X 红、Y 绿、Z 蓝。
    // 默认沿 +X/+Y/+Z 画箭头，scaleLines 控制线长。
    new AxesViewer(scene, 3);

    // 父节点：位于原点，绕 Y 旋转；子节点局部坐标固定，世界坐标随父级变化。
    const parent = new TransformNode('parent', scene);

    // 子节点：小立方体，局部位置恒为 (2.5, 0, 0)。
    const child = MeshBuilder.CreateBox('child', { size: 0.9 }, scene);
    const childMat = new StandardMaterial('childMat', scene);
    childMat.diffuseColor = new Color3(0.24, 0.45, 0.85);
    // 切换坐标系时背面剔除方向会翻转，关掉剔除避免“看不见”造成误判。
    childMat.backFaceCulling = false;
    child.material = childMat;
    child.parent = parent;
    child.position.set(2.5, 0, 0);

    // +Y 地标：绿色小球悬在上方，强调“上”方向。
    const up = MeshBuilder.CreateSphere('up', { diameter: 0.5 }, scene);
    const upMat = new StandardMaterial('upMat', scene);
    upMat.diffuseColor = new Color3(0.3, 0.7, 0.36);
    upMat.backFaceCulling = false;
    up.material = upMat;
    up.position.set(0, 2.8, 0);

    scene.onBeforeRenderObservable.add(() => {
      // 坐标系：Babylon 默认左手系（+Z 朝前）。切到右手系会翻转投影与背面剔除。
      scene.useRightHandedSystem = current.useRightHanded;
      // rotation.y 单位是弧度：度数先乘以 Math.PI / 180。
      parent.rotation.y = (current.parentRotationY * Math.PI) / 180;

      // 读取世界坐标前强制刷新世界矩阵（内部会递归刷新父级），避免读到上一帧旧值。
      child.computeWorldMatrix(true);
      const world = child.getAbsolutePosition();

      emit({
        handedness: scene.useRightHandedSystem ? '右手系' : '左手系（默认）',
        childLocal: formatVector(child.position),
        childWorld: formatVector(world),
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
    },
    dispose() {
      runtime.dispose();
    },
  };
}

/* ---------------- 画布与缩放：CSS 尺寸 / 渲染分辨率 / 硬件缩放 ---------------- */

export interface CanvasScalingOptions {
  scalingLevel: number;
}

export interface CanvasScalingSnapshot {
  cssSize: string;
  renderSize: string;
  scalingLevel: number;
}

export interface CanvasScalingInstance {
  update(options: CanvasScalingOptions): void;
  dispose(): void;
}

export function createCanvasScalingExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CanvasScalingSnapshot) => void,
): CanvasScalingInstance {
  let current: CanvasScalingOptions = { scalingLevel: 1 };

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    const camera = new ArcRotateCamera(
      'camera',
      CAMERA_ALPHA,
      CAMERA_BETA,
      9,
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 圆环：缩小硬件缩放级别时，曲面边缘的锯齿变化最直观。
    const torus = MeshBuilder.CreateTorus(
      'torus',
      { diameter: 4, thickness: 0.6, tessellation: 48 },
      scene,
    );
    const mat = new StandardMaterial('mat', scene);
    mat.diffuseColor = new Color3(0.85, 0.42, 0.24);
    mat.backFaceCulling = false;
    torus.material = mat;

    new AxesViewer(scene, 2.4);

    scene.onBeforeRenderObservable.add(() => {
      const cssWidth = Math.max(1, canvas.clientWidth);
      const cssHeight = Math.max(1, canvas.clientHeight);

      emit({
        cssSize: `${cssWidth} × ${cssHeight}`,
        renderSize: `${Math.round(engine.getRenderWidth())} × ${Math.round(engine.getRenderHeight())}`,
        scalingLevel: engine.getHardwareScalingLevel(),
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      // setHardwareScalingLevel：>1 降低渲染分辨率（性能优先）；
      // <1 超采样（质量优先，像素更多）。CSS 尺寸不受影响。
      runtime.engine.setHardwareScalingLevel(options.scalingLevel);
    },
    dispose() {
      runtime.dispose();
    },
  };
}
