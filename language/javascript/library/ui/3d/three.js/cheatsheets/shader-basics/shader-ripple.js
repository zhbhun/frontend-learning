/*
演示 ShaderMaterial 的最小可观察闭环：vertex shader 通过 varying 把 uv 传给 fragment，
fragment 用 uniform 时间和颜色画出随时间变化的波纹。读者在 Controls 改 uColorA / uColorB /
uFrequency / uAmplitude / animate，能立刻看到 uniform 实时影响片元输出。

读文件先看 create() 与 apply()：
- uniforms 是 JS 到 GPU 的通道，每项是 { value }；
- 每帧把 clock 累加的时间写入 uniforms.uTime.value 即驱动动画；
- 改 uniform 不需要 material.needsUpdate，因为 uniform 不是 shader 代码。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uFrequency;
uniform float uAmplitude;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec2 vUv;

void main() {
  // 以 UV 中心为原点的距离
  float d = distance(vUv, vec2(0.5));
  // 波纹相位：sin(d * 频率 - 时间 * 速度)，再映射到 0~1
  float wave = sin(d * uFrequency - uTime * 2.0) * 0.5 + 0.5;
  // 用振幅在 0.5~1.0 之间放大对比，让颜色变化更明显
  float t = mix(0.5, 1.0, wave * uAmplitude);
  vec3 color = mix(uColorA, uColorB, t);
  gl_FragColor = vec4(color, 1.0);
}
`;

export const shaderRippleExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0e1418');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 30);
    camera.position.set(0, 0, 4.5);
    camera.lookAt(0, 0, 0);

    // 单面 Plane；法线指向 +Z，相机在 +Z，正好看到正面。
    const geometry = new THREE.PlaneGeometry(2.2, 2.2, 1, 1);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime:      { value: 0 },
        uFrequency: { value: 16 },
        uAmplitude: { value: 0.85 },
        uColorA:    { value: new THREE.Color('#3d73d9') },
        uColorB:    { value: new THREE.Color('#f0a432') }
      }
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 把动画时间挂在 state 上，apply() 切换 animate 时立即生效。
    const state = { animate: true, time: 0 };

    function frame(delta) {
      if (state.animate) {
        state.time += delta;
        material.uniforms.uTime.value = state.time;
      }
      renderer.render(scene, camera);
      emitSnapshot({ renderer, material, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { mesh, material, state, loop };
  },

  apply(instance, args) {
    const { material, state, loop } = instance;
    // 永远改 .value；不要替换 uniforms.xxx 整个对象，否则 renderer 拿不到新引用。
    material.uniforms.uFrequency.value = args.frequency;
    material.uniforms.uAmplitude.value = args.amplitude;
    material.uniforms.uColorA.value.set(args.colorA);
    material.uniforms.uColorB.value.set(args.colorB);
    state.animate = args.animate;
    loop.renderOnce();
  },

  readout({ renderer, material, state }) {
    return [
      ['uTime', state.time.toFixed(2)],
      ['uFrequency', material.uniforms.uFrequency.value.toFixed(1)],
      ['uAmplitude', material.uniforms.uAmplitude.value.toFixed(2)],
      ['uniforms 数', Object.keys(material.uniforms).length],
      ['本帧 draw calls', renderer.info.render.calls]
    ];
  }
};
