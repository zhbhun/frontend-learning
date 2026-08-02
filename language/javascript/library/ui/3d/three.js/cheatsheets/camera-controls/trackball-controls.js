import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

import {
  createControllerStage,
  formatVector,
  resetCamera
} from './controller-stage.js';

/*
演示 TrackballControls 不保持固定 camera.up 的旋转模型。

输入是动态阻尼、旋转速度和平移/缩放开关；关键操作是持续向上拖动并越过极点。
绿色箭头与 camera.up 读数会一起翻转，证明它不会像 OrbitControls 那样把画面扶正。
读文件时先看 onFrame 中每帧 update() 和 upArrow 的同步。
*/
export function createTrackballControlsExample(initialArgs = {}) {
  const settings = {
    staticMoving: false,
    dynamicDampingFactor: 0.2,
    rotateSpeed: 1,
    noPan: false,
    noZoom: false
  };
  let upArrow;

  const example = createControllerStage({
    title: 'TrackballControls',
    hint: '左键旋转并越过极点 · 右键平移 · 滚轮缩放；绿色箭头表示 camera.up。',
    cameraPosition: [6.5, 4.5, 7.5],
    createControls({ camera, canvas, scene, target }) {
      upArrow = new THREE.ArrowHelper(
        camera.up.clone().normalize(),
        target,
        2,
        '#278467',
        0.35,
        0.2
      );
      scene.add(upArrow);

      const controls = new TrackballControls(camera, canvas);
      controls.target.copy(target);
      controls.minDistance = 2.5;
      controls.maxDistance = 18;
      controls.update();
      return controls;
    },
    onFrame({ camera, controls, target }) {
      // Trackball 的拖动与动态阻尼都依赖逐帧 update()。
      controls.update();
      upArrow.position.copy(target);
      upArrow.setDirection(camera.up.clone().normalize());
    },
    onResize({ controls }) {
      controls.handleResize();
    },
    readout({ camera, controls, state }) {
      return [
        ['camera.up', formatVector(camera.up)],
        ['相机位置', formatVector(camera.position)],
        ['staticMoving', String(controls.staticMoving)],
        ['逐帧 update', '必需'],
        ['change 事件', state.eventCounts.change]
      ];
    }
  });

  example.apply = (args) => {
    Object.assign(settings, args);
    const { controls } = example.context;
    controls.staticMoving = settings.staticMoving;
    controls.dynamicDampingFactor = settings.dynamicDampingFactor;
    controls.rotateSpeed = settings.rotateSpeed;
    controls.noPan = settings.noPan;
    controls.noZoom = settings.noZoom;
    controls.update();
    example.renderOnce();
  };

  example.addAction('恢复正上方', () => {
    resetCamera(example.context, [6.5, 4.5, 7.5]);
    example.context.controls.target.copy(example.context.target);
    example.context.controls.reset();
    example.context.controls.update();
    example.renderOnce();
  });

  example.apply(initialArgs);
  return example;
}
