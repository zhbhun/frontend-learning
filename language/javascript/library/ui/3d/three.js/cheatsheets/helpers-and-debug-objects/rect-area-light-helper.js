/*
演示 RectAreaLightHelper：矩形区域光外形线框。

输入：灯光宽高。
预期：Helper 矩形与发光面一致，通常挂在 light 下。
*/

import * as THREE from 'three';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

import { createHelpersExampleFrame } from './helpers-example-frame.js';

RectAreaLightUniformsLib.init();

export const rectAreaLightHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withDefaultLights: false,
      withGroundGrid: true,
      cameraPosition: [5, 4, 6],
      lookAt: [0, 1, 0],
      build({ scene }) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 32, 20),
          new THREE.MeshStandardMaterial({ color: '#d8d0c4', roughness: 0.3, metalness: 0.2 })
        );
        mesh.position.y = 0.9;
        scene.add(mesh);
        scene.add(new THREE.AmbientLight('#ffffff', 0.15));

        const light = new THREE.RectAreaLight('#fff3d6', 8, 3, 2);
        light.position.set(2.2, 2.8, 2.4);
        light.lookAt(mesh.position);
        scene.add(light);

        const helper = new RectAreaLightHelper(light);
        light.add(helper);

        return { light, helper, mesh };
      },
      animate({ mesh }, delta) {
        mesh.rotation.y += delta * 0.3;
      },
      readSnapshot({ light }) {
        return { width: light.width, height: light.height };
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
    frame.light.width = args.width;
    frame.light.height = args.height;
    frame.light.intensity = args.intensity;
    frame.render();
  },

  readout({ width, height, renderer }) {
    return [
      ['light.width', width.toFixed(1)],
      ['light.height', height.toFixed(1)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
