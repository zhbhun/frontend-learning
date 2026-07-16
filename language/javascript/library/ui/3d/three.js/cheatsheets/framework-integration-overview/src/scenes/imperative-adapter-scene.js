/*
本示例演示如何把 vanilla three.js 场景包成框架组件可调用的 adapter。
读代码先看 mount() / update() / unmount()：mount 创建 renderer、scene、camera、loop、observer、listener 和资源；update 只改已有对象；unmount 反向清理。
页面控件对应状态：挂载/卸载对应组件生命周期，主题颜色、旋转速度、线框材质对应框架传入的 props。
预期观察：反复 update 不会创建新 renderer；卸载后 DOM canvas 消失，并显示 geometry/material 的释放数量。
*/

import * as THREE from 'three';
import {
  addReferenceGrid,
  addStudioLights,
  createCamera,
  createFrameworkMesh,
  createRenderer,
  createScene,
  disposeObjectTree,
  syncRendererSize
} from '../shared-stage.js';

const initialDisposed = {
  geometries: 0,
  materials: 0,
  textures: 0
};

export function createImperativeAdapter({ host, onSnapshot }) {
  const state = {
    props: {
      color: '#28747c',
      speed: 0.8,
      wireframe: false
    },
    mounted: false,
    propUpdates: 0,
    frames: 0,
    disposed: { ...initialDisposed },
    size: null,
    action: '初始化'
  };

  let instance = null;

  function mount(initialProps = {}) {
    if (instance) {
      state.action = 'mount() 跳过：adapter 已经拥有 renderer';
      publish();
      return;
    }

    state.props = { ...state.props, ...initialProps };

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', '框架 adapter three.js 画布');
    host.replaceChildren(canvas);

    const renderer = createRenderer(canvas);
    const camera = createCamera();
    const scene = createScene();
    const pivot = new THREE.Group();
    const mesh = createFrameworkMesh(state.props.color);

    addStudioLights(scene);
    addReferenceGrid(scene);
    pivot.add(mesh);
    scene.add(pivot);

    let frameId = 0;
    let lastTime = 0;
    let active = true;

    function handlePointerDown() {
      mesh.rotation.x += 0.42;
      state.action = 'pointerdown：直接修改已有 mesh 引用';
      publish();
    }

    function renderFrame(time) {
      if (!active) {
        return;
      }

      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;

      pivot.rotation.y += delta * state.props.speed;
      mesh.rotation.z += delta * state.props.speed * 0.4;
      state.size = syncRendererSize({ renderer, camera, element: host });
      renderer.render(scene, camera);
      state.frames += 1;

      if (state.frames % 12 === 0) {
        publish();
      }
    }

    function loop(time) {
      renderFrame(time);
      frameId = requestAnimationFrame(loop);
    }

    const resizeObserver = 'ResizeObserver' in window
      ? new ResizeObserver(() => renderFrame(performance.now()))
      : null;

    canvas.addEventListener('pointerdown', handlePointerDown);
    resizeObserver?.observe(host);

    instance = {
      camera,
      canvas,
      mesh,
      renderer,
      scene,
      resizeObserver,
      stop() {
        active = false;
        cancelAnimationFrame(frameId);
      },
      removeListeners() {
        canvas.removeEventListener('pointerdown', handlePointerDown);
      }
    };

    applyPropsToMesh(mesh, state.props);
    state.mounted = true;
    state.disposed = { ...initialDisposed };
    state.action = 'mount() 创建 renderer、scene、camera、loop 和资源';
    frameId = requestAnimationFrame(loop);
    publish();
  }

  function update(nextProps = {}) {
    state.props = { ...state.props, ...nextProps };

    if (!instance) {
      state.action = 'update() 暂存 props：等待下一次 mount 使用';
      publish();
      return;
    }

    applyPropsToMesh(instance.mesh, state.props);
    state.propUpdates += 1;
    state.action = 'update() 只修改 color / speed / wireframe';
    publish();
  }

  function unmount() {
    if (!instance) {
      state.action = 'unmount() 跳过：adapter 没有活动实例';
      publish();
      return;
    }

    instance.stop();
    instance.resizeObserver?.disconnect();
    instance.removeListeners();

    // remove canvas 只清 DOM；geometry、material、texture、renderer 要由 adapter 显式释放。
    state.disposed = disposeObjectTree(instance.scene);
    instance.renderer.dispose();
    host.replaceChildren();

    instance = null;
    state.mounted = false;
    state.size = null;
    state.action = 'unmount() 取消 loop、observer、listener 并 dispose';
    publish();
  }

  function publish() {
    onSnapshot?.({
      mounted: state.mounted,
      propUpdates: state.propUpdates,
      frames: state.frames,
      size: state.size,
      disposed: state.disposed,
      action: state.action
    });
  }

  publish();

  return {
    mount,
    update,
    unmount
  };
}

function applyPropsToMesh(mesh, props) {
  mesh.material.color.set(props.color);
  mesh.material.wireframe = props.wireframe;
  mesh.material.needsUpdate = true;
}
