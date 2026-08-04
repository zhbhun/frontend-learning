/*
演示 PositionalAudioHelper：位置音频方向锥（不播放声音，只看锥体）。

输入：内锥角、外锥角、range。
预期：线框锥体跟随 PositionalAudio 朝向。
*/

import * as THREE from 'three';
import { PositionalAudioHelper } from 'three/addons/helpers/PositionalAudioHelper.js';

import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const positionalAudioHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withGroundGrid: true,
      build({ scene, camera }) {
        const listener = new THREE.AudioListener();
        camera.add(listener);

        const audio = new THREE.PositionalAudio(listener);
        audio.setDirectionalCone(120, 180, 0.2);
        audio.position.set(0, 1.2, 0);
        scene.add(audio);

        // 给音频对象一个可见锚点。
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 12, 10),
          new THREE.MeshBasicMaterial({ color: '#9a3f32' })
        );
        audio.add(marker);

        let helper = new PositionalAudioHelper(audio, 2.5);
        audio.add(helper);

        scene.add(new THREE.AxesHelper(1.5));

        return {
          audio,
          get helper() {
            return helper;
          },
          replaceHelper(next) {
            audio.remove(helper);
            helper.dispose();
            helper = next;
            audio.add(helper);
          },
          range: 2.5,
          yaw: 0
        };
      },
      readSnapshot({ range, yaw, audio }) {
        return {
          range,
          yaw,
          inner: audio.panner.coneInnerAngle,
          outer: audio.panner.coneOuterAngle
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
    frame.audio.setDirectionalCone(args.innerAngle, args.outerAngle, 0.2);
    frame.audio.rotation.y = THREE.MathUtils.degToRad(args.yaw);
    frame.yaw = args.yaw;

    if (args.range !== frame.range) {
      frame.range = args.range;
      frame.replaceHelper(new PositionalAudioHelper(frame.audio, args.range));
    } else {
      frame.helper.update();
    }
    frame.render();
  },

  readout({ inner, outer, range, yaw, renderer }) {
    return [
      ['内锥 / 外锥（度）', `${Number(inner).toFixed(0)} / ${Number(outer).toFixed(0)}`],
      ['range', Number(range).toFixed(1)],
      ['yaw', `${Number(yaw).toFixed(0)}°`],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
