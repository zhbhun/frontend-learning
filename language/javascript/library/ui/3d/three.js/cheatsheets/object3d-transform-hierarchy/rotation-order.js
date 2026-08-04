/*
演示 Euler 旋转顺序与万向节死锁：多轴叠旋转时，order 决定中间轴如何折叠。

输入：rotation.x/y/z（度）、rotation.order
预期：
- 指针朝向随三分量与 order 变化
- XYZ 下把 X 调到 ±90° 附近时，Y 与 Z 往往挤到同一自由度（万向节）

读代码先看 apply() 写入 rotation 与 order，再看 readout 的欧拉分量。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import {
  addGroundGrid,
  addWorldAxes,
  createObject3DExampleFrame
} from './object3d-example-frame.js';

const worldDirection = new THREE.Vector3();

export const rotationOrderExample = {
  create(canvas, emitSnapshot) {
    const frame = createObject3DExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [4.2, 3.2, 5.2],
      lookAt: [0, 0.4, 0],
      build({ scene }) {
        addGroundGrid(scene, 8);
        addWorldAxes(scene, 1.8);

        const rig = new THREE.Group();
        rig.name = 'rig';
        scene.add(rig);
        rig.add(new THREE.AxesHelper(1.2));

        // 沿局部 +Z 伸出的指针，用来观察最终朝向。
        const pointer = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.18, 1.8),
          new THREE.MeshStandardMaterial({ color: '#d17832', roughness: 0.4 })
        );
        pointer.position.z = 0.9;
        rig.add(pointer);

        const tip = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.45, 16),
          new THREE.MeshStandardMaterial({ color: '#9a3f32', roughness: 0.45 })
        );
        tip.rotation.x = Math.PI / 2;
        tip.position.z = 1.95;
        rig.add(tip);

        return { rig };
      },
      readSnapshot({ rig }) {
        rig.updateWorldMatrix(true, false);
        rig.getWorldDirection(worldDirection);
        return {
          rig,
          worldDirection: worldDirection.clone()
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
    const { rig } = frame;

    rig.rotation.order = args.rotationOrder;
    rig.rotation.x = THREE.MathUtils.degToRad(args.rotationX);
    rig.rotation.y = THREE.MathUtils.degToRad(args.rotationY);
    rig.rotation.z = THREE.MathUtils.degToRad(args.rotationZ);
    frame.render();
  },

  readout({ rig, worldDirection }) {
    const { rotation } = rig;
    return [
      ['rotation.order', rotation.order],
      [
        'rotation（度）',
        `${THREE.MathUtils.radToDeg(rotation.x).toFixed(0)}, ${THREE.MathUtils.radToDeg(rotation.y).toFixed(0)}, ${THREE.MathUtils.radToDeg(rotation.z).toFixed(0)}`
      ],
      ['世界朝向 (+Z)', formatVector(worldDirection)],
      [
        '提示',
        Math.abs(THREE.MathUtils.radToDeg(rotation.x)) > 80 &&
        rotation.order === 'XYZ'
          ? 'X≈±90°，Y/Z 易耦合（万向节）'
          : '多轴叠转时对比不同 order'
      ]
    ];
  }
};
