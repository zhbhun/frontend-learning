/*
演示 PointLightHelper：点光源位置处的线框球体。

输入：灯光位置、sphereSize 颜色跟随。
预期：线框球心与 light.position 重合；改颜色后 update 刷新材质色。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const pointLightHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withDefaultLights: false,
      withGroundGrid: true,
      build({ scene }) {
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(10, 10),
          new THREE.MeshStandardMaterial({ color: '#d7e2db', roughness: 0.9 })
        );
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 1.4, 1.4),
          new THREE.MeshStandardMaterial({ color: '#888888', roughness: 0.4 })
        );
        mesh.position.y = 0.7;
        scene.add(mesh);

        scene.add(new THREE.AmbientLight('#ffffff', 0.2));

        const light = new THREE.PointLight('#ff6b4a', 40, 20);
        light.position.set(2, 2.5, 2);
        scene.add(light);

        let helper = new THREE.PointLightHelper(light, 0.35);
        scene.add(helper);

        return {
          light,
          get helper() {
            return helper;
          },
          replaceHelper(next) {
            scene.remove(helper);
            helper.dispose();
            helper = next;
            scene.add(helper);
          },
          autoUpdate: true
        };
      },
      readSnapshot({ light, autoUpdate }) {
        return {
          autoUpdate,
          position: light.position.clone(),
          color: `#${light.color.getHexString()}`
        };
      }
    });

    return {
      frame,
      dispose() {
        frame.dispose();
      }
    };
  },

  apply(instance, args) {
    const { frame } = instance;
    frame.light.position.set(args.lightX, args.lightY, args.lightZ);
    frame.light.color.set(args.color);
    frame.autoUpdate = args.autoUpdate;

    if (args.sphereSize !== frame._sphereSize) {
      frame._sphereSize = args.sphereSize;
      frame.replaceHelper(new THREE.PointLightHelper(frame.light, args.sphereSize));
    }

    if (args.autoUpdate) {
      frame.helper.update();
    }
    frame.render();
  },

  readout({ autoUpdate, position, color, renderer }) {
    return [
      ['helper.update()', autoUpdate ? '已调用' : '已暂停'],
      ['light.position', formatVector(position)],
      ['light.color', color],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
