/*
本范例演示 DOM 叠层与 canvas 之间的事件传递。
输入：overlayPointerEvents；主要操作：在面板上拖动鼠标，或点击面板里的按钮。
预期结果：
  - auto 时叠层拦截事件，canvas 收不到 pointerdown，OrbitControls 不响应，按钮可以点。
  - none 时事件穿透到 canvas，OrbitControls 响应拖动（相机方位角变化），按钮再也点不到。
读代码先看 applyOverlayPE() 与事件监听的挂载位置，再用读数对照"上一次接收者"与"相机方位角"。
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 叠层样式直接写在元素上，避免修改共享 CSS；同时也是读者可复制的最小片段。
const overlayStyle = [
  'position:absolute',
  'top:12px',
  'left:12px',
  'z-index:2',
  'display:flex',
  'flex-direction:column',
  'gap:6px',
  'padding:10px 12px',
  'max-width:55%',
  'border-radius:6px',
  'background:rgb(255 255 255 / 90%)',
  'color:#2c3a34',
  'font:13px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif',
  'box-shadow:0 6px 18px rgb(31 45 40 / 12%)'
].join(';');

const titleStyle = 'margin:0;font-weight:600';
const hintStyle = 'margin:0;color:#5d6f67;font-size:12px';
const buttonStyle = [
  'appearance:none',
  'border:1px solid rgb(70 88 79 / 35%)',
  'background:#f4f7f5',
  'color:#2c3a34',
  'padding:4px 10px',
  'border-radius:4px',
  'font:inherit',
  'cursor:pointer'
].join(';');

export const domOverlayExample = {
  create(canvas, emitSnapshot) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // stage 是 story-canvas 创建的 .cs-stage 容器；canvas 与叠层都是它的子节点。
    const stage = canvas.parentElement;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(2.8, 1.8, 3.6);

    // OrbitControls 把 pointerdown 监听挂在 renderer.domElement（即本 canvas）上。
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 8;
    controls.update();

    const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    cube.rotation.set(0.3, 0.4, 0);
    scene.add(cube);

    // 创建 DOM 叠层：模拟一个浮在 canvas 上方的 UI 控件面板。
    const overlay = document.createElement('div');
    overlay.setAttribute('data-cs-overlay', '');
    overlay.style.cssText = overlayStyle;
    overlay.innerHTML = `
      <p style="${titleStyle}">UI 面板</p>
      <button type="button" data-action="reset" style="${buttonStyle}">重置视角</button>
      <button type="button" data-action="spin" style="${buttonStyle}">立方体转 90°</button>
      <p style="${hintStyle}">在面板上拖动鼠标，或点击按钮。</p>
    `;
    stage.append(overlay);

    const buttons = Array.from(overlay.querySelectorAll('button'));

    const state = {
      overlayPointerEvents: 'auto',
      lastReceiver: '—',
      canvasHits: 0,
      overlayHits: 0,
      buttonClicks: 0,
      lastAction: '—'
    };

    function publish() {
      const azimuthal = THREE.MathUtils.radToDeg(controls.getAzimuthalAngle());
      emitSnapshot({
        overlayPE: state.overlayPointerEvents,
        lastReceiver: state.lastReceiver,
        canvasHits: state.canvasHits,
        overlayHits: state.overlayHits,
        buttonClicks: state.buttonClicks,
        lastAction: state.lastAction,
        azimuthal: azimuthal.toFixed(1)
      });
    }

    function onCanvasPointerDown() {
      state.canvasHits += 1;
      state.lastReceiver = 'canvas';
      publish();
    }

    function onOverlayPointerDown() {
      state.overlayHits += 1;
      state.lastReceiver = 'overlay';
      publish();
    }

    function onButtonClick(event) {
      const action = event.currentTarget.dataset.action;
      state.buttonClicks += 1;
      state.lastAction = action;
      if (action === 'reset') {
        camera.position.set(2.8, 1.8, 3.6);
        controls.target.set(0, 0, 0);
        controls.update();
      } else if (action === 'spin') {
        cube.rotation.y += Math.PI / 2;
      }
      publish();
    }

    renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);
    overlay.addEventListener('pointerdown', onOverlayPointerDown);
    buttons.forEach((btn) => btn.addEventListener('click', onButtonClick));

    function applyOverlayPE(value) {
      state.overlayPointerEvents = value;
      // 叠层容器的 pointer-events 切换；按钮自身不单独改，否则会污染"auto 时按钮可点"的对照。
      overlay.style.pointerEvents = value;
      publish();
    }
    applyOverlayPE('auto');

    function resize() {
      const width = Math.max(1, Math.floor(stage.clientWidth));
      const height = Math.max(1, Math.floor(stage.clientHeight));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    resize();

    // 阻尼需要逐帧 update；同时让"相机方位角"读数在拖动后实时刷新。
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
      publish();
    });

    return {
      state,
      applyOverlayPE,
      dispose() {
        renderer.setAnimationLoop(null);
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onCanvasPointerDown);
        overlay.removeEventListener('pointerdown', onOverlayPointerDown);
        buttons.forEach((btn) => btn.removeEventListener('click', onButtonClick));
        overlay.remove();
        controls.dispose();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      }
    };
  },

  apply(instance, args) {
    instance.applyOverlayPE(args.overlayPointerEvents);
  },

  readout(snapshot) {
    return [
      ['叠层 pointer-events', snapshot.overlayPE],
      ['上一次 pointerdown 接收者', snapshot.lastReceiver],
      ['canvas 收到次数', snapshot.canvasHits],
      ['overlay 收到次数', snapshot.overlayHits],
      ['按钮 click 次数', snapshot.buttonClicks],
      ['相机方位角', `${snapshot.azimuthal}°`]
    ];
  }
};
