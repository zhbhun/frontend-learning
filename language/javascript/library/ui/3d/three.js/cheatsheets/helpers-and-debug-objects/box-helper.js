/*
演示 BoxHelper：跟踪 Object3D 的世界轴对齐包围盒（AABB）。

输入：物体旋转 / 缩放、是否调用 update()。
预期：开启 update 时线框跟着变；关闭后线框停在旧包围盒，物体继续动。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import {
  addSubjectMesh,
  createHelpersExampleFrame
} from './helpers-example-frame.js';

const box = new THREE.Box3();
const size = new THREE.Vector3();

export const boxHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withGroundGrid: true,
      build({ scene }) {
        const mesh = addSubjectMesh(scene, { color: '#2f8b72' });
        const helper = new THREE.BoxHelper(mesh, '#e6b800');
        scene.add(helper);

        return {
          mesh,
          helper,
          autoUpdate: true,
          spin: true
        };
      },
      animate({ mesh, helper, autoUpdate, spin }, delta) {
        if (spin) {
          mesh.rotation.y += delta * 0.7;
          mesh.rotation.x += delta * 0.25;
        }
        if (autoUpdate) {
          helper.update();
        }
      },
      readSnapshot({ mesh, helper, autoUpdate }) {
        box.setFromObject(mesh);
        box.getSize(size);
        return {
          autoUpdate,
          boxSize: size.clone(),
          helperVisible: helper.visible
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
    frame.mesh.scale.setScalar(args.scale);
    frame.autoUpdate = args.autoUpdate;
    frame.spin = args.spin;
    if (args.autoUpdate) {
      frame.helper.update();
    }
    frame.render();
  },

  readout({ autoUpdate, boxSize, renderer }) {
    return [
      ['helper.update()', autoUpdate ? '每帧调用' : '已暂停'],
      ['世界 AABB 尺寸', formatVector(boxSize)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
