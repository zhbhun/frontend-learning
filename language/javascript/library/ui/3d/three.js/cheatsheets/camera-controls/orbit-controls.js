import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
  createControllerStage,
  degrees,
  formatVector,
  resetCamera
} from './controller-stage.js';

/*
演示 OrbitControls 如何围绕 target 旋转、平移和缩放。

输入来自 Controls 面板；关键操作是切换阻尼与逐帧 update()，再拖动画布并松手。
预期结果是：阻尼开启且持续 update() 时，相机会在松手后继续平滑收敛；暂停 update()
则只保留指针事件已经写入的姿态。读文件时先看 createControls、onFrame 和 apply。
*/
export function createOrbitControlsExample(initialArgs = {}) {
  const settings = {
    enableDamping: true,
    dampingFactor: 0.08,
    autoRotate: false,
    zoomToCursor: false,
    runUpdate: true
  };

  const example = createControllerStage({
    title: 'OrbitControls',
    hint: '左键旋转 · 右键平移 · 滚轮缩放；红点是 target。',
    cameraPosition: [6.5, 4.5, 7.5],
    createControls({ camera, canvas, target }) {
      const controls = new OrbitControls(camera, canvas);
      controls.target.copy(target);
      controls.minDistance = 2.5;
      controls.maxDistance = 18;
      controls.maxPolarAngle = Math.PI * 0.92;
      controls.update();
      return controls;
    },
    onFrame(context, delta) {
      if (settings.runUpdate) {
        // 阻尼和自动旋转只有在后续帧继续 update() 才能推进。
        context.controls.update(delta);
      }

      context.world.targetMarker.position.copy(context.controls.target);
      context.world.targetRing.position.copy(context.controls.target);
    },
    readout({ camera, controls, state }) {
      return [
        ['target', formatVector(controls.target)],
        ['相机距离', controls.getDistance().toFixed(2)],
        ['极角', degrees(controls.getPolarAngle())],
        ['逐帧 update', settings.runUpdate ? '运行中' : '已暂停'],
        ['change 事件', state.eventCounts.change]
      ];
    }
  });

  example.apply = (args) => {
    Object.assign(settings, args);
    const { controls } = example.context;
    controls.enableDamping = settings.enableDamping;
    controls.dampingFactor = settings.dampingFactor;
    controls.autoRotate = settings.autoRotate;
    controls.zoomToCursor = settings.zoomToCursor;
    controls.update();
    example.renderOnce();
  };

  example.addAction('重置视角', () => {
    resetCamera(example.context, [6.5, 4.5, 7.5]);
    example.context.controls.target.copy(example.context.target);
    example.context.controls.saveState();
    example.context.controls.reset();
    example.context.controls.update();
    example.renderOnce();
  });

  example.apply(initialArgs);
  return example;
}
