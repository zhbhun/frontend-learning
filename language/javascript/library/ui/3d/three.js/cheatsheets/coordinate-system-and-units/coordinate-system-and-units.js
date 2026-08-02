/*
演示 three.js 的右手坐标系、世界单位与像素解耦、弧度使用、局部空间与世界空间。

输入：
- parentPositionX：parent Group 的局部 X（用来观察 child 局部值不变时世界位置怎样随父级移动）
- parentRotationY：parent Group 的 Y 轴旋转（度），用来观察父级旋转后同一局部位置在世界中的方向变化
- unitScale：标记组的整体 scale，演示“1 单位”在场景内部是相对尺度，不与屏幕像素绑定
- viewAngle：相机视角预设，帮助从不同方向观察三轴朝向

预期结果：
- 红 X / 绿 Y / 蓝 Z 三条轴始终满足右手坐标系；从 +Z 一侧看，+X 在右、+Y 在上
- 立方体局部 position 恒为 (2, 0, 0)；世界位置随父级 position / rotation 改变
- readout 同步显示局部值、世界值、矩阵平移与相机距离，便于把视觉变化归因到某条坐标轴

读代码先看 create() 中场景里的坐标参照物，再看 apply() 中父级变换和相机切换。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

// 三个视图预设。front 让相机坐在 +Z 上、朝 -Z 看，最容易看出右手坐标系；
// top 沿 -Y 俯视，能看到 XZ 平面；iso 给一个同时看到三轴的斜视角。
const VIEW_PRESETS = {
  front: { position: new THREE.Vector3(0, 1.6, 8), label: '前视（沿 -Z 看）' },
  top: { position: new THREE.Vector3(0, 9, 0.01), label: '俯视（沿 -Y 看）' },
  iso: { position: new THREE.Vector3(6.4, 5.2, 7.2), label: '斜视' }
};

// 弧度 ↔ 度数的几个常用对应，readout 里展示给读者做对照。
const RADIAN_LITERALS = [
  { deg: 30, rad: Math.PI / 6 },
  { deg: 45, rad: Math.PI / 4 },
  { deg: 90, rad: Math.PI / 2 },
  { deg: 180, rad: Math.PI }
];

const worldPosition = new THREE.Vector3();
const matrixPosition = new THREE.Vector3();

export const coordinateSystemExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.copy(VIEW_PRESETS.iso.position);
    camera.lookAt(0, 0.5, 0);

    // 地面网格放在 XZ 平面（y=0），用来直观感受“上方向是 +Y”。
    const grid = new THREE.GridHelper(10, 10, '#8ba096', '#cdd8d1');
    scene.add(grid);

    // 三轴标记： AxesHelper 三条轴的颜色固定为 X 红 / Y 绿 / Z 蓝。
    const worldAxes = new THREE.AxesHelper(2.4);
    scene.add(worldAxes);

    // 在 +X / +Y / +Z 三个方向各放一个小球，帮助从任意视角判断三轴朝向。
    const axisDotGeometry = new THREE.SphereGeometry(0.18, 20, 14);
    const axisDots = [
      {
        position: new THREE.Vector3(2, 0, 0),
        color: '#c23b3b',
        label: 'X+'
      },
      {
        position: new THREE.Vector3(0, 2, 0),
        color: '#3b8a4f',
        label: 'Y+'
      },
      {
        position: new THREE.Vector3(0, 0, 2),
        color: '#345fb0',
        label: 'Z+'
      }
    ].map(({ position, color }) => {
      const mesh = new THREE.Mesh(
        axisDotGeometry,
        new THREE.MeshStandardMaterial({ color, roughness: 0.45 })
      );
      mesh.position.copy(position);
      scene.add(mesh);
      return mesh;
    });

    // 原点标记：三个轴的交点。
    const origin = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 18, 12),
      new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.5 })
    );
    scene.add(origin);

    // 把测量组（标记 + 立方体 + 父级）放进一个可整体缩放的 rig，
    // 用来演示“1 单位”是场景内部的相对尺度，而非屏幕像素。
    const rig = new THREE.Group();
    scene.add(rig);

    const parent = new THREE.Group();
    rig.add(parent);

    // 给 parent 一个 AxesHelper，方便看到它的局部轴相对世界坐标的方向变化。
    const parentAxes = new THREE.AxesHelper(1.6);
    parent.add(parentAxes);

    const child = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.4 })
    );
    child.position.set(2, 0, 0);
    parent.add(child);

    // 一条从原点连到立方体当前位置的辅助线，让世界位置的移动更直观。
    const traceGeometry = new THREE.BufferGeometry();
    const traceMaterial = new THREE.LineBasicMaterial({ color: '#7d5321' });
    const trace = new THREE.Line(traceGeometry, traceMaterial);
    scene.add(trace);

    const tracePoints = [new THREE.Vector3(0, 0.02, 0), new THREE.Vector3()];

    const lights = [
      new THREE.HemisphereLight('#ffffff', '#7c8d83', 0.9),
      new THREE.DirectionalLight('#ffffff', 2.1)
    ];
    lights[1].position.set(4, 6, 5);
    scene.add(...lights);

    const state = {
      view: VIEW_PRESETS.iso,
      radianIndex: 1
    };

    function updateTrace() {
      child.getWorldPosition(tracePoints[1]);
      tracePoints[1].y = Math.max(0.02, tracePoints[1].y);
      traceGeometry.setFromPoints(tracePoints);
    }

    function frame() {
      renderer.render(scene, camera);
      child.getWorldPosition(worldPosition);
      matrixPosition.setFromMatrixPosition(child.matrixWorld);
      updateTrace();
      emitSnapshot({
        camera,
        child,
        parent,
        rig,
        worldPosition,
        matrixPosition,
        state
      });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { scene, camera, parent, rig, child, state, loop, resizeObserver };
  },

  apply(instance, args) {
    const { camera, parent, rig, state } = instance;

    parent.position.x = args.parentPositionX;
    parent.rotation.y = THREE.MathUtils.degToRad(args.parentRotationY);

    // rig 的 scale 同时缩放坐标参照物和立方体；相机不动时只是视觉大小改变，
    // 用来对照“世界单位不绑定屏幕像素，1 单位有多大由场景约定决定”。
    rig.scale.setScalar(args.unitScale);

    const preset = VIEW_PRESETS[args.viewAngle] ?? VIEW_PRESETS.iso;
    if (!preset.position.equals(camera.position)) {
      camera.position.copy(preset.position);
      camera.lookAt(0, 0.5, 0);
      state.view = preset;
    }

    instance.loop.renderOnce();
  },

  readout({ camera, child, parent, rig, worldPosition, matrixPosition, state }) {
    const sample = RADIAN_LITERALS[state.radianIndex] ?? RADIAN_LITERALS[1];

    return [
      ['右手坐标系', '+X 右、+Y 上、+Z 朝向观察者'],
      ['当前视图', state.view.label],
      ['相机位置', formatVector(camera.position)],
      ['rig.scale', formatVector(rig.scale)],
      ['child 局部 position', formatVector(child.position)],
      ['parent 局部 position', formatVector(parent.position)],
      ['parent.rotation.y', `${THREE.MathUtils.radToDeg(parent.rotation.y).toFixed(0)}°`],
      ['child 世界 position', formatVector(worldPosition)],
      ['matrixWorld 平移', formatVector(matrixPosition)],
      ['弧度示例', `${sample.deg}° = π × ${(sample.rad / Math.PI).toFixed(3)} ≈ ${sample.rad.toFixed(3)} rad`]
    ];
  }
};
