import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { enableViewportAwarePlaneHandles } from '../viewport-aware-transform-controls.js';
import {
  createBaseScene,
  createCamera,
  createRenderer,
  createTransformableMesh,
  disposeObjectTree,
  formatEulerDegrees,
  formatVector3,
  keepTransformControlsVisible,
  startRenderLoop
} from '../shared-stage.js';

/*
 * 本示例演示单个 Object3D 的 TransformControls：attach/detach、三种 mode、
 * world/local、三类 snap、gizmo 尺寸和轴显示。
 * 阅读主线：先看 controls、mesh、helper 的创建关系，再看 dragging-changed
 * 如何暂停 OrbitControls，最后看返回的方法怎样写回 TransformControls API。
 * 页面控件对应：模式 -> setMode，空间 -> setSpace，吸附 -> 三个 set*Snap，
 * gizmo 尺寸 -> setSize，X/Y/Z -> showX/showY/showZ。
 * 预期观察：拖动 gizmo 直接改变 mesh 的 position、rotation 或 scale；
 * local 轴会跟随盒子朝向，world 轴保持场景方向，启用 snap 后变化按步长跳动。
 */
export function createTransformControlsLesson(canvas, onSnapshot) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const mesh = createTransformableMesh();
  scene.add(mesh);

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.target.set(0, 0.15, 0);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.08;
  orbitControls.update();

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.attach(mesh);

  // 新版 TransformControls 本身不是要加入 scene 的 gizmo；可视对象由 getHelper() 提供。
  const helper = transformControls.getHelper();
  keepTransformControlsVisible(helper);
  const disableViewportAware = enableViewportAwarePlaneHandles(transformControls);
  scene.add(helper);

  const snapState = {
    enabled: false,
    translation: 0.5,
    rotationDegrees: 15,
    scale: 0.25
  };

  function publishSnapshot() {
    // r185 的 scale gizmo 始终按 local 轴计算，即使 space 属性仍保存为 world。
    const effectiveSpace = transformControls.mode === 'scale' ? 'local' : transformControls.space;

    onSnapshot?.({
      attached: transformControls.object === mesh,
      dragging: transformControls.dragging,
      mode: transformControls.mode,
      space: transformControls.space,
      effectiveSpace,
      spaceLocked: transformControls.mode === 'scale',
      position: formatVector3(mesh.position),
      rotation: formatEulerDegrees(mesh.rotation),
      scale: formatVector3(mesh.scale)
    });
  }

  function handleDraggingChanged(event) {
    // 两个 controls 监听同一个 canvas；操作对象时暂停相机，结束后恢复。
    orbitControls.enabled = !event.value;
    publishSnapshot();
  }

  function syncSnap() {
    transformControls.setTranslationSnap(snapState.enabled ? snapState.translation : null);
    transformControls.setRotationSnap(
      snapState.enabled ? THREE.MathUtils.degToRad(snapState.rotationDegrees) : null
    );
    transformControls.setScaleSnap(snapState.enabled ? snapState.scale : null);
  }

  transformControls.addEventListener('dragging-changed', handleDraggingChanged);
  transformControls.addEventListener('objectChange', publishSnapshot);

  const stop = startRenderLoop(renderer, scene, camera, canvas, () => {
    orbitControls.update();
  });

  syncSnap();
  publishSnapshot();

  return {
    setMode(mode) {
      transformControls.setMode(mode);
      publishSnapshot();
    },
    setSpace(space) {
      transformControls.setSpace(space);
      publishSnapshot();
    },
    setSnapEnabled(enabled) {
      snapState.enabled = enabled;
      syncSnap();
    },
    setTranslationSnap(value) {
      snapState.translation = value;
      syncSnap();
    },
    setRotationSnap(value) {
      snapState.rotationDegrees = value;
      syncSnap();
    },
    setScaleSnap(value) {
      snapState.scale = value;
      syncSnap();
    },
    setSize(value) {
      transformControls.setSize(value);
    },
    setAxisVisible(axis, visible) {
      if (axis === 'x') transformControls.showX = visible;
      if (axis === 'y') transformControls.showY = visible;
      if (axis === 'z') transformControls.showZ = visible;
    },
    toggleAttachment() {
      if (transformControls.object) {
        transformControls.detach();
      } else {
        transformControls.attach(mesh);
      }
      publishSnapshot();
    },
    resetObject() {
      mesh.position.set(0, -0.15, 0);
      mesh.rotation.set(0.12, 0.55, 0);
      mesh.scale.set(1, 1, 1);
      publishSnapshot();
    },
    dispose() {
      stop();
      transformControls.removeEventListener('dragging-changed', handleDraggingChanged);
      transformControls.removeEventListener('objectChange', publishSnapshot);
      transformControls.detach();
      scene.remove(helper);
      disableViewportAware();
      transformControls.dispose();
      orbitControls.dispose();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
