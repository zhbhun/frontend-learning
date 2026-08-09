/**
 * 范例介绍：演示 Babylon.js 三类特殊对象——MirrorTexture（镜面反射）、TrailMesh（拖尾）、
 * MultiMaterial + SubMesh（多材质分段）。WaterMaterial 来自 @babylonjs/materials，本范例不引入
 * 该依赖，仅在正文以代码片段说明。
 * 输入：
 *   - 镜面反射：reflectionLevel（反射强度，写入 MirrorTexture.level）、orbitSpeed（环绕方块公转速度）、
 *     reflectBoxes（是否把方块纳入 renderList）。
 *   - 拖尾：trailRunning（start/stop）、orbitSpeed（源网格公转速度）、diameter（拖尾粗细，构造参数，
 *     改变时 dispose + 重建）。
 *   - 多材质分段：useMultiMaterial（MultiMaterial + 3 段 SubMesh vs 单材质对照）。
 * 主要操作：
 *   - MirrorTexture 作为 StandardMaterial.reflectionTexture，renderList 决定哪些网格出现在镜面里，
 *     mirrorPlane 用 Plane(0,1,0,0) 表示 y=0 平面、法线朝上。
 *   - TrailMesh 跟随源网格，start()/stop() 控制是否记录新段；改 diameter 需要重建。
 *   - MultiMaterial.subMaterials 承载多份材质，SubMesh 按索引范围分段映射到 materialIndex。
 * 预期结果：readout 同步给出当前类型的关键参数与状态。
 * 阅读主线：createMirrorReflection → createTrailFollow → createMultiMaterialSegments。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  MirrorTexture,
  MultiMaterial,
  Plane,
  Scene,
  StandardMaterial,
  SubMesh,
  TrailMesh,
  Vector3,
} from '@babylonjs/core';

// 共享相机角度：在原点斜上方观察。
const CAMERA_ALPHA = -Math.PI / 2.2;
const CAMERA_BETA = Math.PI / 2.7;

/* ---------------- MirrorTexture：平面镜面反射 ---------------- */

export interface MirrorReflectionOptions {
  reflectionLevel: number;
  orbitSpeed: number;
  reflectBoxes: boolean;
}

export interface MirrorReflectionSnapshot {
  mirrorPlane: string;
  renderListCount: number;
  reflectionLevel: number;
}

export interface MirrorReflectionInstance {
  update(options: MirrorReflectionOptions): void;
  dispose(): void;
}

