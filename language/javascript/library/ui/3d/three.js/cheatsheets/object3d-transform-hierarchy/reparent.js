/*
演示换父级时 add 与 attach 的差异：是否保持世界变换。

输入：
- method：'add' | 'attach'
- reparent：是否把 child 挂到 right 父级（否则挂在 left）

预期：
- add：保留局部 TRS，世界位置随新父级跳变
- attach：调整局部 TRS，使世界位置/朝向尽量保持

读代码先看 apply() 中 reset 到 left，再按 method 换到 right。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import {
  addGroundGrid,
  addWorldAxes,
  createObject3DExampleFrame
} from './object3d-example-frame.js';

const worldPosition = new THREE.Vector3();

export const reparentExample = {
  create(canvas, emitSnapshot) {
    const frame = createObject3DExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [7.2, 5.6, 8.4],
      lookAt: [0, 0.6, 0],
      build({ scene }) {
        addGroundGrid(scene, 12);
        addWorldAxes(scene, 2);

        const left = new THREE.Group();
        left.name = 'left';
        left.position.set(-2.4, 0, 0);
        left.rotation.y = THREE.MathUtils.degToRad(-25);
        scene.add(left);
        left.add(new THREE.AxesHelper(1.3));

        const right = new THREE.Group();
        right.name = 'right';
        right.position.set(2.4, 0, 0);
        right.rotation.y = THREE.MathUtils.degToRad(40);
        right.scale.setScalar(1.25);
        scene.add(right);
        right.add(new THREE.AxesHelper(1.3));

        const child = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.8, 0.8),
          new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.4 })
        );
        child.name = 'child';
        child.position.set(1.4, 0.5, 0);
        left.add(child);

        // 底座色块标出两个父级原点。
        const leftPad = new THREE.Mesh(
          new THREE.CircleGeometry(0.35, 24),
          new THREE.MeshBasicMaterial({ color: '#2f8b72' })
        );
        leftPad.rotation.x = -Math.PI / 2;
        leftPad.position.y = 0.02;
        left.add(leftPad);

        const rightPad = new THREE.Mesh(
          new THREE.CircleGeometry(0.35, 24),
          new THREE.MeshBasicMaterial({ color: '#d17832' })
        );
        rightPad.rotation.x = -Math.PI / 2;
        rightPad.position.y = 0.02;
        right.add(rightPad);

        return { left, right, child };
      },
      readSnapshot({ left, right, child }) {
        child.updateWorldMatrix(true, false);
        child.getWorldPosition(worldPosition);
        return {
          left,
          right,
          child,
          worldPosition: worldPosition.clone()
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
    const { left, right, child } = frame;

    // 每次先回到 left 的基准局部姿态，再执行换父级，保证对照条件相同。
    if (child.parent) {
      child.parent.remove(child);
    }
    child.position.set(1.4, 0.5, 0);
    child.rotation.set(0, 0, 0);
    child.scale.set(1, 1, 1);
    left.add(child);
    child.updateWorldMatrix(true, false);

    if (args.reparent) {
      if (args.method === 'attach') {
        right.attach(child);
      } else {
        right.add(child);
      }
    }

    frame.render();
  },

  readout({ child, worldPosition }) {
    return [
      ['换父级方法', child.parent?.name === 'right' ? '已换到 right' : '仍在 left'],
      ['child.parent', child.parent ? child.parent.name : 'null'],
      ['child 局部 position', formatVector(child.position)],
      ['child 世界 position', formatVector(worldPosition)],
      [
        '对照提示',
        child.parent?.name === 'right'
          ? '对比 add（局部不变、世界跳）与 attach（世界尽量不变）'
          : '打开「换到 right」观察差异'
      ]
    ];
  }
};
