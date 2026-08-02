import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

import {
  cameraDirection,
  createControllerStage,
  degrees,
  formatVector,
  resetCamera
} from './controller-stage.js';

/*
演示 PointerLockControls 只负责锁定后的鼠标视角，以及应用如何补上 WASD 移动。

输入是指针灵敏度、移动速度和原始鼠标输入请求；点击“锁定鼠标”后移动鼠标并按 WASD，
Esc 解锁。锁定状态、方向和位置读数是可核对证据。读文件时先看 lock/unlock 事件与
onFrame 中应用层对 moveForward()/moveRight() 的调用。
*/
export function createPointerLockControlsExample(initialArgs = {}) {
  const settings = {
    pointerSpeed: 1,
    movementSpeed: 5,
    rawInput: false
  };
  const pressed = new Set();
  let lockButton;

  const example = createControllerStage({
    title: 'PointerLockControls',
    hint: '点击右上角锁定鼠标 · 移动鼠标观察 · WASD 行走 · Esc 解锁。',
    cameraPosition: [0, 2.2, 9],
    targetPosition: [0, 1.5, 0],
    activation: 'manual',
    createControls(context) {
      const controls = new PointerLockControls(context.camera, context.canvas);
      controls.enabled = false;

      const onKeyDown = (event) => {
        if (controls.isLocked && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
          pressed.add(event.code);
        }
      };
      const onKeyUp = (event) => pressed.delete(event.code);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      context.onCleanup(() => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      });

      controls.addEventListener('lock', () => {
        controls.enabled = context.state.nearViewport;
        context.setHint('鼠标已锁定 · 移动鼠标观察 · WASD 行走 · Esc 解锁。');
        if (lockButton) lockButton.textContent = '鼠标已锁定';
      });
      controls.addEventListener('unlock', () => {
        controls.enabled = false;
        pressed.clear();
        context.setHint('点击右上角锁定鼠标 · 移动鼠标观察 · WASD 行走 · Esc 解锁。');
        if (lockButton) lockButton.textContent = '锁定鼠标';
      });

      return controls;
    },
    onFrame({ camera, controls }, delta) {
      if (!controls.isLocked) {
        return;
      }

      camera.updateMatrix();
      const distance = settings.movementSpeed * delta;
      if (pressed.has('KeyW')) controls.moveForward(distance);
      if (pressed.has('KeyS')) controls.moveForward(-distance);
      if (pressed.has('KeyA')) controls.moveRight(-distance);
      if (pressed.has('KeyD')) controls.moveRight(distance);
    },
    onVisibilityChange({ controls }, isNear) {
      controls.enabled = isNear && controls.isLocked;
      if (!isNear && controls.isLocked) {
        // 离屏时主动释放指针，避免用户滚离范例后仍被画布占用。
        controls.unlock();
      }
    },
    readout({ camera, controls, state }) {
      return [
        ['指针状态', controls.isLocked ? '已锁定' : '未锁定'],
        ['相机位置', formatVector(camera.position)],
        ['观察方向', formatVector(cameraDirection(camera))],
        ['俯仰范围', `${degrees(controls.minPolarAngle)}–${degrees(controls.maxPolarAngle)}`],
        ['lock / unlock', `${state.eventCounts.lock} / ${state.eventCounts.unlock}`]
      ];
    }
  });

  lockButton = example.addAction(
    '锁定鼠标',
    () => {
      if (!example.context.controls.isLocked) {
        // Pointer Lock API 要求这次调用直接来自用户手势。
        example.context.controls.lock(settings.rawInput);
      }
    },
    { primary: true }
  );

  example.apply = (args) => {
    Object.assign(settings, args);
    example.context.controls.pointerSpeed = settings.pointerSpeed;
    example.renderOnce();
  };

  example.addAction('重置位置', () => {
    resetCamera(example.context, [0, 2.2, 9]);
    example.renderOnce();
  });

  example.apply(initialArgs);
  return example;
}
