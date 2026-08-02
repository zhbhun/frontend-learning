import { ArcballControls } from 'three/addons/controls/ArcballControls.js';

import {
  createControllerStage,
  formatVector,
  resetCamera
} from './controller-stage.js';

/*
演示 ArcballControls 的虚拟轨迹球、自由滚转、双击聚焦和 gizmo。

输入来自 Controls 面板；拖动、滚轮、双击彩色物体后，可从 gizmo、FOV、target 和事件读数
核对结果。ArcballControls 自己推进旋转与聚焦动画，本范例的帧循环只负责 render，
没有把外部 update() 当成动画前提。读文件时先看构造函数第三个 scene 参数和 apply。
*/
export function createArcballControlsExample(initialArgs = {}) {
  const settings = {
    enableAnimations: true,
    enableGizmos: true,
    enableGrid: false,
    enableFocus: true,
    cursorZoom: false,
    rotateSpeed: 1
  };

  const example = createControllerStage({
    title: 'ArcballControls',
    hint: '拖动自由旋转 · 滚轮缩放 · 双击物体聚焦；允许绕视线滚转。',
    cameraPosition: [6.5, 4.5, 7.5],
    createControls({ camera, canvas, scene, target }) {
      // scene 让控制器可以把 gizmo 和平移网格加入同一个渲染场景。
      const controls = new ArcballControls(camera, canvas, scene);
      controls.target.copy(target);
      controls.minDistance = 2.5;
      controls.maxDistance = 18;
      controls.update();
      return controls;
    },
    onFrame(context) {
      context.world.targetMarker.position.copy(context.controls.target);
      context.world.targetRing.position.copy(context.controls.target);
    },
    readout({ camera, controls, state }) {
      return [
        ['target', formatVector(controls.target)],
        ['相机位置', formatVector(camera.position)],
        ['FOV', `${camera.fov.toFixed(1)}°`],
        ['外部 update', '动画不依赖'],
        ['change 事件', state.eventCounts.change]
      ];
    }
  });

  example.apply = (args) => {
    Object.assign(settings, args);
    const { controls } = example.context;
    controls.enableAnimations = settings.enableAnimations;
    controls.enableGizmos = settings.enableGizmos;
    controls.setGizmosVisible(settings.enableGizmos);
    controls.enableGrid = settings.enableGrid;
    controls.enableFocus = settings.enableFocus;
    controls.cursorZoom = settings.cursorZoom;
    controls.rotateSpeed = settings.rotateSpeed;
    controls.update();
    example.renderOnce();
  };

  example.addAction('重置轨迹球', () => {
    resetCamera(example.context, [6.5, 4.5, 7.5]);
    example.context.controls.target.copy(example.context.target);
    example.context.controls.setCamera(example.context.camera);
    example.context.controls.reset();
    example.renderOnce();
  });

  example.apply(initialArgs);
  return example;
}
