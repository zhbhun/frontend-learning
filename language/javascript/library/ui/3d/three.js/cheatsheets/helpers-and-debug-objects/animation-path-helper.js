/*
演示 AnimationPathHelper：根据位置关键帧画运动路径。

输入：是否显示关键帧标记。
预期：绿色路径连接采样点，红点标记关键帧位置。
*/

import * as THREE from 'three';
import { AnimationPathHelper } from 'three/addons/helpers/AnimationPathHelper.js';

import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const animationPathHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withGroundGrid: true,
      cameraPosition: [7, 5, 8],
      build({ scene }) {
        const root = new THREE.Object3D();
        scene.add(root);

        const mover = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 16, 12),
          new THREE.MeshStandardMaterial({ color: '#d17832', roughness: 0.4 })
        );
        mover.name = 'mover';
        root.add(mover);

        const times = [0, 1, 2, 3];
        const values = [
          -2, 0.5, 0,
          -0.5, 1.5, 1.5,
          1.2, 0.8, -0.5,
          2.2, 0.5, 0.8
        ];
        const track = new THREE.VectorKeyframeTrack('mover.position', times, values);
        const clip = new THREE.AnimationClip('path', 3, [track]);

        let helper = new AnimationPathHelper(root, clip, mover, {
          color: 0x2f8b72,
          markerColor: 0xd94a3d,
          divisions: 80,
          showMarkers: true,
          markerSize: 6
        });
        scene.add(helper);

        const mixer = new THREE.AnimationMixer(root);
        const action = mixer.clipAction(clip);
        action.play();

        return {
          root,
          mover,
          clip,
          mixer,
          get helper() {
            return helper;
          },
          replaceHelper(next) {
            scene.remove(helper);
            helper.traverse((child) => {
              child.geometry?.dispose?.();
              child.material?.dispose?.();
            });
            helper = next;
            scene.add(helper);
          },
          showMarkers: true
        };
      },
      animate({ mixer }, delta) {
        mixer.update(delta);
      },
      readSnapshot({ showMarkers }) {
        return { showMarkers };
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
    if (args.showMarkers !== frame.showMarkers) {
      frame.showMarkers = args.showMarkers;
      frame.replaceHelper(
        new AnimationPathHelper(frame.root, frame.clip, frame.mover, {
          color: 0x2f8b72,
          markerColor: 0xd94a3d,
          divisions: 80,
          showMarkers: args.showMarkers,
          markerSize: 6
        })
      );
    }
    frame.render();
  },

  readout({ showMarkers, renderer }) {
    return [
      ['showMarkers', showMarkers ? '是' : '否'],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