export function createMirrorReflection(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MirrorReflectionSnapshot) => void,
): MirrorReflectionInstance {
  let current: MirrorReflectionOptions = {
    reflectionLevel: 1,
    orbitSpeed: 0.5,
    reflectBoxes: true,
  };

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    const camera = new ArcRotateCamera(
      'camera',
      CAMERA_ALPHA,
      CAMERA_BETA,
      11,
      new Vector3(0, 1, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 镜面：一块平铺在 y=0 的地面平面，用 MirrorTexture 作 reflectionTexture。
    const mirror = MeshBuilder.CreatePlane(
      'mirror',
      { width: 9, height: 9 },
      scene,
    );
    mirror.rotation.x = Math.PI / 2; // 默认朝 +Z，绕 X 转 90° 变成水平地面（朝 +Y）
    const mirrorMat = new StandardMaterial('mirrorMat', scene);
    mirrorMat.diffuseColor = new Color3(0.10, 0.12, 0.16);
    mirrorMat.specularColor = new Color3(0.04, 0.04, 0.04);
    mirror.material = mirrorMat;

    // MirrorTexture：RenderTargetTexture 子类，把 renderList 里的网格按 mirrorPlane 镜像后画进贴图。
    const mirrorTexture = new MirrorTexture('mirrorTexture', 512, scene, true);
    // mirrorPlane 是平面方程 ax+by+cz+d=0；法线 (a,b,c) 朝"远离观察者"一侧。
    // 这里镜面在 y=0、朝上反射，法线取 (0,1,0)，d=0。
    mirrorTexture.mirrorPlane = new Plane(0, 1, 0, 0);
    mirrorMat.reflectionTexture = mirrorTexture;

    // 环绕的有色方块：作为反射参照物，颜色明显便于在镜面里识别它们的倒影。
    const colors = [
      new Color3(0.82, 0.30, 0.18),
      new Color3(0.18, 0.55, 0.45),
      new Color3(0.55, 0.32, 0.78),
      new Color3(0.76, 0.36, 0.36),
    ];
    const boxes: Mesh[] = [];
    const orbitRadius = 2.6;
    colors.forEach((color, i) => {
      const box = MeshBuilder.CreateBox(`box${i}`, { size: 0.6 }, scene);
      const mat = new StandardMaterial(`boxMat${i}`, scene);
      mat.diffuseColor = color;
      mat.backFaceCulling = false;
      box.material = mat;
      box.metadata = { phase: (i / colors.length) * Math.PI * 2 };
      boxes.push(box);
    });

    let phase = 0;
    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      phase += dt * current.orbitSpeed;

      boxes.forEach((box) => {
        const p = box.metadata.phase + phase;
        box.position.set(
          Math.cos(p) * orbitRadius,
          1.6 + Math.sin(p * 1.7) * 0.35,
          Math.sin(p) * orbitRadius,
        );
        box.rotation.y += dt * 0.8;
      });

      // renderList 决定哪些网格出现在镜面里：清空后镜面只显底色，主场景照常动。
      mirrorTexture.renderList = current.reflectBoxes ? [...boxes] : [];
      // level（继承自 Texture，默认 1）控制反射强度：0 完全底色，>1 增亮。
      mirrorTexture.level = current.reflectionLevel;

      emit({
        mirrorPlane: '(0, 1, 0, 0)',
        renderListCount: mirrorTexture.renderList.length,
        reflectionLevel: mirrorTexture.level,
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

/* ---------------- TrailMesh：跟随源网格的拖尾 ---------------- */

export interface TrailFollowOptions {
  trailRunning: boolean;
  orbitSpeed: number;
  diameter: number;
}

export interface TrailFollowSnapshot {
  diameter: number;
  length: number;
  status: string;
}

export interface TrailFollowInstance {
  update(options: TrailFollowOptions): void;
  dispose(): void;
}

const TRAIL_LENGTH = 60;

export function createTrailFollow(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TrailFollowSnapshot) => void,
): TrailFollowInstance {
  let current: TrailFollowOptions = {
    trailRunning: true,
    orbitSpeed: 1,
    diameter: 0.6,
  };

  // trail 的创建晚于 setup，但因为 diameter 改变时需要在 update 里重建，
  // 把它和源网格、材质放到外层闭包，方便 update 直接访问。
  let trail: TrailMesh | null = null;
  let trailMat: StandardMaterial | null = null;
  let source: Mesh | null = null;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.06, 0.07, 0.11, 1);

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

    // 源网格：拖尾跟随它的世界位置；用发光材质强化"光源在动"的感觉。
    source = MeshBuilder.CreateSphere('source', { diameter: 0.7 }, scene);
    const sourceMat = new StandardMaterial('sourceMat', scene);
    sourceMat.emissiveColor = new Color3(0.95, 0.55, 0.15);
    sourceMat.diffuseColor = new Color3(0.95, 0.55, 0.15);
    source.material = sourceMat;

    // TrailMesh：构造时给定 diameter 与 length；diameter 只能在构造时设定，
    // 运行时要改粗细只能 dispose + 重建。位置参数顺序：name, sourceMesh, scene, diameter, length。
    trail = new TrailMesh('trail', source, scene, current.diameter, TRAIL_LENGTH);
    trailMat = new StandardMaterial('trailMat', scene);
    trailMat.emissiveColor = new Color3(0.95, 0.7, 0.3);
    trailMat.diffuseColor = new Color3(0.95, 0.7, 0.3);
    trail.material = trailMat;

    let phase = 0;
    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      phase += dt * current.orbitSpeed;
      // 拖尾的形状来自源网格的世界位置轨迹：源不动 = 拖尾停在原地。
      source!.position.set(
        Math.cos(phase) * 2.4,
        Math.sin(phase * 2) * 0.6,
        Math.sin(phase) * 2.4,
      );

      emit({
        diameter: current.diameter,
        length: TRAIL_LENGTH,
        status: current.trailRunning ? '运行中（start）' : '已停止（stop）',
      });
    });

    return scene;
  });

  function rebuildTrail() {
    if (!trail || !source || !trailMat) {
      return;
    }
    // diameter 是构造期参数：dispose 旧拖尾，按新 diameter 重新构造。
    trail.dispose();
    trail = new TrailMesh(
      'trail',
      source,
      runtime.scene,
      current.diameter,
      TRAIL_LENGTH,
    );
    trail.material = trailMat;
    // 重建后默认自动开始；若当前应是停止态，主动 stop。
    if (!current.trailRunning) {
      trail.stop();
    }
  }

  return {
    update(options) {
      const diameterChanged = options.diameter !== current.diameter;
      current = options;
      if (diameterChanged) {
        rebuildTrail();
      }
      // start/stop 幂等：运行就 start()，停止就 stop()。
      if (trail) {
        if (options.trailRunning) {
          trail.start();
        } else {
          trail.stop();
        }
      }
    },
    dispose() {
      runtime.dispose();
    },
  };
}

