/**
 * 范例：演示 Babylon.js 相机与控制——相机自带输入（attachControl）、相机类型切换、投影模式切换，以及 AutoRotationBehavior。
 * 输入：
 *   - 相机与投影：cameraType（'arcRotate' | 'free'）、projectionMode（'perspective' | 'orthographic'）。
 *   - 闲置自转：enableAutoRotation（boolean，写入 camera.useAutoRotationBehavior）。
 * 主要操作：
 *   - 切换 scene.activeCamera：ArcRotateCamera ↔ UniversalCamera，演示切换时要 detachControl 旧相机再 attachControl 新相机。
 *   - 切换 camera.mode：PERSPECTIVE_CAMERA ↔ ORTHOGRAPHIC_CAMERA；正交模式下手动设置 orthoLeft/Right/Top/Bottom
 *     （默认 null 等价于「1 像素 = 1 单位」，不适合正常场景），并在 engine resize 时按 aspect 重算。
 *   - 开关 useAutoRotationBehavior：观察闲置一段时间后相机自动绕 target 转动，任何输入都会重置等待计时。
 * 预期结果：readout 同步给出相机类型、投影、FOV、alpha/beta/radius 或位置、行为挂载状态与自转状态。
 * 阅读主线：buildStage（共享场景）→ createCameraExample（相机与投影）→ createBehaviorExample（闲置自转）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  ArcRotateCamera,
  AxesViewer,
  Camera,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core';

// 正交模式下的固定观察高度（世界单位的一半）；左右边界按当前 aspect 推算。
const ORTHO_HALF_HEIGHT = 5;

// 弧度转度数（结果按 360 取模，便于读者跟踪 alpha 持续累加）。
function radToDeg(rad: number): number {
  return Math.round((((rad * 180) / Math.PI) % 360 + 360) % 360);
}

/**
 * 共享舞台：地面 + 4 角彩色盒子 + 中心柱 + AxesViewer。
 * 4 角盒子距相机远近不同，便于直观对比「透视近大远小 / 正交尺寸不变」。
 */
function buildStage(scene: Scene): void {
  scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);
  new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);
  new AxesViewer(scene, 2.4);

  const ground = MeshBuilder.CreateGround('ground', { width: 16, height: 16 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.82, 0.83, 0.8);
  ground.material = groundMat;

  // 4 角盒子：不同颜色，分布在距中心不同的 Z 上，用来对比透视/正交下「远小近不小」的差异。
  const corners: ReadonlyArray<readonly [string, Vector3, Color3]> = [
    ['boxA', new Vector3(-3, 0.5, -3), new Color3(0.24, 0.45, 0.85)],
    ['boxB', new Vector3(3, 0.5, -3), new Color3(0.85, 0.42, 0.24)],
    ['boxC', new Vector3(-3, 0.5, 3), new Color3(0.3, 0.7, 0.36)],
    ['boxD', new Vector3(3, 0.5, 3), new Color3(0.85, 0.7, 0.2)],
  ];
  for (const [name, pos, color] of corners) {
    const box = MeshBuilder.CreateBox(name, { size: 1 }, scene);
    const mat = new StandardMaterial(`${name}Mat`, scene);
    mat.diffuseColor = color;
    box.material = mat;
    box.position.copyFrom(pos);
  }

  // 中心柱：让绕 target 的轨道相机有明确观察中心。
  const pillar = MeshBuilder.CreateCylinder('pillar', { height: 2.4, diameter: 0.5 }, scene);
  const pillarMat = new StandardMaterial('pillarMat', scene);
  pillarMat.diffuseColor = new Color3(0.4, 0.4, 0.45);
  pillar.material = pillarMat;
  pillar.position.set(0, 1.2, 0);
}

/* ---------------- 相机与投影：相机类型 + 投影模式 ---------------- */

export interface CameraExampleOptions {
  cameraType: 'arcRotate' | 'free';
  projectionMode: 'perspective' | 'orthographic';
}

export interface CameraExampleSnapshot {
  cameraType: string;
  mode: string;
  fovDeg: number;
  // ArcRotate 模式下填这几个；Free 模式下读数面板用 freePos。
  alphaDeg: number;
  betaDeg: number;
  radius: number;
  freePos: string;
}

export interface CameraExampleInstance {
  update(options: CameraExampleOptions): void;
  dispose(): void;
}

