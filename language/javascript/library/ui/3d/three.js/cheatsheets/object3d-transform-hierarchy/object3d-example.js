/*
演示 Object3D 的局部变换、父子层级与矩阵更新。

输入是父级旋转、父级缩放、子级局部 X 和矩阵更新策略；操作后同时显示子级局部坐标、
世界坐标与 matrixWorld 中的平移。关闭自动更新并故意不调用 updateMatrix() 时，属性值
会变化而矩阵结果保持旧值。读文件时先看 apply() 中的矩阵生效分支。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

const worldPosition = new THREE.Vector3();
const matrixPosition = new THREE.Vector3();

export const object3DExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
    camera.position.set(7, 6, 9);
    camera.lookAt(0, 1, 0);

    const parent = new THREE.Group();
    parent.position.set(0, 0.7, 0);
    scene.add(parent);

    const child = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.45 })
    );
    child.position.set(2.6, 0, 0);
    parent.add(child);

    const parentAxes = new THREE.AxesHelper(2.2);
    parent.add(parentAxes);
    child.add(new THREE.AxesHelper(1.1));

    scene.add(new THREE.GridHelper(12, 12, '#8ba096', '#d3ded7'));
    const light = new THREE.DirectionalLight('#ffffff', 2.2);
    light.position.set(4, 7, 5);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.8), light);

    const state = { updateMatrix: true };

    function frame() {
      // renderer.render() 会更新启用自动更新的层级；手动模式则只使用已提交的矩阵。
      renderer.render(scene, camera);
      child.getWorldPosition(worldPosition);
      matrixPosition.setFromMatrixPosition(child.matrixWorld);
      emitSnapshot({ child, parent, state, worldPosition, matrixPosition });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { parent, child, state, loop, resizeObserver };
  },

  apply(instance, args) {
    const { parent, child, state, loop } = instance;
    parent.rotation.y = THREE.MathUtils.degToRad(args.parentRotationY);
    parent.scale.setScalar(args.parentScale);
    child.position.x = args.childLocalX;
    parent.matrixAutoUpdate = args.matrixAutoUpdate;
    child.matrixAutoUpdate = args.matrixAutoUpdate;
    state.updateMatrix = args.updateMatrix;

    if (!args.matrixAutoUpdate && args.updateMatrix) {
      // 关闭自动更新后，局部矩阵与整条世界矩阵链都由应用负责提交。
      parent.updateMatrix();
      child.updateMatrix();
      parent.updateMatrixWorld(true);
    }

    loop.renderOnce();
  },

  readout({ child, parent, state, worldPosition, matrixPosition }) {
    return [
      ['子级局部 position', formatVector(child.position)],
      ['子级世界 position', formatVector(worldPosition)],
      ['matrixWorld 平移', formatVector(matrixPosition)],
      ['父级旋转 Y', `${THREE.MathUtils.radToDeg(parent.rotation.y).toFixed(0)}°`],
      ['矩阵策略', parent.matrixAutoUpdate ? '自动' : state.updateMatrix ? '手动已提交' : '手动未提交']
    ];
  }
};
