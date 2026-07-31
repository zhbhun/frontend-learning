/*
演示 OrthographicCamera 的平行观察盒、缩放与投影矩阵生效时机。

输入是观察盒高度、near、far、zoom、相机距离和“更新矩阵”开关；操作按画面
比例计算 left/right/top/bottom，并决定是否更新 projectionMatrix；属性观察
范围、矩阵观察范围和可见物体读数用于区分“值已写入”和“画面已生效”。
*/

import * as THREE from 'three';

import { placeCamera } from '../../assets/shared-scene.js';
import {
  readOrthographicMatrixSize,
  setOrthographicProjectionProperties,
  updateOrthographicProjection
} from './camera-model.js';
import { createCameraExampleFrame } from './camera-example-frame.js';

export const orthographicProjectionExample = {
  create(canvas, emitSnapshot) {
    const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0, 20);
    const state = {
      aspect: 1,
      viewHeight: 6,
      near: 0,
      far: 20,
      zoom: 1,
      distance: 8,
      matrixCurrent: true,
      error: '无'
    };

    placeCamera(camera, state.distance);

    const frame = createCameraExampleFrame({
      canvas,
      camera,
      emitSnapshot,
      onResize(aspect) {
        state.aspect = aspect;
        updateOrthographicProjection(camera, state);
        state.matrixCurrent = true;
      },
      readSnapshot() {
        return {
          propertySize: new THREE.Vector2(
            (camera.right - camera.left) / camera.zoom,
            (camera.top - camera.bottom) / camera.zoom
          ),
          matrixSize: readOrthographicMatrixSize(camera),
          near: camera.near,
          far: camera.far,
          distance: state.distance,
          matrixCurrent: state.matrixCurrent,
          error: state.error
        };
      }
    });

    return { camera, frame, state };
  },

  apply(instance, args) {
    const options = {
      aspect: instance.state.aspect,
      viewHeight: args.viewHeight,
      near: args.near,
      far: args.far,
      zoom: args.zoom
    };

    instance.state.distance = args.distance;
    placeCamera(instance.camera, args.distance);

    try {
      if (args.updateProjectionMatrix) {
        updateOrthographicProjection(instance.camera, options);
        instance.state.matrixCurrent = true;
      } else {
        setOrthographicProjectionProperties(
          instance.camera,
          options
        );
        instance.state.matrixCurrent = false;
      }

      Object.assign(instance.state, options);
      instance.state.error = '无';
    } catch (error) {
      instance.state.error = error.message;
    }

    instance.frame.render();
  },

  readout(snapshot) {
    return [
      [
        '属性观察范围',
        `${snapshot.propertySize.x.toFixed(2)} × ${snapshot.propertySize.y.toFixed(2)}`
      ],
      [
        '矩阵观察范围',
        `${snapshot.matrixSize.x.toFixed(2)} × ${snapshot.matrixSize.y.toFixed(2)}`
      ],
      ['属性 near → far', `${snapshot.near.toFixed(2)} → ${snapshot.far.toFixed(2)}`],
      ['相机到目标距离', snapshot.distance.toFixed(1)],
      [
        '投影矩阵',
        snapshot.matrixCurrent ? '已同步' : '未同步：画面仍使用旧矩阵'
      ],
      ['视锥内物体', snapshot.visibleObjects.join('、') || '无'],
      ['输入检查', snapshot.error]
    ];
  }
};
