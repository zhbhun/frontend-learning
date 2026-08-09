/**
 * 范例：Babylon.js 引擎内置的关键帧动画。
 * 输入：loopMode（cycle / yoyo）、easing（linear / cubic / bounce / elastic）、speedRatio。
 * 主要操作：
 *   - 用两段 Animation（位置 VECTOR3 + 旋转 FLOAT）+ setKeys 定义关键帧动画。
 *   - 挂到 box.animations，由 scene.beginAnimation 返回 Animatable，引擎在 scene.render()
 *     内部按时间插值并把结果写回 box.position / box.rotation.y。
 *   - 切 loopMode / easing 时 stop 旧 Animatable 再 beginAnimation 从 0 重播，让读者完整看到
 *     新曲线；切 speedRatio 时只写 Animatable.speedRatio，演示它是运行时属性。
 * 预期结果：readout 给出循环模式、缓动、速度、当前帧进度和 box.position.x；
 *   CYCLE 到末帧后位置瞬移回首点，YOYO 在首末帧之间来回；不同缓动曲线的运动质感明显不同。
 * 阅读主线：先看 buildEasing 与两段 Animation 的 setKeys，再看 restart 与 update 的重建逻辑。
 */
import {
  Animation,
  ArcRotateCamera,
  BounceEase,
  Color3,
  Color4,
  CubicEase,
  EasingFunction,
  ElasticEase,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  type Animatable,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

export type LoopMode = 'cycle' | 'yoyo';
export type EasingKind = 'linear' | 'cubic' | 'bounce' | 'elastic';

export interface AnimationDemoOptions {
  loopMode: LoopMode;
  easing: EasingKind;
  speedRatio: number;
}

export interface AnimationDemoSnapshot {
  loopLabel: string;
  easingLabel: string;
  speedLabel: string;
  progress: string;
  positionX: string;
}

export interface AnimationDemoInstance {
  update(options: AnimationDemoOptions): void;
  dispose(): void;
}

// 帧率与关键帧范围：30fps × 60 帧 = 单向 2 秒。
const FRAME_RATE = 30;
const TOTAL_FRAMES = 60;
const FROM_X = -3;
const TO_X = 3;

const LOOP_LABELS: Record<LoopMode, string> = {
  cycle: 'CYCLE（回到首帧）',
  yoyo: 'YOYO（来回反弹）',
};

const EASING_LABELS: Record<EasingKind, string> = {
  linear: 'Linear（线性）',
  cubic: 'Cubic（三次缓动）',
  bounce: 'Bounce（末段弹跳）',
  elastic: 'Elastic（弹性过冲）',
};

// 把控件值解析成 EasingFunction 实例；Linear 时返回 null，表示用默认线性插值。
function buildEasing(kind: EasingKind): EasingFunction | null {
  if (kind === 'linear') {
    return null;
  }
  const ease =
    kind === 'cubic'
      ? new CubicEase()
      : kind === 'bounce'
        ? new BounceEase()
        : new ElasticEase();
  // 三种模式都可选；EASEINOUT 让缓动在首末两端都体现，对比最直观。
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  return ease;
}

export function createAnimationDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AnimationDemoSnapshot) => void,
): AnimationDemoInstance {
  let current: AnimationDemoOptions = {
    loopMode: 'cycle',
    easing: 'linear',
    speedRatio: 1,
  };

  // createBabylonRuntime 在返回前会同步跑完 setup，因此这些引用在 update 首次调用前已就绪。
  let scene!: Scene;
  let box!: Mesh;
  let moveAnim!: Animation;
  let spinAnim!: Animation;
  let animatable: Animatable | null = null;

  const runtime = createBabylonRuntime(canvas, (engine) => {
    scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

    // 轨道相机：从斜上方观察水平位移，让 X 方向 -3 → +3 的运动清晰可见。
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2.2,
      Math.PI / 2.6,
      10,
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);

    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 地面线框网格：作为水平位移的参照，便于判断 box 的位置。
    const ground = MeshBuilder.CreateGround(
      'ground',
      { width: 10, height: 6, subdivisions: 10 },
      scene,
    );
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.wireframe = true;
    groundMat.emissiveColor = new Color3(0.62, 0.66, 0.63);
    groundMat.disableLighting = true;
    ground.material = groundMat;
    ground.position.y = -0.5;

    box = MeshBuilder.CreateBox('box', { size: 1 }, scene);
    const boxMat = new StandardMaterial('boxMat', scene);
    boxMat.diffuseColor = new Color3(0.24, 0.45, 0.85);
    boxMat.emissiveColor = new Color3(0.08, 0.16, 0.32);
    box.material = boxMat;
    box.position.set(FROM_X, 0.5, 0);

    // 位置动画：动整向量 position，类型 VECTOR3。value 必须是 Vector3。
    moveAnim = new Animation(
      'moveX',
      'position',
      FRAME_RATE,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE,
    );
    moveAnim.setKeys([
      { frame: 0, value: new Vector3(FROM_X, 0.5, 0) },
      { frame: TOTAL_FRAMES, value: new Vector3(TO_X, 0.5, 0) },
    ]);

    // 旋转动画：动标量 rotation.y，类型 FLOAT。一个单向转一圈，让缓动质感更醒目。
    spinAnim = new Animation(
      'spinY',
      'rotation.y',
      FRAME_RATE,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE,
    );
    spinAnim.setKeys([
      { frame: 0, value: 0 },
      { frame: TOTAL_FRAMES, value: Math.PI * 2 },
    ]);

    // 把动画挂到目标的 animations 数组；beginAnimation 默认从这里取。
    box.animations = [moveAnim, spinAnim];

    // beginAnimation 返回 Animatable；第 4 参 loop=true 才会循环，
    // 具体怎么循环由每段 Animation 的 loopMode 决定。
    animatable = scene.beginAnimation(
      box,
      0,
      TOTAL_FRAMES,
      true,
      current.speedRatio,
    );

    // 每帧 scene.render() 之前触发：读 Animatable.masterFrame 推导进度，
    // 读 box.position.x 证明引擎确实把插值结果写回了目标属性。
    scene.onBeforeRenderObservable.add(() => {
      const frame = animatable ? animatable.masterFrame : 0;
      const progress = Math.max(0, Math.min(1, frame / TOTAL_FRAMES));
      emit({
        loopLabel: LOOP_LABELS[current.loopMode],
        easingLabel: EASING_LABELS[current.easing],
        speedLabel: `${current.speedRatio.toFixed(2)}×`,
        progress: `${Math.round(progress * 100)}%`,
        positionX: box.position.x.toFixed(2),
      });
    });

    return scene;
  });

  // 重建播放：loopMode / easing 是 Animation 数据的属性，切值时 stop 旧 Animatable
  // 再 beginAnimation 从 0 开始，读者能完整看到新曲线从首帧到末帧的效果。
  function restart(): void {
    if (!animatable) {
      return;
    }
    animatable.stop();
    animatable = null;

    const loopConst =
      current.loopMode === 'cycle'
        ? Animation.ANIMATIONLOOPMODE_CYCLE
        : Animation.ANIMATIONLOOPMODE_YOYO;
    moveAnim.loopMode = loopConst;
    spinAnim.loopMode = loopConst;
    const easing = buildEasing(current.easing);
    moveAnim.setEasingFunction(easing);
    spinAnim.setEasingFunction(easing);

    animatable = scene.beginAnimation(
      box,
      0,
      TOTAL_FRAMES,
      true,
      current.speedRatio,
    );
  }

  return {
    update(options) {
      const prev = current;
      current = options;
      if (!animatable) {
        return;
      }
      if (options.loopMode !== prev.loopMode || options.easing !== prev.easing) {
        // 数据相关参数变了：从头重播。
        restart();
      } else {
        // speedRatio 是 Animatable 的运行时属性，写下去立即生效，不必重建。
        animatable.speedRatio = options.speedRatio;
      }
    },
    dispose() {
      runtime.dispose();
    },
  };
}
