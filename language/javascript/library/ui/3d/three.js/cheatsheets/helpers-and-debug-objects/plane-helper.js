/*
演示 PlaneHelper：把数学 Plane 画成有限大小的半透明平面与法线。

输入：平面法线分量、常数 constant、size。
预期：helper 跟随 Plane；常用于裁剪平面调试。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import {
  addSubjectMesh,
  createHelpersExampleFrame
} from './helpers-example-frame.js';

const normal = new THREE.Vector3();

export const planeHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withGroundGrid: true,
      build({ scene }) {
        addSubjectMesh(scene, { color: '#3d73d9' });

        const plane = new THREE.Plane(new THREE.Vector3(1, 1, 0.2).normalize(), 0);
        let helper = new THREE.PlaneHelper(plane, 4, '#e6b800');
        scene.add(helper);

        return {
          plane,
          get helper() {
            return helper;
          },
          replaceHelper(next) {
            scene.remove(helper);
            helper.dispose();
            helper = next;
            scene.add(helper);
          }
        };
      },
      readSnapshot({ plane }) {
        return {
          normal: plane.normal.clone(),
          constant: plane.constant
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
    normal.set(args.nx, args.ny, args.nz);
    if (normal.lengthSq() < 1e-6) {
      normal.set(0, 1, 0);
    }
    normal.normalize();
    frame.plane.set(normal, args.constant);

    if (args.size !== frame._size) {
      frame._size = args.size;
      frame.replaceHelper(new THREE.PlaneHelper(frame.plane, args.size, '#e6b800'));
    }

    frame.render();
  },

  readout({ normal: n, constant, renderer }) {
    return [
      ['plane.normal', formatVector(n)],
      ['plane.constant', constant.toFixed(2)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
