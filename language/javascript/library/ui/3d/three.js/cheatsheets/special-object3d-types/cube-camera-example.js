/*
演示 CubeCamera 把场景向 6 个面渲染到立方环境贴图，再让金属球反射出动态环境。

输入是"是否每帧调用 CubeCamera.update"、反射体金属度（决定反射强度）和环绕物体的公转
速度。反射体是 metalness=1 的球体，envMap 指向 WebGLCubeRenderTarget.texture；环绕的有色
方块作为反射参照，让"反射是否在刷新"在视觉上可见。每帧先 hide 反射体、调用
cubeCamera.update(renderer, scene) 把 6 面烘焙进 cube target，再 show 反射体、渲染主场景。
关闭 update 时 envMap 不再刷新，反射会冻结在上一帧画面，主场景却继续动——这是 CubeCamera
最常见的"隐蔽生效步骤"坑。读文件时先看 buildScene() 与 frame()。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

// 立方环境贴图：256 像素见方、6 面、开启 mipmap 以便远处表面也能取到清晰反射。
const CUBE_SIZE = 256;
const ORBIT_RADIUS = 2.4;
const REFLECTOR_RADIUS = 0.8;

function buildOrbitingBoxes() {
  // 环绕的有色方块作为反射参照物：颜色明显、体积适中，便于在金属球表面识别它们的倒影。
  const colors = ['#d17832', '#2f8b72', '#8f5ac7', '#c24a4a'];
  const boxGeo = new THREE.BoxGeometry(0.42, 0.66, 0.42);
  const group = new THREE.Group();
  for (let i = 0; i < colors.length; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: colors[i],
      roughness: 0.45,
      metalness: 0.05
    });
    const box = new THREE.Mesh(boxGeo, material);
    // 用 phase 把四个方块均匀分布在圆周上，height 让上下也错开，反射不会聚成一条线。
    box.userData.phase = (i / colors.length) * Math.PI * 2;
    box.userData.height = 0.55 + (i % 2) * 0.45;
    group.add(box);
  }
  return group;
}

export const cubeCameraExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    camera.position.set(4.5, 3.2, 5.5);
    camera.lookAt(0, 0.6, 0);

    scene.add(new THREE.GridHelper(14, 14, '#8ba096', '#d3ded7'));

    // WebGLCubeRenderTarget：内部维护 6 张同一尺寸的 2D 贴图，作为 cube map 的存储。
    const cubeTarget = new THREE.WebGLCubeRenderTarget(CUBE_SIZE, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter
    });

    // CubeCamera 自身是 Object3D（不是 Camera），构造时给定 near/far 与 target。
    // 它在 update() 时把子层 6 台 PerspectiveCamera（fov=-90，分别朝 ±X/±Y/±Z）依次渲染进 target。
    const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeTarget);
    cubeCamera.position.set(0, REFLECTOR_RADIUS, 0);
    scene.add(cubeCamera);

    // 反射体：高金属度、低粗糙度，envMap 取 cube target 的贴图，表面几乎纯镜面。
    const sphereGeo = new THREE.IcosahedronGeometry(REFLECTOR_RADIUS, 6);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: '#f2f2f2',
      metalness: 1.0,
      roughness: 0.08,
      envMap: cubeTarget.texture
    });
    const reflectiveSphere = new THREE.Mesh(sphereGeo, sphereMat);
    reflectiveSphere.position.copy(cubeCamera.position);
    scene.add(reflectiveSphere);

    const orbitGroup = buildOrbitingBoxes();
    scene.add(orbitGroup);

    scene.add(new THREE.HemisphereLight('#ffffff', '#78908a', 0.6));
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(5, 8, 6);
    scene.add(key);

    const state = {
      updateCubeCamera: true,
      metalness: 1.0,
      orbitSpeed: 0.4,
      orbitPhase: 0,
      cubeUpdated: false
    };

    function frame(delta) {
      state.orbitPhase += delta * state.orbitSpeed;
      // 环绕方块绕 Y 公转、高度做正弦起伏，让反射内容随时间变化。
      orbitGroup.children.forEach((box) => {
        const phase = box.userData.phase + state.orbitPhase;
        box.position.set(
          Math.cos(phase) * ORBIT_RADIUS,
          box.userData.height + Math.sin(phase * 1.7) * 0.15,
          Math.sin(phase) * ORBIT_RADIUS
        );
        box.rotation.y += delta * 0.6;
        box.rotation.x += delta * 0.3;
      });

      // 反射体缓慢自转，方便看出表面反射的方向感。
      reflectiveSphere.rotation.y += delta * 0.18;

      // 关键步骤：每帧把场景烘焙进 cube target，envMap 才能反映当前环绕方块的位置。
      // 关闭 toggle 后这步被跳过，反射会冻结在上一帧画面——但主场景继续渲染。
      state.cubeUpdated = false;
      if (state.updateCubeCamera) {
        // 标准做法是先隐藏反射体再 update，避免反射体本身出现在自己的反射里。
        // 凸球面其实可省略这一步，但保留它示范规范流程，便于读者套用到非凸物体。
        reflectiveSphere.visible = false;
        cubeCamera.update(renderer, scene);
        reflectiveSphere.visible = true;
        state.cubeUpdated = true;
      }

      renderer.render(scene, camera);
      emitSnapshot({ renderer, state });
    }

    // 进入循环前先烘焙一次，确保初次进入视口时反射就有内容，而不是空白。
    reflectiveSphere.visible = false;
    cubeCamera.update(renderer, scene);
    reflectiveSphere.visible = true;
    renderer.render(scene, camera);

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { reflectiveSphere, state, loop };
  },

  apply(instance, args) {
    const { reflectiveSphere, state, loop } = instance;
    state.updateCubeCamera = args.updateCubeCamera;
    state.metalness = args.metalness;
    state.orbitSpeed = args.orbitSpeed;
    // metalness 改变不需要重建材质，直接写属性；MeshStandardMaterial 会即时反映。
    reflectiveSphere.material.metalness = args.metalness;
    // 用一次单帧渲染让新的 metalness / toggle 立刻反映到画面，无需等动画循环。
    loop.renderOnce();
  },

  readout({ renderer, state }) {
    return [
      ['CubeCamera.update', state.cubeUpdated ? '每帧调用（6 面）' : '已暂停（反射冻结）'],
      ['CubeCamera 子相机', '6（PX/NX/PY/NY/PZ/NZ）'],
      ['主场景 draw calls', renderer.info.render.calls],
      ['本帧 triangles', renderer.info.render.triangles],
      ['envMap', `WebGLCubeRenderTarget ${CUBE_SIZE}×${CUBE_SIZE}`]
    ];
  }
};
