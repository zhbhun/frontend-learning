/**
 * 范例：Havok 物理集成——落体、堆叠、弹性。
 * 输入：gravityDir（'down' | 'up' | 'zero'，决定 Y 方向重力）、
 *   restitution（碰撞弹性，0 不弹 / 1 完全弹性）。
 * 主要操作：
 *   1) 同步搭建 Scene/相机/光/地面 mesh（setup 立即返回 scene）。
 *   2) 后台 await HavokPhysics()（异步加载 WASM）→ new HavokPlugin(true, havok) →
 *      scene.enablePhysics(gravity, plugin)；完成后创建 STATIC 地面刚体 + 首批 DYNAMIC 物体。
 *   3) 点击 canvas（POINTERTAP）撒一批新物体；切重力方向调 plugin.setGravity；
 *      调弹性时遍历所有 shape 重设 material。
 *   4) 每帧 onBeforeRenderObservable 里统计刚体数 / 活跃刚体数 / FPS 并 emit。
 * 预期结果：盒子/球从空中下落、堆叠、按 restitution 弹跳；切到"上"反向坠落；切到"零"漂浮。
 *   读数显示物理就绪状态、刚体总数、仍在运动的活跃数、重力方向、弹性、FPS。
 * 阅读主线：先看 setup 顶部的同步场景搭建，再看 HavokPhysics().then 里的 enablePhysics +
 *   spawnBatch，最后看 onPointerObservable 的点击撒物体、update 的参数应用与 onBeforeRenderObservable 的读数。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  HavokPlugin,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PBRMetallicRoughnessMaterial,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeBox,
  PhysicsShapeSphere,
  PointerEventTypes,
  Quaternion,
  Scene,
  Vector3,
} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

export type GravityDir = 'down' | 'up' | 'zero';

export interface PhysicsOptions {
  gravityDir: GravityDir;
  restitution: number;
}

export interface PhysicsSnapshot {
  ready: boolean;
  totalBodies: number;
  activeBodies: number;
  gravityDir: GravityDir;
  restitution: number;
  fps: number;
}

export interface PhysicsInstance {
  update(options: PhysicsOptions): void;
  dispose(): void;
}

// 重力取真实地球重力 9.81 m/s²；'zero' 用于演示无重力漂浮。
const GRAVITY_MAG = 9.81;
// 防止物体无限堆积影响性能：超过上限时回收最早的刚体。
const MAX_BODIES = 90;
const SPAWN_BATCH = 6;
const INITIAL_BODIES = 22;
const GROUND_EXTENT = 14; // 地面半边长（视觉与碰撞体一致）

// 调色板：随机分配给每个刚体，方便肉眼区分堆叠。
const PALETTE: Color3[] = [
  new Color3(0.95, 0.42, 0.38),
  new Color3(0.98, 0.73, 0.32),
  new Color3(0.30, 0.70, 0.55),
  new Color3(0.38, 0.58, 0.92),
  new Color3(0.74, 0.50, 0.85),
  new Color3(0.92, 0.58, 0.78),
];

interface ActiveBody {
  mesh: Mesh;
  body: PhysicsBody;
  shape: PhysicsShapeBox | PhysicsShapeSphere;
}

export function createPhysicsExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PhysicsSnapshot) => void,
): PhysicsInstance {
  let gravityDir: GravityDir = 'down';
  let restitution = 0.55;
  // plugin 在 HavokPhysics() 异步加载完成后才可用；之前所有物理操作都要等。
  let plugin: HavokPlugin | null = null;
  let physicsReady = false;
  // 复用的临时向量，避免每帧分配。
  const tmpVel = new Vector3();

  const bodies: ActiveBody[] = [];

  // createBabylonRuntime 负责 Engine、视口可见性启停、resize 和 dispose。
  // setup 必须同步返回 Scene；HavokPhysics 是异步的，放在后台 .then 里完成。
  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.10, 0.12, 0.16, 1);

    // ArcRotateCamera：从斜上方观察地面与堆叠物；attachControl 后拖拽旋转、滚轮缩放。
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.2,
      Math.PI / 2.6,
      22,
      new Vector3(0, 2, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    // 两盏光：半球光打底、方向光带阴影方向感，让堆叠层次可辨。
    new HemisphericLight('hemi', new Vector3(0.3, 1, 0.4), scene);
    const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.4), scene);
    sun.intensity = 0.7;

    // 地面：用薄 box 而非 CreateGround，让 mesh 与碰撞体尺寸严格一致，避免"视觉贴地、物理悬空"。
    const ground = MeshBuilder.CreateBox(
      'ground',
      { width: GROUND_EXTENT * 2, height: 0.5, depth: GROUND_EXTENT * 2 },
      scene,
    );
    ground.position.y = -0.25; // 顶面落在 Y=0
    const groundMat = new PBRMetallicRoughnessMaterial('groundMat', scene);
    groundMat.baseColor = new Color3(0.18, 0.20, 0.24);
    groundMat.metallic = 0.0;
    groundMat.roughness = 0.9;
    ground.material = groundMat;

    // 每帧读数。physicsReady 之前也会 emit，让读者看到"物理加载中"状态。
    scene.onBeforeRenderObservable.add(() => {
      let active = 0;
      for (const b of bodies) {
        b.body.getLinearVelocityToRef(tmpVel);
        // 活跃 = 仍在运动（线速度模长超过阈值）；静止堆叠的不计入。
        if (tmpVel.lengthSquared() > 0.05 * 0.05) {
          active++;
        }
      }
      emit({
        ready: physicsReady,
        totalBodies: bodies.length,
        activeBodies: active,
        gravityDir,
        restitution,
        fps: Math.round(engine.getFps()),
      });
    });

    // 点击 canvas（非拖拽的 POINTERTAP）撒一批新物体；拖拽仍由相机消费用于旋转视角。
    scene.onPointerObservable.add((info) => {
      if (!physicsReady) return;
      if (info.type === PointerEventTypes.POINTERTAP) {
        spawnBatch(SPAWN_BATCH);
      }
    });

    // === 异步初始化 Havok 物理 ===
    // HavokPhysics() 是 ESM 默认导出，返回 Promise<HavokPhysicsWithBindings>，
    // 内部加载 HavokPhysics.wasm。Vite 会从 @babylonjs/havok/lib/esm 解析 WASM 路径。
    HavokPhysics()
      .then((havok) => {
        // HavokPlugin(useDeltaForWorldStep, havokInstance)：
        //   第一个参数 true 表示用每帧 delta 推进物理步长（默认推荐）。
        plugin = new HavokPlugin(true, havok);
        scene.enablePhysics(new Vector3(0, gravityToY(gravityDir), 0), plugin);

        // 地面 STATIC 刚体：mass=0 不动；用与 mesh 尺寸一致的 box 碰撞体。
        // PhysicsShapeBox(center, rotation, extents) 的 extents 是半边长。
        const groundBody = new PhysicsBody(ground, PhysicsMotionType.STATIC, false, scene);
        const groundShape = new PhysicsShapeBox(
          Vector3.Zero(),
          Quaternion.Identity(),
          new Vector3(GROUND_EXTENT, 0.25, GROUND_EXTENT),
          scene,
        );
        groundShape.material = { friction: 0.7, restitution };
        groundBody.shape = groundShape;

        spawnBatch(INITIAL_BODIES);
        physicsReady = true;
      })
      .catch((err) => {
        // WASM 加载失败时把错误打到控制台；读数里的 ready 会一直保持 false。
        // eslint-disable-next-line no-console
        console.error('[physics-with-havok] HavokPhysics 加载失败：', err);
      });

    return scene;

    // --- 局部辅助：批量撒物体 ---
    function spawnBatch(n: number) {
      for (let i = 0; i < n; i++) {
        // 超过上限时回收最早的刚体，保持性能稳定。
        if (bodies.length >= MAX_BODIES) {
          const oldest = bodies.shift();
          if (oldest) disposeBody(oldest);
        }
        bodies.push(createBody());
      }
    }
  });

  function createBody(): ActiveBody {
    // 在 engine 当前 scene 上创建（runtime.scene 已就绪）。
    const scene = runtime.scene;
    const isSphere = Math.random() < 0.4;
    const size = 0.6 + Math.random() * 0.5; // 盒子边长 / 球直径
    const radius = size / 2;

    const mesh = isSphere
      ? MeshBuilder.CreateSphere(
          `body${bodies.length}`,
          { diameter: size, segments: 12 },
          scene,
        )
      : MeshBuilder.CreateBox(
          `body${bodies.length}`,
          { size },
          scene,
        );

    // 从空中随机位置出发，让落体与堆叠自然展开。
    mesh.position.set(
      (Math.random() - 0.5) * GROUND_EXTENT * 1.4,
      6 + Math.random() * 5,
      (Math.random() - 0.5) * GROUND_EXTENT * 1.4,
    );
    mesh.rotation.y = Math.random() * Math.PI;

    const mat = new PBRMetallicRoughnessMaterial(`mat${bodies.length}`, scene);
    mat.baseColor = PALETTE[bodies.length % PALETTE.length];
    mat.metallic = 0.05;
    mat.roughness = 0.55;
    mesh.material = mat;

    // DYNAMIC 刚体：受重力、被碰撞推动；startsAsleep=false 让它立即参与模拟。
    const body = new PhysicsBody(mesh, PhysicsMotionType.DYNAMIC, false, scene);

    // 碰撞体形状与 mesh 尺寸保持一致：球用半径，盒子用半边长。
    const shape = isSphere
      ? new PhysicsShapeSphere(Vector3.Zero(), radius, scene)
      : new PhysicsShapeBox(
          Vector3.Zero(),
          Quaternion.Identity(),
          new Vector3(radius, radius, radius),
          scene);
    // PhysicsMaterial 是接口（plain object），不是类；直接赋给 shape.material。
    shape.material = { friction: 0.35, restitution };
    body.shape = shape;
    // 显式 body+shape 路径需要给 DYNAMIC 体设质量，惯量由 shape 自动算出。
    body.setMassProperties({ mass: 1 });

    return { mesh, body, shape };
  }

  function disposeBody(b: ActiveBody) {
    b.body.dispose();
    b.shape.dispose();
    b.mesh.dispose();
  }

  function applyGravity() {
    if (!plugin) return;
    plugin.setGravity(new Vector3(0, gravityToY(gravityDir), 0));
  }

  function applyRestitution() {
    // 弹性是 per-shape-material 的；切值时遍历所有 body 的 shape 重设 material。
    for (const b of bodies) {
      b.shape.material = { friction: 0.35, restitution };
    }
  }

  return {
    update(options) {
      if (options.gravityDir !== gravityDir) {
        gravityDir = options.gravityDir;
        applyGravity();
      }
      if (options.restitution !== restitution) {
        restitution = options.restitution;
        applyRestitution();
      }
    },
    dispose() {
      runtime.dispose();
    },
  };
}

function gravityToY(dir: GravityDir): number {
  switch (dir) {
    case 'down':
      return -GRAVITY_MAG;
    case 'up':
      return GRAVITY_MAG;
    case 'zero':
      return 0;
  }
}
