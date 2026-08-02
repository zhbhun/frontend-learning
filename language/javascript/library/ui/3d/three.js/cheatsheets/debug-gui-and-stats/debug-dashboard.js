/*
调试反馈面板范例：在一个场景里同时展示多种调试反馈渠道，作为"调试反馈环"的可观察证据。

不依赖 lil-gui / stats.js（工作区未安装这两个包），而是用同源思路在 Storybook 里复现：
- Storybook Controls 充当调参面板（对应 lil-gui 的 gui.add / addColor）
- renderer.info 给出 draw calls / triangles / geometries / textures（硬渲染统计）
- 手算 FPS（frame delta 的滑动平均）替代 stats.js 的 FPS 面板
- scene.traverse 按类型计数，对应"控制台检查对象层级"的做法

输入是 Controls 面板的参数（对象颜色、粗糙度、周围对象数量、helper 开关）；
操作后画面与读数同步变化，让读者看到"改一个值，哪些调试读数跟着变"。
读文件时先看 frame()：renderer.render 之后读 info + traverse 计数 + FPS 滑动平均，
emitSnapshot 把它们推给 readout；apply() 把 Controls 的参数落到 material / 场景树。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const FPS_WINDOW = 30; // FPS 滑动平均的样本数

export const debugDashboardExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 60);
    camera.position.set(5.5, 4, 7);
    camera.lookAt(0, 0.6, 0);

    // helper：默认开启，可在 Controls 里关掉，用来对比"加 helper 前后"的 draw calls 差值。
    // Helper 的完整用法（构造、update、dispose、各类型对照）在 Helper 课展开，这里只用最常见三种。
    const axes = new THREE.AxesHelper(2.2);
    const grid = new THREE.GridHelper(16, 16, '#8ba096', '#d3ded7');
    scene.add(axes, grid);

    scene.add(new THREE.HemisphereLight('#ffffff', '#78908a', 0.85));
    const key = new THREE.DirectionalLight('#ffffff', 1.8);
    key.position.set(4, 7, 5);
    scene.add(key);

    // 中心对象：颜色与粗糙度由 Controls 调整，对应 lil-gui 在真实项目里暴露的"调参"参数。
    const demoMaterial = new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.5,
      metalness: 0.1
    });
    const demoMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.9, 1),
      demoMaterial
    );
    demoMesh.position.y = 0.9;
    scene.add(demoMesh);

    // 跟踪型 helper：被辅助对象变换后要 update() 才会跟随；漏掉是常见坑。
    const boxHelper = new THREE.BoxHelper(demoMesh, '#ffd23f');
    scene.add(boxHelper);

    // 周围对象：数量由 Controls 控制，用来观察 draw calls / triangles 随对象数近似线性变化。
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: '#cfd6dd',
      roughness: 0.8
    });

    function rebuildRing(count) {
      // 销毁旧 geometry（共享 material 复用不动），否则 renderer.info.memory.geometries 会只增不减。
      for (const child of [...ringGroup.children]) {
        child.geometry.dispose();
        ringGroup.remove(child);
      }
      for (let i = 0; i < count; i++) {
        const angle = (i / Math.max(count, 1)) * Math.PI * 2;
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.3, 0.3),
          ringMaterial
        );
        box.position.set(Math.cos(angle) * 2.6, 0.4, Math.sin(angle) * 2.6);
        ringGroup.add(box);
      }
    }

    const state = {
      showHelpers: true
    };

    rebuildRing(12);

    const deltas = []; // FPS 滑动平均窗口
    let helpersInScene = true; // 跟踪 helper 当前是否在场景树里，避免重复 add/remove

    function frame(deltaRaw) {
      demoMesh.rotation.y += deltaRaw * 0.5;
      ringGroup.rotation.y -= deltaRaw * 0.15;
      boxHelper.update();

      // helper 开关：实际增删场景里的 helper 节点，下一次 render 的 draw calls 会立刻反映。
      if (state.showHelpers !== helpersInScene) {
        if (state.showHelpers) {
          scene.add(axes, grid, boxHelper);
        } else {
          scene.remove(axes, grid, boxHelper);
        }
        helpersInScene = state.showHelpers;
      }

      renderer.render(scene, camera);

      // FPS：跳过 0（循环恢复后的首帧 delta）避免除零；滑动平均后比单帧倒数更稳。
      if (deltaRaw > 0) {
        deltas.push(deltaRaw);
        if (deltas.length > FPS_WINDOW) deltas.shift();
      }
      const avgDelta =
        deltas.length > 0
          ? deltas.reduce((sum, d) => sum + d, 0) / deltas.length
          : 0;
      const fps = avgDelta > 0 ? Math.min(999, Math.round(1 / avgDelta)) : 0;

      // scene.traverse 按类别计数：对应"用控制台检查对象层级"的做法。
      // 每帧一次开销可控；真实项目里这种结构可以一次性打印到 console。
      const counts = { mesh: 0, light: 0, helper: 0 };
      scene.traverse((obj) => {
        if (obj.isMesh) counts.mesh++;
        else if (obj.isLight) counts.light++;
        else if (/Helper$/.test(obj.type)) counts.helper++;
      });

      // renderer.info 在 autoReset=true（默认）下反映上一帧的渲染开销。
      const info = renderer.info;
      emitSnapshot({
        fps,
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        counts
      });
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
      demoMaterial,
      ringGroup,
      rebuildRing,
      loop
    };
  },

  apply(instance, args) {
    instance.state.showHelpers = args.showHelpers;
    instance.demoMaterial.color.set(args.objectColor);
    instance.demoMaterial.roughness = args.roughness;
    // 只有数量真的变了才重建，避免每帧 dispose + 重建造成读数抖动。
    if (instance.ringGroup.children.length !== args.ringCount) {
      instance.rebuildRing(args.ringCount);
    }
    // 暂停状态下也立刻重渲染一帧，让 Controls 的改动在视口外时也能在恢复后看到正确状态。
    instance.loop.renderOnce();
  },

  readout(snap) {
    const c = snap.counts;
    return [
      ['FPS（滑动平均）', snap.fps],
      ['draw calls', snap.calls],
      ['triangles', snap.triangles.toLocaleString()],
      ['geometries', snap.geometries],
      ['textures', snap.textures],
      ['场景对象', `Mesh ${c.mesh} · Light ${c.light} · Helper ${c.helper}`]
    ];
  }
};
