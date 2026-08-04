/*
演示 ViewHelper：视口一角的轴向 gizmo。

输入：相机绕场景旋转。
预期：主画面旋转时，右下角 ViewHelper 同步显示相机朝向。
实现要点：主场景渲染后调用 viewHelper.render(renderer)，并关闭 autoClear。
*/

import * as THREE from 'three';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  disposeObjectTree,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const viewHelperExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    renderer.autoClear = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(5, 3.5, 6);
    camera.lookAt(0, 0.6, 0);

    scene.add(new THREE.HemisphereLight('#ffffff', '#7c8d83', 0.9));
    const key = new THREE.DirectionalLight('#ffffff', 1.8);
    key.position.set(4, 6, 5);
    scene.add(key);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(1.8));

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.45 })
    );
    mesh.position.y = 0.7;
    scene.add(mesh);

    const viewHelper = new ViewHelper(camera, renderer.domElement);
    viewHelper.center.set(0, 0.6, 0);

    const state = { azimuth: 40, polar: 55, distance: 8 };

    function placeCamera() {
      const az = THREE.MathUtils.degToRad(state.azimuth);
      const pol = THREE.MathUtils.degToRad(state.polar);
      camera.position.set(
        state.distance * Math.sin(az) * Math.sin(pol),
        state.distance * Math.cos(pol),
        state.distance * Math.cos(az) * Math.sin(pol)
      );
      camera.lookAt(0, 0.6, 0);
    }

    function frame() {
      placeCamera();
      renderer.clear();
      renderer.render(scene, camera);
      viewHelper.render(renderer);
      emitSnapshot({
        azimuth: state.azimuth,
        polar: state.polar,
        renderer
      });
    }

    const loop = createRenderLoop(canvas, frame);

    function resize() {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    }

    const resizeObserver = createResizeObserver(canvas, resize);
    resize();

    return {
      state,
      loop,
      render() {
        loop.renderOnce();
      },
      dispose() {
        loop.dispose();
        resizeObserver.disconnect();
        disposeObjectTree(scene);
        viewHelper.dispose?.();
        renderer.dispose();
      }
    };
  },

  apply(instance, args) {
    instance.state.azimuth = args.azimuth;
    instance.state.polar = args.polar;
    instance.state.distance = args.distance;
    instance.render();
  },

  readout({ azimuth, polar, renderer }) {
    return [
      ['方位角', `${Number(azimuth).toFixed(0)}°`],
      ['极角', `${Number(polar).toFixed(0)}°`],
      ['本帧三角形', renderer?.info?.render?.triangles ?? '—']
    ];
  }
};
