/*
演示半透明与深度写入冲突：前景半透明球挡住后方色块时，关掉 depthWrite
会改变遮挡结果。

输入：opacity、depthWrite、transparent。
预期：
- transparent=true 且 opacity<1 时可见半透明；
- depthWrite=true 时半透明球仍写入深度，后方物体容易被“挖空”或排序怪异；
- depthWrite=false 时后方色块更容易透出来（仍受绘制顺序影响）。
读代码先看前后两个 mesh 的叠放，再看 apply() 对 transparent / opacity / depthWrite。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const transparencyDepthExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 40);
    camera.position.set(0, 1.4, 6.2);
    camera.lookAt(0, 1.0, 0);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.6, 0.35),
      new THREE.MeshStandardMaterial({ color: '#c0504d', roughness: 0.55 })
    );
    back.position.set(0.55, 1.05, -0.9);
    scene.add(back);

    const frontMaterial = new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.35,
      transparent: true,
      opacity: 0.45,
      depthWrite: true
    });
    const front = new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 32), frontMaterial);
    front.position.set(-0.2, 1.05, 0.55);
    scene.add(front);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));

    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(3, 5, 4);
    scene.add(key);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.55));

    function frame(delta) {
      front.rotation.y += delta * 0.25;
      back.rotation.y -= delta * 0.15;
      renderer.render(scene, camera);
      emitSnapshot({ frontMaterial });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { frontMaterial, loop };
  },

  apply(instance, args) {
    const { frontMaterial, loop } = instance;
    frontMaterial.transparent = args.transparent;
    frontMaterial.opacity = args.opacity;
    frontMaterial.depthWrite = args.depthWrite;
    loop.renderOnce();
  },

  readout({ frontMaterial }) {
    return [
      ['transparent', String(frontMaterial.transparent)],
      ['opacity', frontMaterial.opacity.toFixed(2)],
      ['depthWrite', String(frontMaterial.depthWrite)],
      [
        '观察',
        frontMaterial.transparent && frontMaterial.depthWrite
          ? '半透明仍写深度 → 后方易被挖空'
          : frontMaterial.transparent && !frontMaterial.depthWrite
            ? '半透明不写深度 → 后方更容易透出'
            : '接近不透明合成'
      ]
    ];
  }
};
