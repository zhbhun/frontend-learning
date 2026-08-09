/**
 * 范例：GUI——全屏 UI 的控件、容器、锚定与事件。
 * 输入：panelAnchor（'left' | 'center' | 'right'），由 Storybook Controls 切换，
 *   改写 StackPanel 的 horizontalAlignment，演示 GUI 控件锚定。
 * 主要操作：
 *   - setup 里建 Scene/相机/光/一个盒子（受 GUI 控制的变化对象）。
 *   - AdvancedDynamicTexture.CreateFullscreenUI(name, foreground=true, scene)
 *     建全屏 UI：屏幕空间纹理，叠在 3D 之上。
 *   - 一个 StackPanel（纵向布局，自带 background，未设 height 时沿堆叠方向自适应）
 *     内装 TextBlock / Button / Slider / TextBlock 四个控件——演示容器与控件。
 *   - Button.onPointerClickObservable 切换盒子显隐 + 计数；
 *     Slider.onValueChangedObservable 改盒子角速度。两个 observable 与 5.1 同一套订阅模型。
 *   - 每帧 onBeforeRenderObservable：按角速度推进盒子旋转 + 同步面板内状态文字 + emit 读数。
 *   - update() 按 panelAnchor 重新设 panel.horizontalAlignment。
 * 预期结果：
 *   - 点击「切换盒子显隐」按钮：盒子显隐切换，读数「点击次数」+1，面板内状态文字同步。
 *   - 拖动滑块：盒子角速度变化，旋转快慢随之变化；读数「滑块值 / 盒子角速度」同步。
 *   - 切换 Controls 的「面板水平锚点」：面板在 canvas 左/中/右重新对齐。
 *   - 拖动 canvas 透明区域：相机绕目标旋转——证明全屏 GUI 只在控件上拦截指针。
 * 阅读主线：createGuiExample（状态）→ setup（3D + 全屏 UI + 控件挂接）→ 事件回调
 *           → applyAnchor / update（锚定）→ dispose（先 ADT，再 runtime）。
 */
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';
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
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Slider,
  StackPanel,
  TextBlock,
} from '@babylonjs/gui';

export type GuiAnchor = 'left' | 'center' | 'right';

export interface GuiOptions {
  panelAnchor: GuiAnchor;
}

export interface GuiSnapshot {
  clicks: number;
  sliderValue: number;
  angularSpeed: number;
  boxVisible: boolean;
  anchor: GuiAnchor;
}

export interface GuiInstance {
  update(options: GuiOptions): void;
  dispose(): void;
}

