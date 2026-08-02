import { MapControls } from 'three/addons/controls/MapControls.js';

import {
  createControllerStage,
  formatVector,
  resetCamera
} from './controller-stage.js';

/*
演示 MapControls 的地图操作预设与世界平面平移。

输入是平移空间、旋转开关和指针缩放；关键操作是用左键拖动彩色地块。
默认 screenSpacePanning=false 时，光标下的地图点会沿 camera.up 的正交平面移动；
改为 true 后回到屏幕空间平移。读文件时先看构造参数和 apply。
*/
export function createMapControlsExample(initialArgs = {}) {
  const settings = {
    screenSpacePanning: false,
    enableRotate: true,
    zoomToCursor: true
  };

  const example = createControllerStage({
    title: 'MapControls',
    hint: '左键平移地图 · 右键旋转 · 滚轮缩放；观察 target 的 X/Z 读数。',
    cameraPosition: [0, 9.5, 8.5],
    targetPosition: [0, 0, 0],
    createControls({ camera, canvas, target }) {
      const controls = new MapControls(camera, canvas);
      controls.target.copy(target);
      controls.minDistance = 3;
      controls.maxDistance = 22;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.update();
      return controls;
    },
    onFrame(context, delta) {
      context.controls.update(delta);
      context.world.targetMarker.position.copy(context.controls.target);
      context.world.targetRing.position.copy(context.controls.target);
    },
    readout({ camera, controls, state }) {
      return [
        ['target', formatVector(controls.target)],
        ['相机高度', camera.position.y.toFixed(2)],
        ['平移空间', controls.screenSpacePanning ? '屏幕空间' : '地图平面'],
        ['左键', 'PAN'],
        ['change 事件', state.eventCounts.change]
      ];
    }
  });

  example.apply = (args) => {
    Object.assign(settings, args);
    const { controls } = example.context;
    controls.screenSpacePanning = settings.screenSpacePanning;
    controls.enableRotate = settings.enableRotate;
    controls.zoomToCursor = settings.zoomToCursor;
    controls.update();
    example.renderOnce();
  };

  example.addAction('回到地图中心', () => {
    resetCamera(example.context, [0, 9.5, 8.5], example.context.target);
    example.context.controls.target.copy(example.context.target);
    example.context.controls.update();
    example.renderOnce();
  });

  example.apply(initialArgs);
  return example;
}
