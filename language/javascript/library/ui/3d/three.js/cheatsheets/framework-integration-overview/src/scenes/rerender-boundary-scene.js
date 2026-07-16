/*
本示例演示框架 re-render 与 three.js 资源创建之间的边界。
读代码先看 renderVersion()：稳定引用模式只改已有 mesh 的属性；重复创建模式每次 render 都 new geometry/material，再释放旧资源。
页面控件对应状态：模式按钮决定更新策略，props 版本改变颜色和缩放，render 次数模拟组件重复执行。
预期观察：稳定引用模式下 geometry/material 创建计数保持不变；重复创建模式下创建和释放计数会随着 render 次数快速上升。
*/

import * as THREE from 'three';
import {
  addReferenceGrid,
  addStudioLights,
  createCamera,
  createRenderer,
  createScene,
  disposeObjectTree,
  readRendererInfo,
  syncRendererSize
} from '../shared-stage.js';

const colors = ['#28747c', '#c96332', '#6d5bd0', '#4f8f45', '#b54e7a'];

export function createRerenderBoundaryController({ host, onSnapshot }) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 're-render 边界 three.js 画布');
  host.replaceChildren(canvas);

  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createScene();
  addStudioLights(scene);
  addReferenceGrid(scene);

  const state = {
    mode: 'stable',
    version: 0,
    renders: 0,
    created: {
      geometries: 0,
      materials: 0
    },
    disposed: {
      geometries: 0,
      materials: 0
    },
    action: '初始化',
    info: readRendererInfo(renderer)
  };

  let mesh = createPropMesh(0, state);
  scene.add(mesh);

  const resizeObserver = 'ResizeObserver' in window
    ? new ResizeObserver(() => renderFrame())
    : null;
  resizeObserver?.observe(host);

  function renderVersion(version) {
    const safeVersion = clampVersion(version);
    state.version = safeVersion;
    state.renders += 1;

    if (state.mode === 'stable') {
      applyProps(mesh, safeVersion);
      state.action = '稳定引用：复用 mesh，只更新属性';
    } else {
      const oldMesh = mesh;
      scene.remove(oldMesh);
      const disposed = disposeObjectTree(oldMesh);
      state.disposed.geometries += disposed.geometries;
      state.disposed.materials += disposed.materials;

      mesh = createPropMesh(safeVersion, state);
      scene.add(mesh);
      state.action = '重复创建：本次 render 新建 geometry/material';
    }

    renderFrame();
    publish();
  }

  function renderNext() {
    renderVersion(state.version + 1);
  }

  function renderMany(count) {
    for (let index = 0; index < count; index += 1) {
      renderVersion(state.version + 1);
    }
  }

  function setMode(mode) {
    state.mode = mode;
    state.action = mode === 'stable'
      ? '切换到稳定引用：后续只改属性'
      : '切换到重复创建：后续每次 render 重建资源';
    publish();
  }

  function reset() {
    scene.remove(mesh);
    disposeObjectTree(mesh);

    state.version = 0;
    state.renders = 0;
    state.created = { geometries: 0, materials: 0 };
    state.disposed = { geometries: 0, materials: 0 };

    mesh = createPropMesh(0, state);
    scene.add(mesh);
    state.action = '重置计数并创建初始 mesh';
    renderFrame();
    publish();
  }

  function renderFrame() {
    syncRendererSize({ renderer, camera, element: host });
    mesh.rotation.y += 0.015;
    renderer.render(scene, camera);
    state.info = readRendererInfo(renderer);
  }

  function publish() {
    onSnapshot?.({
      mode: state.mode,
      version: state.version,
      renders: state.renders,
      created: state.created,
      disposed: state.disposed,
      action: state.action,
      info: state.info
    });
  }

  renderFrame();
  publish();

  return {
    renderVersion,
    renderNext,
    renderMany,
    setMode,
    reset
  };
}

function createPropMesh(version, state) {
  state.created.geometries += 1;
  state.created.materials += 1;

  const geometry = new THREE.BoxGeometry(1.45, 1.45, 1.45, 3, 3, 3);
  const material = new THREE.MeshStandardMaterial({
    color: colors[version % colors.length],
    roughness: 0.44,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(geometry, material);
  applyProps(mesh, version);
  return mesh;
}

function applyProps(mesh, version) {
  mesh.material.color.set(colors[version % colors.length]);
  mesh.scale.setScalar(0.82 + (version % 5) * 0.1);
  mesh.rotation.x = version * 0.08;
  mesh.position.y = 0.02;
}

function clampVersion(version) {
  const wrapped = Number.isFinite(version) ? version : 0;
  return ((Math.round(wrapped) % 13) + 13) % 13;
}
