/*
演示 Object3D 共享属性：name / userData、visible、layers、renderOrder，以及阴影开关读数。

输入：
- objectName、tag（写入 userData.tag）
- visible
- useLayer1：物体是否只在 layer 1；相机是否启用 layer 1
- renderOrderA / renderOrderB：两块半透明板的绘制顺序
- castShadow / receiveShadow：只验证对象侧布尔值（完整阴影管线见明暗与阴影课）

预期：
- visible=false 时物体从画面消失，但仍在场景树中
- 物体在 layer 1 且相机未启用 layer 1 时不可见
- 调大某一板的 renderOrder，透明叠序改变

读代码先看 layers / renderOrder 的 apply 分支。
*/

import * as THREE from 'three';

import {
  addGroundGrid,
  createObject3DExampleFrame
} from './object3d-example-frame.js';

export const sharedPropertiesExample = {
  create(canvas, emitSnapshot) {
    const frame = createObject3DExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [4.8, 3.6, 5.6],
      lookAt: [0, 0.7, 0],
      build({ scene, camera }) {
        addGroundGrid(scene, 8);

        const subject = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 1.1, 1.1),
          new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.4 })
        );
        subject.name = 'subject';
        subject.position.set(-1.4, 0.55, 0);
        subject.userData = { tag: 'demo' };
        scene.add(subject);

        // 两块半透明板交叉叠放，用来观察 renderOrder（仅透明物体排序时明显）。
        const panelA = new THREE.Mesh(
          new THREE.PlaneGeometry(1.8, 1.8),
          new THREE.MeshStandardMaterial({
            color: '#2f8b72',
            roughness: 0.55,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
            side: THREE.DoubleSide
          })
        );
        panelA.name = 'panelA';
        panelA.position.set(1.3, 0.9, 0.15);
        panelA.rotation.y = THREE.MathUtils.degToRad(-18);
        scene.add(panelA);

        const panelB = new THREE.Mesh(
          new THREE.PlaneGeometry(1.8, 1.8),
          new THREE.MeshStandardMaterial({
            color: '#d17832',
            roughness: 0.55,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
            side: THREE.DoubleSide
          })
        );
        panelB.name = 'panelB';
        panelB.position.set(1.3, 0.9, -0.15);
        panelB.rotation.y = THREE.MathUtils.degToRad(18);
        scene.add(panelB);

        const reference = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 18, 12),
          new THREE.MeshStandardMaterial({ color: '#8f5ac7', roughness: 0.45 })
        );
        reference.name = 'reference';
        reference.position.set(-1.4, 0.28, 1.5);
        // 参考球始终留在默认 layer 0，用来对照层过滤。
        scene.add(reference);

        return { subject, panelA, panelB, reference, camera };
      },
      readSnapshot({ subject, panelA, panelB, camera }) {
        return { subject, panelA, panelB, camera };
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
    const { subject, panelA, panelB, camera } = frame;

    subject.name = args.objectName;
    subject.userData.tag = args.tag;
    subject.visible = args.visible;

    if (args.useLayer1) {
      subject.layers.set(1);
      camera.layers.disable(1);
      if (args.cameraSeesLayer1) {
        camera.layers.enable(1);
      }
    } else {
      subject.layers.set(0);
      camera.layers.enable(0);
      camera.layers.disable(1);
    }

    panelA.renderOrder = args.renderOrderA;
    panelB.renderOrder = args.renderOrderB;

    subject.castShadow = args.castShadow;
    subject.receiveShadow = args.receiveShadow;
    panelA.receiveShadow = args.receiveShadow;
    panelB.receiveShadow = args.receiveShadow;

    frame.render();
  },

  readout({ subject, panelA, panelB, camera }) {
    return [
      ['name', subject.name],
      ['userData.tag', String(subject.userData.tag ?? '')],
      ['visible', String(subject.visible)],
      ['subject.layers.mask', String(subject.layers.mask)],
      ['camera.layers.mask', String(camera.layers.mask)],
      ['panelA.renderOrder', String(panelA.renderOrder)],
      ['panelB.renderOrder', String(panelB.renderOrder)],
      ['castShadow', String(subject.castShadow)],
      ['receiveShadow', String(subject.receiveShadow)]
    ];
  }
};