/* ---------------- MultiMaterial + SubMesh：多材质分段 ---------------- */

export interface MultiMaterialSegmentsOptions {
  useMultiMaterial: boolean;
}

export interface MultiMaterialSegmentsSnapshot {
  materialMode: string;
  subMaterialsCount: number;
  subMeshesCount: number;
}

export interface MultiMaterialSegmentsInstance {
  update(options: MultiMaterialSegmentsOptions): void;
  dispose(): void;
}

export function createMultiMaterialSegments(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MultiMaterialSegmentsSnapshot) => void,
): MultiMaterialSegmentsInstance {
  let current: MultiMaterialSegmentsOptions = { useMultiMaterial: true };

  // apply 在 setup 里绑定具体实现，update 里调用。
  let apply: (() => void) = () => {};

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    const camera = new ArcRotateCamera(
      'camera',
      CAMERA_ALPHA,
      CAMERA_BETA,
      7,
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 球体：把它按索引范围切成 3 段，分别绑到 MultiMaterial 的 3 个子材质。
    const sphere = MeshBuilder.CreateSphere(
      'sphere',
      { diameter: 2.6, segments: 24 },
      scene,
    );

    const matTop = new StandardMaterial('matTop', scene);
    matTop.diffuseColor = new Color3(0.85, 0.30, 0.30);
    const matMid = new StandardMaterial('matMid', scene);
    matMid.diffuseColor = new Color3(0.30, 0.62, 0.85);
    const matBot = new StandardMaterial('matBot', scene);
    matBot.diffuseColor = new Color3(0.40, 0.70, 0.42);

    // 单材质：用于 A/B 对照（切回时球体只显一种灰色）。
    const singleMat = new StandardMaterial('singleMat', scene);
    singleMat.diffuseColor = new Color3(0.75, 0.72, 0.68);

    // MultiMaterial：subMaterials 数组的下标就是 SubMesh 的 materialIndex。
    const multiMat = new MultiMaterial('multi', scene);
    multiMat.subMaterials.push(matTop);
    multiMat.subMaterials.push(matMid);
    multiMat.subMaterials.push(matBot);

    // 默认球体只有一个覆盖整张网格的 SubMesh；切多材质前先 release 再按索引三等分。
    // SubMesh 构造：new SubMesh(materialIndex, verticesStart, verticesCount, indexStart, indexCount, mesh)，
    // 构造时自动把自己注册进 mesh.subMeshes，不必手动 push。
    function applyMultiMaterial() {
      sphere.material = multiMat;
      sphere.releaseSubMeshes();
      const verticesCount = sphere.getTotalVertices();
      const indicesCount = sphere.getTotalIndices();
      const third = Math.floor(indicesCount / 3);
      new SubMesh(0, 0, verticesCount, 0, third, sphere);
      new SubMesh(1, 0, verticesCount, third, third, sphere);
      new SubMesh(2, 0, verticesCount, third * 2, indicesCount - third * 2, sphere);
    }

    function applySingleMaterial() {
      sphere.material = singleMat;
      sphere.releaseSubMeshes();
      // 非 MultiMaterial 时，所有 SubMesh 都用 mesh.material，materialIndex 不影响上色。
      new SubMesh(
        0,
        0,
        sphere.getTotalVertices(),
        0,
        sphere.getTotalIndices(),
        sphere,
      );
    }

    apply = () => {
      if (current.useMultiMaterial) {
        applyMultiMaterial();
      } else {
        applySingleMaterial();
      }
    };
    apply();

    scene.onBeforeRenderObservable.add(() => {
      // 缓慢自转，让三段配色从各角度都可见。
      sphere.rotation.y += (engine.getDeltaTime() / 1000) * 0.5;

      emit({
        materialMode: current.useMultiMaterial
          ? 'MultiMaterial（3 段）'
          : '单材质',
        subMaterialsCount: current.useMultiMaterial
          ? multiMat.subMaterials.length
          : 1,
        subMeshesCount: sphere.subMeshes.length,
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      apply();
    },
    dispose() {
      runtime.dispose();
    },
  };
}
