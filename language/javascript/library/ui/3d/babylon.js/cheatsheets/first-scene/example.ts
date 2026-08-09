/**
 * 范例：Babylon.js 最小可交互画面。
 * 输入是 angularSpeed（每秒绕 Y 轴累加的弧度数）；主要操作是用 createBabylonRuntime 创建
 * Engine/Scene/相机/光/立方体，订阅 onBeforeRenderObservable 用 engine.getDeltaTime()
 * 推进 box.rotation.y 并 emit 派生读数。
 * 预期结果：立方体持续旋转；速度为 0 时立方体冻结，但 FPS 仍持续刷新，证明渲染循环在跑。
 * 读代码先看 createBabylonRuntime 的 setup 里的对象创建顺序，再看 onBeforeRenderObservable 回调和 update。
 */
import {
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

export interface FirstSceneOptions {
  angularSpeed: number;
}

export interface FirstSceneSnapshot {
  rotating: boolean;
  rotation: number;
  fps: number;
}

export interface FirstSceneInstance {
  update(options: FirstSceneOptions): void;
  dispose(): void;
}

export function createFirstScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FirstSceneSnapshot) => void,
): FirstSceneInstance {
  let angularSpeed = 1;

  // createBabylonRuntime 负责 Engine、视口可见性启停、resize 和 dispose；
  // setup 里只关心"这一帧要画什么"，返回创建好的 Scene。
  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);

    // ArcRotateCamera 用 alpha/beta/radius 绕 target 观察；radius 已经把相机挪开，不必再移位置。
    const camera = new ArcRotateCamera(
      'cam',
      -Math.PI / 2,
      Math.PI / 2,
      5,
      Vector3.Zero(),
      scene,
    );
    camera.attachControl(canvas, true);

    // 默认 StandardMaterial 受光才可见，第一幅画面必须给场景至少一盏光。
    new HemisphericLight('light', new Vector3(0, 1, 0), scene);

    const box = MeshBuilder.CreateBox('box', { size: 1 }, scene);

    // 每帧 scene.render() 之前触发：把毫秒 delta 换算为秒再乘速度累加旋转，
    // 保证动画在 60Hz 和 144Hz 屏幕上速度一致。
    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      box.rotation.y += dt * angularSpeed;

      emit({
        rotating: angularSpeed > 0,
        rotation: box.rotation.y,
        fps: Math.round(1000 / Math.max(engine.getDeltaTime(), 1)),
      });
    });

    return scene;
  });

  return {
    update(options) {
      angularSpeed = options.angularSpeed;
    },
    dispose() {
      runtime.dispose();
    },
  };
}
