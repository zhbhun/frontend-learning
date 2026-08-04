/*
演示 DirectionalLightHelper：平行光的位置平面与指向 target 的方向线。

输入：灯光位置、helper size、是否 update()。
预期：线框平面在灯光处，方向线指向 light.target；改光后需 update。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const directionalLightHelperExample = {
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
          new THREE.SphereGeometry(0.8, 32, 20),
          new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.35 })
        );
        mesh.position.y = 0.8;
        scene.add(mesh);

        scene.add(new THREE.AmbientLight('#ffffff', 0.25));

        const light = new THREE.DirectionalLight('#ffd8a8', 2.4);
        light.position.set(3, 4, 2);
        light.target.position.set(0, 0.8, 0);
        scene.add(light);
        scene.add(light.target);

        const helper = new THREE.DirectionalLightHelper(light, 1.2);
        scene.add(helper);

        return { light, helper, autoUpdate: true };
      },
      readSnapshot({ light, autoUpdate }) {
        return {
          autoUpdate,
          position: light.position.clone()
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
    frame.autoUpdate = args.autoUpdate;

    // size 只能通过重建 helper 改变；这里固定 size，重点演示 update。
    if (args.autoUpdate) {
      frame.helper.update();
    }
    frame.render();
  },

  readout({ autoUpdate, position, renderer }) {
    return [
      ['helper.update()', autoUpdate ? '已调用' : '已暂停'],
      ['light.position', formatVector(position)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
