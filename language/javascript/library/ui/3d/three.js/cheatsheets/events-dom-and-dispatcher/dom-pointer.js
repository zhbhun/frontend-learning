/*
演示 DOM 指针挂在画布上的最小闭环：在 canvas 上听 pointer 事件，读出 client 坐标、
相对画布的局部坐标，以及为拾取准备的 NDC。

输入是指针移动 / 按下 / 抬起 / 离开，以及“监听启用”开关；关掉开关后事件不再更新读数，
用来观察 removeEventListener / AbortController 清理后的效果。
读文件先看 attachListeners() 与 toPointerSnapshot()：前者决定挂在哪，后者把 client 坐标
换算成局部坐标和 NDC。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const domPointerExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
    camera.position.set(3.6, 2.6, 4.8);
    camera.lookAt(0, 0.4, 0);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(1.6));
    scene.add(new THREE.HemisphereLight('#ffffff', '#78908a', 0.95));
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(4, 6, 3);
    scene.add(key);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.48 })
    );
    mesh.position.y = 0.55;
    scene.add(mesh);

    // AbortController 把同一批监听绑在一个信号上，abort() 一次全部拆除。
    let abortController = null;

    const state = {
      listening: true,
      pointerInside: false,
      pressed: false,
      clientX: null,
      clientY: null,
      localX: null,
      localY: null,
      ndcX: null,
      ndcY: null,
      lastEvent: '—'
    };

    function publish() {
      emitSnapshot({ state });
    }

    function clearPointer() {
      state.pointerInside = false;
      state.pressed = false;
      state.clientX = null;
      state.clientY = null;
      state.localX = null;
      state.localY = null;
      state.ndcX = null;
      state.ndcY = null;
    }

    function toPointerSnapshot(event) {
      const rect = canvas.getBoundingClientRect();
      // clientX/Y 相对视口；减 rect 得到相对画布的 CSS 像素。
      // NDC：x/y ∈ [-1, 1]，原点在画布中心；DOM 的 Y 向下，NDC 的 Y 向上，所以取负。
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const ndcX = (localX / rect.width) * 2 - 1;
      const ndcY = -(localY / rect.height) * 2 + 1;

      state.pointerInside = true;
      state.clientX = event.clientX;
      state.clientY = event.clientY;
      state.localX = localX;
      state.localY = localY;
      state.ndcX = ndcX;
      state.ndcY = ndcY;
    }

    function onPointerMove(event) {
      toPointerSnapshot(event);
      state.lastEvent = 'pointermove';
      publish();
    }

    function onPointerDown(event) {
      toPointerSnapshot(event);
      state.pressed = true;
      state.lastEvent = 'pointerdown';
      // 按下时立方体略提亮，只作“DOM 输入已到达”的视觉证据，不是拾取命中。
      mesh.material.emissive.set('#1a3a6e');
      mesh.material.emissiveIntensity = 0.35;
      publish();
    }

    function onPointerUp(event) {
      toPointerSnapshot(event);
      state.pressed = false;
      state.lastEvent = 'pointerup';
      mesh.material.emissive.set('#000000');
      mesh.material.emissiveIntensity = 0;
      publish();
    }

    function onPointerLeave() {
      clearPointer();
      state.lastEvent = 'pointerleave';
      mesh.material.emissive.set('#000000');
      mesh.material.emissiveIntensity = 0;
      publish();
    }

    function detachListeners() {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
    }

    function attachListeners() {
      detachListeners();
      abortController = new AbortController();
      const { signal } = abortController;
      // 挂在实际接收指针的画布上（本范例的 canvas 即 renderer.domElement）。
      canvas.addEventListener('pointermove', onPointerMove, { signal });
      canvas.addEventListener('pointerdown', onPointerDown, { signal });
      canvas.addEventListener('pointerup', onPointerUp, { signal });
      canvas.addEventListener('pointerleave', onPointerLeave, { signal });
    }

    attachListeners();
    publish();

    function frame(delta) {
      mesh.rotation.y += delta * 0.35;
      renderer.render(scene, camera);
      publish();
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return {
      state,
      loop,
      setListening(enabled) {
        state.listening = enabled;
        if (enabled) {
          attachListeners();
        } else {
          detachListeners();
          clearPointer();
          state.lastEvent = '已拆除监听';
          mesh.material.emissive.set('#000000');
          mesh.material.emissiveIntensity = 0;
        }
        publish();
      },
      dispose() {
        detachListeners();
        loop.dispose();
        renderer.dispose();
      }
    };
  },

  apply(instance, args) {
    instance.setListening(args.listening);
    instance.loop.renderOnce();
  },

  readout({ state }) {
    const fmt = (value, digits = 0) =>
      value == null || Number.isNaN(value) ? '—' : Number(value).toFixed(digits);

    return [
      ['监听启用', state.listening ? '是' : '否'],
      ['最近事件', state.lastEvent],
      ['按下', state.pressed ? '是' : '否'],
      ['clientX / clientY', `${fmt(state.clientX)} / ${fmt(state.clientY)}`],
      ['局部 X / Y', `${fmt(state.localX, 1)} / ${fmt(state.localY, 1)}`],
      ['NDC x / y', `${fmt(state.ndcX, 3)} / ${fmt(state.ndcY, 3)}`]
    ];
  }
};
