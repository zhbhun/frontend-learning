import { FlyControls } from 'three/addons/controls/FlyControls.js';

import {
  cameraDirection,
  createControllerStage,
  degrees,
  formatVector,
  resetCamera
} from './controller-stage.js';

/*
演示 FlyControls 在局部坐标中进行六自由度移动和滚转。

输入是移动速度、滚转速度、拖动观察和自动前进；先单击画布取得键盘输入，再用
W/S、A/D、R/F 移动，方向键俯仰/偏航，Q/E 滚转。预期结果是相机没有 target
约束，位置与 up 方向都可以自由变化。读文件时先看 activation='focus' 和 update(delta)。
*/
export function createFlyControlsExample(initialArgs = {}) {
  const settings = {
    movementSpeed: 4,
    rollSpeed: 0.7,
    dragToLook: true,
    autoForward: false
  };

  const example = createControllerStage({
    title: 'FlyControls',
    hint: '先单击画布 · WASD/RF 移动 · 方向键转向 · Q/E 滚转。',
    cameraPosition: [0, 2.4, 9],
    targetPosition: [0, 1.2, 0],
    activation: 'focus',
    createControls({ camera, canvas }) {
      return new FlyControls(camera, canvas);
    },
    onFrame({ controls }, delta) {
      // FlyControls 的速度以“每秒”为单位，必须传入当前帧的 delta 秒数。
      controls.update(delta);
    },
    readout({ camera, controls, state }) {
      return [
        ['输入状态', controls.enabled ? '画布已激活' : '单击画布激活'],
        ['相机位置', formatVector(camera.position)],
        ['观察方向', formatVector(cameraDirection(camera))],
        ['roll', degrees(camera.rotation.z)],
        ['change 事件', state.eventCounts.change]
      ];
    }
  });

  example.apply = (args) => {
    Object.assign(settings, args);
    const { controls } = example.context;
    controls.movementSpeed = settings.movementSpeed;
    controls.rollSpeed = settings.rollSpeed;
    controls.dragToLook = settings.dragToLook;
    controls.autoForward = settings.autoForward;
    example.renderOnce();
  };

  example.addAction('重置飞行位置', () => {
    resetCamera(example.context, [0, 2.4, 9]);
    example.renderOnce();
    example.context.canvas.focus();
  });

  example.apply(initialArgs);
  return example;
}
