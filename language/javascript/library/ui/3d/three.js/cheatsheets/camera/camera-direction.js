/*
演示 Camera 继承自 Object3D 的位置与朝向。

输入是相机位置和观察目标；操作入口最终调用 camera.position、lookAt() 与
getWorldDirection()；预期结果是目标落在视线中心附近，世界空间观察方向读数
同步变化。读文件时先看 apply()，再看 readSnapshot()。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import { aimCamera } from './camera-model.js';
import { createCameraExampleFrame } from './camera-example-frame.js';

export const cameraDirectionExample = {
  create(canvas, emitSnapshot) {
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 30);
    const state = {
      position: [6, 4, 8],
      target: [0, 0.7, 0],
      direction: new THREE.Vector3(),
      error: '无'
    };

    state.direction.copy(aimCamera(camera, state));

    const frame = createCameraExampleFrame({
      canvas,
      camera,
      emitSnapshot,
      onResize(aspect) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      },
      readSnapshot() {
        return {
          position: camera.position.clone(),
          target: new THREE.Vector3().fromArray(state.target),
          direction: state.direction.clone(),
          error: state.error
        };
      }
    });

    return { camera, frame, state };
  },

  apply(instance, args) {
    const nextState = {
      position: [args.cameraX, args.cameraY, args.cameraZ],
      target: [args.targetX, args.targetY, args.targetZ]
    };

    try {
      instance.state.direction.copy(
        aimCamera(instance.camera, nextState)
      );
      instance.state.position = nextState.position;
      instance.state.target = nextState.target;
      instance.state.error = '无';
    } catch (error) {
      instance.state.error = error.message;
    }

    instance.frame.render();
  },

  readout(snapshot) {
    return [
      ['相机位置', formatVector(snapshot.position)],
      ['观察目标', formatVector(snapshot.target)],
      ['世界观察方向', formatVector(snapshot.direction)],
      ['视锥内物体', snapshot.visibleObjects.join('、') || '无'],
      ['输入检查', snapshot.error]
    ];
  }
};
