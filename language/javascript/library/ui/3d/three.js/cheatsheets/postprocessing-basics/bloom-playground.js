/*
本范例演示 EffectComposer 的最小 pass 链：RenderPass → UnrealBloomPass → OutputPass，
并说明为什么 OutputPass 是链尾必经的一环。

输入：
- bloomEnabled：是否启用 bloom pass（用 pass.enabled 切换，不破坏链路）。
- strength / radius / threshold：UnrealBloomPass 的三个核心参数。
- outputPassEnabled：是否启用 OutputPass。关闭后链尾变成 UnrealBloomPass，
  它把线性颜色直接画到屏幕，画面会过曝、偏色——这就是 OutputPass 的作用证据。

主要对象：
- composer：EffectComposer(renderer)，替代 renderer.render(scene, camera)。
- renderPass：RenderPass(scene, camera)，链路的第一步，把场景画到内部缓冲。
- bloomPass：UnrealBloomPass(resolution, strength, radius, threshold)，提取亮区并叠加光晕。
- outputPass：OutputPass()，做色调映射 + sRGB 颜色空间转换，链尾唯一出口。

预期结果：
- bloomEnabled 关闭时无光晕，画面回到普通 beauty 渲染；
- threshold 降低让更多区域进入 bloom；
- outputPassEnabled 关闭后画面明显过曝、颜色失真，因为缺少了色调映射与颜色空间转换。
读代码先看 buildComposer() 怎么排 pass 顺序，再看 syncPasses() 怎么按 args 切换 enabled。
*/

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const bloomPlaygroundExample = {
  create(canvas, emitSnapshot) {
    // 后处理需要色调映射参与；renderer.toneMapping 由 OutputPass 在链尾统一应用。
    // shared-scene 的 createRenderer 默认 NoToneMapping，这里改成 ACESFilmic。
    const renderer = createRenderer(canvas);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0e1116');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(3.6, 2.2, 5.0);
    camera.lookAt(0, 0.4, 0);

    // 三个亮度差异明显的物体，让 threshold 的变化可观察：
    // - 中心球：emissive 极亮，任何 threshold 下都会 bloom；
    // - 黄色方块：中等亮度，threshold 高时被排除、低时进入 bloom；
    // - 暗红圆环：基本不亮，几乎不参与 bloom。
    const brightSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 32, 24),
      new THREE.MeshStandardMaterial({
        color: '#0a0a0a',
        emissive: '#ffffff',
        emissiveIntensity: 2.2,
        roughness: 0.4
      })
    );
    brightSphere.position.set(0, 0.7, 0);
    scene.add(brightSphere);

    const midBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.85, 0.85),
      new THREE.MeshStandardMaterial({
        color: '#0a0a0a',
        emissive: '#f2c14e',
        emissiveIntensity: 0.6,
        roughness: 0.5
      })
    );
    midBox.position.set(-1.7, 0.55, 0.6);
    scene.add(midBox);

    const darkTorus = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.18, 16, 32),
      new THREE.MeshStandardMaterial({ color: '#3a1414', roughness: 0.7 })
    );
    darkTorus.position.set(1.7, 0.55, -0.4);
    scene.add(darkTorus);

    // 一点环境光，让非 emissive 部分（圆环）不是死黑。
    scene.add(new THREE.HemisphereLight('#9aa4b8', '#0a0c10', 0.35));

    // —— 后处理链路 ——
    function buildComposer() {
      const composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      // 初始分辨率只是 UnrealBloomPass 内部缓冲的起点；composer.setSize 会按真实尺寸更新。
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(1024, 1024),
        1.0, // strength
        0.4, // radius
        0.85 // threshold
      );
      const outputPass = new OutputPass();

      composer.addPass(renderPass);
      composer.addPass(bloomPass);
      composer.addPass(outputPass);

      return { composer, renderPass, bloomPass, outputPass };
    }

    const { composer, renderPass, bloomPass, outputPass } = buildComposer();

    const state = {
      bloomEnabled: true,
      outputPassEnabled: true,
      strength: 1.0,
      radius: 0.4,
      threshold: 0.85
    };

    function syncPasses() {
      bloomPass.enabled = state.bloomEnabled;
      bloomPass.strength = state.strength;
      bloomPass.radius = state.radius;
      bloomPass.threshold = state.threshold;
      outputPass.enabled = state.outputPassEnabled;
    }

    syncPasses();

    function frame(delta) {
      brightSphere.rotation.y += delta * 0.4;
      midBox.rotation.y += delta * 0.3;
      midBox.rotation.x += delta * 0.18;
      darkTorus.rotation.z += delta * 0.25;

      // 用 composer.render() 替代 renderer.render(scene, camera)。
      // EffectComposer 内部会按 passes 数组顺序执行，并把最后一个 enabled pass 画到屏幕。
      composer.render(delta);
      emitSnapshot({ state });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      // composer 自带 setPixelRatio + setSize；它会同步更新内部 read/write buffer 与所有 pass。
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { state, loop, syncPasses };
  },

  apply(instance, args) {
    const { state, loop, syncPasses } = instance;
    state.bloomEnabled = args.bloomEnabled;
    state.outputPassEnabled = args.outputPassEnabled;
    state.strength = args.strength;
    state.radius = args.radius;
    state.threshold = args.threshold;
    syncPasses();
    loop.renderOnce();
  },

  readout({ state }) {
    const chain = [
      'RenderPass',
      state.bloomEnabled ? 'UnrealBloomPass' : 'UnrealBloomPass（禁用）',
      state.outputPassEnabled ? 'OutputPass' : 'OutputPass（禁用）'
    ].join(' → ');
    const lastEnabled = state.outputPassEnabled
      ? 'OutputPass（色调映射 + sRGB）'
      : 'UnrealBloomPass（线性颜色直接画到屏幕，会过曝偏色）';
    return [
      ['Pass 链', chain],
      ['链尾实际出口', lastEnabled],
      ['bloom strength', state.strength.toFixed(2)],
      ['bloom radius', state.radius.toFixed(2)],
      ['bloom threshold', state.threshold.toFixed(2)]
    ];
  }
};