export function createGuiExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GuiSnapshot) => void,
): GuiInstance {
  let current: GuiOptions = { panelAnchor: 'left' };

  // 读数状态：GUI 事件（点击 / 滑块）改这里，渲染回调 emit 出去。
  let clicks = 0;
  let sliderValue = 1;   // 滑块最近一次 onValueChangedObservable 回调值
  let angularSpeed = 1;  // 盒子每秒弧度，由滑块驱动
  let boxVisible = true; // 由按钮切换

  // 需要在 update / dispose 里再次访问的句柄。
  let panel: StackPanel | null = null;
  let statusText: TextBlock | null = null;
  let adt: AdvancedDynamicTexture | null = null;

  function anchorToValue(anchor: GuiAnchor): number {
    if (anchor === 'left') return Control.HORIZONTAL_ALIGNMENT_LEFT;
    if (anchor === 'center') return Control.HORIZONTAL_ALIGNMENT_CENTER;
    return Control.HORIZONTAL_ALIGNMENT_RIGHT;
  }

  function applyAnchor(anchor: GuiAnchor) {
    if (panel) panel.horizontalAlignment = anchorToValue(anchor);
  }

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.93, 0.95, 0.94, 1);

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

    const box = MeshBuilder.CreateBox('box', { size: 1.6 }, scene);
    const boxMat = new StandardMaterial('boxMat', scene);
    boxMat.diffuseColor = new Color3(0.42, 0.62, 0.86);
    boxMat.emissiveColor = new Color3(0.12, 0.18, 0.26);
    box.material = boxMat;

    // 全屏 UI：CreateFullscreenUI 在 canvas 上盖一张屏幕空间纹理。
    // 第二参 foreground=true（默认）让它在 3D 之上绘制；它内部会创建一个 Layer。
    adt = AdvancedDynamicTexture.CreateFullscreenUI('gui', true, scene);

    // StackPanel：纵向线性布局。设 width 让它不横向撑满；不设 height 时沿堆叠方向自适应。
    // background 来自父类 Container——StackPanel 可以直接当带底色的面板用。
    panel = new StackPanel('panel');
    panel.width = '280px';
    panel.background = '#1e293b';
    panel.spacing = 10;            // 子控件间距（像素）
    panel.paddingTop = '14px';     // 子控件相对面板顶边的内边距
    panel.paddingBottom = '14px';
    panel.isVertical = true;
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    panel.top = '40px';            // 相对 canvas 顶部的偏移（与 TOP 对齐配合）
    panel.left = '20px';           // 相对 canvas 左侧的偏移（与 LEFT 对齐配合）
    adt.addControl(panel);

    // 标题文字：TextBlock 只显示，不响应点击。
    const title = new TextBlock('title', 'GUI 面板');
    title.color = '#e2e8f0';
    title.fontSize = 18;
    title.height = '28px';
    title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.addControl(title);

    // 按钮：Button.CreateSimpleButton 是带默认 padding 的工厂。
    // onPointerClickObservable 是 Observable<Vector2WithInfo>，与 5.1 的订阅模型一致。
    const toggleBtn = Button.CreateSimpleButton('toggle', '切换盒子显隐');
    toggleBtn.width = '240px';
    toggleBtn.height = '40px';
    toggleBtn.color = 'white';
    toggleBtn.background = '#2563eb';
    toggleBtn.cornerRadius = 6;
    toggleBtn.fontSize = 14;
    toggleBtn.onPointerClickObservable.add(() => {
      boxVisible = !boxVisible;
      box.isVisible = boxVisible;
      clicks++;
    });
    panel.addControl(toggleBtn);

    // 滑块：minimum/maximum/value/step/onValueChangedObservable 都在 BaseSlider 上。
    // 回调收到的是 number；把它存进 angularSpeed，渲染循环据此推进盒子旋转。
    const speedSlider = new Slider('speed');
    speedSlider.minimum = 0;
    speedSlider.maximum = 3;
    speedSlider.value = 1;
    speedSlider.step = 0.1;
    speedSlider.width = '240px';
    speedSlider.height = '22px';
    speedSlider.color = '#38bdf8';
    speedSlider.background = '#0f172a';
    speedSlider.onValueChangedObservable.add((v: number) => {
      sliderValue = v;
      angularSpeed = v;
    });
    panel.addControl(speedSlider);

    // 状态文字：每帧在渲染回调里更新 text，反映 GUI 事件落到了 3D 场景。
    statusText = new TextBlock('status', '');
    statusText.color = '#cbd5e1';
    statusText.fontSize = 13;
    statusText.height = '20px';
    statusText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.addControl(statusText);

    // 每帧：推进盒子旋转（证明循环与 GUI 设定的角速度都生效）+ 同步面板内文字 + emit 读数。
    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      box.rotation.y += angularSpeed * dt;
      if (statusText) {
        statusText.text = `角速度 ${angularSpeed.toFixed(2)} rad/s · 盒子${boxVisible ? '可见' : '隐藏'}`;
      }
      emit({
        clicks,
        sliderValue,
        angularSpeed,
        boxVisible,
        anchor: current.panelAnchor,
      });
    });

    return scene;
  });

  applyAnchor(current.panelAnchor);

  return {
    update(options) {
      current = options;
      applyAnchor(current.panelAnchor);
    },
    dispose() {
      // 先 dispose ADT（释放纹理 / 控件 / fullscreen layer），
      // 再让 runtime.dispose 走 scene.dispose + engine.dispose。
      adt?.dispose();
      panel = null;
      statusText = null;
      adt = null;
      runtime.dispose();
    },
  };
}
