/**
 * 范例：Observables 与事件——订阅与清理。
 * 输入：renderObs / pointerObs / keyboardObs 三个布尔，分别控制是否订阅
 *   scene.onBeforeRenderObservable / onPointerObservable / onKeyboardObservable。
 * 主要操作：
 *   - setup 里建 Scene/相机/光/一个盒子（视觉参照，证明循环在跑）。
 *   - 三个独立的 user-controlled observer：render 计数帧、pointer 读 POINTERMOVE 坐标、
 *     keyboard 记 KEYDOWN 最近按键。add 返回的 Observer 都保留，remove 用同一引用。
 *   - 一个常驻 emit observer：每帧推进盒子旋转 + emit 派生读数。它和 user-controlled 的
 *     render observer 共存于同一个 onBeforeRenderObservable，用来证明"取消一个 observer
 *     不影响同一 observable 上的其它订阅"。
 *   - update() 按 args 增删三个 observer，体现"订阅返回 observer、用 observer 取消"的纪律。
 * 预期结果：
 *   - 取消「订阅渲染」后帧计数停住，但盒子仍持续旋转（emit observer 未被取消）。
 *   - 重新订阅渲染时帧计数从 0 重起（新 observer，新订阅）。
 *   - 取消「订阅指针/键盘」后对应读数冻结在最后值，其它通道照常。
 *   - onKeyboardObservable 需要 canvas 键盘焦点：tabIndex=0，点击聚焦后蓝色边框提示。
 * 阅读主线：createObservablesExample（状态与焦点）→ setup（场景 + 常驻 emit observer）
 *           → syncSubscriptions（三个 observer 的对称 add/remove）→ dispose（逐个 remove 后再 runtime.dispose）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  HemisphericLight,
  KeyboardEventTypes,
  Mesh,
  MeshBuilder,
  Observer,
  PointerEventTypes,
  PointerInfo,
  Scene,
  StandardMaterial,
  Vector3,
  type KeyboardInfo,
} from '@babylonjs/core';

export interface ObsOptions {
  renderObs: boolean;
  pointerObs: boolean;
  keyboardObs: boolean;
}

export interface ObsSnapshot {
  renderSubscribed: boolean;
  pointerSubscribed: boolean;
  keyboardSubscribed: boolean;
  frameCount: number;
  pointer: string; // "(x, y)" 或 "—"
  lastKey: string; // "key (code)" 或 "—"
  hasFocus: boolean;
}

export interface ObsInstance {
  update(options: ObsOptions): void;
  dispose(): void;
}

export function createObservablesExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ObsSnapshot) => void,
): ObsInstance {
  let current: ObsOptions = { renderObs: true, pointerObs: true, keyboardObs: true };

  // 三个用户可控的订阅句柄：add 返回 Observer，remove 必须用同一引用。
  let renderObs: Observer<Scene> | null = null;
  let pointerObs: Observer<PointerInfo> | null = null;
  let keyboardObs: Observer<KeyboardInfo> | null = null;
  // 常驻 emit observer：驱动盒子旋转 + 每帧派发读数。它在 setup 里赋值，dispose 里 remove。
  let emitObs: Observer<Scene> | null = null;

  let frameCount = 0;
  let lastPointer = '—';
  let lastKey = '—';
  let hasFocus = false;

  let activeScene!: Scene;

  // onKeyboardObservable 由 Engine 接到 canvas 的 keydown/keyup，但 canvas 默认不可聚焦：
  // 设 tabIndex 让它可聚焦，并用蓝色 boxShadow 提示读者当前焦点状态。
  canvas.tabIndex = 0;
  canvas.style.outline = 'none';
  const onFocus = () => {
    hasFocus = true;
    canvas.style.boxShadow = '0 0 0 3px #2563eb';
  };
  const onBlur = () => {
    hasFocus = false;
    canvas.style.boxShadow = 'none';
  };
  canvas.addEventListener('focus', onFocus);
  canvas.addEventListener('blur', onBlur);

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);
    activeScene = scene;

    const camera = new ArcRotateCamera(
      'cam',
      -Math.PI / 2,
      Math.PI / 2.4,
      6,
      Vector3.Zero(),
      scene,
    );
    camera.attachControl(canvas, true);
    new HemisphericLight('hemi', new Vector3(0.4, 1, 0.3), scene);

    const box: Mesh = MeshBuilder.CreateBox('box', { size: 1.4 }, scene);
    const boxMat = new StandardMaterial('boxMat', scene);
    boxMat.diffuseColor = new Color3(0.42, 0.62, 0.86);
    boxMat.emissiveColor = new Color3(0.12, 0.18, 0.26);
    box.material = boxMat;

    // 常驻 emit observer：每帧推进盒子旋转（证明循环在跑）+ emit 读数。
    // 它与用户可控的 render observer 共享同一个 onBeforeRenderObservable，
    // 用来演示"取消其中一个订阅不影响其它 observer"。
    emitObs = scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      box.rotation.y += 0.6 * dt;
      emit({
        renderSubscribed: renderObs !== null,
        pointerSubscribed: pointerObs !== null,
        keyboardSubscribed: keyboardObs !== null,
        frameCount,
        pointer: lastPointer,
        lastKey,
        hasFocus,
      });
    });

    return scene;
  });

  // 按 current 增删三个用户可控 observer：add 返回 Observer，remove 用同一引用。
  function syncSubscriptions() {
    if (!activeScene) return;

    // render：常驻 emit observer 已经每帧旋转盒子；这里只单独计帧，演示独立订阅。
    if (current.renderObs && !renderObs) {
      frameCount = 0; // 重新订阅时计数从 0 起，让"取消→重新订阅"的对比可观察。
      renderObs = activeScene.onBeforeRenderObservable.add(() => {
        frameCount++;
      });
    } else if (!current.renderObs && renderObs) {
      activeScene.onBeforeRenderObservable.remove(renderObs);
      renderObs = null;
    }

    // pointer：第二参 mask 只接 POINTERMOVE，引擎在分发前过滤，不做无用 switch。
    if (current.pointerObs && !pointerObs) {
      pointerObs = activeScene.onPointerObservable.add(() => {
        lastPointer = `(${Math.round(activeScene.pointerX)}, ${Math.round(activeScene.pointerY)})`;
      }, PointerEventTypes.POINTERMOVE);
    } else if (!current.pointerObs && pointerObs) {
      activeScene.onPointerObservable.remove(pointerObs);
      pointerObs = null;
    }

    // keyboard：onKeyboardObservable 只回调 KEYDOWN/KEYUP，按 kbInfo.type 分支取值。
    if (current.keyboardObs && !keyboardObs) {
      keyboardObs = activeScene.onKeyboardObservable.add((kbInfo) => {
        if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
          lastKey = `${kbInfo.event.key} (${kbInfo.event.code})`;
        }
      });
    } else if (!current.keyboardObs && keyboardObs) {
      activeScene.onKeyboardObservable.remove(keyboardObs);
      keyboardObs = null;
    }
  }

  syncSubscriptions();

  return {
    update(options) {
      current = options;
      syncSubscriptions();
    },
    dispose() {
      // 逐个显式 remove，再让 runtime.dispose 走 scene.dispose（会清空所有 observable）。
      // 这里单独 remove 是为了演示"每个 add 都对应一次 remove"的纪律——
      // 场景不销毁（热替换、SPA 路由切换）时漏 remove 是常见泄漏源。
      renderObs?.remove();
      pointerObs?.remove();
      keyboardObs?.remove();
      emitObs?.remove();
      renderObs = pointerObs = keyboardObs = emitObs = null;
      canvas.removeEventListener('focus', onFocus);
      canvas.removeEventListener('blur', onBlur);
      canvas.style.boxShadow = 'none';
      runtime.dispose();
    },
  };
}
