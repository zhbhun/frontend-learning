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
 * 本示例演示 Rapier collision event 的最小使用：ColliderDesc.setActiveEvents(...)
 * 打开事件，world.step(eventQueue) 后用 eventQueue.drainCollisionEvents(...) 读取开始/结束接触。
 * 读代码先看 spawnBalls() 和 drainEvents()：前者给 collider 登记名字，后者把 handle 转回可读文本。
 * 页面控件对应球数量和 restitution；弹性越高，接触开始/结束越频繁。
 * 预期观察：事件来自 collider，不来自 three.js mesh；mesh 只负责跟随 body 显示。
 */
export function createContactEventsLesson(canvas, RAPIER) {
  const renderer = createRenderer(canvas);
  const camera = createCamera({ position: [6.4, 4.8, 7.4], target: [0, 1.0, 0] });
  const scene = createBaseScene();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const eventQueue = new RAPIER.EventQueue(true);
  const fixedStep = 1 / 60;
  const state = {
    ballCount: 8,
    bounce: 0.65
  };
  const balls = [];
  const colliderNames = new Map();
  let accumulator = 0;
  let started = 0;
  let stopped = 0;
  let lastFrameEvents = 0;
  let lastEventText = '-';

  addBaseLights(scene);
  addReferenceGrid(scene, 12);

  const groundMesh = createGroundMesh({ width: 12, depth: 7, thickness: 0.2, color: '#8fb3a5' });
  scene.add(groundMesh);

  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0));
  const groundCollider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(6, 0.1, 3.5)
      .setFriction(0.86)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    groundBody
  );
  colliderNames.set(groundCollider.handle, 'ground');

  function clearBalls() {
    balls.splice(0).forEach(({ body, mesh, collider }) => {
      colliderNames.delete(collider.handle);
      scene.remove(mesh);
      disposeObjectTree(mesh);
      world.removeRigidBody(body);
    });
  }

  function resetCounters() {
    started = 0;
    stopped = 0;
    lastFrameEvents = 0;
    lastEventText = '-';
    writeCounters();
  }

  function spawnBalls() {
    clearBalls();
    resetCounters();
    accumulator = 0;

    for (let index = 0; index < state.ballCount; index += 1) {
      const x = (index % 6 - 2.5) * 0.72;
      const y = 3.2 + Math.floor(index / 6) * 0.9 + (index % 2) * 0.28;
      const z = Math.sin(index * 1.2) * 0.65;
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(x, y, z)
          .setLinvel(Math.sin(index * 0.7) * 0.55, 0, Math.cos(index) * 0.28)
      );
      const collider = world.createCollider(
        RAPIER.ColliderDesc.ball(0.34)
          .setFriction(0.58)
          .setRestitution(state.bounce)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body
      );
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(`hsl(${(index * 47 + 30) % 360} 68% 52%)`),
        roughness: 0.5,
        metalness: 0.04
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      balls.push({ body, collider, mesh });
      colliderNames.set(collider.handle, `ball-${index + 1}`);
    }
  }

  function updateBounce(value) {
    state.bounce = value;
    balls.forEach(({ collider }) => collider.setRestitution(value));
  }

  function drainEvents() {
    lastFrameEvents = 0;

    eventQueue.drainCollisionEvents((handle1, handle2, hasStarted) => {
      const name1 = colliderNames.get(handle1) ?? `#${handle1}`;
      const name2 = colliderNames.get(handle2) ?? `#${handle2}`;

      if (hasStarted) {
        started += 1;
      } else {
        stopped += 1;
      }

      lastFrameEvents += 1;
      lastEventText = `${name1} ${hasStarted ? '开始接触' : '结束接触'} ${name2}`;
    });

    writeCounters();
  }

  function writeCounters() {
    writeText('started-readout', started);
    writeText('stopped-readout', stopped);
    writeText('frame-events-readout', lastFrameEvents);
    writeText('last-event-readout', lastEventText);
  }

  bindRange('ball-count', 'ball-count-value', (value) => String(value), (value) => {
    state.ballCount = value;
    spawnBalls();
  });
  bindRange('bounce', 'bounce-value', (value) => formatNumber(value, 2), updateBounce);
  bindButton('reset-events', spawnBalls);

  const stop = startRenderLoop({
    renderer,
    scene,
    camera,
    canvas,
    onFrame({ delta }) {
      accumulator += Math.min(delta, 0.12);

      while (accumulator >= fixedStep) {
        world.timestep = fixedStep;
        world.step(eventQueue);
        drainEvents();
        accumulator -= fixedStep;
      }

      balls.forEach(({ body, mesh }) => syncMeshToBody(mesh, body));
    }
  });

  return () => {
    clearBalls();
    world.removeRigidBody(groundBody);
    eventQueue.free();
    disposeRendererLesson({ stop, scene, renderer });
  };
}
