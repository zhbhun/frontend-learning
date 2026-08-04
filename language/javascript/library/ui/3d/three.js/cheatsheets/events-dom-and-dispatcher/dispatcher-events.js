/*
演示 EventDispatcher 一侧：Object3D 的 added / removed / childadded / childremoved，
以及应用自己 dispatch 的业务事件 selected。

输入是“挂载立方体”开关和画布上的 pointerdown；挂载时读写树上事件，点击画布时
对 Mesh 派发 { type: 'selected' }（本课不做 Raycaster 拾取，点击只是触发业务通知的入口）。
读文件先看 onChildLifecycle / onSelected，以及 apply() 里的 scene.add / remove。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const dispatcherEventsExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
    camera.position.set(3.8, 2.8, 5);
    camera.lookAt(0, 0.5, 0);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(1.6));
    scene.add(new THREE.HemisphereLight('#ffffff', '#78908a', 0.95));
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(4, 6, 3);
    scene.add(key);

    // 父级 Group：在它上面听 childadded / childremoved。
    const parent = new THREE.Group();
    parent.name = 'Parent';
    scene.add(parent);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 1.15, 1.15),
      new THREE.MeshStandardMaterial({
        color: '#2f8b72',
        roughness: 0.5,
        emissive: '#000000',
        emissiveIntensity: 0
      })
    );
    mesh.name = 'Cube';
    mesh.position.y = 0.58;

    const state = {
      childMounted: false,
      lastTreeEvent: '—',
      treeEventCount: 0,
      lastCustomEvent: '—',
      selectedCount: 0,
      flashRemaining: 0
    };

    function publish() {
      emitSnapshot({ state });
    }

    function noteTreeEvent(label) {
      state.treeEventCount += 1;
      state.lastTreeEvent = `${label} · #${state.treeEventCount}`;
      publish();
    }

    // Object3D 继承 EventDispatcher；这些是挂载/卸载时的内置通知。
    function onChildAdded(event) {
      noteTreeEvent(`childadded ← ${event.child?.name || event.child?.type}`);
    }

    function onChildRemoved(event) {
      noteTreeEvent(`childremoved ← ${event.child?.name || event.child?.type}`);
    }

    function onAdded() {
      noteTreeEvent('added（Cube）');
    }

    function onRemoved() {
      noteTreeEvent('removed（Cube）');
    }

    // 自定义业务事件：type 自己定，payload 挂在同一对象上。
    function onSelected(event) {
      state.selectedCount += 1;
      state.lastCustomEvent = `selected · source=${event.source} · #${state.selectedCount}`;
      state.flashRemaining = 0.45;
      mesh.material.emissive.set('#e8a317');
      mesh.material.emissiveIntensity = 0.7;
      publish();
    }

    parent.addEventListener('childadded', onChildAdded);
    parent.addEventListener('childremoved', onChildRemoved);
    mesh.addEventListener('added', onAdded);
    mesh.addEventListener('removed', onRemoved);
    mesh.addEventListener('selected', onSelected);

    function onPointerDown() {
      // 只在立方体已挂载时派发；证明“DOM 输入 → 应用决定 → dispatchEvent”，
      // 而不是 Mesh 自带 click。
      if (!state.childMounted) {
        state.lastCustomEvent = '未挂载，跳过 selected';
        publish();
        return;
      }
      mesh.dispatchEvent({ type: 'selected', source: 'canvas-pointerdown' });
    }

    canvas.addEventListener('pointerdown', onPointerDown);

    function frame(delta) {
      if (state.childMounted) {
        mesh.rotation.y += delta * 0.4;
      }
      if (state.flashRemaining > 0) {
        state.flashRemaining -= delta;
        if (state.flashRemaining <= 0) {
          state.flashRemaining = 0;
          mesh.material.emissive.set('#000000');
          mesh.material.emissiveIntensity = 0;
        }
      }
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
      parent,
      mesh,
      loop,
      setChildMounted(mounted) {
        if (mounted === state.childMounted) return;
        if (mounted) {
          parent.add(mesh);
        } else {
          parent.remove(mesh);
          state.flashRemaining = 0;
          mesh.material.emissive.set('#000000');
          mesh.material.emissiveIntensity = 0;
        }
        state.childMounted = mounted;
        publish();
      },
      dispose() {
        canvas.removeEventListener('pointerdown', onPointerDown);
        parent.removeEventListener('childadded', onChildAdded);
        parent.removeEventListener('childremoved', onChildRemoved);
        mesh.removeEventListener('added', onAdded);
        mesh.removeEventListener('removed', onRemoved);
        mesh.removeEventListener('selected', onSelected);
        loop.dispose();
        mesh.geometry.dispose();
        mesh.material.dispose();
        renderer.dispose();
      }
    };
  },

  apply(instance, args) {
    instance.setChildMounted(args.childMounted);
    instance.loop.renderOnce();
  },

  readout({ state }) {
    return [
      ['立方体已挂载', state.childMounted ? '是' : '否'],
      ['最近树事件', state.lastTreeEvent],
      ['树事件次数', String(state.treeEventCount)],
      ['最近业务事件', state.lastCustomEvent],
      ['selected 次数', String(state.selectedCount)]
    ];
  }
};
