/*
演示 Mesh 如何把 geometry、material 和 Object3D 变换组合成可渲染物体。

输入是几何类型、材质类型、线框开关与 drawRange；操作后画面和 renderer 三角形读数一起
变化。读文件时先看 apply()：geometry 与 material 可以独立替换，drawRange 属于 geometry。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const meshExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 30);
    camera.position.set(4.8, 3.5, 6.8);
    camera.lookAt(0, 0.6, 0);

    const geometries = {
      box: new THREE.BoxGeometry(2.2, 2.2, 2.2, 2, 2, 2),
      sphere: new THREE.SphereGeometry(1.45, 32, 20),
      torusKnot: new THREE.TorusKnotGeometry(1.1, 0.35, 96, 16)
    };
    const materials = {
      basic: new THREE.MeshBasicMaterial({ color: '#3d73d9' }),
      standard: new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.35, metalness: 0.15 }),
      normal: new THREE.MeshNormalMaterial()
    };
    const mesh = new THREE.Mesh(geometries.box, materials.standard);
    mesh.position.y = 1.55;
    scene.add(mesh);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));
    const light = new THREE.DirectionalLight('#ffffff', 2.6);
    light.position.set(4, 7, 5);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.9), light);

    const state = { geometryType: 'box', materialType: 'standard', fraction: 1 };

    function frame(delta) {
      mesh.rotation.y += delta * 0.45;
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

    return { mesh, geometries, materials, state, loop };
  },

  apply(instance, args) {
    const { mesh, geometries, materials, state, loop } = instance;
    mesh.geometry = geometries[args.geometryType];
    mesh.material = materials[args.materialType];
    mesh.material.wireframe = args.wireframe;

    const indexOrPosition = mesh.geometry.index ?? mesh.geometry.getAttribute('position');
    const fullCount = indexOrPosition.count;
    const drawCount = Math.max(3, Math.floor((fullCount * args.drawFraction) / 3) * 3);
    mesh.geometry.setDrawRange(0, drawCount);

    state.geometryType = args.geometryType;
    state.materialType = args.materialType;
    state.fraction = args.drawFraction;
    loop.renderOnce();
  },

  readout({ renderer, mesh, state }) {
    const position = mesh.geometry.getAttribute('position');
    return [
      ['geometry', state.geometryType],
      ['position 顶点', position.count],
      ['index', mesh.geometry.index?.count ?? 'null'],
      ['material', state.materialType],
      ['drawRange 比例', `${Math.round(state.fraction * 100)}%`],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
