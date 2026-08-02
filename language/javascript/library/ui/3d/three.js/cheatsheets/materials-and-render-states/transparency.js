/*
演示透明渲染最容易出错的三个开关之间的关系：
- transparent + opacity：基础半透明。开启后 renderer 按材质的 depth 对透明对象排序，
  并在不写深度时让背后对象透过它显示。
- alphaTest：硬透明（贴图边缘常见的"全有或全无"）。低于阈值的片元直接丢弃，
  不进入透明排序，也不需要排序就能写出干净边缘——常配合带 alpha 通道的 map。
- depthWrite：透明物体是否写深度。true 时近处透明面会"挖掉"远处透明面，
  常见症状是半透明物体之间出现黑色或错位的接缝；透明面之间通常应设 false。

输入：opacity、alphaTest、depthWrite。
场景：3 个前后交错的半透明球，中间球前后平移制造可观察的前后关系。
读 create() 看初始 transparent/opacity/depthWrite，读 apply() 看切换 depthWrite 后画面差异。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const transparencyExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#232830');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 30);
    camera.position.set(0, 2.5, 6.5);
    camera.lookAt(0, 1.0, 0);

    scene.add(new THREE.GridHelper(12, 12, '#5a6168', '#42484f'));

    // 共享同一份几何：球体表面有连续法线，便于观察高光透过另一面时的差异
    const geometry = new THREE.SphereGeometry(0.9, 36, 24);
    const colors = ['#3d73d9', '#d17832', '#2f8b72'];
    const positions = [
      [-1.0, 1.0, 0],
      [1.0, 1.0, 0],
      [0, 1.0, 0]
    ];

    const meshes = positions.map((pos, i) => {
      const material = new THREE.MeshStandardMaterial({
        color: colors[i],
        roughness: 0.45,
        transparent: true,
        opacity: 0.6,
        depthWrite: true
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos[0], pos[1], pos[2]);
      scene.add(mesh);
      return mesh;
    });

    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(4, 6, 4);
    scene.add(key);
    scene.add(new THREE.HemisphereLight('#5a6677', '#2a2d33', 0.4));

    const state = { opacity: 0.6, alphaTest: 0, depthWrite: true };

    function frame(delta) {
      meshes.forEach((m, i) => {
        m.rotation.y += delta * (0.2 + i * 0.05);
      });
      // 中间球前后平移，制造可观察的"前后关系"，让 depthWrite 切换的差异最明显
      meshes[2].position.z = Math.sin(performance.now() * 0.0008) * 0.7;
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

    return { meshes, state, loop };
  },

  apply(instance, args) {
    const { meshes, state, loop } = instance;
    state.opacity = args.opacity;
    state.alphaTest = args.alphaTest;
    state.depthWrite = args.depthWrite;

    // opacity < 1 或 alphaTest > 0 都需要 transparent 才能正确合成
    const needsTransparent = args.opacity < 1 || args.alphaTest > 0;
    meshes.forEach((mesh) => {
      mesh.material.opacity = args.opacity;
      mesh.material.transparent = needsTransparent;
      mesh.material.alphaTest = args.alphaTest;
      mesh.material.depthWrite = args.depthWrite;
      // 切换 transparent 会改变 shader 路径，需要触发重编
      mesh.material.needsUpdate = true;
    });
    loop.renderOnce();
  },

  readout({ renderer, state }) {
    const transparent = state.opacity < 1 || state.alphaTest > 0;
    return [
      ['opacity', state.opacity.toFixed(2)],
      ['alphaTest', state.alphaTest.toFixed(2)],
      ['transparent', transparent ? 'true' : 'false'],
      ['depthWrite', state.depthWrite ? 'true（近处透明面会挖洞）' : 'false（透明推荐）'],
      ['draw calls', renderer.info.render.calls]
    ];
  }
};
