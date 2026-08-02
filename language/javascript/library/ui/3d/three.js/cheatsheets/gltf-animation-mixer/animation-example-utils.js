/*
AnimationMixer 课范例共用的最小舞台与示例模型。

输入是 canvas、读取状态的函数和每帧回调；范例把 mixer.update(delta) 放在每帧回调里，
舞台负责 clamp delta、渲染并把当前状态推给读数面板。视口外自动暂停并保留最后一帧。

示例模型由 GLTFExporter 在内存里把一个手工构造的 Robot 对象连同三段 AnimationClip
导出成 GLB blob URL，再交给 GLTFLoader 加载——这样 gltf.animations 走的是真实
glTF 动画管线，而不是手工把 clip 挂回 three.js 对象。
*/

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize,
  disposeObjectTree
} from '../../assets/shared-scene.js';

// 创建带渲染循环的舞台。frame 回调每帧接收秒制 delta，先调它再渲染。
// delta 已经被 clamp 到 0.1s，避免卡顿后或从后台恢复时动画一次性跳很远。
export function createAnimationStage(canvas, readSnapshot, frame) {
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#edf3ef');

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(3.4, 2.0, 4.2);
  camera.lookAt(0, 1.0, 0);

  scene.add(new THREE.GridHelper(8, 8, '#8ba096', '#c7d3ca'));
  const hemi = new THREE.HemisphereLight('#ffffff', '#7c8a82', 1.0);
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(3, 5, 4);
  scene.add(hemi, key);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  let emitSnapshot = () => {};

  function wrappedFrame(delta) {
    // 防御性 clamp：createRenderLoop 恢复时第一帧 delta 已经是 0，
    // 这里再保险一次，避免任何异常大 delta 把动画推进一大截。
    const clamped = Math.min(delta, 0.1);
    if (frame) frame(clamped);
    renderer.render(scene, camera);
    emitSnapshot(readSnapshot());
  }

  const loop = createRenderLoop(canvas, wrappedFrame);

  createResizeObserver(canvas, () => {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    loop.renderOnce();
  });

  return {
    scene,
    sceneRoot,
    camera,
    renderer,
    loop,
    setSnapshotEmitter(next) {
      emitSnapshot = next;
    },
    renderOnce() {
      loop.renderOnce();
    },
    dispose() {
      loop.dispose();
      renderer.dispose();
    }
  };
}

/*
构造一个多关节的示例模型：Robot 下挂 Body，Body 下挂 Head、ArmL、ArmR。
Body 的几何居中，子级用相对位置摆放；手臂的几何把枢轴平移到顶端，
这样旋转 ArmR.rotation 才像从肩膀抬起，而不是绕手臂中心自转。
所有节点都带 name，方便 AnimationClip 的轨道按名引用，也方便 GLTFExporter 写出节点名。
*/
export function buildRobotModel() {
  const robot = new THREE.Group();
  robot.name = 'Robot';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#3d73d9',
    roughness: 0.45,
    metalness: 0.12
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: '#d17832',
    roughness: 0.5,
    metalness: 0.05
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#1c1c1c',
    roughness: 0.3
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.6), bodyMat);
  body.name = 'Body';
  body.position.y = 0.95;
  robot.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), accentMat);
  head.name = 'Head';
  head.position.set(0, 0.78, 0);
  body.add(head);

  // 手臂：box 几何向下平移半个高度，让原点落在肩膀处。
  const armGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);
  armGeo.translate(0, -0.35, 0);

  const armL = new THREE.Mesh(armGeo, accentMat);
  armL.name = 'ArmL';
  armL.position.set(-0.62, 0.35, 0);
  body.add(armL);

  const armR = new THREE.Mesh(armGeo.clone(), accentMat);
  armR.name = 'ArmR';
  armR.position.set(0.62, 0.35, 0);
  body.add(armR);

  const eyeGeo = new THREE.SphereGeometry(0.05, 12, 8);
  [-0.12, 0.12].forEach((x, index) => {
    const eye = new THREE.Mesh(eyeGeo, darkMat);
    eye.name = `Eye${index + 1}`;
    eye.position.set(x, 0.05, 0.3);
    head.add(eye);
  });

  return robot;
}

// 把欧拉角（度）转成四元数数组 [x, y, z, w]，用于 QuaternionKeyframeTrack 的 values。
function eulerToQuat(degX, degY, degZ) {
  const e = new THREE.Euler(
    THREE.MathUtils.degToRad(degX),
    THREE.MathUtils.degToRad(degY),
    THREE.MathUtils.degToRad(degZ),
    'XYZ'
  );
  const q = new THREE.Quaternion().setFromEuler(e);
  return [q.x, q.y, q.z, q.w];
}

