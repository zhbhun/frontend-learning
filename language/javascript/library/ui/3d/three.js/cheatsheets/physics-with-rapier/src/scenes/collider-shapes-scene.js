import * as THREE from 'three';
import {
  addBaseLights,
  addReferenceGrid,
  createBaseScene,
  createCamera,
  createColliderWire,
  createGroundMesh,
  createRenderer,
  createTextSprite,
  disposeObjectTree,
  disposeRendererLesson,
  formatNumber,
  startRenderLoop,
  syncMeshToBody
} from '../shared-stage.js';
import { bindButton, bindCheckbox, bindRange, bindSelect, writeText } from '../shared-ui.js';

/*
 * 本示例演示 collider shape 与 three.js mesh shape 不会自动一致。
 * 读代码先看 createShapeSet()：每个可见 mesh 都显式选择一个 ColliderDesc。
 * 页面控件对应：匹配/错配会重建 collider；线框显示的是本示例手工创建的 collider 可视化。
 * 预期观察：错配时物体看起来像盒子/球/胶囊，但落地、滚动和接触边界按 collider 发生。
 */
export function createColliderShapesLesson(canvas, RAPIER) {
  const renderer = createRenderer(canvas);
  const camera = createCamera({ position: [6.8, 4.8, 7.4], target: [0, 0.9, 0] });
  const scene = createBaseScene();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const fixedStep = 1 / 60;
  const state = {
    mode: 'matched',
    showDebug: true,
    dropHeight: 5
  };
  const items = [];
  let accumulator = 0;

  addBaseLights(scene);
  addReferenceGrid(scene, 12);

  const groundMesh = createGroundMesh({ width: 12, depth: 7, thickness: 0.2, color: '#9bbf91' });
  scene.add(groundMesh);

  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(6, 0.1, 3.5).setFriction(0.92), groundBody);

  const labels = [
    createTextSprite('盒子 mesh', [-2.5, 2.1, -1.6], '#2b4f6f'),
    createTextSprite('球体 mesh', [0, 2.1, -1.6], '#2b4f6f'),
    createTextSprite('胶囊 mesh', [2.5, 2.1, -1.6], '#2b4f6f')
  ];
  scene.add(...labels);

  function makeMaterial(color) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.62,
      metalness: 0.04
    });
  }

  function makeVisibleMesh(visibleKind) {
    if (visibleKind === 'box') {
      return new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), makeMaterial('#d58a4a'));
    }

    if (visibleKind === 'sphere') {
      return new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 18), makeMaterial('#3f8fc5'));
    }

    return new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.96, 8, 18), makeMaterial('#6aa66a'));
  }

  function makeColliderDesc(colliderKind) {
    if (colliderKind === 'cuboid') {
      return RAPIER.ColliderDesc.cuboid(0.45, 0.45, 0.45);
    }

    if (colliderKind === 'tallCuboid') {
      return RAPIER.ColliderDesc.cuboid(0.28, 0.76, 0.28);
    }

    if (colliderKind === 'ball') {
      return RAPIER.ColliderDesc.ball(0.48);
    }

    return RAPIER.ColliderDesc.capsule(0.48, 0.28);
  }

  function makeWire(colliderKind) {
    if (colliderKind === 'cuboid') {
      return createColliderWire('cuboid', { x: 0.45, y: 0.45, z: 0.45 });
    }

    if (colliderKind === 'tallCuboid') {
      return createColliderWire('cuboid', { x: 0.28, y: 0.76, z: 0.28 });
    }

    if (colliderKind === 'ball') {
      return createColliderWire('ball', { radius: 0.48 });
    }

    return createColliderWire('capsule', { halfHeight: 0.48, radius: 0.28 });
  }

  function readShapePlan() {
    if (state.mode === 'matched') {
      return [
        { visible: 'box', collider: 'cuboid', x: -2.5, readout: 'BoxGeometry + cuboid' },
        { visible: 'sphere', collider: 'ball', x: 0, readout: 'SphereGeometry + ball' },
        { visible: 'capsule', collider: 'capsule', x: 2.5, readout: 'CapsuleGeometry + capsule' }
      ];
    }

    return [
      { visible: 'box', collider: 'ball', x: -2.5, readout: 'BoxGeometry + ball' },
      { visible: 'sphere', collider: 'cuboid', x: 0, readout: 'SphereGeometry + cuboid' },
      { visible: 'capsule', collider: 'tallCuboid', x: 2.5, readout: 'CapsuleGeometry + tall cuboid' }
    ];
  }

  function clearItems() {
    items.splice(0).forEach(({ body, mesh, wire }) => {
      scene.remove(mesh, wire);
      disposeObjectTree(mesh);
      disposeObjectTree(wire);
      world.removeRigidBody(body);
    });
  }

  function createShapeSet() {
    clearItems();
    accumulator = 0;

    readShapePlan().forEach((shape, index) => {
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(shape.x, state.dropHeight + index * 0.35, 0)
          .setAngvel({ x: 0.45, y: 0.2 + index * 0.18, z: 0.35 })
      );
      const collider = world.createCollider(
        makeColliderDesc(shape.collider).setFriction(0.72).setRestitution(0.28),
        body
      );
      const mesh = makeVisibleMesh(shape.visible);
      const wire = makeWire(shape.collider);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wire.visible = state.showDebug;
      scene.add(mesh, wire);
      items.push({ body, collider, mesh, wire, readout: shape.readout });
    });

    writeText('mode-readout', state.mode === 'matched' ? '匹配' : '错配');
    writeText('box-readout', items[0]?.readout ?? '-');
    writeText('sphere-readout', items[1]?.readout ?? '-');
    writeText('capsule-readout', items[2]?.readout ?? '-');
  }

  bindSelect('shape-mode', (value) => {
    state.mode = value;
    createShapeSet();
  });
  bindCheckbox('show-debug', (checked) => {
    state.showDebug = checked;
    items.forEach(({ wire }) => {
      wire.visible = checked;
    });
  });
  bindRange('drop-height', 'drop-height-value', (value) => formatNumber(value, 1), (value) => {
    state.dropHeight = value;
    createShapeSet();
  });
  bindButton('reset-shapes', createShapeSet);

  const stop = startRenderLoop({
    renderer,
    scene,
    camera,
    canvas,
    onFrame({ delta }) {
      accumulator += Math.min(delta, 0.12);

      while (accumulator >= fixedStep) {
        world.timestep = fixedStep;
        world.step();
        accumulator -= fixedStep;
      }

      items.forEach(({ body, mesh, wire }) => {
        syncMeshToBody(mesh, body);
        syncMeshToBody(wire, body);
      });
    }
  });

  return () => {
    clearItems();
    labels.forEach((label) => scene.remove(label));
    world.removeRigidBody(groundBody);
    disposeRendererLesson({ stop, scene, renderer });
  };
}
