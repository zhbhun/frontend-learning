/**
 * 范例：渲染循环与时间。
 * 输入：mode（'delta' 用 getDeltaTime 推进；'fixed' 每帧固定加，错误示范）、
 *   angularSpeed（delta 模式下为弧度/秒；fixed 模式下为弧度/帧）。
 * 主要操作：在 scene.onBeforeRenderObservable 里按 mode 推进 box.rotation.y，
 *   累计 elapsed，并按 0.4s 窗口换算「有效角速度」，emit
 *   mode/status/fps/deltaTime/elapsed/angle/effectiveDegPerSec。
 * 预期结果：delta 模式下有效角速度 ≈ angularSpeed × 57.3 °/s，与 FPS 无关；
 *   fixed 模式下 ≈ angularSpeed × FPS × 57.3 °/s——同一数值随刷新率漂移。
 * 阅读主线：先看 setup 里 Engine/Scene/相机/光/Mesh 的创建顺序，
 *   再看 onBeforeRenderObservable 回调里 mode 分支与时间累加，最后看 update。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

export interface LoopOptions {
  mode: 'delta' | 'fixed';
  angularSpeed: number;
}

export interface LoopSnapshot {
  mode: 'delta' | 'fixed';
  status: string;
  fps: number;
  deltaTime: number; // 毫秒，engine.getDeltaTime() 原始读数
  elapsed: number; // 秒，累计运行时间（仅渲染期间增长）
  angle: number; // 弧度，box.rotation.y（未取模）
  effectiveDegPerSec: number; // 按 0.4s 窗口换算的有效角速度
}

export interface LoopInstance {
  update(options: LoopOptions): void;
  dispose(): void;
}

export function createLoopExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LoopSnapshot) => void,
): LoopInstance {
  let mode: 'delta' | 'fixed' = 'delta';
  let angularSpeed = 1;

  // createBabylonRuntime 负责 Engine、视口可见性启停、resize 和 dispose；
  // setup 返回 Scene，这里只关心"这一帧推进什么、读出什么"。
  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1); // 浅米色背景，让 plank 更突出

    // ArcRotateCamera：alpha/beta/radius 绕 target 观察；半径 6 把相机挪开。
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2.3,
      6,
      Vector3.Zero(),
      scene,
    );
    camera.attachControl(canvas, true);

    // 半球光：给 plank 基础明暗，让 Y 轴旋转肉眼可辨。
    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 非立方体 plank：宽高深不等，Y 轴旋转才看得出来。
    const box = MeshBuilder.CreateBox(
      'box',
      { width: 1.8, height: 0.7, depth: 1.0 },
      scene,
    );
    const boxMat = new StandardMaterial('boxMat', scene);
    boxMat.diffuseColor = new Color3(0.42, 0.62, 0.86);
    box.material = boxMat;

    let elapsed = 0;
    // 「有效角速度」按 0.4s 窗口换算，避免单帧抖动让读数乱跳。
    const WINDOW = 0.4;
    let windowStartAngle = 0;
    let windowStartElapsed = 0;
    let effectiveDegPerSec = 0;

    // 每帧 scene.render() 之前触发：按 mode 推进业务状态、累计时间、emit 读数。
    // getDeltaTime() 在此读取的就是本帧间隔，已经有效。
    scene.onBeforeRenderObservable.add(() => {
      const dtMs = engine.getDeltaTime();
      const dt = dtMs / 1000;

      if (mode === 'delta') {
        // 正确：速度按"每秒多少"解释，乘秒制 delta，与刷新率解耦。
        box.rotation.y += angularSpeed * dt;
      } else {
        // 错误示范：每帧固定加同样的值，结果随帧率漂移（60Hz 与 144Hz 差 2.4 倍）。
        box.rotation.y += angularSpeed;
      }
      // elapsed 始终按真实渲染时间累加，让 fixed 模式下 FPS × speed 的关系可被换算。
      elapsed += dt;

      if (elapsed - windowStartElapsed >= WINDOW) {
        const dAngle = box.rotation.y - windowStartAngle;
        const dT = elapsed - windowStartElapsed;
        effectiveDegPerSec = ((dAngle * 180) / Math.PI) / dT;
        windowStartAngle = box.rotation.y;
        windowStartElapsed = elapsed;
      }

      emit({
        mode,
        status: angularSpeed > 0 ? '运行中' : '已冻结',
        fps: Math.round(engine.getFps()),
        deltaTime: dtMs,
        elapsed,
        angle: box.rotation.y,
        effectiveDegPerSec,
      });
    });

    return scene;
  });

  return {
    update(options) {
      mode = options.mode;
      angularSpeed = options.angularSpeed;
    },
    dispose() {
      runtime.dispose();
    },
  };
}
