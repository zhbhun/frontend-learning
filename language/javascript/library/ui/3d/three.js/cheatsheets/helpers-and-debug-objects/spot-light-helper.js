/*
演示 SpotLightHelper：聚光灯锥体；灯光或 target 变化后必须 update()。

输入：灯光位置、target 位置、是否调用 update()。
预期：开启 update 时锥体对准 target；关闭后锥体留在旧方向，灯光已移走。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const spotLightHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withDefaultLights: false,
      withGroundGrid: true,
      build({ scene }) {
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(12, 12),
          new THREE.MeshStandardMaterial({ color: '#d7e2db', roughness: 0.92 })
        );
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 1.2, 1.2),
          new THREE.MeshStandardMaterial({ color: '#666666', roughness: 0.35 })
        );
        mesh.position.y = 0.6;
        scene.add(mesh);

        scene.add(new THREE.AmbientLight('#ffffff', 0.18));

        const light = new THREE.SpotLight('#fff2cc', 80, 20, Math.PI / 6, 0.35, 1);
        light.position.set(3, 5, 3);
        light.target.position.set(0, 0.6, 0);
        scene.add(light);
        scene.add(light.target);

        const helper = new THREE.SpotLightHelper(light);
        scene.add(helper);

        const targetMarker = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 10),
          new THREE.MeshBasicMaterial({ color: '#9a3f32' })
        );
        scene.add(targetMarker);

        return { light, helper, targetMarker, autoUpdate: true };
      },
      readSnapshot({ light, autoUpdate }) {
        return {
          autoUpdate,
          lightPos: light.position.clone(),
          targetPos: light.target.position.clone()
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
    const { light, helper, targetMarker } = frame;

    light.position.set(args.lightX, args.lightY, args.lightZ);
    light.target.position.set(args.targetX, args.targetY, args.targetZ);
    targetMarker.position.copy(light.target.position);
    light.angle = THREE.MathUtils.degToRad(args.angleDeg);
    frame.autoUpdate = args.autoUpdate;

    if (args.autoUpdate) {
      // 官方文档：灯光或 target 变换后必须手动 update。
      helper.update();
    }
    frame.render();
  },

  readout({ autoUpdate, lightPos, targetPos, renderer }) {
    return [
      ['helper.update()', autoUpdate ? '已调用' : '已暂停（锥体可能过期）'],
      ['light.position', formatVector(lightPos)],
      ['light.target.position', formatVector(targetPos)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
