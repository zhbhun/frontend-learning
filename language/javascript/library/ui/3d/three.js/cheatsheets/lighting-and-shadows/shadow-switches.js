/*
演示阴影开关链：四环缺一即无影。

四环：
1. renderer.shadowMap.enabled
2. light.castShadow
3. 投射物 mesh.castShadow
4. 接收面 mesh.receiveShadow

输入是四个布尔开关；关掉任意一环时画面阴影消失，读数标出断点。
读代码先看 create() 里四环全部打开的最小场景，再看 apply() 如何按开关写入。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const shadowSwitchesExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#232830');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(6.2, 5.2, 7.5);
    camera.lookAt(0, 0.6, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: '#e8d8b5', roughness: 0.4, metalness: 0.1 })
    );
    box.position.set(0, 0.9, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);

    const key = new THREE.DirectionalLight('#fff3d6', 3.2);
    key.position.set(4.2, 7.5, 3.5);
    key.target.position.set(0, 0.6, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 24;
    key.shadow.bias = -0.0002;
    scene.add(key);
    scene.add(key.target);

    scene.add(new THREE.HemisphereLight('#6a7588', '#2a2d33', 0.4));

    const state = {
      shadowMapEnabled: true,
      lightCastShadow: true,
      castShadow: true,
      receiveShadow: true
    };

    function frame(delta) {
      box.rotation.y += delta * 0.4;
      renderer.render(scene, camera);
      emitSnapshot({ state, renderer, key, box, ground });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return {
      renderer,
      key,
      box,
      ground,
      state,
      loop,
      dispose() {
        loop.dispose();
        resizeObserver.disconnect();
        if (key.shadow.map) {
          key.shadow.map.dispose();
          key.shadow.map = null;
        }
        renderer.dispose();
      }
    };
  },

  apply(instance, args) {
    const { renderer, key, box, ground, state, loop } = instance;
    state.shadowMapEnabled = args.shadowMapEnabled;
    state.lightCastShadow = args.lightCastShadow;
    state.castShadow = args.castShadow;
    state.receiveShadow = args.receiveShadow;

    renderer.shadowMap.enabled = args.shadowMapEnabled;
    key.castShadow = args.lightCastShadow;
    box.castShadow = args.castShadow;
    ground.receiveShadow = args.receiveShadow;
    // 接收开关只改地面，避免盒子自阴影干扰“地面是否有影”的判断
    box.receiveShadow = args.receiveShadow;

    loop.renderOnce();
  },

  readout({ state }) {
    const links = [
      ['renderer.shadowMap.enabled', state.shadowMapEnabled],
      ['light.castShadow', state.lightCastShadow],
      ['mesh.castShadow', state.castShadow],
      ['mesh.receiveShadow', state.receiveShadow]
    ];
    const broken = links.filter(([, on]) => !on).map(([name]) => name);
    return [
      ...links.map(([name, on]) => [name, on ? '开' : '关']),
      ['阴影', broken.length === 0 ? '四环齐 → 可见' : `断于 ${broken[0]}`]
    ];
  }
};
