/*
演示 Material.side：FrontSide / BackSide / DoubleSide 如何决定正反面是否着色。

输入：side、旋转角度。
预期：
- FrontSide：只看正面，翻到背面消失；
- BackSide：只看背面；
- DoubleSide：正反都画（开销更高，且光照按各自朝向）。
读代码先看 PlaneGeometry 单面网格，再看 apply() 写入 material.side。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const SIDE_MAP = {
  front: THREE.FrontSide,
  back: THREE.BackSide,
  double: THREE.DoubleSide
};

export const materialSideExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 40);
    camera.position.set(3.6, 2.4, 4.6);
    camera.lookAt(0, 1.0, 0);

    const material = new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.45,
      side: THREE.FrontSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), material);
    mesh.position.y = 1.2;
    scene.add(mesh);

    // 背面对照色：用第二个很薄的盒子标出“相机另一侧还有内容”
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.35),
      new THREE.MeshBasicMaterial({ color: '#c0504d' })
    );
    marker.position.set(0, 1.2, -0.2);
    scene.add(marker);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(1.4));

    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(3, 5, 4);
    scene.add(key);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.55));

    const state = { side: 'front', rotationY: 0 };

    function frame() {
      renderer.render(scene, camera);
      emitSnapshot({ material, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { mesh, material, state, loop };
  },

  apply(instance, args) {
    const { mesh, material, state, loop } = instance;
    material.side = SIDE_MAP[args.side] ?? THREE.FrontSide;
    mesh.rotation.y = (args.rotationY * Math.PI) / 180;
    state.side = args.side;
    state.rotationY = args.rotationY;
    loop.renderOnce();
  },

  readout({ material, state }) {
    const labels = {
      [THREE.FrontSide]: 'FrontSide',
      [THREE.BackSide]: 'BackSide',
      [THREE.DoubleSide]: 'DoubleSide'
    };
    return [
      ['side', labels[material.side]],
      ['rotation.y', `${state.rotationY.toFixed(0)}°`],
      [
        '可见性',
        material.side === THREE.DoubleSide
          ? '正反都画'
          : '单面：转到另一侧会消失或只见背面'
      ]
    ];
  }
};
