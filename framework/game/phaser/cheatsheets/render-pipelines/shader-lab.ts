/**
 * 范例:Shader 游戏对象实验台——用自定义 fragment shader 画一块独立四边形。
 * 输入(Controls):preset(plasma 纯程序化 / texmix 采样 iChannel0 贴图)、
 * speed(time uniform 的推进速度)。
 * 主要操作:切换 preset 重建 Shader 对象;拖 speed 观察 time uniform 变化
 * 如何驱动画面动画(setupUniforms 每次渲染都会执行)。
 * 预期结果:readout 展示 Shader 配置名、renderToTexture 状态、纹理数与
 * 当前 time 值;画面随 time 流动持续动画。Shader 是 Stand Alone Render:
 * 它会打断当前批处理,每个 Shader 一次 draw call。
 * 阅读主线:FRAGMENTS(两段最小 shader)→ createTextures → ShaderLabScene
 * (建 Shader 对象)→ applyParams(重建/热调)→ report。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  LABEL_STYLE,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

export interface ShaderParams {
  /** shader 预设:plasma = 纯程序化图案;texmix = 采样 iChannel0 贴图 */
  preset: 'plasma' | 'texmix';
  /** time uniform 的推进倍速 */
  speed: number;
}

export interface ShaderSnapshot {
  /** ShaderQuadConfig 的 name(渲染节点名,非全局唯一) */
  name: string;
  /** 是否渲染到独立纹理(默认 false = 直接画到画面) */
  renderToTexture: boolean;
  /** 传入的纹理数(texmix 用 1 张,plasma 为 0) */
  textureCount: number;
  /** 当前 time uniform 的值(setupUniforms 每帧写入) */
  time: string;
  /** speed 倍速 */
  speed: number;
}

export interface ShaderInstance {
  applyParams(params: ShaderParams): void;
  dispose(): void;
}

const CHIP_KEY = 'shader-chip';

/**
 * 纯程序化 fragment:只用 time 与 outTexCoord(默认顶点着色器提供的
 * 0–1 四边形内坐标),不采样任何纹理。
 */
const PLASMA_FRAG = `
precision mediump float;
uniform float time;
varying vec2 outTexCoord;

void main () {
  vec2 uv = outTexCoord;
  float v = sin(uv.x * 10.0 + time)
    + sin((uv.x + uv.y) * 8.0 - time * 1.3)
    + sin(uv.y * 12.0 + time * 0.7);
  v = v / 3.0;
  vec3 col = 0.5 + 0.5 * cos(v * 3.14159 + vec3(0.0, 2.1, 4.2) + time * 0.2);
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * 纹理采样 fragment:iChannel0 由构造参数 textures 指定,
 * initialUniforms 把它绑到纹理单元 0;uv 扭曲 + 亮度呼吸。
 */
const TEXMIX_FRAG = `
precision mediump float;
uniform sampler2D iChannel0;
uniform float time;
varying vec2 outTexCoord;

void main () {
  vec2 uv = outTexCoord;
  vec2 warp = uv + 0.05 * vec2(sin(uv.y * 20.0 + time), cos(uv.x * 20.0 - time));
  vec4 pixel = texture2D(iChannel0, warp);
  gl_FragColor = vec4(pixel.rgb * (0.75 + 0.25 * sin(time)), pixel.a);
}
`;

export function createShaderLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ShaderSnapshot) => void,
): ShaderInstance {
  let suspender: LoopSuspender | null = null;
  let labScene: Phaser.Scene | null = null;
  let shader: Phaser.GameObjects.Shader | null = null;
  /** setupUniforms 闭包读取的实时倍速(拖动 speed 即时生效) */
  const state = { speed: 1, time: 0 };

  class ShaderLabScene extends Phaser.Scene {
    create() {
      labScene = this;
      // 生成 texmix 采样的贴图:同心圆纹样,扭曲后变化明显
      const chip = this.make.graphics({ x: 0, y: 0 }, false);
      chip.fillStyle(0x141a26, 1);
      chip.fillRect(0, 0, 160, 160);
      chip.lineStyle(4, 0x66e2ff, 1);
      for (let r = 8; r < 90; r += 16) {
        chip.strokeCircle(80, 80, r);
      }
      chip.lineStyle(4, 0xe7a34a, 1);
      chip.strokeRect(8, 8, 144, 144);
      chip.generateTexture(CHIP_KEY, 160, 160);
      chip.destroy();

      this.add
        .text(
          12,
          10,
          'Shader = Stand Alone Render:打断批处理,每个对象一次 draw call',
          LABEL_STYLE,
        )
        .setDepth(1);
      // 参照物:普通 Image,验证 Shader 不影响其他对象
      this.add.image(GAME_WIDTH - 60, 60, CHIP_KEY).setScale(0.3).setAlpha(0.7);
      this.add.image(60, GAME_HEIGHT - 60, CHIP_KEY).setScale(0.3).setAlpha(0.7);

      buildShader(this, 'plasma');
    }

    update() {
      report();
    }
  }

  function buildShader(scene: Phaser.Scene, preset: ShaderParams['preset']) {
    shader?.destroy();
    state.time = 0;
    const isTex = preset === 'texmix';
    shader = scene.add.shader(
      {
        name: `lab-${preset}`,
        fragmentSource: isTex ? TEXMIX_FRAG : PLASMA_FRAG,
        // setupUniforms 每次渲染执行:time 按倍速推进,写入 shader uniform
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          state.time += 0.016 * state.speed;
          setUniform('time', state.time);
        },
        ...(isTex ? { initialUniforms: { iChannel0: 0 } } : {}),
      },
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      320,
      270,
      isTex ? [CHIP_KEY] : [],
    );
  }

  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    parent: undefined,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [ShaderLabScene],
  });
  suspender = createGameLoopSuspender(game, canvas);

  function report() {
    if (!shader) {
      return;
    }
    emit({
      name: shader.renderNode.name,
      renderToTexture: shader.renderToTexture,
      textureCount: shader.textures.length,
      time: state.time.toFixed(2),
      speed: state.speed,
    });
  }

  return {
    applyParams(next: ShaderParams) {
      state.speed = next.speed;
      if (labScene && shader && shader.renderNode.name !== `lab-${next.preset}`) {
        buildShader(labScene, next.preset);
      }
    },
    dispose() {
      suspender?.dispose();
      game.destroy(true);
    },
  };
}
