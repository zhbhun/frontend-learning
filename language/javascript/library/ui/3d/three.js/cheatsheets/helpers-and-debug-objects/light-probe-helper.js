/*
演示 LightProbeHelper：把 LightProbe 的球谐环境光画成球体。

输入：探针尺寸与强度。
预期：球体着色反映 SH 系数；仅 WebGLRenderer。
*/

import * as THREE from 'three';
import { LightProbeHelper } from 'three/addons/helpers/LightProbeHelper.js';

import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const lightProbeHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withDefaultLights: false,
      withGroundGrid: true,
      build({ scene }) {
        const lightProbe = new THREE.LightProbe();
        // 给 L0 / L1 一点颜色，球体才看得出环境光分布。
        lightProbe.sh.coefficients[0].set(0.4, 0.45, 0.55);
        lightProbe.sh.coefficients[1].set(0.2, 0.15, 0.05);
        lightProbe.sh.coefficients[2].set(0.05, 0.12, 0.2);
        lightProbe.intensity = 1;
        lightProbe.position.y = 1.2;
        scene.add(lightProbe);

        // LightProbeHelper 没有 update()：位置/尺寸/强度在 onBeforeRender 里同步。
        const helper = new LightProbeHelper(lightProbe, 1.2);
        scene.add(helper);

        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 28, 18),
          new THREE.MeshStandardMaterial({ color: '#aaaaaa', roughness: 0.35 })
        );
        mesh.position.set(2.2, 0.7, 0);
        scene.add(mesh);
        scene.add(new THREE.AmbientLight('#ffffff', 0.2));

        return { lightProbe, helper };
      },
      readSnapshot({ lightProbe, helper }) {
        return { intensity: lightProbe.intensity, size: helper.size };
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
    frame.lightProbe.intensity = args.intensity;
    frame.helper.size = args.size;
    frame.render();
  },

  readout({ intensity, size, renderer }) {
    return [
      ['lightProbe.intensity', Number(intensity).toFixed(2)],
      ['size', Number(size).toFixed(2)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
