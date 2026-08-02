/*
演示 RectAreaLight 的矩形尺寸与朝向怎样改变面光源的高光分布，以及使用前必须初始化
LTC uniforms 这一隐蔽步骤。

输入是 width、height 与 intensity。RectAreaLight 只对 PBR 材质生效，且发光面朝向由
lookAt() 决定。构造前必须调用 RectAreaLightUniformsLib.init()，否则光照几乎不显现。
主要对象：
- light：RectAreaLight，挂在雕塑斜前方，用 lookAt() 对准雕塑。
- lightFrame：与 light 同位置同朝向的线框矩形，用于对照发光面与高光位置。
预期结果：增大 width / height，高光面积和照亮范围都扩大；改 intensity 调整整体亮度。
读代码先看顶部 RectAreaLightUniformsLib.init() 的调用，再看 light.lookAt(statue)。
*/

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

// WebGLRenderer 使用 RectAreaLight 前必须初始化一次 LTC uniforms，否则光源几乎不亮。
// 这是全局调用，整个页面只执行一次即可。
RectAreaLightUniformsLib.init();

export const rectAreaLightExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1f2429');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(5.5, 4, 7.5);
    camera.lookAt(0, 1.2, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    scene.add(new THREE.GridHelper(16, 16, '#5a6168', '#42484f'));

    // RectAreaLight 只影响 PBR 材质；这里用 MeshStandardMaterial 才能看出高光
    const statue = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.6, 0.22, 120, 18),
      new THREE.MeshStandardMaterial({ color: '#e8d8b5', roughness: 0.25, metalness: 0.35 })
    );
    statue.position.set(0, 1.3, 0);
    scene.add(statue);

    // RectAreaLight：默认面朝局部 -Z 方向，必须 lookAt 才能对准目标
    const light = new THREE.RectAreaLight('#fff3d6', 6, 3, 3);
    light.position.set(2.4, 3.2, 2.8);
    light.lookAt(statue.position);
    scene.add(light);

    // 线框矩形可视化发光面位置与朝向，便于对照高光位置
    const lightFrame = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: '#ffd070', side: THREE.DoubleSide, wireframe: true })
    );
    scene.add(lightFrame);

    // 弱环境光避免非受光区域完全死黑
    scene.add(new THREE.HemisphereLight('#5a6677', '#2a2d33', 0.18));

    function tick(delta) {
      statue.rotation.y += delta * 0.25;

      // 线框矩形跟随 light 的位置、尺寸与朝向
      lightFrame.position.copy(light.position);
      lightFrame.scale.set(light.width, light.height, 1);
      lightFrame.quaternion.copy(light.quaternion);

      renderer.render(scene, camera);
      emitSnapshot({ light });
    }

    const loop = createRenderLoop(canvas, tick);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { light, loop };
  },

  apply(instance, args) {
    const { light, loop } = instance;
    light.width = args.width;
    light.height = args.height;
    light.intensity = args.intensity;
    loop.renderOnce();
  },

  readout({ light }) {
    return [
      ['rect.width', light.width.toFixed(1)],
      ['rect.height', light.height.toFixed(1)],
      ['rect.intensity', light.intensity.toFixed(1)],
      ['light.position', formatVector(light.position)]
    ];
  }
};
