/*
演示 Box3Helper：可视化独立的 Box3 数学对象，不绑定某个 Mesh。

输入：Box3 的中心与尺寸。
预期：线框中心与尺寸跟随 Box3；与场景中物体无自动关联。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import {
  addSubjectMesh,
  createHelpersExampleFrame
} from './helpers-example-frame.js';

const center = new THREE.Vector3();
const size = new THREE.Vector3();

export const box3HelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withGroundGrid: true,
      build({ scene }) {
        // 参照物：说明 Box3Helper 不必来自某个 mesh。
        addSubjectMesh(scene, { color: '#8f5ac7', position: [2.2, 0.7, -1.2] });

        const box3 = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(2, 2, 2)
        );
        const helper = new THREE.Box3Helper(box3, '#e6b800');
        scene.add(helper);

        return { box3, helper };
      },
      readSnapshot({ box3 }) {
        box3.getCenter(center);
        box3.getSize(size);
        return {
          center: center.clone(),
          size: size.clone()
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
    frame.box3.setFromCenterAndSize(
      new THREE.Vector3(args.centerX, args.centerY, args.centerZ),
      new THREE.Vector3(args.sizeX, args.sizeY, args.sizeZ)
    );
    frame.render();
  },

  readout({ center: boxCenter, size: boxSize, renderer }) {
    return [
      ['Box3 中心', formatVector(boxCenter)],
      ['Box3 尺寸', formatVector(boxSize)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
