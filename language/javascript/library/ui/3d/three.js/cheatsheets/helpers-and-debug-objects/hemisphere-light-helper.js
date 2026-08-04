/*
演示 HemisphereLightHelper：半球光的八面体线框，可显示天空/地面色。

输入：灯光位置、sky/ground 色、是否 update()。
预期：update 后线框颜色跟随灯光；位置跟随 light.matrixWorld。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const hemisphereLightHelperExample = {
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
          new THREE.SphereGeometry(0.9, 32, 20),
          new THREE.MeshStandardMaterial({ color: '#aaaaaa', roughness: 0.45 })
        );
        mesh.position.y = 0.9;
        scene.add(mesh);

        const light = new THREE.HemisphereLight('#cce6ff', '#3a4a3f', 1.4);
        light.position.set(0, 3.5, 0);
        scene.add(light);

        const helper = new THREE.HemisphereLightHelper(light, 1.2);
        scene.add(helper);

        return { light, helper, autoUpdate: true };
      },
      readSnapshot({ light, autoUpdate }) {
        return {
          autoUpdate,
          position: light.position.clone(),
          sky: `#${light.color.getHexString()}`,
          ground: `#${light.groundColor.getHexString()}`
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
    frame.light.color.set(args.sky);
    frame.light.groundColor.set(args.ground);
    frame.autoUpdate = args.autoUpdate;

    if (args.autoUpdate) {
      frame.helper.update();
    }
    frame.render();
  },

  readout({ autoUpdate, position, sky, ground, renderer }) {
    return [
      ['helper.update()', autoUpdate ? '已调用' : '已暂停'],
      ['light.position', formatVector(position)],
      ['sky / ground', `${sky} / ${ground}`],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
