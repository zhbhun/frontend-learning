/**
 * 范例:内置特效(Filters)实验台——同一组滤镜(glow / blur / shadow)分别挂到
 * 摄像机(camera.filters)与单个对象(gameObject.enableFilters()),
 * 并可切换 internal / external 两个列表,对比「滤镜在对象变换前后」的差别。
 * 输入(Controls):target(挂摄像机还是对象)、scope(internal / external)、
 * effect(off / glow / blur / shadow)、strength(强度滑杆)、color(glow/shadow 颜色)、
 * rotate(演示对象是否旋转 45°)。
 * 主要操作:切换 effect 开关滤镜;拖 strength / 换 color 观察滤镜实例参数热更新;
 * 开 rotate 后给「对象 + blur」切 internal / external,观察模糊方向随之改变。
 * 预期结果:readout 展示两个列表里的滤镜实例(类名与关键参数)、
 * willRenderFilters 的结果、对象 filters 是否已启用;画面上滤镜即时生效。
 * 滤镜仅 WebGL 渲染器可用(Canvas 下列表为空、画面无变化)。
 * 阅读主线:createTextures → create(背景、演示对象、标签)→ applyParams
 * (重建 / 热调滤镜)→ report(readout 快照)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  HUD_STYLE,
  LABEL_STYLE,
  createGameLoopSuspender,
  hexColor,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即时生效,不重建场景。 */
export interface FxParams {
  /** 特效挂载目标:camera = 主摄像机 filters;object = 演示对象 enableFilters */
  target: 'camera' | 'object';
  /** 挂到哪个列表:internal(对象变换前)/ external(对象变换后) */
  scope: 'internal' | 'external';
  /** 当前特效:off 关闭;glow / blur / shadow 分别创建对应滤镜实例 */
  effect: 'off' | 'glow' | 'blur' | 'shadow';
  /** 强度:glow→outerStrength;blur→strength;shadow→intensity */
  strength: number;
  /** glow / shadow 的颜色,'#rrggbb' */
  color: string;
  /** 演示对象是否旋转 45°(用于观察 internal / external 的模糊方向差) */
  rotate: boolean;
}

/** readout 用的滤镜实例读数:类名 + 关键参数,全部来自真实滤镜对象。 */
export interface FilterInfo {
  scope: 'internal' | 'external';
  className: string;
  params: string;
}

export interface FxSnapshot {
  /** 渲染器类型:WebGL 或 Canvas(滤镜仅 WebGL 可用) */
  rendererType: string;
  /** 摄像机两个列表里的滤镜实例 */
  cameraFilters: FilterInfo[];
  /** 演示对象的 filters 是否已启用(enableFilters 之后才非空) */
  objectFiltersEnabled: boolean;
  /** 对象两个列表里的滤镜实例 */
  objectFilters: FilterInfo[];
  /** 对象 willRenderFilters():是否有激活滤镜会真正渲染 */
  willRender: boolean;
  /** 当前强度参数在各滤镜上的实际生效值 */
  appliedStrength: string;
  /** 演示对象角度(度) */
  angle: number;
}

export interface FxInstance {
  applyParams(params: FxParams): void;
  dispose(): void;
}

type FilterListLike = Phaser.GameObjects.Components.FilterList;

const CHIP_KEY = 'fx-chip';
const BG_KEY = 'fx-tile';

