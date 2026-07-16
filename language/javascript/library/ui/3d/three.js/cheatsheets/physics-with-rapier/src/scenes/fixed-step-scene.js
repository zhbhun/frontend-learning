import * as THREE from 'three';
import {
  addBaseLights,
  addReferenceGrid,
  createBaseScene,
  createCamera,
  createGroundMesh,
  createRenderer,
  createTextSprite,
  disposeObjectTree,
  disposeRendererLesson,
  formatNumber,
  startRenderLoop,
  syncMeshToBody
} from '../shared-stage.js';
import { bindButton, bindCheckbox, bindRange, writeText } from '../shared-ui.js';

/*
 * 本示例演示同一组物体在 variable delta 和 fixed timestep 下的差异。
 * 读代码先看 stepVariableWorld() 与 stepFixedWorld()：左侧把本帧 delta 直接交给 world.step()，
 * 右侧把同一个 delta 放进 accumulator，再拆成多个 1/60 秒固定步。
 * 页面控件对应：注入卡顿 delta、卡顿间隔和卡顿时长；卡顿越大，左侧越容易出现明显抖动或堆叠差异。
 * 预期观察：fixed 不是让画面不慢，而是让物理求解每次吃到稳定的小时间片。
 */
export function createFixedStepLesson(canvas, RAPIER) {
  const renderer = createRenderer(canvas);
  const camera = createCamera({ position: [7.2, 4.6, 8.4], target: [0, 1, 0] });
  const scene = createBaseScene();
  const fixedStep = 1 / 60;
  const state = {
    injectStutter: true,
    stutterInterval: 36,
    stutterDelta: 0.16
  };
  let frameIndex = 0;

  addBaseLights(scene);
  addReferenceGrid(scene, 14);
  scene.add(
    createTextSprite('可变 delta', [-3.2, 3.2, -1.8], '#7c3f1d'),
    createTextSprite('固定 timestep', [3.2, 3.2, -1.8], '#1f6f58')
  );

  const variable = createComparisonWorld({
    RAPIER,
    offsetX: -3.2,
    color: '#d58a4a',
    name: 'variable'
  });
  const fixed = createComparisonWorld({
    RAPIER,
    offsetX: 3.2,
    color: '#55a57c',
    name: 'fixed'
  });
  scene.add(...variable.meshes, ...fixed.meshes);

  function createComparisonWorld({ RAPIER: RapierModule, offsetX, color, name }) {
    const world = new RapierModule.World({ x: 0, y: -9.81, z: 0 });
    const meshes = [];
    const dynamicItems = [];
    let accumulator = 0;
    let totalSteps = 0;

    const groundMesh = createGroundMesh({ width: 4.6, depth: 4, thickness: 0.2, color });
    groundMesh.position.x = offsetX;
    meshes.push(groundMesh);

    const groundBody = world.createRigidBody(RapierModule.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0));
    world.createCollider(RapierModule.ColliderDesc.cuboid(2.3, 0.1, 2).setFriction(0.96), groundBody);

    function spawnStack() {
      dynamicItems.splice(0).forEach(({ body, mesh }) => {
        const index = meshes.indexOf(mesh);
        if (index >= 0) {
          meshes.splice(index, 1);
        }
        scene.remove(mesh);
        disposeObjectTree(mesh);
        world.removeRigidBody(body);
      });

      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.62,
        metalness: 0.04
      });

      for (let index = 0; index < 6; index += 1) {
        const x = (index % 2) * 0.46 - 0.23;
        const z = Math.floor(index / 2) * 0.18 - 0.18;
        const body = world.createRigidBody(
          RapierModule.RigidBodyDesc.dynamic()
            .setTranslation(x, 0.35 + index * 0.62, z)
            .setRotation({ x: 0, y: 0, z: 0, w: 1 })
        );
        world.createCollider(
          RapierModule.ColliderDesc.cuboid(0.3, 0.3, 0.3).setFriction(0.82).setRestitution(0.05),
          body
        );
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), material.clone());
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        meshes.push(mesh);
        dynamicItems.push({ body, mesh });
      }

      accumulator = 0;
      totalSteps = 0;
    }

    spawnStack();

    return {
      name,
      world,
      meshes,
      dynamicItems,
      groundBody,
      get accumulator() {
        return accumulator;
      },
      set accumulator(value) {
        accumulator = value;
      },
      get totalSteps() {
        return totalSteps;
      },
      addSteps(count) {
        totalSteps += count;
      },
      spawnStack,
      offsetX
    };
  }

  function resetWorlds() {
    variable.spawnStack();
    fixed.spawnStack();
    frameIndex = 0;
  }

  bindCheckbox('inject-stutter', (checked) => {
    state.injectStutter = checked;
  });
  bindRange('stutter-interval', 'stutter-interval-value', (value) => String(value), (value) => {
    state.stutterInterval = value;
  });
  bindRange('stutter-delta', 'stutter-delta-value', (value) => `${formatNumber(value, 2)}s`, (value) => {
    state.stutterDelta = value;
  });
  bindButton('reset-step', resetWorlds);

  function stepVariableWorld(delta) {
    variable.world.timestep = delta;
    variable.world.step();
    variable.addSteps(1);
    return 1;
  }

  function stepFixedWorld(delta) {
    fixed.accumulator += delta;
    let steps = 0;

    while (fixed.accumulator >= fixedStep && steps < 32) {
      fixed.world.timestep = fixedStep;
      fixed.world.step();
      fixed.accumulator -= fixedStep;
      steps += 1;
    }

    fixed.addSteps(steps);
    return steps;
  }

  function syncWorld(worldState) {
    let topY = -Infinity;

    worldState.dynamicItems.forEach(({ body, mesh }) => {
      syncMeshToBody(mesh, body, worldState.offsetX);
      topY = Math.max(topY, body.translation().y);
    });

    return topY;
  }

  const stop = startRenderLoop({
    renderer,
    scene,
    camera,
    canvas,
    onFrame({ delta }) {
      frameIndex += 1;
      const naturalDelta = delta > 0 ? Math.min(delta, 1 / 30) : fixedStep;
      const stuttering = state.injectStutter && frameIndex % state.stutterInterval === 0;
      const simulatedDelta = stuttering ? state.stutterDelta : naturalDelta;
      const variableSteps = stepVariableWorld(simulatedDelta);
      const fixedSteps = stepFixedWorld(simulatedDelta);
      const variableTop = syncWorld(variable);
      const fixedTop = syncWorld(fixed);

      writeText('variable-readout', `最高 ${formatNumber(variableTop, 2)} / ${variable.totalSteps} 步`);
      writeText('fixed-readout', `最高 ${formatNumber(fixedTop, 2)} / ${fixed.totalSteps} 步`);
      writeText('delta-readout', `${formatNumber(simulatedDelta, 3)}s${stuttering ? ' 卡顿' : ''}`);
      writeText('steps-readout', `variable ${variableSteps}; fixed ${fixedSteps}`);
    }
  });

  return () => {
    [...variable.dynamicItems, ...fixed.dynamicItems].forEach(({ body }) => {
      // 各 world 各自拥有 body，不能跨 world 移除。
      const owner = variable.dynamicItems.some((item) => item.body === body) ? variable.world : fixed.world;
      owner.removeRigidBody(body);
    });
    variable.world.removeRigidBody(variable.groundBody);
    fixed.world.removeRigidBody(fixed.groundBody);
    disposeRendererLesson({ stop, scene, renderer });
  };
}
