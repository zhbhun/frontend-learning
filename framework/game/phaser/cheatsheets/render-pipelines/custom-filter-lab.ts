/**
 * 范例:自定义 Filter 最小闭环——一个自写的「扫描线」滤镜,走官方自定义
 * 滤镜路径:Filters.Controller 子类(参数载体)+ BaseFilterShader 子类
 * (渲染节点,fragment shader)→ addNodeConstructor 注册 → 加入
 * camera.filters 或 gameObject.filters 列表。
 * 输入(Controls):target(挂对象还是摄像机)、on(开关滤镜)、
 * intensity(扫描线强度)、lineDensity(扫描线密度)。
 * 主要操作:开关 on 观察滤镜挂载;拖 intensity / lineDensity 验证
 * Controller 属性热调(setupUniforms 每次渲染读取 controller)。
 * 预期结果:readout 展示渲染节点注册状态(hasNode)、滤镜实例的
 * renderNode 名与两个 uniform 的实际值;画面出现随密度变化的扫描线。
 * 阅读主线:SCANLINES_FRAG(滤镜 shader 契约:uMainSampler 输入)
 * → ScanlinesController / ScanlinesShader(两个子类)→ 注册与应用
 * → applyParams → report。
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

export interface CustomFilterParams {
  /** 滤镜挂载目标:object = 演示对象 filters;camera = 主摄像机 filters */
  target: 'object' | 'camera';
  /** 是否应用滤镜(移除/重新加入列表) */
  on: boolean;
  /** 扫描线强度 0–1 */
  intensity: number;
  /** 扫描线密度(每屏线数) */
  lineDensity: number;
}

export interface CustomFilterSnapshot {
  /** 渲染节点是否已注册(addNodeConstructor 之后 hasNode 为 true) */
  nodeRegistered: boolean;
  /** 当前挂载点 */
  holder: string;
  /** 滤镜实例的 renderNode 名(Controller 构造时传入) */
  renderNodeName: string;
  /** Controller 上的实际参数值(setupUniforms 每帧读取它们) */
  intensity: string;
  lineDensity: string;
  /** 挂载点滤镜列表长度 */
  listLength: number;
}

export interface CustomFilterInstance {
  applyParams(params: CustomFilterParams): void;
  dispose(): void;
}

/** 滤镜名:Controller 与 RenderNode 通过这个名字配对。 */
const FILTER_NODE_NAME = 'FilterScanlines';

/**
 * 滤镜 fragment 契约:uMainSampler 是上一步滤镜栈输出的纹理(单元 0,
 * BaseFilterShader 已绑定);outFragCoord / outTexCoord 由内置顶点着色器
 * SimpleTexture-vert 提供。滤镜只写 fragment,顶点由引擎合成。
 */
const SCANLINES_FRAG = `
#pragma phaserTemplate(shaderName)
precision mediump float;
uniform sampler2D uMainSampler;
uniform float intensity;
uniform float lineDensity;
varying vec2 outFragCoord;

void main () {
  vec4 pixel = texture2D(uMainSampler, outFragCoord);
  float lines = sin(outFragCoord.y * lineDensity * 3.14159);
  pixel.rgb *= 1.0 - intensity * 0.5 * (1.0 - lines);
  gl_FragColor = pixel;
}
`;

/**
 * Controller:滤镜的参数载体与用户 API。构造时用 renderNode 名与
 * 渲染节点配对;自定义属性在 setupUniforms 里被读取。
 */
class ScanlinesController extends Phaser.Filters.Controller {
  /** 扫描线强度 0–1 */
  intensity: number;
  /** 每屏扫描线数 */
  lineDensity: number;

  constructor(
    camera: Phaser.Cameras.Scene2D.Camera,
    intensity = 0.6,
    lineDensity = 120,
  ) {
    super(camera, FILTER_NODE_NAME);
    this.intensity = intensity;
    this.lineDensity = lineDensity;
  }
}

/**
 * 渲染节点:BaseFilterShader 子类负责编译 shader 并输出到新的
 * DrawingContext。setupUniforms 每次渲染执行,从 controller 读参数。
 */
class ScanlinesShader extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) {
    // super(name, manager, fragmentShaderKey, fragmentShaderSource, additions)
    super(FILTER_NODE_NAME, manager, undefined, SCANLINES_FRAG);
  }

  setupUniforms(
    controller: ScanlinesController,
    drawingContext: Phaser.Renderer.WebGL.DrawingContext,
  ): void {
    const programManager = this.programManager;
    programManager.setUniform('intensity', controller.intensity);
    programManager.setUniform('lineDensity', controller.lineDensity);
    void drawingContext;
  }
}

