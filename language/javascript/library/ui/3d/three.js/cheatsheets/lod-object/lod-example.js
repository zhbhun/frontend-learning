/*
演示 LOD（Level of Detail）按相机距离切换不同细节层级。

输入是相机距离与 hysteresis。同一份材质下准备三档 IcosahedronGeometry，detail 越高
三角面越多；addLevel() 按"从近到远、细节由高到低"把它们登记进 LOD。autoUpdate 默认为
true，renderer.render() 在 projectObject 阶段会对 isLOD 对象自动调用 update(camera)；
update 用 LOD 与相机的世界距离（除以 camera.zoom）挑选当前 level，只把对应 object 的
visible 置 true，其它层全部 visible=false。读文件时先看 buildLod() 与 frame()。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const LOD_RADIUS = 0.85;

// 三档细节：detail 越高三角面越多；切换时几何形状一致，差异集中在面数。
// IcosahedronGeometry（无 index，每面独立顶点）：detail=5 约 720 三角形 / detail=1 约 80 / detail=0 共 20。
const LEVELS = [
  { detail: 5, distance: 0 },
  { detail: 1, distance: 4 },
  { detail: 0, distance: 8 }
];

function buildLod() {
  const lod = new THREE.LOD();

  // 三层共享同一份 material：外观一致，dispose 时也只释放一次。
  const material = new THREE.MeshStandardMaterial({
    color: '#3d73d9',
    roughness: 0.35,
    metalness: 0.15
  });

  LEVELS.forEach(({ detail, distance }) => {
    const geometry = new THREE.IcosahedronGeometry(LOD_RADIUS, detail);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.detail = detail;
    // addLevel 内部按 distance 升序插入，并把 mesh 同时挂为 LOD 的子级。
    lod.addLevel(mesh, distance);
  });

  return lod;
}

export const lodExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    // 相机与 LOD 中心同高，保证 args.cameraDistance === 实际世界距离，读数和阈值对得上。
    camera.position.set(0, LOD_RADIUS, 6);
    camera.lookAt(0, LOD_RADIUS, 0);

    const lod = buildLod();
    // LOD 中心放在地面之上一个半径的位置，球体底部正好贴着 y=0。
    lod.position.set(0, LOD_RADIUS, 0);
    scene.add(lod);

    scene.add(new THREE.GridHelper(14, 14, '#8ba096', '#d3ded7'));

    // 把 levels 上的距离阈值画成地面环，让"何时切换"在画面里可见。
    const ringGroup = new THREE.Group();
    LEVELS.filter((level) => level.distance > 0).forEach(({ distance }) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(distance - 0.03, distance + 0.03, 128),
        new THREE.MeshBasicMaterial({
          color: '#9a3f32',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.55
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      ringGroup.add(ring);
    });
    scene.add(ringGroup);

    const light = new THREE.DirectionalLight('#ffffff', 2.4);
    light.position.set(4, 7, 5);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.9), light);

    const worldLod = new THREE.Vector3();
    const worldCam = new THREE.Vector3();
    const state = { distance: 0, currentLevel: 0 };

    function frame(delta) {
      lod.rotation.y += delta * 0.25;
      // LOD.autoUpdate 默认 true：renderer.render() 内部 projectObject 遇到 isLOD
      // 会调用 update(camera)，按世界距离切换可见层级。这里不需要手动调用。
      renderer.render(scene, camera);

      lod.getWorldPosition(worldLod);
      camera.getWorldPosition(worldCam);
      state.distance = worldLod.distanceTo(worldCam);
      state.currentLevel = lod.getCurrentLevel();
      emitSnapshot({ renderer, lod, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { lod, camera, state, loop };
  },

  apply(instance, args) {
    const { lod, camera, state, loop } = instance;
    // 相机沿 +Z 推拉，Y 与 LOD 中心对齐；这样 slider 数值就是相机到 LOD 的世界距离。
    camera.position.set(0, LOD_RADIUS, args.cameraDistance);
    camera.lookAt(lod.position);
    camera.updateProjectionMatrix();

    // hysteresis 是该层 distance 的比例迟滞；统一写进每一层，阈值附近会形成死区。
    lod.levels.forEach((level) => {
      level.hysteresis = args.hysteresis;
    });

    state.hysteresis = args.hysteresis;
    loop.renderOnce();
  },

  readout({ renderer, lod, state }) {
    const activeLevel = lod.levels[state.currentLevel];
    const positionAttribute = activeLevel.object.geometry.getAttribute('position');
    const levelsSummary = lod.levels
      .map((level, index) => `L${index}:d=${level.distance},h=${level.hysteresis.toFixed(2)}`)
      .join('  ');
    return [
      ['当前 level', `${state.currentLevel} / ${lod.levels.length - 1}`],
      ['当前几何', `${activeLevel.object.geometry.type} (detail=${activeLevel.object.userData.detail})`],
      ['当前距离', state.distance.toFixed(2)],
      ['顶点数', positionAttribute.count],
      ['本帧三角形', renderer.info.render.triangles],
      ['levels 数组', levelsSummary]
    ];
  }
};
