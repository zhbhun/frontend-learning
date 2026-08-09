/**
 * 范例：Babylon.js Gizmo 交互式变换。
 * 输入：
 *   - gizmoType：'position' | 'rotation' | 'scale' | 'boundingBox' | 'none'
 *     互斥切换 manager 的 *GizmoEnabled 开关（开新的前先把其余置 false），演示四类 gizmo
 *     与“同时只开一种”的工作模式，对应 three.js TransformControls 的 translate/rotate/scale
 *     + Babylon 特有的 BoundingBoxGizmo（带 8 个缩放手柄的整体包围盒）。
 *   - target：'auto' | 'box' | 'sphere' | 'cylinder' | 'torus' | 'detach'
 *     'auto' 依赖 usePointerToAttachGizmos（默认 true）点击挂载 + clearGizmoOnEmptyPointerEvent
 *     点击空地取消；指定具体 mesh 则 attachToMesh(mesh) 并关掉自动挂载（锁死，让控件状态与读数一致）；
 *     'detach' 调 attachToMesh(null)。
 * 主要操作：
 *   - new GizmoManager(scene) 创建唯一管理器；clearGizmoOnEmptyPointerEvent=true 演示点空地取消。
 *   - applyGizmoType 互斥开关四类 gizmo；切类型时 _attachedMesh 保留，新 gizmo 自动绑同一目标。
 *   - applyTarget 控制挂载来源：auto=内置 POINTERDOWN 挂载；具体 mesh=手动 attachToMesh。
 *   - onBeforeRenderObservable 里 emit 读数：当前 gizmo 类型、attachedMesh 名称、manager.isDragging /
 *     isHovered、目标的 position / rotation（度）/ scaling。
 * 预期结果：
 *   - 默认 PositionGizmo 出现在盒子上；拖拽轴直接改 position，读数实时变化。
 *   - 切到 RotationGizmo：gizmo 仍在盒子上（_attachedMesh 保留），拖圆环改朝向；读数 rotation
 *     从 rotationQuaternion 分解成欧拉角度（RotationGizmo 默认用 quaternion，不写 rotation 欧拉角）。
 *   - 拖拽 gizmo 时相机不转（UtilityLayerRenderer 在 onPrePointerObservable 拦截，命中 gizmo 即
 *     skipOnPointerObservable=true，主场景含相机跳过该 POINTERDOWN），读数 isDragging=是；
 *     松手后 isDragging=否。
 *   - target=auto 时点击物体挂载、点击空地取消；切到具体物体直接挂载（并锁住自动挂载）。
 * 阅读主线：createGizmoExample（场景 + manager 创建）→ applyGizmoType/applyTarget（开关与挂载）
 *           → emit（readout 字段）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Color4,
  GizmoManager,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export type GizmoType = 'position' | 'rotation' | 'scale' | 'boundingBox' | 'none';
export type GizmoTarget = 'auto' | 'box' | 'sphere' | 'cylinder' | 'torus' | 'detach';

export interface GizmoExampleOptions {
  gizmoType: GizmoType;
  target: GizmoTarget;
}

export interface GizmoExampleSnapshot {
  gizmoLabel: string;
  targetName: string;
  dragging: string;
  hovered: string;
  position: string;
  rotation: string;
  scaling: string;
}

export interface GizmoExampleInstance {
  update(options: GizmoExampleOptions): void;
  dispose(): void;
}

export function createGizmoExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GizmoExampleSnapshot) => void,
): GizmoExampleInstance {
  let current: GizmoExampleOptions = { gizmoType: 'position', target: 'box' };

  // createBabylonRuntime 同步执行 setup，因此 manager / activeScene 在 setup 返回后已赋值。
  let manager!: GizmoManager;
  let activeScene!: Scene;
  const targets: Mesh[] = [];

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);
    activeScene = scene;

    // attachControl 后相机也消费指针：拖空地旋转、滚轮缩放。gizmo 拖拽时由 UtilityLayerRenderer
    // 在 pre-pointer 阶段 skip 主场景指针，相机不会同时转动——不需要像 three.js 那样手写桥接。
    const camera = new ArcRotateCamera(
      'cam',
      -Math.PI / 2.4,
      Math.PI / 2.6,
      11,
      new Vector3(0, 0.6, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 22;
    camera.wheelPrecision = 30;
    camera.attachControl(canvas, true);

    new HemisphericLight('hemi', new Vector3(0.4, 1, 0.3), scene);

    // 地面仅作视觉参照；isPickable=false 让点击空地的 pickedMesh 为 null，
    // 配合 clearGizmoOnEmptyPointerEvent=true 实现“点空地取消挂载”。
    const ground = MeshBuilder.CreateGround('ground', { width: 18, height: 12 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.82, 0.83, 0.8);
    groundMat.emissiveColor = new Color3(0.16, 0.17, 0.16);
    ground.material = groundMat;
    ground.isPickable = false;

    // 四个可变换对象，各自独立材质。
    const specs: Array<{ build: () => Mesh; pos: Vector3; color: Color3 }> = [
      { build: () => MeshBuilder.CreateBox('box', { size: 1.4 }, scene), pos: new Vector3(-3, 0.7, -2), color: new Color3(0.24, 0.45, 0.85) },
      { build: () => MeshBuilder.CreateSphere('sphere', { diameter: 1.5 }, scene), pos: new Vector3(3, 0.8, -2), color: new Color3(0.3, 0.7, 0.36) },
      { build: () => MeshBuilder.CreateCylinder('cylinder', { height: 1.8, diameter: 1.2 }, scene), pos: new Vector3(-3, 0.9, 2), color: new Color3(0.85, 0.55, 0.2) },
      { build: () => MeshBuilder.CreateTorus('torus', { diameter: 1.6, thickness: 0.45 }, scene), pos: new Vector3(3, 0.5, 2), color: new Color3(0.7, 0.35, 0.75) },
    ];
    for (const spec of specs) {
      const m = spec.build();
      m.position.copyFrom(spec.pos);
      const mat = new StandardMaterial(`${m.name}Mat`, scene);
      mat.diffuseColor.copyFrom(spec.color);
      m.material = mat;
      targets.push(m);
    }

    // GizmoManager：一个管理器统一管四类 gizmo + 内置 POINTERDOWN 挂载。
    manager = new GizmoManager(scene);
    // 默认 clearGizmoOnEmptyPointerEvent=false（点空地不取消）；这里置 true 演示“点空地取消挂载”。
    manager.clearGizmoOnEmptyPointerEvent = true;

    // 每帧把派生读数 emit 给 readout。manager.isDragging / isHovered 聚合四类子 gizmo 的状态。
    scene.onBeforeRenderObservable.add(() => {
      const attached = manager.attachedMesh;
      emit({
        gizmoLabel: labelForType(current.gizmoType),
        targetName: attached ? humanNameOf(attached.name) : '—',
        dragging: manager.isDragging ? '是' : '否',
        hovered: manager.isHovered ? '是' : '否',
        position: attached ? formatVector(attached.position) : '—',
        rotation: attached ? formatRotation(attached) : '—',
        scaling: attached ? formatVector(attached.scaling) : '—',
      });
    });

    return scene;
  });

  // 初始化为默认状态（position gizmo 挂到盒子），让 create 返回的实例立即可用。
  applyGizmoType(current.gizmoType);
  applyTarget(current.target);

  function applyGizmoType(type: GizmoType) {
    // 互斥切换：先全关再开选中的一种，演示“同时只开一种”。
    // 关闭某个 *Enabled 只解绑（attachedNode=null）并不销毁子 gizmo；再开会复用原实例。
    manager.positionGizmoEnabled = false;
    manager.rotationGizmoEnabled = false;
    manager.scaleGizmoEnabled = false;
    manager.boundingBoxGizmoEnabled = false;
    if (type === 'position') manager.positionGizmoEnabled = true;
    else if (type === 'rotation') manager.rotationGizmoEnabled = true;
    else if (type === 'scale') manager.scaleGizmoEnabled = true;
    else if (type === 'boundingBox') manager.boundingBoxGizmoEnabled = true;
    // 'none' 保持全关。切类型后 _attachedMesh 保留，新启用的 gizmo 自动绑同一目标。
  }

  function applyTarget(target: GizmoTarget) {
    if (target === 'auto') {
      // 交给 manager 内置的 POINTERDOWN 挂载：命中 mesh 挂载、命中空地（pickedMesh 为 null）取消。
      manager.usePointerToAttachGizmos = true;
      return;
    }
    if (target === 'detach') {
      manager.usePointerToAttachGizmos = false; // 锁定，避免后续点击重新挂载
      manager.attachToMesh(null);
      return;
    }
    // 指定 mesh：直接 attachToMesh 并关掉自动挂载，让控件状态与读数一致。
    manager.usePointerToAttachGizmos = false;
    const hit = targets.find((m) => m.name === target);
    if (hit) manager.attachToMesh(hit);
  }

  return {
    update(options: GizmoExampleOptions) {
      current = options;
      applyGizmoType(options.gizmoType);
      applyTarget(options.target);
    },
    dispose() {
      // manager.dispose 释放四类子 gizmo、移除它挂在 scene.onPointerObservable 上的两个 observer、
      // 并 detach boundingBox 的 SixDofDragBehavior；非默认 utility layer 也会一并释放。
      // 默认共享的 UtilityLayerRenderer 会随 scene.dispose 自动清理（绑定在 onDisposeObservable 上）。
      manager?.dispose();
      activeScene?.onBeforeRenderObservable.clear();
      runtime.dispose();
    },
  };
}

function labelForType(type: GizmoType): string {
  switch (type) {
    case 'position':
      return 'PositionGizmo';
    case 'rotation':
      return 'RotationGizmo';
    case 'scale':
      return 'ScaleGizmo';
    case 'boundingBox':
      return 'BoundingBoxGizmo';
    case 'none':
      return '（未启用）';
  }
}

function humanNameOf(meshName: string): string {
  const map: Record<string, string> = {
    box: '盒子',
    sphere: '球体',
    cylinder: '圆柱',
    torus: '圆环',
  };
  return map[meshName] ?? meshName;
}

function formatVector(v: Vector3): string {
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

// RotationGizmo 默认用 quaternion 更新 attachedMesh.rotationQuaternion（而非 rotation 欧拉角）。
// 读数时若存在 rotationQuaternion 就分解成欧拉角再换算角度，否则直接读 rotation。
function formatRotation(mesh: AbstractMesh): string {
  const euler = mesh.rotationQuaternion
    ? mesh.rotationQuaternion.toEulerAngles()
    : mesh.rotation;
  const deg = (r: number) => Math.round((r * 180) / Math.PI);
  return `(${deg(euler.x)}°, ${deg(euler.y)}°, ${deg(euler.z)}°)`;
}
