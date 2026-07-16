import * as THREE from 'three';
import {
  addBaseLights,
  addReferenceGrid,
  createBaseScene,
  createCamera,
  createGroundMesh,
  createRenderer,
  disposeObjectTree,
  disposeRendererLesson,
  formatNumber,
  startRenderLoop,
  syncMeshToBody
} from '../shared-stage.js';
import { bindButton, bindRange, writeText } from '../shared-ui.js';

/*
 * 本示例演示 Rapier 最小主线：await init 之后创建 World，创建 dynamic body 和 fixed ground，
 * 每个固定步长调用 world.step()，再把 body.translation()/rotation() 写回 mesh。
 * 读代码先看 spawnBodies() 和 onFrame()：前者建立 RigidBody + Collider + Mesh 的配对，
 * 后者推进物理并同步 Object3D。
 * 页面控件对应 body 数量、初始高度和 collider 的 restitution；改弹性能观察反弹高度变化。
 * 预期观察：mesh 只是外壳，真正决定掉落和碰撞的是 body 与 collider。
 */
export function createFallingBodiesLesson(canvas, RAPIER) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const fixedStep = 1 / 60;
  const state = {
    bodyCount: 12,
    spawnHeight: 6,
    restitution: 0.35
  };
  const bodies = [];
  let accumulator = 0;
  let totalSteps = 0;

  addBaseLights(scene);
  addReferenceGrid(scene, 12);

  const groundMesh = createGroundMesh({ width: 12, depth: 7, thickness: 0.2, color: '#8fb3a5' });
  scene.add(groundMesh);

  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(6, 0.1, 3.5).setFriction(0.9), groundBody);
  writeText('world-readout', '重力 (0, -9.81, 0)');

  function createMesh(kind, index) {
    const hue = (index * 41) % 360;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(`hsl(${hue} 66% 52%)`),
      roughness: 0.58,
      metalness: 0.05
    });

    const geometry =
      kind === 'box' ? new THREE.BoxGeometry(0.72, 0.72, 0.72) : new THREE.SphereGeometry(0.38, 24, 16);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function clearBodies() {
    bodies.splice(0).forEach(({ body, mesh }) => {
      scene.remove(mesh);
      disposeObjectTree(mesh);
      world.removeRigidBody(body);
    });
  }

  function spawnBodies() {
    clearBodies();
    accumulator = 0;
    totalSteps = 0;

    for (let index = 0; index < state.bodyCount; index += 1) {
      const kind = index % 3 === 0 ? 'sphere' : 'box';
      const x = (index % 6 - 2.5) * 0.78;
      const y = state.spawnHeight + Math.floor(index / 6) * 0.85;
      const z = (index % 2 === 0 ? -0.45 : 0.45) + Math.sin(index * 1.7) * 0.18;
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(x, y, z)
          .setLinvel(Math.sin(index) * 0.35, 0, Math.cos(index) * 0.25)
          .setAngvel({ x: 0.6, y: 0.25 + index * 0.03, z: 0.4 })
      );

      // collider 的形状和参数决定接触；mesh 几何只是同步后的可见外壳。
      const colliderDesc =
        kind === 'box'
          ? RAPIER.ColliderDesc.cuboid(0.36, 0.36, 0.36)
          : RAPIER.ColliderDesc.ball(0.38);
      const collider = world.createCollider(
        colliderDesc.setFriction(0.72).setRestitution(state.restitution),
        body
      );
      const mesh = createMesh(kind, index);

      scene.add(mesh);
      bodies.push({ body, collider, mesh });
    }
  }

  function updateRestitution(value) {
    state.restitution = value;
    bodies.forEach(({ collider }) => collider.setRestitution(value));
  }

  bindRange('body-count', 'body-count-value', (value) => String(value), (value) => {
    state.bodyCount = value;
    spawnBodies();
  });
  bindRange('spawn-height', 'spawn-height-value', (value) => formatNumber(value, 1), (value) => {
    state.spawnHeight = value;
    spawnBodies();
  });
  bindRange('restitution', 'restitution-value', (value) => formatNumber(value, 2), updateRestitution);
  bindButton('reset-bodies', spawnBodies);

  function syncBodies() {
    let lowest = Infinity;

    bodies.forEach(({ body, mesh }) => {
      syncMeshToBody(mesh, body);
      lowest = Math.min(lowest, body.translation().y);
    });

    writeText('body-readout', `${bodies.length} 个 dynamic body`);
    writeText('lowest-readout', Number.isFinite(lowest) ? formatNumber(lowest, 2) : '-');
  }

  const stop = startRenderLoop({
    renderer,
    scene,
    camera,
    canvas,
    onFrame({ delta }) {
      accumulator += Math.min(delta, 0.12);
      let frameSteps = 0;

      while (accumulator >= fixedStep && frameSteps < 8) {
        world.timestep = fixedStep;
        world.step();
        accumulator -= fixedStep;
        frameSteps += 1;
        totalSteps += 1;
      }

      syncBodies();
      writeText('step-readout', `${totalSteps} total / ${frameSteps} frame`);
    }
  });

  return () => {
    clearBodies();
    world.removeRigidBody(groundBody);
    disposeRendererLesson({ stop, scene, renderer });
  };
}