export function createFxLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FxSnapshot) => void,
): FxInstance {
  let suspender: LoopSuspender | null = null;
  let labScene: Phaser.Scene | null = null;
  let params: FxParams = {
    target: 'camera',
    scope: 'internal',
    effect: 'glow',
    strength: 4,
    color: '#66e2ff',
    rotate: false,
  };
  let demo: Phaser.GameObjects.Image | null = null;

  class FxScene extends Phaser.Scene {
    create() {
      labScene = this;
      createTextures(this);

      this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, BG_KEY).setOrigin(0);

      // 背景参照物:与演示对象同贴图,用于分辨「只滤镜一个对象」还是「滤镜整个画面」
      this.add.image(96, 96, CHIP_KEY).setScale(0.55).setAlpha(0.8);
      this.add.image(GAME_WIDTH - 96, 96, CHIP_KEY).setScale(0.55).setAlpha(0.8);
      this.add.image(96, GAME_HEIGHT - 76, CHIP_KEY).setScale(0.55).setAlpha(0.8);
      this.add
        .image(GAME_WIDTH - 96, GAME_HEIGHT - 76, CHIP_KEY)
        .setScale(0.55)
        .setAlpha(0.8);

      demo = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, CHIP_KEY);

      this.add
        .text(12, 10, 'target=camera 时四角参照物一起被滤镜', LABEL_STYLE)
        .setDepth(1);
      this.add
        .text(
          GAME_WIDTH - 12,
          GAME_HEIGHT - 22,
          'rotate + blur:internal 模糊随对象转,external 模糊保持水平',
          { ...HUD_STYLE, fontSize: '11px' },
        )
        .setOrigin(1, 0)
        .setDepth(1);

      // 初始建一次滤镜;后续 applyParams 按参数差异重建或热调
      rebuildFilters();
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
    scene: [FxScene],
  });
  suspender = createGameLoopSuspender(game, canvas);

  function createTextures(scene: Phaser.Scene) {
    // 演示对象贴图:圆角方块 + 内圈,自生成,无外部素材
    const chip = scene.make.graphics({ x: 0, y: 0 }, false);
    chip.fillStyle(0xe7edf7, 1);
    chip.fillRoundedRect(6, 6, 108, 108, 18);
    chip.fillStyle(0x2b8bd8, 1);
    chip.fillCircle(60, 60, 34);
    chip.fillStyle(0x141a26, 1);
    chip.fillCircle(60, 60, 16);
    chip.generateTexture(CHIP_KEY, 120, 120);
    chip.destroy();

    // 背景平铺贴图:细网格,便于观察 camera 级滤镜覆盖整个画面
    const tile = scene.make.graphics({ x: 0, y: 0 }, false);
    tile.fillStyle(0x1b2436, 1);
    tile.fillRect(0, 0, 60, 60);
    tile.lineStyle(1, 0x232f47, 1);
    tile.strokeRect(0, 0, 60, 60);
    tile.generateTexture(BG_KEY, 60, 60);
    tile.destroy();
  }

  /** 摘录一个 FilterList 的实例信息:类名 + 关键参数,供 readout 展示。 */
  function describeFilters(
    list: FilterListLike,
    scope: 'internal' | 'external',
  ): FilterInfo[] {
    return list.list.map((controller) => {
      let className = 'Controller';
      let params = '';
      if (controller instanceof Phaser.Filters.Glow) {
        className = 'Glow';
        params = `color=0x${controller.color.toString(16)} outer=${controller.outerStrength} inner=${controller.innerStrength}`;
      } else if (controller instanceof Phaser.Filters.Blur) {
        className = 'Blur';
        params = `x=${controller.x} y=${controller.y} strength=${controller.strength}`;
      } else if (controller instanceof Phaser.Filters.Shadow) {
        className = 'Shadow';
        params = `decay=${controller.decay} samples=${controller.samples} intensity=${controller.intensity}`;
      }
      return { scope, className, params };
    });
  }

  /** 重建滤镜:target / scope / effect 变化时清空两个挂载点,再建新的。 */
  function rebuildFilters() {
    if (!labScene) {
      return;
    }
    const cam = labScene.cameras.main;
    cam.filters.internal.clear();
    cam.filters.external.clear();
    const obj = demo;
    if (obj && obj.filters) {
      obj.filters.internal.clear();
      obj.filters.external.clear();
    }
    if (params.effect === 'off') {
      return;
    }

    const holder: { internal: FilterListLike; external: FilterListLike } =
      params.target === 'camera'
        ? cam.filters
        : (() => {
            if (!obj) {
              throw new Error('demo object missing');
            }
            // 对象滤镜首次使用需要 enableFilters();重复调用安全
            return obj.enableFilters().filters as {
              internal: FilterListLike;
              external: FilterListLike;
            };
          })();

    const list = params.scope === 'internal' ? holder.internal : holder.external;
    const color = hexColor(params.color);
    if (params.effect === 'glow') {
      list.addGlow(color, params.strength);
    } else if (params.effect === 'blur') {
      list.addBlur(1, 4, 0, params.strength * 0.6);
    } else {
      list.addShadow(2, 4, 0.1, 1, color, 6, params.strength);
    }
  }

  /** 热调:strength / color 只改滤镜实例属性,不重建。 */
  function tuneFilters() {
    if (!labScene) {
      return;
    }
    const cam = labScene.cameras.main;
    const obj = demo;
    const holders: Array<{
      internal: FilterListLike;
      external: FilterListLike;
    }> = [cam.filters];
    if (obj?.filters) {
      holders.push(obj.filters as { internal: FilterListLike; external: FilterListLike });
    }
    const color = hexColor(params.color);
    for (const holder of holders) {
      for (const list of [holder.internal, holder.external]) {
        for (const controller of list.list) {
          if ('outerStrength' in controller) {
            const glow = controller as unknown as Phaser.Filters.Glow;
            glow.color = color;
            glow.outerStrength = params.strength;
          } else if ('strength' in controller && 'steps' in controller) {
            const blur = controller as unknown as Phaser.Filters.Blur;
            blur.strength = params.strength * 0.6;
          } else if ('decay' in controller) {
            const shadow = controller as unknown as Phaser.Filters.Shadow;
            shadow.intensity = params.strength;
          }
        }
      }
    }
  }

  function applyParams(next: FxParams) {
    const prev = params;
    params = next;
    if (demo) {
      demo.setAngle(next.rotate ? 45 : 0);
    }
    const structural =
      prev.target !== next.target ||
      prev.scope !== next.scope ||
      prev.effect !== next.effect;
    if (structural) {
      rebuildFilters();
    } else {
      tuneFilters();
    }
  }

  function report() {
    if (!demo || !labScene) {
      return;
    }
    const cam = labScene.cameras.main;
    const objFilters = demo.filters;
    const cameraFilters = [
      ...describeFilters(cam.filters.internal, 'internal'),
      ...describeFilters(cam.filters.external, 'external'),
    ];
    const objectFilters = objFilters
      ? [
          ...describeFilters(objFilters.internal, 'internal'),
          ...describeFilters(objFilters.external, 'external'),
        ]
      : [];

    let appliedStrength = '—';
    const active = params.target === 'camera' ? cameraFilters : objectFilters;
    for (const info of active) {
      appliedStrength = info.params;
    }

    emit({
      rendererType: game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas',
      cameraFilters,
      objectFiltersEnabled: objFilters !== null,
      objectFilters,
      willRender: objFilters ? demo.willRenderFilters() : false,
      appliedStrength,
      angle: demo.angle,
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

