/*
演示 SkeletonHelper：把 Bone 层级画成彩色线段。

输入：关节旋转。
预期：骨骼线跟随 Bone 层级；Helper 加在 scene，不替代蒙皮网格本身。
蒙皮权重与 AnimationMixer 见 SkinnedMesh 课。
*/

import * as THREE from 'three';

import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const skeletonHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [4, 4, 6],
      lookAt: [0, 1.2, 0],
      withGroundGrid: true,
      build({ scene }) {
        const hips = new THREE.Bone();
        hips.name = 'hips';
        hips.position.y = 0.4;

        const spine = new THREE.Bone();
        spine.name = 'spine';
        spine.position.y = 0.9;
        hips.add(spine);

        const head = new THREE.Bone();
        head.name = 'head';
        head.position.y = 0.7;
        spine.add(head);

        const leftArm = new THREE.Bone();
        leftArm.name = 'leftArm';
        leftArm.position.set(0.55, 0.55, 0);
        spine.add(leftArm);

        const rightArm = new THREE.Bone();
        rightArm.name = 'rightArm';
        rightArm.position.set(-0.55, 0.55, 0);
        spine.add(rightArm);

        const leftLeg = new THREE.Bone();
        leftLeg.name = 'leftLeg';
        leftLeg.position.set(0.25, -0.05, 0);
        hips.add(leftLeg);

        const rightLeg = new THREE.Bone();
        rightLeg.name = 'rightLeg';
        rightLeg.position.set(-0.25, -0.05, 0);
        hips.add(rightLeg);

        scene.add(hips);

        const helper = new THREE.SkeletonHelper(hips);
        scene.add(helper);

        // 关节点小圆球，方便对照 Helper 线段端点。
        const joints = [hips, spine, head, leftArm, rightArm, leftLeg, rightLeg];
        const markers = joints.map((bone) => {
          const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 10, 8),
            new THREE.MeshBasicMaterial({ color: '#1f2d28' })
          );
          bone.add(marker);
          return marker;
        });

        return { hips, spine, leftArm, rightArm, helper, markers };
      },
      readSnapshot({ spine, leftArm, rightArm }) {
        return {
          spineY: spine.rotation.y,
          leftArmZ: leftArm.rotation.z,
          rightArmZ: rightArm.rotation.z
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
    frame.spine.rotation.y = THREE.MathUtils.degToRad(args.spineY);
    frame.leftArm.rotation.z = THREE.MathUtils.degToRad(args.leftArmZ);
    frame.rightArm.rotation.z = THREE.MathUtils.degToRad(args.rightArmZ);
    frame.render();
  },

  readout({ spineY, leftArmZ, rightArmZ, renderer }) {
    return [
      ['spine.rotation.y', `${THREE.MathUtils.radToDeg(spineY).toFixed(0)}°`],
      ['leftArm.rotation.z', `${THREE.MathUtils.radToDeg(leftArmZ).toFixed(0)}°`],
      ['rightArm.rotation.z', `${THREE.MathUtils.radToDeg(rightArmZ).toFixed(0)}°`],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
