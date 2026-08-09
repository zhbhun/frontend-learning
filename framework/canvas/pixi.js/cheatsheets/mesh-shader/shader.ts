/**
 * 范例介绍：演示用 Geometry + 自定义 GLSL Shader 组成 Mesh，在片元级生成动态图案。
 *
 * 演示内容：一个铺满裁剪空间的全屏四边形，fragment shader 用 uTime 驱动画色，
 *           uColor / uFrequency / uSpeed 实时影响图案。
 * 输入：色相 hue（0–360）、频率 frequency、速度 speed。
 * 主要操作：update() 把 hue 转成 RGB 写入 UniformGroup，并同步 frequency、speed；
 *           Ticker 每帧累加 uTime。
 * 预期结果：
 *   - 调「色相」→ 整体色调随之偏移。
 *   - 调「频率」→ 波纹密度变疏变密。
 *   - 调「速度」→ 图案流动加快 / 减慢。
 *   - uTime 持续增长（readout 可见）。
 *
 * 关键边界（正文重点）：顶点直接写在裁剪空间（NDC -1..1），vertex shader 原样输出 gl_Position，
 *   所以 Mesh 的 position / scale / rotation 对这个图案无效——这正是自定义 Shader 的特点
 *   （Shader.from 不注入投影 / 变换矩阵，顶点如何落到屏幕完全由你的 GLSL 决定）。
 *   示例只写了 gl（WebGL）程序，故 init 指定 preference: 'webgl'；要同时支持 WebGPU，
 *   需在 Shader.from 里补 gpu 的 WGSL 源。
 *
 * 阅读主线：先看 buildShader（UniformGroup + GLSL + Shader.from），再看 buildMesh（NDC 四边形），
 *   对照 update 的 uniform 热更新与 dispose 的释放 / 离屏暂停。
 */
import {
  Application,
  Mesh,
  MeshGeometry,
  Shader,
  UniformGroup,
} from 'pixi.js';

export interface ShaderDemoArgs {
  hue: number;
  frequency: number;
  speed: number;
}

export interface ShaderDemoSnapshot {
  hue: number;
  frequency: number;
  speed: number;
  uTime: string;
}

export interface ShaderDemoInstance {
  update(args: ShaderDemoArgs): void;
  dispose(): void;
}

// 顶点直接用裁剪空间坐标（NDC -1..1），vertex shader 原样输出 gl_Position。
// 自定义 Shader.from 不注入投影 / 变换矩阵，顶点如何落到屏幕完全由这段 GLSL 决定。
const vertexSrc = `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vUV = aUV;
}
`;

// uColor 为基色，uFrequency 控制波纹密度，uSpeed 控制流动速度，uTime 每帧累加。
// PixiJS 会自动注入默认精度，这里显式声明 mediump 与官方示例保持一致。
const fragmentSrc = `
precision mediump float;
in vec2 vUV;
uniform float uTime;
uniform vec3 uColor;
uniform float uFrequency;
uniform float uSpeed;
void main() {
  vec2 p = vUV * 2.0 - 1.0;             // 中心化到 -1..1
  float t = uTime * uSpeed;
  // 等离子：几个正弦叠加，再叠加一个径向分量
  float v = sin(p.x * uFrequency + t);
  v += sin((p.y * uFrequency + t) * 0.5);
  v += sin((p.x + p.y) * uFrequency - t);
  v += sin(length(p) * uFrequency * 2.0 - t * 1.5);
  v *= 0.25;                            // 归回 -1..1 附近
  vec3 col = uColor + vec3(v);
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

// HSV(h, 1, 1) → RGB，用色相控件驱动 uColor。
function hueToRgb(h: number): Float32Array {
  const out = new Float32Array(3);
  const hp = (((h % 360) + 360) % 360) / 60;
  const f = hp - Math.floor(hp);
  const q = 1 - f;
  const tt = f;
  switch (Math.floor(hp) % 6) {
    case 0: out[0] = 1; out[1] = tt; out[2] = 0; break;
    case 1: out[0] = q; out[1] = 1; out[2] = 0; break;
    case 2: out[0] = 0; out[1] = 1; out[2] = tt; break;
    case 3: out[0] = 0; out[1] = q; out[2] = 1; break;
    case 4: out[0] = tt; out[1] = 0; out[2] = 1; break;
    default: out[0] = 1; out[1] = 0; out[2] = q; break;
  }
  return out;
}

export function createShaderDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ShaderDemoSnapshot) => void,
): ShaderDemoInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: ShaderDemoArgs = { hue: 200, frequency: 6, speed: 0.8 };
  let mesh: Mesh | null = null;
  let globals: UniformGroup | null = null;

  // uniforms 必须声明 { value, type }；type 用 WGSL 风格（f32 / vec3<f32>）。
  // 持有 globals 引用，每帧直接改 globals.uniforms.xxx 即可生效（shader.resources 引用同一对象）。
  function buildShader(): Shader {
    globals = new UniformGroup({
      uTime: { value: 0, type: 'f32' },
      uColor: { value: hueToRgb(current.hue), type: 'vec3<f32>' },
      uFrequency: { value: current.frequency, type: 'f32' },
      uSpeed: { value: current.speed, type: 'f32' },
    });
    return Shader.from({
      gl: { vertex: vertexSrc, fragment: fragmentSrc },
      resources: { globals },
    });
  }

  // 全屏 NDC 四边形：positions 直接是裁剪空间坐标，覆盖整个画布。
  function buildMesh(): Mesh {
    const geometry = new MeshGeometry({
      positions: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
    const shader = buildShader();
    return new Mesh({ geometry, shader });
  }

  function applyArgs(args: ShaderDemoArgs) {
    current = args;
    if (globals) {
      globals.uniforms.uColor = hueToRgb(args.hue);
      globals.uniforms.uFrequency = args.frequency;
      globals.uniforms.uSpeed = args.speed;
    }
  }

  const initPromise = app.init({
    canvas,
    background: '#0f1220',
    preference: 'webgl', // 只写了 gl（WebGL）程序，故指定 WebGL 后端
    resizeTo: canvas.parentElement ?? window,
  });

  initPromise
    .then(() => {
      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }
      ready = true;

      mesh = buildMesh();
      app.stage.addChild(mesh);

      let elapsed = 0;
      app.ticker.add((ticker) => {
        elapsed += ticker.deltaMS / 1000;
        if (globals) {
          // 每帧更新 uTime，驱动 fragment 里的图案流动。
          globals.uniforms.uTime = elapsed;
        }
        emit({
          hue: current.hue,
          frequency: current.frequency,
          speed: current.speed,
          uTime: elapsed.toFixed(2),
        });
      });
    })
    .catch(() => {
      // 渲染器初始化失败时画布保持空白。
    });

  // 离屏时暂停渲染循环以省 GPU。
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!ready) {
        return;
      }
      const visible = entries.at(-1)?.isIntersecting ?? false;
      if (visible) {
        app.start();
      } else {
        app.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas.parentElement ?? canvas);

  return {
    update(args) {
      applyArgs(args);
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      if (ready) {
        app.destroy(true, { children: true });
      } else {
        initPromise.then(() => app.destroy(true, { children: true }));
      }
    },
  };
}
