/*
演示 tone mapping 如何把 HDR（线性值大于 1）的光照结果压回显示器能表达的 0~1。
- mode：renderer.toneMapping，No / ACES / AgX / Neutral 四档常用。
- exposure：renderer.toneMappingExposure，整体亮度的乘数。

关键点：
1. PBR + 环境贴图 + 强光会让某些片元的线性颜色远超 1（金属反射的亮点、自发光灯泡）。
   NoToneMapping 会把超过 1 的部分硬切成纯白；ACES/AgX/Neutral 用不同曲线柔和地滚降。
2. 改 renderer.toneMapping 不需要手动设 material.needsUpdate——渲染器发现参数变化会自己重编译。
3. exposure 是 uniform，改完下一帧立即生效，也不需要重编译。

输入：mode、exposure。
预期：把 mode 从 ACES 切到 No，灯泡和金属反射点会从柔和过渡变成硬切纯白；
      切到 AgX / Neutral 又是不同的色彩与对比风格。调 exposure 整体压暗或提亮。
读代码先看 create() 里 bulb 的 emissiveIntensity=4（制造 >1 的 HDR 源），
再看 apply() 怎么把 args 翻译成 renderer 的两个属性。
*/

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const TONE_MAPPINGS = {
  none: THREE.NoToneMapping,
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping
};

export const toneMappingExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#15171b');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(3.0, 2.0, 4.0);
    camera.lookAt(0, 0.75, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // 低粗糙度金属球：反射环境里的亮点会 > 1，是看 tone mapping 的主力
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 48, 32),
      new THREE.MeshStandardMaterial({
        color: '#e6e6e6',
        roughness: 0.15,
        metalness: 1.0
      })
    );
    ball.position.set(0, 0.8, 0);
    scene.add(ball);

    // 自发光“灯泡”：线性值远超 1，No 会硬切到纯白，ACES/AgX 柔和过渡
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 20, 14),
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#ffffff',
        emissiveIntensity: 4.0
      })
    );
    bulb.position.set(-1.5, 1.25, 0.6);
    scene.add(bulb);

    scene.add(new THREE.GridHelper(12, 12, '#5a6168', '#2c3036'));

    const key = new THREE.DirectionalLight('#fff3d6', 1.0);
    key.position.set(4, 6, 4);
    scene.add(key);

    const state = { mode: 'aces', exposure: 1.0 };

    function frame(delta) {
      ball.rotation.y += delta * 0.2;
      renderer.render(scene, camera);
      emitSnapshot({ renderer, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { renderer, state, loop };
  },

  apply(instance, args) {
    const { renderer, state, loop } = instance;
    state.mode = args.mode;
    state.exposure = args.exposure;
    renderer.toneMapping = TONE_MAPPINGS[args.mode];
    renderer.toneMappingExposure = args.exposure;
    loop.renderOnce();
  },

  readout({ state }) {
    const labels = {
      none: 'NoToneMapping（>1 硬切白）',
      aces: 'ACESFilmic（电影感）',
      agx: 'AgX（现代、中性）',
      neutral: 'Neutral（中性、忠实）'
    };
    return [
      ['renderer.toneMapping', labels[state.mode]],
      ['toneMappingExposure', state.exposure.toFixed(2)],
      ['HDR 源', '灯泡 emissiveIntensity=4 + 金属反射亮点（线性 > 1）']
    ];
  }
};