export function createCameraExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CameraExampleSnapshot) => void,
): CameraExampleInstance {
  let current: CameraExampleOptions = {
    cameraType: 'arcRotate',
    projectionMode: 'perspective',
  };

  // 在 setup 期间赋值（createBabylonRuntime 同步执行 setup，赋值在返回前完成）。
  let arc!: ArcRotateCamera;
  let freeCam!: UniversalCamera;
  let activeScene!: Scene;
  let activeEngine!: Engine;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    buildStage(scene);
    activeScene = scene;
    activeEngine = engine;

    // ArcRotateCamera：绕 target 的 alpha/beta/radius。alpha/beta 是弧度，radius 是世界单位。
    arc = new ArcRotateCamera(
      'arc',
      -Math.PI / 2.2,
      Math.PI / 2.6,
      11,
      new Vector3(0, 1, 0),
      scene,
    );
    arc.minZ = 0.1;
    // 给 radius 一个下限，避免滚轮贴脸穿到 target 内部（默认 null 不限）。
    arc.lowerRadiusLimit = 2;

    // UniversalCamera：FreeCamera 的现代升级版，默认带键鼠 + 触控 + 手柄输入。
    freeCam = new UniversalCamera('free', new Vector3(0, 4, -9), scene);
    freeCam.setTarget(new Vector3(0, 1, 0));
    freeCam.minZ = 0.1;
    // 默认键盘输入只绑方向键，补 WASD 才符合第一人称直觉。
    freeCam.keysUp.push(87);    // W
    freeCam.keysDown.push(83);  // S
    freeCam.keysLeft.push(65);  // A
    freeCam.keysRight.push(68); // D

    // 默认让 ArcRotate 接管 canvas 输入。
    scene.activeCamera = arc;
    arc.attachControl(canvas, true);

    scene.onBeforeRenderObservable.add(() => {
      const active = scene.activeCamera;
      if (!active) return;
      const isArc = active === arc;
      emit({
        cameraType: isArc ? 'ArcRotateCamera' : 'UniversalCamera',
        mode: active.mode === Camera.PERSPECTIVE_CAMERA ? '透视' : '正交',
        fovDeg: Math.round((active.fov * 180) / Math.PI * 10) / 10,
        alphaDeg: isArc ? radToDeg(arc.alpha) : 0,
        betaDeg: isArc ? Math.round((arc.beta * 180) / Math.PI) : 0,
        radius: isArc ? Math.round(arc.radius * 10) / 10 : 0,
        freePos: isArc
          ? '—'
          : `(${active.position.x.toFixed(1)}, ${active.position.y.toFixed(1)}, ${active.position.z.toFixed(1)})`,
      });
    });

    return scene;
  });

  // 把投影/相机状态实际写到相机上。切换相机类型时必须先 detachControl 旧相机再 attachControl 新相机，
  // 否则两台相机的输入处理器都会挂在 canvas 上、互相干扰（这是从 three.js 迁移时最容易漏掉的一步）。
  function applyOptions(opts: CameraExampleOptions): void {
    const desired = opts.cameraType === 'arcRotate' ? arc : freeCam;
    if (activeScene.activeCamera !== desired) {
      activeScene.activeCamera?.detachControl();
      activeScene.activeCamera = desired;
      desired.attachControl(canvas, true);
    }

    if (opts.projectionMode === 'orthographic') {
      // 正交模式：ortho* 默认为 null，等价于「1 像素 = 1 单位」，正常场景要先按 aspect 设边界。
      desired.mode = Camera.ORTHOGRAPHIC_CAMERA;
      const aspect =
        activeEngine.getRenderWidth() / Math.max(1, activeEngine.getRenderHeight());
      desired.orthoTop = ORTHO_HALF_HEIGHT;
      desired.orthoBottom = -ORTHO_HALF_HEIGHT;
      desired.orthoLeft = -ORTHO_HALF_HEIGHT * aspect;
      desired.orthoRight = ORTHO_HALF_HEIGHT * aspect;
    } else {
      // 切回透视时把 ortho* 清回 null，避免残留影响下次正交切换。
      desired.mode = Camera.PERSPECTIVE_CAMERA;
      desired.orthoLeft = null;
      desired.orthoRight = null;
      desired.orthoTop = null;
      desired.orthoBottom = null;
    }
  }

  applyOptions(current);

  // 窗口/容器尺寸变化时，正交模式下的左右边界要按新 aspect 重算，否则画面会被拉伸。
  // 共享 runtime 已会调 engine.resize()，这里挂 onResizeObservable 接力更新正交边界。
  activeEngine.onResizeObservable.add(() => applyOptions(current));

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

/* ---------------- 闲置自转：AutoRotationBehavior ---------------- */

export interface BehaviorExampleOptions {
  enableAutoRotation: boolean;
}

export interface BehaviorExampleSnapshot {
  attached: string;
  alphaDeg: number;
  idleSpeed: number;
  waitTime: number;
  rotating: boolean;
}

export interface BehaviorExampleInstance {
  update(options: BehaviorExampleOptions): void;
  dispose(): void;
}

export function createBehaviorExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BehaviorExampleSnapshot) => void,
): BehaviorExampleInstance {
  let current: BehaviorExampleOptions = { enableAutoRotation: true };
  let arc!: ArcRotateCamera;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    buildStage(scene);

    arc = new ArcRotateCamera(
      'arc',
      -Math.PI / 2.2,
      Math.PI / 2.6,
      11,
      new Vector3(0, 1, 0),
      scene,
    );
    arc.minZ = 0.1;
    arc.lowerRadiusLimit = 2;
    arc.attachControl(canvas, true);

    // useAutoRotationBehavior 是 setter：true 时创建 AutoRotationBehavior 并 addBehavior；
    // false 时 removeBehavior。闲置 idleRotationWaitTime（默认 2000 ms）无输入后开始缓慢自转。
    arc.useAutoRotationBehavior = current.enableAutoRotation;

    scene.onBeforeRenderObservable.add(() => {
      const behavior = arc.autoRotationBehavior;
      emit({
        attached: behavior ? '已挂载' : '未挂载',
        alphaDeg: radToDeg(arc.alpha),
        idleSpeed: behavior ? behavior.idleRotationSpeed : 0,
        waitTime: behavior ? behavior.idleRotationWaitTime : 0,
        rotating: behavior?.rotationInProgress ?? false,
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      // toggle 同一 setter 即可安全开关，不会有监听泄漏。
      arc.useAutoRotationBehavior = options.enableAutoRotation;
    },
    dispose() {
      runtime.dispose();
    },
  };
}
