/*
演示 Scene 的根容器、背景、雾与 overrideMaterial。

输入是背景色、雾类型与参数、材质覆盖开关；操作后画面展示不同深度的对象，读数显示
场景直属对象数量和当前全局状态。读文件时先看 apply()：背景、雾和材质覆盖互不替代。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize,
  rotateObjects
} from '../../assets/shared-scene.js';

export const sceneExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 50);
    camera.position.set(7, 5, 10);
    camera.lookAt(0, 1, -5);

    const group = new THREE.Group();
    scene.add(group);

    const geometries = [
      new THREE.BoxGeometry(1.3, 1.3, 1.3),
      new THREE.SphereGeometry(0.75, 28, 18),
      new THREE.TorusKnotGeometry(0.58, 0.2, 72, 12)
    ];
    const materials = ['#3d73d9', '#d17832', '#2f8b72'].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.45 })
    );
    // 第二个材质拒绝 Scene.overrideMaterial，便于观察 allowOverride 的例外。
    materials[1].allowOverride = false;

    const objects = Array.from({ length: 7 }, (_, index) => {
      const mesh = new THREE.Mesh(geometries[index % 3], materials[index % 3]);
      mesh.position.set((index % 2 ? 1 : -1) * (1.2 + (index % 3) * 0.25), 0.9, 1 - index * 2.1);
      group.add(mesh);
      return mesh;
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 24),
      new THREE.MeshStandardMaterial({ color: '#cbd8d0', roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -7;
    scene.add(floor);

    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(5, 8, 4);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.8), key);

    const overrideMaterial = new THREE.MeshNormalMaterial();
    const state = { fogType: 'linear', override: false };

    function frame(delta) {
      rotateObjects(objects, delta);
      renderer.render(scene, camera);
      emitSnapshot({ scene, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { scene, overrideMaterial, state, loop };
  },

  apply(instance, args) {
    const { scene, overrideMaterial, state, loop } = instance;
    scene.background = new THREE.Color(args.background);
    state.fogType = args.fogType;
    state.override = args.overrideMaterial;

    if (args.fogType === 'linear') {
      scene.fog = new THREE.Fog(args.background, args.fogNear, args.fogFar);
    } else if (args.fogType === 'exp2') {
      scene.fog = new THREE.FogExp2(args.background, args.fogDensity);
    } else {
      scene.fog = null;
    }

    scene.overrideMaterial = args.overrideMaterial ? overrideMaterial : null;
    loop.renderOnce();
  },

  readout({ scene, state }) {
    return [
      ['scene.children', scene.children.length],
      ['背景', `#${scene.background.getHexString()}`],
      ['雾类型', state.fogType === 'none' ? '无' : state.fogType],
      ['overrideMaterial', state.override ? 'MeshNormalMaterial' : 'null'],
      ['保留原材质', '橙色球（allowOverride=false）']
    ];
  }
};
