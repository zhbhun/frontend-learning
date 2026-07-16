/*
本示例演示如何把常见异常压成最小复现。
读代码先看 rebuildMode()：每次只切换一个变量，其他上下文保持尽量少。
控件对应状态：正常参照、空场景、MeshStandardMaterial 无光、对象尺寸过小；切换后会用 console.groupCollapsed 和 console.table 输出快照。
预期观察：空场景没有 mesh，材质无光会发黑，尺寸过小几乎不可见；读数能把“看不见”拆成不同原因。
*/

import * as THREE from 'three';
import {
  addBaseLights,
  collectSceneStats,
  createBaseScene,
  createCamera,
  createRenderer,
  disposeObjectTree,
  formatVector,
  resizeRendererAndCamera
} from '../shared-stage.js';

const modes = {
  normal: {
    label: '正常参照',
    toolbar: 'normal',
    diagnosis: '可见基线'
  },
  empty: {
    label: '空场景',
    toolbar: 'empty',
    diagnosis: '没有可渲染 Mesh'
  },
  'unlit-material': {
    label: '材质无光',
    toolbar: 'unlit',
    diagnosis: 'MeshStandardMaterial 缺少灯光'
  },
  'tiny-scale': {
    label: '尺寸过小',
    toolbar: 'tiny',
    diagnosis: '包围盒尺寸接近 0'
  }
};

export function createMinimalReproScene(canvas, onSnapshot) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  let mode = 'normal';
  let content = null;
  let frameId = 0;

  rebuildMode(mode);
  render();

  function rebuildMode(nextMode) {
    mode = nextMode;

    if (content) {
      scene.remove(content);
      disposeObjectTree(content);
    }

    content = createModeContent(mode);
    scene.add(content);
    publishSnapshot();
    logReproSnapshot();
  }

  function render() {
    resizeRendererAndCamera(renderer, camera, canvas);

    if (content?.userData.mesh) {
      content.userData.mesh.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }

  function publishSnapshot() {
    const mesh = content?.userData.mesh ?? null;
    const stats = collectSceneStats(content);
    const hasBox = Boolean(mesh);

    if (hasBox) {
      box.setFromObject(mesh);
      box.getSize(size);
    }

    onSnapshot?.({
      modeText: modes[mode].label,
      nodesText: `${stats.nodes} nodes, ${stats.meshes} mesh, ${stats.lights} light`,
      boxText: hasBox ? formatVector(size) : '-',
      diagnosisText: modes[mode].diagnosis,
      toolbarText: modes[mode].toolbar
    });
  }

  function logReproSnapshot() {
    const mesh = content?.userData.mesh ?? null;
    const stats = collectSceneStats(content);

    if (mesh) {
      box.setFromObject(mesh);
      box.getSize(size);
    }

    console.groupCollapsed(`[minimal-repro] ${modes[mode].label}`);
    console.table([
      { key: 'mode', value: mode },
      { key: 'nodes', value: stats.nodes },
      { key: 'meshes', value: stats.meshes },
      { key: 'lights', value: stats.lights },
      { key: 'material', value: mesh?.material?.type ?? '-' },
      { key: 'boxSize', value: mesh ? formatVector(size) : '-' },
      { key: 'cameraNearFar', value: `${camera.near.toFixed(2)} / ${camera.far.toFixed(2)}` }
    ]);
    console.groupEnd();
  }

  return {
    setMode(nextMode) {
      rebuildMode(nextMode);
    },
    dispose() {
      cancelAnimationFrame(frameId);
      if (content) {
        scene.remove(content);
        disposeObjectTree(content);
      }
      renderer.dispose();
    }
  };
}

function createModeContent(mode) {
  const group = new THREE.Group();
  group.name = `minimalRepro:${mode}`;

  if (mode === 'empty') {
    return group;
  }

  if (mode === 'normal' || mode === 'tiny-scale') {
    addBaseLights(group);
    const grid = new THREE.GridHelper(4, 8, '#60768a', '#c6d3de');
    group.add(grid);
  }

  const material = new THREE.MeshStandardMaterial({
    color: mode === 'unlit-material' ? '#4f8cff' : '#e58b35',
    roughness: 0.48,
    metalness: 0.08
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.name = 'reproMesh';
  mesh.position.y = mode === 'tiny-scale' ? 0.04 : 0.6;

  if (mode === 'tiny-scale') {
    // 单位或缩放错误常让对象“存在但看不见”；读 Box3 尺寸能直接确认。
    mesh.scale.setScalar(0.025);
  }

  group.userData.mesh = mesh;
  group.add(mesh);
  return group;
}
