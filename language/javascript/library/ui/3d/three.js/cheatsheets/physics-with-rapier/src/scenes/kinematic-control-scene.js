import * as THREE from 'three';
import {
  addBaseLights,
  addReferenceGrid,
  createBaseScene,
  createCamera,
  createGroundMesh,
  createRenderer,
  createTextSprite,
  disposeRendererLesson,
  formatNumber,
  formatVector,
  startRenderLoop,
  syncMeshToBody
} from '../shared-stage.js';
import { bindButton, bindRange, bindSelect, writeText } from '../shared-ui.js';

/*
 * 本示例演示 position-based kinematic body 的控制方式。
 * 读代码先看 stepPhysics()：在 world.step() 之前写 setNextKinematicTranslation()，
 * Rapier 会据此推导平台速度，让平台和 dynamic 箱子产生更自然的接触。
 * 页面控件对应：控制方式、平台速度和平台幅度；切到 setTranslation 可观察“瞬移式控制”的差异。
 * 预期观察：kinematic 不受重力推动，但可以通过下一位置影响 dynamic body。
 */
export function createKinematicControlLesson(canvas, RAPIER) {
  const renderer = createRenderer(canvas);
  const camera = createCamera({ position: [6.2, 4.5, 7.2], target: [0, 1.0, 0] });
  const scene = createBaseScene();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const fixedStep = 1 / 60;
  const state = {
    mode: 'next',
    speed: 1.2,
    amplitude: 2.4
  };
  let accumulator = 0;
  let physicsTime = 0;

  addBaseLights(scene);
  addReferenceGrid(scene, 12);
  scene.add(createTextSprite('kinematic platform', [0, 2.3, -1.7], '#1f6f58'));

  const groundMesh = createGroundMesh({ width: 12, depth: 7, thickness: 0.2, color: '#96b6bd' });
  scene.add(groundMesh);
  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(6, 0.1, 3.5).setFriction(0.9), groundBody);

  const platformBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.65, 0)
  );
  world.createCollider(RAPIER.ColliderDesc.cuboid(1.45, 0.12, 0.72).setFriction(1.0), platformBody);
  const platformMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 0.24, 1.44),
    new THREE.MeshStandardMaterial({
      color: '#4fa37a',
      roughness: 0.64,
      metalness: 0.04
    })
  );
  platformMesh.castShadow = true;
  platformMesh.receiveShadow = true;
  scene.add(platformMesh);

  const boxBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1.45, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.38, 0.38, 0.38).setFriction(0.82), boxBody);
  const boxMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.76, 0.76),
    new THREE.MeshStandardMaterial({
      color: '#d58a4a',
      roughness: 0.58,
      metalness: 0.05
    })
  );
  boxMesh.castShadow = true;
  boxMesh.receiveShadow = true;
  scene.add(boxMesh);

  function resetBox() {
    boxBody.setTranslation({ x: 0, y: 2.1, z: 0 }, true);
    boxBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    boxBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    boxBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  bindSelect('control-mode', (value) => {
    state.mode = value;
    writeText('mode-readout', value === 'next' ? '下一位置' : '直接瞬移');
  });
  bindRange('platform-speed', 'platform-speed-value', (value) => formatNumber(value, 1), (value) => {
    state.speed = value;
  });
  bindRange('platform-amplitude', 'platform-amplitude-value', (value) => formatNumber(value, 1), (value) => {
    state.amplitude = value;
  });
  bindButton('reset-kinematic', resetBox);

  function stepPhysics() {
    physicsTime += fixedStep;
    const nextX = Math.sin(physicsTime * state.speed) * state.amplitude;
    const nextPosition = { x: nextX, y: 0.65, z: 0 };

    if (state.mode === 'next') {
      // 推荐方式：在 step 前写入下一位置，Rapier 会计算 kinematic 的伪速度。
      platformBody.setNextKinematicTranslation(nextPosition);
    } else {
      // 对照方式：直接改位置更像瞬移，dynamic body 不会获得同样自然的接触速度。
      platformBody.setTranslation(nextPosition, true);
    }

    world.timestep = fixedStep;
    world.step();
  }

  const stop = startRenderLoop({
    renderer,
    scene,
    camera,
    canvas,
    onFrame({ delta }) {
      accumulator += Math.min(delta, 0.12);

      while (accumulator >= fixedStep) {
        stepPhysics();
        accumulator -= fixedStep;
      }

      syncMeshToBody(platformMesh, platformBody);
      syncMeshToBody(boxMesh, boxBody);
      writeText('platform-readout', formatVector(platformBody.translation(), 2));
      writeText('box-readout', formatVector(boxBody.translation(), 2));
    }
  });

  return () => {
    world.removeRigidBody(boxBody);
    world.removeRigidBody(platformBody);
    world.removeRigidBody(groundBody);
    disposeRendererLesson({ stop, scene, renderer });
  };
}
