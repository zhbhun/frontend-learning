/*
演示 InstancedMesh 默认 frustumCulled 行为在"实例分布变化后未重算 boundingSphere"时
如何把整个对象误剔除。

实例固定成簇分布在 X=12 附近（相机视野内）。boundingSphereMode：
- computed：调用 computeBoundingSphere()，包围球覆盖实例实际分布，对象正常显示。
- stale：把 boundingSphere 强制设为"实例仍在原点时计算的过期值"，模拟"setMatrixAt 平移
  实例后忘记重算"。此时原点落到相机背后、视锥外，整个对象被错误剔除，画面只剩网格和标记。
- disabled：mesh.frustumCulled = false，直接跳过视锥剔除。
读文件时先看 create() 怎样摆实例和相机，再看 apply() 怎样按模式切换 boundingSphere。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

const INSTANCE_COUNT = 220;
const CLUSTER_CENTER = new THREE.Vector3(12, 0, 0);
const CLUSTER_RADIUS = 1.0;

// 模拟"实例仍在原点时计算的过期包围球"——中心在原点，半径取簇半径。
// 真实场景中它对应"实例从原点移到 X=12 后，boundingSphere 没跟着重算"的状态。
const staleSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), CLUSTER_RADIUS);

export const instancedCullingExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    // 相机偏向 X 正方向并 lookAt 实例簇中心，让原点落到相机背后、视锥外。
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(14, 2.6, 5.5);
    camera.lookAt(CLUSTER_CENTER);

    scene.add(new THREE.GridHelper(40, 40, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(2.0));
    scene.add(new THREE.HemisphereLight('#ffffff', '#78908a', 0.75));
    const key = new THREE.DirectionalLight('#ffffff', 2.0);
    key.position.set(8, 10, 6);
    scene.add(key);

    const geometry = new THREE.IcosahedronGeometry(0.16, 0);
    const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });

    const mesh = new THREE.InstancedMesh(geometry, material, INSTANCE_COUNT);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    // 种子随机让实例位置稳定，切换 boundingSphereMode 时只改剔除判断，不动分布。
    let seed = 2024;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      // 在 CLUSTER_CENTER 附近球形分布：实例整体落在相机视野内。
      const r = Math.cbrt(rand()) * CLUSTER_RADIUS;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      dummy.position.set(
        CLUSTER_CENTER.x + r * Math.sin(phi) * Math.cos(theta),
        CLUSTER_CENTER.y + r * Math.sin(phi) * Math.sin(theta),
        CLUSTER_CENTER.z + r * Math.cos(phi)
      );
      dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, 0);
      dummy.scale.setScalar(0.8 + rand() * 0.6);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // 每实例颜色让簇在显示时更易辨认；material.color 设为白色避免压暗。
      color.setHSL(0.55 + rand() * 0.25, 0.55, 0.55);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // 首次按实例矩阵计算包围球，得到中心在 CLUSTER_CENTER 的正确值。
    mesh.computeBoundingSphere();
    scene.add(mesh);

    // 簇中心标记：黑色小球 + 坐标轴，标出实例实际聚集的位置，与原点的 AxesHelper 形成对照。
    const centerMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 10),
      new THREE.MeshBasicMaterial({ color: '#1f2d28' })
    );
    centerMarker.position.copy(CLUSTER_CENTER);
    scene.add(centerMarker);
    const centerAxes = new THREE.AxesHelper(1.2);
    centerAxes.position.copy(CLUSTER_CENTER);
    scene.add(centerAxes);

    const state = { boundingSphereMode: 'computed', mesh };

    function frame() {
      renderer.render(scene, camera);
      emitSnapshot({ renderer, scene, state, mesh, camera });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { scene, state, mesh, camera, loop };
  },

  apply(instance, args) {
    const { state, mesh, loop } = instance;
    state.boundingSphereMode = args.boundingSphereMode;
    if (args.boundingSphereMode === 'stale') {
      // 把包围球强制设为"实例仍在原点时计算的过期值"，模拟 setMatrixAt 后没重算。
      mesh.boundingSphere = staleSphere.clone();
      mesh.frustumCulled = true;
    } else if (args.boundingSphereMode === 'computed') {
      // 基于当前 instanceMatrix 重算包围球，覆盖整个实例簇。
      mesh.computeBoundingSphere();
      mesh.frustumCulled = true;
    } else {
      // disabled：直接跳过视锥剔除，相机背后的实例也会进入 GPU 提交。
      mesh.frustumCulled = false;
    }
    loop.renderOnce();
  },

  readout({ state, mesh, camera }) {
    // 用相机投影矩阵构造视锥，手算包围球与视锥是否相交，预测是否会被剔除。
    const frustum = new THREE.Frustum();
    const projMatrix = new THREE.Matrix4()
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projMatrix);
    const bs = mesh.boundingSphere;
    const intersects = bs ? frustum.intersectsSphere(bs) : true;
    const modeLabel = {
      stale: '过期（实例仍在原点时计算）',
      computed: 'computeBoundingSphere（已重算）',
      disabled: 'frustumCulled=false（跳过剔除）'
    }[state.boundingSphereMode];
    return [
      ['包围球模式', modeLabel],
      ['frustumCulled', mesh.frustumCulled ? 'true' : 'false'],
      ['包围球中心', bs ? formatVector(bs.center) : 'null'],
      ['包围球半径', bs ? bs.radius.toFixed(2) : '-'],
      ['实例实际位置', `${formatVector(CLUSTER_CENTER)} 附近`],
      ['包围球与视锥', intersects ? '相交（不剔除）' : '不相交（整个对象被剔除）'],
      ['实例数', INSTANCE_COUNT]
    ];
  }
};
