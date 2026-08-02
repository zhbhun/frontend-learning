/*
演示同一几何体 + 同一光源下，5 种常用材质（MeshBasicMaterial、MeshLambertMaterial、
MeshPhongMaterial、MeshStandardMaterial、MeshNormalMaterial）的视觉差异。

输入：材质类型 + 线框开关。
读文件先看 create() 中 light 与受光材质的关系——只有 Lambert/Phong/Standard 响应光，
Basic 完全不受光，Normal 用顶点法线着色也不响应光。把材质切换到 Basic 时，再加多少 Light
画面也不会变暗或变亮。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const materialFamilyExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 30);
    camera.position.set(4.8, 3.2, 6.2);
    camera.lookAt(0, 1.0, 0);

    // 同一份几何供所有材质共用，差异只来自材质
    const geometry = new THREE.TorusKnotGeometry(1.0, 0.34, 128, 24);

    const materials = {
      basic: new THREE.MeshBasicMaterial({ color: '#3d73d9' }),
      lambert: new THREE.MeshLambertMaterial({ color: '#3d73d9' }),
      phong: new THREE.MeshPhongMaterial({
        color: '#3d73d9',
        specular: '#ffffff',
        shininess: 70
      }),
      standard: new THREE.MeshStandardMaterial({
        color: '#3d73d9',
        roughness: 0.35,
        metalness: 0.25
      }),
      normal: new THREE.MeshNormalMaterial()
    };
    const mesh = new THREE.Mesh(geometry, materials.standard);
    mesh.position.y = 1.0;
    scene.add(mesh);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));

    // 受光材质才需要光；basic / normal 不响应它，但保留它让对照场景一致
    const key = new THREE.DirectionalLight('#ffffff', 2.6);
    key.position.set(4, 7, 5);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.9), key);

    const state = { materialType: 'standard', wireframe: false };

    function frame(delta) {
      mesh.rotation.y += delta * 0.4;
      renderer.render(scene, camera);
      emitSnapshot({ renderer, mesh, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { mesh, materials, state, loop };
  },

  apply(instance, args) {
    const { mesh, materials, state, loop } = instance;
    mesh.material = materials[args.materialType];
    mesh.material.wireframe = args.wireframe;
    state.materialType = args.materialType;
    state.wireframe = args.wireframe;
    loop.renderOnce();
  },

  readout({ state }) {
    const litByLight = ['lambert', 'phong', 'standard'].includes(state.materialType);
    const hasSpecular = ['phong', 'standard'].includes(state.materialType);
    return [
      ['material', state.materialType],
      ['响应光', litByLight ? '是' : '否（再加光也不变）'],
      ['高光', hasSpecular ? '是' : '否'],
      ['wireframe', state.wireframe ? '开' : '关']
    ];
  }
};
