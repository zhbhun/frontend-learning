/*
演示 ArrowHelper：用箭头标出方向向量。

输入：方向（经纬度式）、长度、颜色。
预期：箭头从 origin 指向 dir；setDirection / setLength 即时更新。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import { createHelpersExampleFrame } from './helpers-example-frame.js';

const dir = new THREE.Vector3();

export const arrowHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withGroundGrid: true,
      build({ scene }) {
        scene.add(new THREE.AxesHelper(1.5));

        const initialDir = new THREE.Vector3(1, 0.4, 0.2).normalize();
        const arrow = new THREE.ArrowHelper(
          initialDir,
          new THREE.Vector3(0, 0.5, 0),
          2.5,
          '#e6b800',
          0.45,
          0.25
        );
        scene.add(arrow);

        return {
          arrow,
          direction: initialDir.clone(),
          length: 2.5
        };
      },
      readSnapshot({ direction, length }) {
        return {
          direction: direction.clone(),
          length
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
    const yaw = THREE.MathUtils.degToRad(args.yaw);
    const pitch = THREE.MathUtils.degToRad(args.pitch);
    dir
      .set(
        Math.cos(pitch) * Math.sin(yaw),
        Math.sin(pitch),
        Math.cos(pitch) * Math.cos(yaw)
      )
      .normalize();

    frame.arrow.position.set(args.originX, args.originY, args.originZ);
    frame.arrow.setDirection(dir);
    frame.arrow.setLength(args.length, args.length * 0.2, args.length * 0.1);
    frame.arrow.setColor(args.color);
    frame.direction.copy(dir);
    frame.length = args.length;
    frame.render();
  },

  readout({ direction, length, renderer }) {
    return [
      ['方向', formatVector(direction)],
      ['长度', Number(length).toFixed(2)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
