/*
演示 SkinnedMesh 如何用骨骼层级驱动顶点变形（蒙皮）。

输入是 elbow 旋转角度与权重模式。圆柱沿 Y 轴放置，骨骼由两根 Bone 组成：
root 钉在圆柱底部（y=-2），elbow 作为 root 的子级位于圆柱中点（y=0）。
圆柱下半段顶点完全归属 root，上半段完全归属 elbow；切换到"刚硬接缝"时这样做。
"平滑过渡"模式在 |y|<0.6 的过渡带用线性混合，旋转 elbow 时弯曲形态从折角变成圆弧。

读文件时先看 buildSkeleton() 的骨骼层级、buildGeometry() 的 skinIndex/skinWeight
写入逻辑，再看 apply() 怎样把 elbow 旋转写成 bone.rotation。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const HEIGHT = 4;
const HALF = HEIGHT / 2;
const RADIUS = 0.45;
const SEG_RADIUS = 18;
const SEG_HEIGHT = 28;
// 过渡带半宽：|y|<TRANSITION_HALF 的顶点在两根 bone 之间线性混合。
const TRANSITION_HALF = 0.6;

// 构造骨骼：root 在底部、elbow 在中点。返回 Skeleton 与 elbow Bone 引用。
function buildSkeleton() {
  const root = new THREE.Bone();
  root.position.y = -HALF; // 世界 y = -2（圆柱底部）
  root.name = 'root';

  const elbow = new THREE.Bone();
  // 相对父级位移 +2，世界位置 = -2 + 2 = 0（圆柱中点 = 关节）。
  elbow.position.y = HALF;
  elbow.name = 'elbow';
  root.add(elbow);

  // Skeleton 构造时若没有传入 boneInverses，会自动 calculateInverses()，
  // 把每根 bone 当前的世界矩阵取逆作为"绑定姿态"。所以这里建出来的姿态就是绑定姿态。
  return new THREE.Skeleton([root, elbow]);
}

// 在 CylinderGeometry 上写 skinIndex / skinWeight。
// CylinderGeometry 先生成侧面（行 0 在顶部 y=+HALF，到底部 y=-HALF），再生成顶/底盖，
// 但代码不依赖行号——直接读 position.y 判断当前顶点处于哪个高度。
function buildGeometry(weightMode) {
  const geometry = new THREE.CylinderGeometry(
    RADIUS,
    RADIUS,
    HEIGHT,
    SEG_RADIUS,
    SEG_HEIGHT,
    false
  );

  const position = geometry.attributes.position;
  const vertexCount = position.count;
  const skinIndices = new Float32Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);

  for (let i = 0; i < vertexCount; i++) {
    const y = position.getY(i);

    let rootWeight = 0;
    let elbowWeight = 0;

    if (weightMode === 'rigid') {
      // 刚硬接缝：y >= 0 完全归 elbow，y < 0 完全归 root；接缝处会形成尖角。
      if (y >= 0) {
        elbowWeight = 1;
      } else {
        rootWeight = 1;
      }
    } else {
      // 平滑过渡：在 |y| < TRANSITION_HALF 的带内做 root/elbow 的线性混合，
      // 旋转 elbow 时顶点会沿一段圆弧连续切线，避免硬折角。
      if (y <= -TRANSITION_HALF) {
        rootWeight = 1;
      } else if (y >= TRANSITION_HALF) {
        elbowWeight = 1;
      } else {
        const t = (y + TRANSITION_HALF) / (2 * TRANSITION_HALF);
        rootWeight = 1 - t;
        elbowWeight = t;
      }
    }

    // skinIndex 的 4 个分量指出本顶点受哪几根 bone 影响；这里只用前两根。
    skinIndices[i * 4 + 0] = 0; // root
    skinIndices[i * 4 + 1] = 1; // elbow
    skinIndices[i * 4 + 2] = 0;
    skinIndices[i * 4 + 3] = 0;

    // skinWeight 与 skinIndex 一一对应，权重和理想情况下为 1。
    skinWeights[i * 4 + 0] = rootWeight;
    skinWeights[i * 4 + 1] = elbowWeight;
    skinWeights[i * 4 + 2] = 0;
    skinWeights[i * 4 + 3] = 0;
  }

  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));
  return geometry;
}

export const skinnedExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 50);
    camera.position.set(4.6, 1.6, 5.8);
    camera.lookAt(0, 0, 0);

    const skeleton = buildSkeleton();
    const geometry = buildGeometry('smooth');
    const material = new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.38,
      metalness: 0.15
    });

    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.position.y = HALF; // 把圆柱抬到地面之上，底部贴 y=0
    // 必须把骨骼根挂进 SkinnedMesh 子级，骨骼才会随网格的世界矩阵一起更新。
    mesh.add(skeleton.bones[0]);
    // bind() 用当前 matrixWorld 作为 bindMatrix，并触发 skeleton.calculateInverses()。
    mesh.bind(skeleton);
    scene.add(mesh);

    // SkeletonHelper 自动从 mesh 递归收集 Bone，每帧通过 updateMatrixWorld 跟随。
    const skeletonHelper = new THREE.SkeletonHelper(mesh);
    skeletonHelper.material.linewidth = 2;
    scene.add(skeletonHelper);

    scene.add(new THREE.GridHelper(12, 12, '#8ba096', '#d3ded7'));
    const light = new THREE.DirectionalLight('#ffffff', 2.4);
    light.position.set(4, 7, 5);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.9), light);

    const state = {
      elbowDeg: 0,
      weightMode: 'smooth'
    };
    const elbowBone = skeleton.bones[1];

    function frame(delta) {
      mesh.rotation.y += delta * 0.25;
      renderer.render(scene, camera);
      emitSnapshot({ renderer, mesh, skeleton, state, elbowBone });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { mesh, skeleton, elbowBone, state, loop };
  },

  apply(instance, args) {
    const { mesh, elbowBone, state, loop } = instance;
    // bone 是普通 Object3D：rotation 写进 bone.rotation，renderer 在 updateMatrixWorld
    // 阶段会重算 bone.matrixWorld，再由 WebGLObjects 在 render 阶段调 skeleton.update()
    // 把每根 bone 的 matrixWorld × boneInverse 写进 boneTexture，供 vertex shader 蒙皮。
    elbowBone.rotation.x = THREE.MathUtils.degToRad(args.elbowDeg);
    state.elbowDeg = args.elbowDeg;

    if (state.weightMode !== args.weightMode) {
      // 切换权重模式必须重建 skinIndex/skinWeight attribute；几何形状本身不变。
      mesh.geometry.dispose();
      mesh.geometry = buildGeometry(args.weightMode);
      state.weightMode = args.weightMode;
    }

    loop.renderOnce();
  },

  readout({ renderer, mesh, skeleton, state }) {
    return [
      ['bone 数', skeleton.bones.length],
      ['boneInverses 数', skeleton.boneInverses.length],
      ['elbow.rotation.x', `${state.elbowDeg.toFixed(0)}°`],
      ['权重模式', state.weightMode === 'smooth' ? '平滑过渡' : '刚硬接缝'],
      ['bindMode', mesh.bindMode],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
