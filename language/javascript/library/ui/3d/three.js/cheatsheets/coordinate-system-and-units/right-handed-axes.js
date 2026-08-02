/*
演示 three.js 右手坐标系的三轴朝向与绕轴正向旋转（右手定则）。

输入：
- viewAngle：前视 / 俯视 / 斜视，从前视最容易核对“+X 右、+Y 上、+Z 朝自己”
- rotationY：绕 +Y 的旋转（度），内部写成弧度；俯视时增大角度应看到逆时针

预期结果：
- 红 / 绿 / 蓝端点球分别落在 +X / +Y / +Z
- 橙色指针绕 Y 增大时，从上往下看逆时针转

读代码先看 VIEW_PRESETS 与 build 里的三轴标记，再看 apply() 如何写 rotation.y。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import {
  addAxisEndDots,
  addGroundGrid,
  addOriginMarker,
  addWorldAxes,
  addYawPointer,
  createCoordinateExampleFrame
} from './coordinate-example-frame.js';

const VIEW_PRESETS = {
  front: {
    position: [0, 1.6, 8],
    lookAt: [0, 0.5, 0],
    label: '前视（相机在 +Z，朝 -Z 看）'
  },
  top: {
    position: [0, 9, 0.01],
    lookAt: [0, 0, 0],
    label: '俯视（相机在 +Y，朝 -Y 看）'
  },
  iso: {
    position: [6.4, 5.2, 7.2],
    lookAt: [0, 0.5, 0],
    label: '斜视（同时看到三轴）'
  }
};

export const rightHandedAxesExample = {
  create(canvas, emitSnapshot) {
    const state = {
      view: VIEW_PRESETS.iso,
      rotationYDeg: 0
    };

    // 与 story 默认 args（前视、rotationY=0）对齐。
    state.view = VIEW_PRESETS.front;

    const frame = createCoordinateExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: VIEW_PRESETS.front.position,
      lookAt: VIEW_PRESETS.front.lookAt,
      build({ scene }) {
        addGroundGrid(scene);
        addWorldAxes(scene);
        addAxisEndDots(scene);
        addOriginMarker(scene);

        // 指针挂在可旋转的 Group 上，只演示绕 Y 的右手定则。
        const yaw = new THREE.Group();
        scene.add(yaw);
        addYawPointer(yaw);

        return { yaw };
      },
      readSnapshot({ yaw }, camera) {
        return {
          camera,
          yaw,
          viewLabel: state.view.label,
          rotationYDeg: state.rotationYDeg
        };
      }
    });

    return {
      frame,
      state,
      dispose() {
        frame.dispose();
      }
    };
  },

  apply(instance, args) {
    const { frame, state } = instance;
    const preset = VIEW_PRESETS[args.viewAngle] ?? VIEW_PRESETS.iso;

    state.view = preset;
    state.rotationYDeg = args.rotationY;
    frame.yaw.rotation.y = THREE.MathUtils.degToRad(args.rotationY);
    frame.setCamera(preset.position, preset.lookAt);
    frame.render();
  },

  readout({ camera, yaw, viewLabel, rotationYDeg }) {
    return [
      ['当前视图', viewLabel],
      ['相机位置', formatVector(camera.position)],
      ['轴约定', '+X 红右 / +Y 绿上 / +Z 蓝朝观察者'],
      ['rotation.y（度）', `${rotationYDeg.toFixed(0)}°`],
      ['rotation.y（弧度）', yaw.rotation.y.toFixed(3)],
      ['俯视时增大角度', '绕 +Y 逆时针（右手定则）']
    ];
  }
};
