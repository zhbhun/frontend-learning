/*
演示世界单位是场景内部标量，不绑定屏幕像素。

输入 unitScale → group.scale.setScalar(...)；相机位置不变。
预期：画面变大/变小，但立方体局部尺寸仍是 0.8 世界单位。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import {
  addAxisEndDots,
  addGroundGrid,
  addOriginMarker,
  addWorldAxes,
  createCoordinateExampleFrame
} from './coordinate-example-frame.js';

export const worldUnitsExample = {
  create(canvas, emitSnapshot) {
    const frame = createCoordinateExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [6.4, 5.2, 7.2],
      lookAt: [0, 0.5, 0],
      build({ scene }) {
        // 网格留在场景根下：缩放 group 时地面尺寸不变，对照更清楚。
        addGroundGrid(scene);

        const group = new THREE.Group();
        scene.add(group);

        addWorldAxes(group);
        addAxisEndDots(group);
        addOriginMarker(group);

        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.8, 0.8),
          new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.4 })
        );
        cube.position.set(2, 0.4, 0);
        group.add(cube);

        return { group, cube };
      },
      readSnapshot({ group, cube }, camera) {
        return { camera, group, cube };
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
    instance.frame.group.scale.setScalar(args.unitScale);
    instance.frame.render();
  },

  readout({ camera, group, cube }) {
    return [
      ['相机位置（不变）', formatVector(camera.position)],
      ['group.scale', formatVector(group.scale)],
      ['立方体局部尺寸', '0.8 × 0.8 × 0.8（世界单位）'],
      ['立方体局部 position', formatVector(cube.position)],
      ['结论', '视觉变大/变小 ≠ 改成了像素单位；1 仍是场景标量']
    ];
  }
};