export function createCustomFilterLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CustomFilterSnapshot) => void,
): CustomFilterInstance {
  let suspender: LoopSuspender | null = null;
  let labScene: Phaser.Scene | null = null;
  let params: CustomFilterParams = {
    target: 'object',
    on: true,
    intensity: 0.6,
    lineDensity: 120,
  };
  let demo: Phaser.GameObjects.Image | null = null;
  let scanlines: ScanlinesController | null = null;
  let nodeRegistered = false;

  class CustomFilterScene extends Phaser.Scene {
    create() {
      labScene = this;
      // 演示贴图:亮色渐变横条,扫描线效果更明显
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      const colors = [0x66e2ff, 0x2b8bd8, 0xe7a34a, 0xe7edf7];
      for (let i = 0; i < 4; i++) {
        g.fillStyle(colors[i], 1);
        g.fillRect(i * 30, 0, 30, 180);
      }
      g.generateTexture('cf-bars', 120, 180);
      g.destroy();

      this.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'cf-bars')
        .setOrigin(0)
        .setAlpha(0.15);
      demo = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'cf-bars');
      this.add.image(110, 90, 'cf-bars').setScale(0.4).setAlpha(0.6);
      this.add
        .image(GAME_WIDTH - 110, GAME_HEIGHT - 90, 'cf-bars')
        .setScale(0.4)
        .setAlpha(0.6);

      this.add
        .text(
          12,
          10,
          '自定义滤镜:Controller(参数)+ BaseFilterShader(shader)→ addNodeConstructor 注册',
          LABEL_STYLE,
        )
        .setDepth(1);

      applyFilters();
      nodeRegistered = (
        this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer
      ).renderNodes.hasNode(FILTER_NODE_NAME);
    }

    update() {
      report();
    }
  }

  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    parent: undefined,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [CustomFilterScene],
  });
  suspender = createGameLoopSuspender(game, canvas);

  /** 按当前参数重建滤镜:先注册渲染节点(幂等),再挂到目标列表。 */
  function applyFilters() {
    if (!labScene || !demo) {
      return;
    }
    const renderer = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    if (!renderer.renderNodes.hasNode(FILTER_NODE_NAME)) {
      // 场景 create 阶段渲染器已启动,此处注册正合适
      renderer.renderNodes.addNodeConstructor(FILTER_NODE_NAME, ScanlinesShader);
    }
    nodeRegistered = renderer.renderNodes.hasNode(FILTER_NODE_NAME);

    const cam = labScene.cameras.main;
    cam.filters.internal.clear();
    cam.filters.external.clear();
    if (demo.filters) {
      demo.filters.internal.clear();
      demo.filters.external.clear();
    }
    scanlines = null;
    if (!params.on) {
      return;
    }

    if (params.target === 'camera') {
      scanlines = new ScanlinesController(
        cam,
        params.intensity,
        params.lineDensity,
      );
      cam.filters.internal.add(scanlines);
    } else {
      // 对象滤镜:Controller 需要传 filterCamera(对象专用滤镜摄像机)
      scanlines = new ScanlinesController(
        demo.enableFilters().filterCamera,
        params.intensity,
        params.lineDensity,
      );
      demo.filters!.internal.add(scanlines);
    }
  }

  function applyParams(next: CustomFilterParams) {
    const prev = params;
    params = next;
    if (prev.target !== next.target || prev.on !== next.on) {
      applyFilters();
      return;
    }
    // 热调:直接改 Controller 属性,setupUniforms 每帧读取
    if (scanlines) {
      scanlines.intensity = next.intensity;
      scanlines.lineDensity = next.lineDensity;
    }
  }

  function report() {
    if (!demo) {
      return;
    }
    emit({
      nodeRegistered,
      holder: !params.on
        ? '—(未挂载)'
        : params.target === 'camera'
          ? 'camera.filters.internal'
          : 'demo.filters.internal',
      renderNodeName: scanlines ? scanlines.renderNode : '—',
      intensity: scanlines ? scanlines.intensity.toFixed(2) : '—',
      lineDensity: scanlines ? String(scanlines.lineDensity) : '—',
      listLength: scanlines ? 1 : 0,
    });
  }

  return {
    applyParams,
    dispose() {
      suspender?.dispose();
      game.destroy(true);
    },
  };
}