function flatten(arrays) {
  return arrays.flat();
}

/*
构造三段 AnimationClip。轨道名格式为 "<nodeName>.<property>"，
PropertyBinding 会从 mixer 根开始递归按名查找节点，再绑定到它的 property。

- Idle：Body 与 Head 反向轻微摇摆（quaternion 轨道）。
- Wave：ArmR 抬到接近竖直并左右摆动（quaternion 轨道）。
- Jump：Body 上抬（position 轨道）并在落地瞬间纵向挤压（scale 轨道）。

三段 clip 覆盖了 glTF 动画最常见的三种轨道类型：quaternion / position / scale，
对应 three.js 的 QuaternionKeyframeTrack 与 VectorKeyframeTrack。
*/
export function buildAnimationClips() {
  const idleBody = new THREE.QuaternionKeyframeTrack(
    'Body.quaternion',
    [0, 1.2, 2.4],
    flatten([
      eulerToQuat(0, 6, 0),
      eulerToQuat(0, -6, 0),
      eulerToQuat(0, 6, 0)
    ])
  );
  const idleHead = new THREE.QuaternionKeyframeTrack(
    'Head.quaternion',
    [0, 1.2, 2.4],
    flatten([
      eulerToQuat(0, -4, 0),
      eulerToQuat(0, 4, 0),
      eulerToQuat(0, -4, 0)
    ])
  );
  const idleClip = new THREE.AnimationClip('Idle', 2.4, [idleBody, idleHead]);

  // ArmR 几何枢轴已在肩膀处：z=160° 表示手臂几乎指向上方。
  // 在 160°↔200° 之间循环，呈现举手挥动的效果。
  const waveArm = new THREE.QuaternionKeyframeTrack(
    'ArmR.quaternion',
    [0, 0.4, 0.8, 1.2, 1.6],
    flatten([
      eulerToQuat(0, 0, 160),
      eulerToQuat(0, 0, 200),
      eulerToQuat(0, 0, 160),
      eulerToQuat(0, 0, 200),
      eulerToQuat(0, 0, 160)
    ])
  );
  const waveClip = new THREE.AnimationClip('Wave', 1.6, [waveArm]);

  // Body.position 的关键帧起始值与 rest 姿态 (0, 0.95, 0) 对齐，避免播放瞬间瞬移。
  const jumpPos = new THREE.VectorKeyframeTrack(
    'Body.position',
    [0, 0.3, 0.6, 0.9, 1.2],
    [0, 0.95, 0, 0, 1.35, 0, 0, 1.6, 0, 0, 1.2, 0, 0, 0.95, 0]
  );
  // 落地瞬间纵向挤压：scale.y < 1 同时 scale.x/z 保持 1。
  const jumpScale = new THREE.VectorKeyframeTrack(
    'Body.scale',
    [0, 0.15, 0.6, 1.05, 1.2],
    [1, 1, 1, 1, 0.78, 1, 1, 1.15, 1, 1, 0.85, 1, 1, 1, 1]
  );
  const jumpClip = new THREE.AnimationClip('Jump', 1.2, [jumpPos, jumpScale]);

  return [idleClip, waveClip, jumpClip];
}

/*
用 GLTFExporter 把 Robot 对象和三段 clip 导出成单文件 GLB blob URL。
animations 选项会让导出器把 clip.tracks 写进 glTF 的 animations 数组，
并自动切换到 TRS 模式（只导出 position/quaternion/scale，不写 matrix）。
导出后立即释放源对象，避免内存里同时留两份资源。
*/
export async function makeAnimatedGlbUrl() {
  const robot = buildRobotModel();
  const clips = buildAnimationClips();

  const exporter = new GLTFExporter();
  const arrayBuffer = await exporter.parseAsync(robot, {
    binary: true,
    animations: clips
  });

  disposeObjectTree(robot);

  const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
  return URL.createObjectURL(blob);
}

// 把 object 的包围盒中心平移到原点正上方，底面贴 y=0。
export function placeOnGround(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());

  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
}

// 收集子树上的 geometry / material（含纹理），去重后返回。scene.remove 不会释放这些资源。
export function collectResources(object) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  object.traverse((child) => {
    if (child.geometry) {
      geometries.add(child.geometry);
    }

    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => materials.add(entry));
    } else if (material) {
      materials.add(material);
    }
  });

  materials.forEach((material) => {
    for (const value of Object.values(material)) {
      if (value && value.isTexture) {
        textures.add(value);
      }
    }
  });

  return { geometries, materials, textures };
}

export function disposeCollected({ geometries, materials, textures }) {
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}
