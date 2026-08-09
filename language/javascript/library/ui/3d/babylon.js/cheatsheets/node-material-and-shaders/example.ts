/**
 * 范例：用 ShaderMaterial 手写 GLSL 实现自定义着色——一个不受场景光照、
 * 由 uTime / uSpeed / uFrequency 三个 uniform 驱动的同心波纹球。
 * 输入：
 *   - speed：每秒时间倍率（每帧 setFloat 上传到 uniform uSpeed）。
 *   - frequency：波纹密度（每帧 setFloat 上传到 uniform uFrequency）。
 *   - colorPreset：色对预设 warm/cool/mono（每帧 setColor3 上传到 uColorA / uColorB）。
 * 主要操作：在 Effect.ShadersStore 注册 vertex / fragment 两段 GLSL，构造 ShaderMaterial
 *   并列出 attributes 与 uniforms；每帧把控件值通过 setFloat / setColor3 上传到 GPU。
 * 预期结果：球面出现从 UV 中心扩散、随时间流动的同心波纹；调 speed 波纹变快，
 *   调 frequency 波纹变密，切 colorPreset 两端换色；场景里没有任何光源——
 *   证明 ShaderMaterial 的颜色完全由 fragment shader 决定，不接入光照系统。
 * 阅读主线：先看 VERTEX_SHADER / FRAGMENT_SHADER 两段 GLSL，再看 ShaderMaterial 的
 *   attributes / uniforms 声明，最后看 onBeforeRenderObservable 里 setFloat / setColor3。
 */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  Effect,
  MeshBuilder,
  Scene,
  ShaderMaterial,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

// 色对预设：select 切换得到可复现的离散色对；readout 显示真实 RGB。
const COLOR_PRESETS: Record<string, { a: Color3; b: Color3; label: string }> = {
  warm: {
    a: new Color3(0.95, 0.35, 0.25),
    b: new Color3(1.0, 0.85, 0.4),
    label: '暖 warm',
  },
  cool: {
    a: new Color3(0.2, 0.55, 0.85),
    b: new Color3(0.45, 0.85, 0.75),
    label: '冷 cool',
  },
  mono: {
    a: new Color3(0.12, 0.13, 0.17),
    b: new Color3(0.9, 0.9, 0.92),
    label: '单色 mono',
  },
};

// vertex shader：标准 MVP 变换，把 uv 作为 varying 传给 fragment。
// worldViewProjection 是 Babylon 内置 uniform——只要在 uniforms 数组里列出，
// 引擎每帧自动绑定 mesh 的世界 × 视图 × 投影组合矩阵。
const VERTEX_SHADER = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main(void) {
  gl_Position = worldViewProjection * vec4(position, 1.0);
  vUV = uv;
}
`;

// fragment shader：从 UV 中心扩散的同心波纹，颜色在 uColorA / uColorB 之间按波形插值。
// uTime / uSpeed / uFrequency 是自定义 uniform，由 JS 每帧 setFloat 上传。
const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUV;
uniform float uTime;
uniform float uSpeed;
uniform float uFrequency;
uniform vec3 uColorA;
uniform vec3 uColorB;
void main(void) {
  float t = uTime * uSpeed;
  vec2 p = vUV - 0.5;
  float dist = length(p);
  float wave = sin((dist * uFrequency - t) * 6.2831853);
  wave = wave * 0.5 + 0.5; // 映射到 0..1
  vec3 color = mix(uColorA, uColorB, wave);
  gl_FragColor = vec4(color, 1.0);
}
`;

// 把两段 GLSL 注册进 Effect.ShadersStore；引用时传 { vertex: 'nmRipple', fragment: 'nmRipple' }，
// 引擎自动追加 VertexShader / FragmentShader 后缀去查表。
function registerShaders() {
  Effect.ShadersStore['nmRippleVertexShader'] = VERTEX_SHADER;
  Effect.ShadersStore['nmRippleFragmentShader'] = FRAGMENT_SHADER;
}

export interface ShaderPlaygroundOptions {
  speed: number;
  frequency: number;
  colorPreset: string;
}

export interface ShaderPlaygroundSnapshot {
  materialType: string;
  elapsed: number;
  speed: number;
  frequency: number;
  colorPreset: string;
  colorA: string;
  colorB: string;
}

export interface ShaderPlaygroundInstance {
  update(options: ShaderPlaygroundOptions): void;
  dispose(): void;
}

export function createShaderPlayground(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ShaderPlaygroundSnapshot) => void,
): ShaderPlaygroundInstance {
  let current: ShaderPlaygroundOptions = {
    speed: 1,
    frequency: 5,
    colorPreset: 'warm',
  };
  let material: ShaderMaterial;
  let elapsed = 0;

  registerShaders();

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    // 故意不创建任何光源——ShaderMaterial 默认不接入光照系统，
    // 颜色完全由 fragment shader 决定，与场景里有没有 Light 无关。
    scene.clearColor = new Color4(0.08, 0.09, 0.11, 1);

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2.2,
      4.2,
      Vector3.Zero(),
      scene,
    );
    camera.attachControl(canvas, true);

    // ShaderMaterial：第四参数列出 GLSL 里用到的 attributes 与 uniforms。
    // 内置 uniform（worldViewProjection）列出后引擎自动绑定 mesh 矩阵；
    // 自定义 uniform（uTime / uSpeed / uFrequency / uColorA / uColorB）由 setFloat / setColor3 上传。
    material = new ShaderMaterial(
      'ripple',
      scene,
      { vertex: 'nmRipple', fragment: 'nmRipple' },
      {
        attributes: ['position', 'uv'],
        uniforms: [
          'worldViewProjection',
          'uTime',
          'uSpeed',
          'uFrequency',
          'uColorA',
          'uColorB',
        ],
      },
    );

    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2, segments: 48 }, scene);
    sphere.material = material;

    // 每帧 scene.render() 之前：累加时间，把控件值通过 setFloat / setColor3 上传到 uniform。
    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      elapsed += dt;

      material.setFloat('uTime', elapsed);
      material.setFloat('uSpeed', current.speed);
      material.setFloat('uFrequency', current.frequency);
      const pair = COLOR_PRESETS[current.colorPreset] ?? COLOR_PRESETS.warm;
      material.setColor3('uColorA', pair.a);
      material.setColor3('uColorB', pair.b);

      emit({
        materialType: 'ShaderMaterial',
        elapsed,
        speed: current.speed,
        frequency: current.frequency,
        colorPreset: pair.label,
        colorA: `(${pair.a.r.toFixed(2)}, ${pair.a.g.toFixed(2)}, ${pair.a.b.toFixed(2)})`,
        colorB: `(${pair.b.r.toFixed(2)}, ${pair.b.g.toFixed(2)}, ${pair.b.b.toFixed(2)})`,
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
    },
    dispose() {
      runtime.dispose();
    },
  };
}
