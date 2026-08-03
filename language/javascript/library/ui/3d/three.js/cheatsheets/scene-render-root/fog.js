/*
演示 Fog / FogExp2 按深度改写支持雾的材质颜色，而不是在空白处画体积烟。

输入：雾类型、near / far / density、雾色、背景色是否与雾色一致。
预期：远处物体融入雾色；雾色与背景色不一致时远处出现硬边；关闭材质 fog 的物体不受影响。
读文件时先看 apply()：雾参数写入 scene.fog，背景色独立可控。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize,
  rotateObjects
} from '../../assets/shared-scene.js';

export const fogExample = {
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
    // 中间材质关闭雾，用来对照 material.fog。
    materials[1].fog = false;

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

    const state = { fogType: 'linear' };

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

    return { scene, state, loop };
  },

  apply(instance, args) {
    const { scene, state, loop } = instance;
    const background = args.matchBackground ? args.fogColor : args.background;
    scene.background = new THREE.Color(background);
    state.fogType = args.fogType;

    if (args.fogType === 'linear') {
      scene.fog = new THREE.Fog(args.fogColor, args.fogNear, args.fogFar);
    } else if (args.fogType === 'exp2') {
      scene.fog = new THREE.FogExp2(args.fogColor, args.fogDensity);
    } else {
      scene.fog = null;
    }

    loop.renderOnce();
  },

  readout({ scene, state }) {
    const fog = scene.fog;
    let fogDetail = '无';

    if (fog?.isFog) {
      fogDetail = `Fog near=${fog.near} far=${fog.far}`;
    } else if (fog?.isFogExp2) {
      fogDetail = `FogExp2 density=${fog.density}`;
    }

    return [
      ['scene.background', `#${scene.background.getHexString()}`],
      ['scene.fog', state.fogType === 'none' ? 'null' : fogDetail],
      ['雾色', fog ? `#${fog.color.getHexString()}` : '—'],
      ['橙色球', 'material.fog = false']
    ];
  }
};
