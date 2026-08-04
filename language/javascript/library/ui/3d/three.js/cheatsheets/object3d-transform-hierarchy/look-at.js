/*
演示 lookAt 与 up：物体朝向世界空间中的目标点，up 影响绕视线的扭转。

输入：目标点 X/Z、up 模式（+Y / +Z）
预期：圆锥尖端始终朝向目标；切换 up 后物体侧倾改变

读代码先看 apply() 里 lookAt 与 up.copy，再看 getWorldDirection 读数。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import {
  addGroundGrid,
  addWorldAxes,
  createObject3DExampleFrame
} from './object3d-example-frame.js';

const worldDirection = new THREE.Vector3();
const targetWorld = new THREE.Vector3();

export const lookAtExample = {
  create(canvas, emitSnapshot) {
    const frame = createObject3DExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [5.6, 4.4, 6.4],
      lookAt: [0.4, 0.8, 0],
      build({ scene }) {
        addGroundGrid(scene);
        addWorldAxes(scene, 2);

        const object = new THREE.Group();
        object.name = 'object';
        object.position.set(-1.2, 0.8, 0);
        scene.add(object);
        object.add(new THREE.AxesHelper(1.1));

        // ConeGeometry 默认尖端朝 +Y；转到尖端朝局部 +Z，与 getWorldDirection 一致。
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.35, 1.4, 20),
          new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.4 })
        );
        cone.rotation.x = Math.PI / 2;
        object.add(cone);

        const target = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 18, 12),
          new THREE.MeshStandardMaterial({ color: '#d17832', roughness: 0.45 })
        );
        target.name = 'target';
        target.position.set(2.2, 0.8, 0);
        scene.add(target);

        const lineGeometry = new THREE.BufferGeometry();
        const line = new THREE.Line(
          lineGeometry,
          new THREE.LineBasicMaterial({ color: '#7d5321' })
        );
        scene.add(line);

        return { object, target, lineGeometry };
      },
      readSnapshot({ object, target, lineGeometry }) {
        object.updateWorldMatrix(true, false);
        object.getWorldDirection(worldDirection);
        target.getWorldPosition(targetWorld);

        lineGeometry.setFromPoints([
          object.getWorldPosition(new THREE.Vector3()),
          targetWorld.clone()
        ]);

        return {
          object,
          target,
          worldDirection: worldDirection.clone(),
          targetWorld: targetWorld.clone()
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
    const { object, target } = frame;

    target.position.set(args.targetX, 0.8, args.targetZ);

    if (args.upMode === '+Z') {
      object.up.set(0, 0, 1);
    } else {
      object.up.set(0, 1, 0);
    }

    // lookAt 使用世界坐标；父级有变换时仍面向世界空间中的点。
    object.lookAt(target.position);
    frame.render();
  },

  readout({ object, worldDirection, targetWorld }) {
    return [
      ['target 世界 position', formatVector(targetWorld)],
      ['object.up', formatVector(object.up)],
      ['世界朝向', formatVector(worldDirection)],
      [
        'rotation.y（度）',
        `${THREE.MathUtils.radToDeg(object.rotation.y).toFixed(0)}°`
      ]
    ];
  }
};
