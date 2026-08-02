import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';

import {
  cameraDirection,
  createControllerStage,
  formatVector,
  resetCamera
} from './controller-stage.js';

/*
演示 FirstPersonControls 的移动、拖动观察、阻尼与垂直视角限制。

输入来自 Controls 面板；先单击画布取得键盘输入，用 WASD/EQ 移动并按住鼠标拖动观察。
dampingFactor 越小，加速、减速和视线停止越迟缓；设为 1 则没有阻尼。
读文件时先看 update(delta)、constrainVertical 和重置时的 lookAt()。
*/
export function createFirstPersonControlsExample(initialArgs = {}) {
  const settings = {
    movementSpeed: 4,
    lookSpeed: 0.22,
    dampingFactor: 0.12,
    constrainVertical: true,
    heightSpeed: false
  };

  const example = createControllerStage({
    title: 'FirstPersonControls',
    hint: '先单击画布 · WASD/EQ 移动 · 按住鼠标拖动观察；松手后观察阻尼。',
    cameraPosition: [0, 2.2, 9],
    targetPosition: [0, 1.4, 0],
    activation: 'focus',
    createControls({ camera, canvas, target }) {
      const controls = new FirstPersonControls(camera, canvas);
      controls.lookAt(target);
      return controls;
    },
    onFrame({ controls }, delta) {
      // 移动速度、观察速度和阻尼都需要 delta 才能与刷新率解耦。
      controls.update(delta);
    },
    readout({ camera, controls }) {
      return [
        ['输入状态', controls.enabled ? '画布已激活' : '单击画布激活'],
        ['相机位置', formatVector(camera.position)],
        ['观察方向', formatVector(cameraDirection(camera))],
        ['阻尼系数', controls.dampingFactor.toFixed(2)],
        ['垂直限制', controls.constrainVertical ? '已启用' : '未启用']
      ];
    }
  });

  example.apply = (args) => {
    Object.assign(settings, args);
    const { controls } = example.context;
    controls.movementSpeed = settings.movementSpeed;
    controls.lookSpeed = settings.lookSpeed;
    controls.dampingFactor = settings.dampingFactor;
    controls.constrainVertical = settings.constrainVertical;
    controls.verticalMin = Math.PI * 0.25;
    controls.verticalMax = Math.PI * 0.75;
    controls.heightSpeed = settings.heightSpeed;
    controls.heightMin = 0;
    controls.heightMax = 8;
    controls.heightCoef = 0.5;
    example.renderOnce();
  };

  example.addAction('重置第一人称', () => {
    resetCamera(example.context, [0, 2.2, 9]);
    example.context.controls.lookAt(example.context.target);
    example.renderOnce();
    example.context.canvas.focus();
  });

  example.apply(initialArgs);
  return example;
}
