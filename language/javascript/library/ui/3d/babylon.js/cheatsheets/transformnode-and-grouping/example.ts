/**
 * 范例：演示 TransformNode 作为分组工具——把车身、车舱和四个车轮挂到 carGroup 下，
 * "整体变换"（移动/旋转编组）与"各自变换"（单个车轮绕自身车轴自转）互不干扰。
 * 输入：
 *   - groupPositionX：编组 TransformNode 沿世界 X 的位移（单位）。
 *   - groupRotationY：编组绕 Y 旋转的角度（度）。
 *   - wheelSpin：是否让前右（FR）车轮绕自身车轴自转。
 * 主要操作：
 *   - 整体变换路径：改 carGroup.position.x / rotation.y，全部子物体跟随；子物体局部 position 不变。
 *   - 各自变换路径：改 FR 车轮 pivot 的 rotation.z，只让该车轮自转；编组不动，车轮世界位置不变。
 * 预期结果：readout 显示采样车轮（FR）局部 position 恒为 (0.65, -0.05, -0.55)；
 *   编组旋转/位移时采样车轮世界位置随之改变；车轮自转只改自身旋转，世界位置（编组静止时）不变。
 * 阅读主线：createBabylonRuntime 的 setup 里看 TransformNode 编组与父子挂载（注意每个车轮用
 *   一个 TransformNode 当"车轴 pivot"，让自转成为独立路径）→ onBeforeRenderObservable 里看
 *   整体变换与各自变换两条互不干扰的路径，以及矩阵刷新后 emit 读数。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

export interface TransformNodeGroupingOptions {
  groupPositionX: number; // 单位
  groupRotationY: number; // 度
  wheelSpin: 'NONE' | 'SPIN';
}

export interface TransformNodeGroupingSnapshot {
  groupWorld: string;
  groupRotationY: number;
  wheelSpin: string;
  sampleWheelLocal: string;
  sampleWheelWorld: string;
  sampleWheelSpin: string;
}

export interface TransformNodeGroupingInstance {
  update(options: TransformNodeGroupingOptions): void;
  dispose(): void;
}

// 把 Vector3 格式化成 (x, y, z) 两位小数，便于 readout 阅读。
function formatVector(v: Vector3): string {
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

// 四个车轮在 carGroup 局部空间里的角落位置：X 前后（车长沿 X）、Z 左右。
// FR（前右）是"各自变换"的采样对象，readout 与橙色材质帮助读者盯住它。
const WHEEL_CORNERS = [
  { name: 'wheelFL', x: 0.65, z: 0.55 },
  { name: 'wheelFR', x: 0.65, z: -0.55 },
  { name: 'wheelBL', x: -0.65, z: 0.55 },
  { name: 'wheelBR', x: -0.65, z: -0.55 },
];

export function createTransformNodeGroupingExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TransformNodeGroupingSnapshot) => void,
): TransformNodeGroupingInstance {
  let current: TransformNodeGroupingOptions = {
    groupPositionX: 0,
    groupRotationY: 0,
    wheelSpin: 'NONE',
  };

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    // ArcRotateCamera：绕目标点的轨道相机，鼠标/触摸可拖动调整观察方向。
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.3,
      Math.PI / 2.8,
      7,
      new Vector3(0, 0.2, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 地面：水平参考面，帮助读者判断车的位置和朝向。
    const ground = MeshBuilder.CreateGround(
      'ground',
      { width: 10, height: 10 },
      scene,
    );
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.82, 0.85, 0.82);
    groundMat.backFaceCulling = false;
    groundMat.wireframe = true;
    ground.material = groundMat;
    ground.position.y = -0.3;
    ground.isPickable = false;

    // 世界原点参考球：挂在场景根下（parent=null），不随编组移动/旋转。
    const origin = MeshBuilder.CreateSphere('origin', { diameter: 0.25 }, scene);
    const originMat = new StandardMaterial('originMat', scene);
    originMat.diffuseColor = new Color3(0.55, 0.57, 0.55);
    originMat.backFaceCulling = false;
    origin.material = originMat;

    // 编组：TransformNode 只承担变换、不参与渲染。整车所有部件挂在它下面做"整体变换"。
    const carGroup = new TransformNode('carGroup', scene);

    // 车身：长方体，长沿 X（车头朝 +X），挂在编组下。
    const body = MeshBuilder.CreateBox(
      'body',
      { width: 2, height: 0.5, depth: 1.2 },
      scene,
    );
    const bodyMat = new StandardMaterial('bodyMat', scene);
    bodyMat.diffuseColor = new Color3(0.28, 0.5, 0.78);
    bodyMat.backFaceCulling = false;
    body.material = bodyMat;
    body.parent = carGroup;
    body.position.set(0, 0.1, 0);

    // 车舱：较小长方体，偏向 +X（车头），让车的朝向在旋转编组时一目了然。
    const cabin = MeshBuilder.CreateBox(
      'cabin',
      { width: 1, height: 0.45, depth: 0.95 },
      scene,
    );
    const cabinMat = new StandardMaterial('cabinMat', scene);
    cabinMat.diffuseColor = new Color3(0.62, 0.78, 0.92);
    cabinMat.backFaceCulling = false;
    cabin.material = cabinMat;
    cabin.parent = carGroup;
    cabin.position.set(0.25, 0.575, 0);

    // 车轮材质：普通车轮用深色，采样车轮（FR）用对比橙色，方便读者盯住它。
    const wheelMat = new StandardMaterial('wheelMat', scene);
    wheelMat.diffuseColor = new Color3(0.16, 0.16, 0.18);
    wheelMat.backFaceCulling = false;
    const spinMat = new StandardMaterial('spinMat', scene);
    spinMat.diffuseColor = new Color3(0.92, 0.5, 0.25);
    spinMat.backFaceCulling = false;

    // 四个车轮：每个用一个 TransformNode 当"车轴 pivot"挂在编组下，再放一个圆柱体作为轮子。
    // 这样"自转"是一条独立路径（绕 pivot 的 Z），不与轮子自身的朝向 Euler 冲突，也演示了
    // 嵌套编组：carGroup → wheelPivot → wheel mesh。
    const pivots: Record<string, TransformNode> = {};
    const wheels: Record<string, Mesh> = {};
    for (const corner of WHEEL_CORNERS) {
      const pivot = new TransformNode(`${corner.name}Pivot`, scene);
      pivot.parent = carGroup;
      pivot.position.set(corner.x, -0.05, corner.z); // 局部角落坐标，恒定不变

      // 圆柱默认高沿 Y（车轴竖直）；绕 X 转 90° 让车轴沿 Z，轮子竖直站立、圆面朝 ±Z。
      const wheel = MeshBuilder.CreateCylinder(
        corner.name,
        { diameter: 0.5, height: 0.25 },
        scene,
      );
      wheel.material = corner.name === 'wheelFR' ? spinMat : wheelMat;
      wheel.parent = pivot;
      wheel.rotation.x = Math.PI / 2;

      pivots[corner.name] = pivot;
      wheels[corner.name] = wheel;
    }

    // 采样对象：前右（FR）车轮。自转 = spinPivot 绕 Z 转，只影响这个轮子。
    const spinPivot = pivots.wheelFR;
    const spinWheel = wheels.wheelFR;

    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;

      // 整体变换路径：只改编组，所有子物体跟随；子物体的局部 position 不被改写。
      carGroup.position.x = current.groupPositionX;
      carGroup.rotation.y = (current.groupRotationY * Math.PI) / 180;

      // 各自变换路径：只改采样车轮的 pivot，编组和其他三轮不受影响。
      // 车轴沿 pivot 的局部 Z，绕 Z 转就是"滚动"，且不会移动车轮中心（世界位置不变）。
      if (current.wheelSpin === 'SPIN') {
        spinPivot.rotation.z += dt * 3; // 3 rad/s
      }

      // 读世界结果前强制刷新父级链（内部会递归刷新），避免读到上一帧旧值。
      carGroup.computeWorldMatrix(true);
      spinWheel.computeWorldMatrix(true);

      emit({
        groupWorld: formatVector(carGroup.getAbsolutePosition()),
        groupRotationY: current.groupRotationY,
        wheelSpin: current.wheelSpin,
        sampleWheelLocal: formatVector(spinPivot.position),
        sampleWheelWorld: formatVector(spinWheel.getAbsolutePosition()),
        sampleWheelSpin: `${((spinPivot.rotation.z * 180) / Math.PI).toFixed(0)}°`,
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
