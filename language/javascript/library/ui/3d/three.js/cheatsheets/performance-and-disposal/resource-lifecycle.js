/*
dispose 与资源复用范例：通过对照 renderer.info.memory 的变化，说明
- 移除场景节点后是否调用 dispose()，决定 geometry/texture 是否真正从显存释放；
- 共享 geometry 时，memory.geometries 不随对象数线性增长。

输入是场景对象数、是否在移除时 dispose、是否共享 geometry。
- 减小对象数时：disposeOnRemove=true 则 memory.geometries 跟着减少；
  disposeOnRemove=false 则只增不减（节点从场景树移除了，但 GPU 资源没释放）。
- shareGeometry=true 时：所有 mesh 引用同一份 geometry，memory.geometries 始终是 1；
  新增不增、移除不减（直到范例销毁时由 sharedGeometry.dispose() 一次性释放）。
读文件时先看 syncPool() 的增减分支，再看 apply() 怎样在共享模式切换时整体重建。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const POOL_RADIUS = 2.6;

// 用确定性参数生成布局，让对象数变化时分布稳定。
function placeAt(index, out) {
  const theta = (index * 2.399) % (Math.PI * 2);
  const phi = Math.acos(((index * 37) % 100) / 50 - 1);
  const r = POOL_RADIUS * (0.55 + ((index * 13) % 10) / 18);
  out.set(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi) + 1.0,
    r * Math.sin(phi) * Math.sin(theta)
  );
  return out;
}

export const resourceLifecycleExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 50);
    camera.position.set(5, 4, 6);
    camera.lookAt(0, 0.8, 0);

    scene.add(new THREE.GridHelper(14, 14, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(2));
    scene.add(new THREE.HemisphereLight('#ffffff', '#78908a', 0.8));
    const key = new THREE.DirectionalLight('#ffffff', 2.0);
    key.position.set(4, 7, 5);
    scene.add(key);

    // 共享资源：所有 mesh 复用同一份 geometry 和 material。
    // disposeOnRemove 只影响"每对象独占的 geometry"；共享资源要等范例销毁时统一释放。
    const sharedGeometry = new THREE.IcosahedronGeometry(0.32, 1);
    const sharedMaterial = new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.45,
      metalness: 0.1
    });

    const pool = new THREE.Group();
    scene.add(pool);

    const state = {
      objectCount: 0,
      disposeOnRemove: true,
      shareGeometry: false,
      lastShareGeometry: false,
      totalCreated: 0,
      totalDisposed: 0
    };

    const tmp = new THREE.Vector3();

    function createOne(shareGeometry) {
      const geometry = shareGeometry
        ? sharedGeometry
        : new THREE.IcosahedronGeometry(0.32, 1);
      const mesh = new THREE.Mesh(geometry, sharedMaterial);
      placeAt(pool.children.length, tmp);
      mesh.position.copy(tmp);
      mesh.userData.ownsGeometry = !shareGeometry; // 销毁时按此决定是否 dispose
      pool.add(mesh);
      state.totalCreated++;
    }

    function removeOne(disposeOnRemove) {
      const mesh = pool.children[pool.children.length - 1];
      pool.remove(mesh);
      if (!mesh.userData.ownsGeometry) return; // 共享 geometry：节点移除即可
      if (disposeOnRemove) {
        mesh.geometry.dispose();
        state.totalDisposed++;
      }
      // dispose=false 时：JS 引用也丢了，但 GPU 资源仍在显存——真正的"泄漏"形态。
    }

    function syncPool(targetCount) {
      while (pool.children.length < targetCount) {
        createOne(state.shareGeometry);
      }
      while (pool.children.length > targetCount) {
        removeOne(state.disposeOnRemove);
      }
      state.objectCount = pool.children.length;
    }

    function clearPool(disposeOnRemove, shareGeometry) {
      while (pool.children.length > 0) {
        removeOne(disposeOnRemove);
      }
      state.objectCount = 0;
    }

    function frame(delta) {
      pool.rotation.y += delta * 0.2;
      renderer.render(scene, camera);
      emitSnapshot({ renderer, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return {
      scene,
      renderer,
      state,
      pool,
      syncPool,
      clearPool,
      loop
    };
  },

  apply(instance, args) {
    const { state, syncPool, clearPool, loop } = instance;
    // disposeOnRemove 不需要重建：只影响接下来的"减少"行为。
    state.disposeOnRemove = args.disposeOnRemove;

    // 切换 shareGeometry 必须整体重建：旧 mesh 引用的是独占 geometry，
    // 新 mesh 要引用 sharedGeometry；混用会让 dispose 逻辑无法判断归属。
    if (state.lastShareGeometry !== args.shareGeometry) {
      // 旧池子按"上一次的 share + 当前的 dispose"清空
      const previousShare = state.lastShareGeometry;
      state.shareGeometry = previousShare;
      clearPool(args.disposeOnRemove);
      // 然后用新模式重建到目标数
      state.shareGeometry = args.shareGeometry;
      state.lastShareGeometry = args.shareGeometry;
      syncPool(args.objectCount);
    } else if (state.objectCount !== args.objectCount) {
      state.shareGeometry = args.shareGeometry;
      syncPool(args.objectCount);
    }

    loop.renderOnce();
  },

  readout({ renderer, state }) {
    const info = renderer.info;
    return [
      ['场景对象数', state.objectCount],
      [
        '移除时 dispose()',
        state.disposeOnRemove
          ? '是（memory.geometries 随减）'
          : '否（memory.geometries 只增不减）'
      ],
      [
        '共享 geometry',
        state.shareGeometry
          ? '是（memory.geometries 始终 1）'
          : '否（每对象独占一份）'
      ],
      ['memory.geometries', info.memory.geometries],
      ['memory.textures', info.memory.textures],
      ['shader programs', info.programs?.length ?? 0],
      ['累计创建 / 释放', `${state.totalCreated} / ${state.totalDisposed}`]
    ];
  }
};
