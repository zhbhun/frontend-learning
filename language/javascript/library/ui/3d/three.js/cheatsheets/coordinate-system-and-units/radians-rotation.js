/*
演示 rotation 使用弧度：直接写入度数数值会转过了头。

输入：
- angleDegrees：你以为要转的角度（度）
- writeAsDegrees：true 时把度数原样写入 rotation.y（错误用法）；
  false 时先 degToRad 再写入（正确用法）

预期结果：
- 正确路径：45° → 约 1/8 圈
- 错误路径：写入 45 弧度 → 约 2578°，指针几乎“乱转”
- readout 同时给出写入值、实际弧度与约等于多少度

读代码先看 apply() 的两条写入路径，再对照画面指针。
*/

import * as THREE from 'three';

import {
  addGroundGrid,
  addOriginMarker,
  addWorldAxes,
  addYawPointer,
  createCoordinateExampleFrame
} from './coordinate-example-frame.js';

export const radiansRotationExample = {
  create(canvas, emitSnapshot) {
    const state = {
      angleDegrees: 45,
      writeAsDegrees: false,
      writtenValue: THREE.MathUtils.degToRad(45)
    };

    const frame = createCoordinateExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [0, 9, 0.01],
      lookAt: [0, 0, 0],
      cameraFov: 42,
      build({ scene }) {
        addGroundGrid(scene);
        addWorldAxes(scene, 2);
        addOriginMarker(scene);

        const yaw = new THREE.Group();
        // 与 story 默认 args 对齐，避免首帧 readout 落在未 apply 的 0。
        yaw.rotation.y = state.writtenValue;
        scene.add(yaw);
        addYawPointer(yaw, { length: 2.2, color: '#3d73d9' });

        // 参考刻度：0° 时指针沿 +X；90° 应对准 -Z（俯视、右手定则）。
        const tick90 = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.08, 0.55),
          new THREE.MeshStandardMaterial({ color: '#8ba096', roughness: 0.6 })
        );
        tick90.position.set(0, 0.04, -1.1);
        scene.add(tick90);

        return { yaw };
      },
      readSnapshot({ yaw }) {
        return {
          yaw,
          angleDegrees: state.angleDegrees,
          writeAsDegrees: state.writeAsDegrees,
          writtenValue: state.writtenValue
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
    state.angleDegrees = args.angleDegrees;
    state.writeAsDegrees = args.writeAsDegrees;

    // 错误用法：把度数当弧度写进去；正确用法：先换成弧度。
    const written = args.writeAsDegrees
      ? args.angleDegrees
      : THREE.MathUtils.degToRad(args.angleDegrees);

    state.writtenValue = written;
    frame.yaw.rotation.y = written;
    frame.render();
  },

  readout({ yaw, angleDegrees, writeAsDegrees, writtenValue }) {
    const actualDeg = THREE.MathUtils.radToDeg(yaw.rotation.y);

    return [
      ['意图角度', `${angleDegrees.toFixed(0)}°`],
      ['写入方式', writeAsDegrees ? 'rotation.y = 度数值（错误）' : 'degToRad(度数)（正确）'],
      ['实际写入 rotation.y', writtenValue.toFixed(3)],
      ['约等于', `${actualDeg.toFixed(1)}°`],
      ['对照', '正确时 90° 应对准 -Z 刻度；错误时会转很多圈']
    ];
  }
};
