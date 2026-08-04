/*
演示 CameraHelper：把辅助相机的视锥画成线框。

输入：辅助相机位姿 / fov、是否调用 helper.update()。
预期：开启 update 时视锥跟上相机；关闭后线框停在旧投影。
观察相机从侧面看，才能看清被可视化的视锥。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const cameraHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [9, 6, 10],
      lookAt: [0, 0.5, 0],
      withGroundGrid: true,
      build({ scene }) {
        const subject = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.45 })
        );
        subject.position.set(0, 0.5, 0);
        scene.add(subject);

        const helperCamera = new THREE.PerspectiveCamera(50, 1.2, 0.8, 8);
        helperCamera.position.set(3.5, 2.5, 4.5);
        helperCamera.lookAt(0, 0.5, 0);
        scene.add(helperCamera);

        const helper = new THREE.CameraHelper(helperCamera);
        scene.add(helper);

        return {
          subject,
          helperCamera,
          helper,
          autoUpdate: true
        };
      },
      animate({ helperCamera, helper, autoUpdate }) {
        if (autoUpdate) {
          helperCamera.updateProjectionMatrix();
          helper.update();
        }
      },
      readSnapshot({ helperCamera, autoUpdate }) {
        return {
          autoUpdate,
          position: helperCamera.position.clone(),
          fov: helperCamera.fov,
          near: helperCamera.near,
          far: helperCamera.far
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
    const { helperCamera, helper } = frame;

    helperCamera.position.set(args.camX, args.camY, args.camZ);
    helperCamera.lookAt(0, 0.5, 0);
    helperCamera.fov = args.fov;
    helperCamera.near = args.near;
    helperCamera.far = args.far;
    frame.autoUpdate = args.autoUpdate;

    if (args.autoUpdate) {
      helperCamera.updateProjectionMatrix();
      helper.update();
    }

    frame.render();
  },

  readout({ autoUpdate, position, fov, near, far, renderer }) {
    return [
      ['helper.update()', autoUpdate ? '已调用' : '已暂停'],
      ['辅助相机 position', formatVector(position)],
      ['fov / near / far', `${fov.toFixed(0)} / ${near.toFixed(1)} / ${far.toFixed(1)}`],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
