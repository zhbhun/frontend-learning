/*
演示 Group 如何用局部坐标组织多个对象，以及整体变换与各自变换的差异。

输入是变换目标（旋转 Group 整体 / 各自旋转每个 Mesh / 同时进行）与角速度。Group 自身不
渲染，但它的 rotation 会作为父级变换传给全部子对象，因此子对象局部 position 保持不变而
世界 position 绕 Group 原点旋转；切到"各自旋转"则只改子级自身 rotation，世界位置不变。
读文件时先看 apply() 中的分支，再看 frame() 中两种变换路径分别改的对象。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

const COLORS = ['#3d73d9', '#d17832', '#2f8b72', '#8f5ac7'];
const OFFSETS = [
  new THREE.Vector3(-2, 0, 0),
  new THREE.Vector3(2, 0, 0),
  new THREE.Vector3(0, 0, -2),
  new THREE.Vector3(0, 0, 2)
];

const localPosition = new THREE.Vector3();
const worldPosition = new THREE.Vector3();

export const groupExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
    camera.position.set(6, 5, 8);
    camera.lookAt(0, 0.7, 0);

    // Group 自身不参与渲染，只给子对象提供一个局部坐标系。
    const group = new THREE.Group();
    group.position.set(0, 0.7, 0);
    scene.add(group);

    // 在 Group 局部空间里把四个立方体摆成十字，相对 group 原点保持固定布局。
    const cubes = OFFSETS.map((offset, index) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        new THREE.MeshStandardMaterial({ color: COLORS[index], roughness: 0.45 })
      );
      mesh.position.copy(offset);
      group.add(mesh);
      return mesh;
    });

    // 中心标记帮助看清 Group 局部原点的位置；AxesHelper 跟随 Group 旋转，直接显示局部轴方向。
    const centerMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#1f2d28' })
    );
    group.add(centerMarker);

    const groupAxes = new THREE.AxesHelper(2.6);
    group.add(groupAxes);

    scene.add(new THREE.GridHelper(12, 12, '#8ba096', '#d3ded7'));
    const light = new THREE.DirectionalLight('#ffffff', 2.2);
    light.position.set(4, 7, 5);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.85), light);

    const state = { transformMode: 'group', speed: 0.6 };

    function frame(delta) {
      const step = delta * state.speed;
      if (state.transformMode === 'group' || state.transformMode === 'both') {
        // 改 Group 的 rotation，子对象的局部 position 保持不变，但子级世界 position 会随之改变。
        group.rotation.y += step;
      }
      if (state.transformMode === 'individual' || state.transformMode === 'both') {
        // 改子对象自身的 rotation，绕各自中心旋转，世界位置不变。
        cubes.forEach((cube) => {
          cube.rotation.y += step;
        });
      }

      renderer.render(scene, camera);

      // 取第一个立方体作为采样：Group 旋转时它绕原点转动，世界 position 会持续变化。
      const sample = cubes[0];
      localPosition.copy(sample.position);
      sample.getWorldPosition(worldPosition);
      emitSnapshot({ renderer, group, sample, state, localPosition, worldPosition });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { group, cubes, state, loop };
  },

  apply(instance, args) {
    const { state, loop } = instance;
    state.transformMode = args.transformMode;
    state.speed = args.speed;
    loop.renderOnce();
  },

  readout({ renderer, group, sample, state, localPosition, worldPosition }) {
    const modeLabel = {
      group: '旋转 Group',
      individual: '各自旋转',
      both: '同时旋转'
    }[state.transformMode];
    return [
      ['变换目标', modeLabel],
      ['Group 旋转 Y', `${THREE.MathUtils.radToDeg(group.rotation.y).toFixed(0)}°`],
      ['采样 Mesh 局部 position', formatVector(localPosition)],
      ['采样 Mesh 世界 position', formatVector(worldPosition)],
      ['采样 Mesh 自身旋转 Y', `${THREE.MathUtils.radToDeg(sample.rotation.y).toFixed(0)}°`],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
