/**
 * 范例:容器与分组对比实验台。
 * 输入:mode(容器 / 分组)、x / angle / scale / alpha(父级变换)、
 * childDepth(是否给三个子对象设置互不相同的 depth)。
 * 主要操作:同一批三个重叠色块 + 一个嵌套标记点,在两种模式下重建;
 * 容器模式把父级变换施加在 container 上,分组模式无处施加(成员各自独立)。
 * 预期结果:容器模式子对象跟随 x/旋转/缩放/透明度,黄块世界包围盒实时变化;
 * 分组模式无论怎么调,成员一个像素都不动;childDepth 在容器模式下不影响
 * 叠放顺序(list 顺序渲染),在分组模式下成员在场景显示列表里,depth 立刻重排。
 * 阅读主线:makeTextures(自包含纹理)→ buildStage(两种模式重建)
 * → apply(Controls 入口)→ drawOverlay/report(每帧证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

export type StageMode = 'container' | 'group';

/** Controls 直接驱动的参数,运行中修改立即生效。 */
export interface ContainersVsGroupsParams {
  /** 组织方式:container = 容器(显示对象),group = 分组(集合) */
  mode: StageMode;
  /** 父级横移:容器模式下改 container.x,分组模式下无目标 */
  x: number;
  /** 父级旋转角(度):容器模式下改 container.angle */
  angle: number;
  /** 父级等比缩放:容器模式下改 container.scale */
  scale: number;
  /** 父级不透明度:容器模式下改 container.alpha(渲染时与子对象相乘) */
  alpha: number;
  /** true 时给三个色块设置互不相同的 depth(3 / 2 / 1,与加入顺序相反) */
  childDepth: boolean;
}

/** readout 用的派生读数:全部来自对象真实属性与派生方法。 */
export interface ContainersVsGroupsSnapshot {
  mode: StageMode;
  /** 黄块本地坐标:容器模式 = 容器内本地;分组模式 = 世界坐标本身 */
  yellowLocal: { x: number; y: number };
  /** 黄块世界包围盒中心:getBounds 自动包含父容器链 */
  yellowWorld: { x: number; y: number };
  /** 嵌套标记点(内层容器的子对象)世界包围盒中心 */
  nestedWorld: { x: number; y: number };
  /** 容器包围盒(仅容器模式有);分组模式为 null */
  containerBounds: Phaser.Geom.Rectangle | null;
  /** 容器自身变换(分组模式为 null) */
  parentState: { x: number; angle: number; scale: number; alpha: number } | null;
  /** 黄块当前的 depth 值 */
  yellowDepth: number;
  /** 画面最上层的色块名:容器模式 = list 末尾;分组模式 = 显示列表按 depth 排序 */
  topName: string;
  /** 成员数量:容器 length / 分组 getLength */
  memberCount: number;
}

export interface ContainersVsGroupsInstance {
  apply(params: ContainersVsGroupsParams): void;
  dispose(): void;
}

/** 三个色块相对舞台中心的本地偏移:两种模式共用,初始画面完全一致。 */
const BLOCK_OFFSETS = [
  { name: '蓝', dx: -52, dy: -18, key: 'cg-block-blue' },
  { name: '黄', dx: 0, dy: 10, key: 'cg-block-yellow' },
  { name: '品红', dx: 52, dy: 38, key: 'cg-block-magenta' },
] as const;
const NESTED_OFFSET = { dx: 96, dy: -52 };
const CENTER = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
const SCENE_KEY = 'ContainersVsGroups';

class CompareScene extends Phaser.Scene {
  /** 当前组织方式;切换时销毁旧舞台并按新模式重建。 */
  private mode: StageMode = 'container';
  private container?: Phaser.GameObjects.Container;
  private group?: Phaser.GameObjects.Group;
  /** 三个色块:容器模式是 container 的子对象;分组模式是场景显示列表成员。 */
  private blocks: Phaser.GameObjects.Image[] = [];
  /** 嵌套标记点:容器模式藏在内层子容器里;分组模式是独立对象。 */
  private nestedDot?: Phaser.GameObjects.Image;
  private nestedRing?: Phaser.GameObjects.Image;
  private overlay?: Phaser.GameObjects.Graphics;
  private params: ContainersVsGroupsParams = {
    mode: 'container',
    x: 0,
    angle: 0,
    scale: 1,
    alpha: 1,
    childDepth: false,
  };

  emitSnapshot: (snapshot: ContainersVsGroupsSnapshot) => void = () => {};

  constructor() {
    super({ key: SCENE_KEY });
  }

  preload() {
    this.makeTextures();
  }

  create() {
    this.drawReferenceGrid();
    this.overlay = this.add.graphics().setDepth(50);
    this.add
      .text(
        12,
        GAME_HEIGHT - 20,
        '红框 = 黄块世界包围盒 · 白框 = 嵌套点 · 三块半透明重叠,叠放顺序即渲染顺序',
        { fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '12px', color: '#8fa3c8' },
      )
      .setOrigin(0, 0.5)
      .setDepth(51);
    this.buildStage();
    this.report();
  }

  override update() {
    this.drawOverlay();
    this.report();
  }

  /** Controls 入口:模式变化重建舞台;其余参数即时应用。 */
  apply(params: ContainersVsGroupsParams) {
    const ready = this.overlay !== undefined;
    const rebuild = ready && params.mode !== this.params.mode;
    this.params = params;
    if (!ready) {
      return; // create() 尚未执行,参数已记录,buildStage 会按记录初始化
    }
    if (rebuild) {
      this.buildStage();
    }
    this.applyStageParams();
  }

  /** 把父级变换施加到当前模式的组织者上。 */
  private applyStageParams() {
    if (this.mode === 'container' && this.container) {
      this.container
        .setX(CENTER.x + this.params.x)
        .setY(CENTER.y)
        .setAngle(this.params.angle)
        .setScale(this.params.scale)
        .setAlpha(this.params.alpha);
    }
    // 分组模式:Group 没有 x / angle / scale / alpha 这些属性,
    // 这四个参数在分组模式下没有任何施加对象——这正是两种组织的职责差异。
    this.applyChildDepth();
  }

  /** childDepth 开关:给三个色块设置互不相同的 depth(与加入顺序相反)。 */
  private applyChildDepth() {
    this.blocks.forEach((block, index) => {
      block.setDepth(this.params.childDepth ? 3 - index : 0);
    });
  }

  /** 按当前模式重建舞台:销毁旧对象 → 创建新成员 → 组织进容器或分组。 */
  private buildStage() {
    this.mode = this.params.mode;
    this.container?.destroy(true);
    this.container = undefined;
    this.group?.destroy(true, true);
    this.group = undefined;
    this.blocks = [];
    this.nestedDot = undefined;
    this.nestedRing = undefined;

    if (this.mode === 'container') {
      // 容器模式:子对象用容器本地坐标(以容器原点为 0,0)摆放
      this.container = this.add.container(CENTER.x, CENTER.y);
      this.blocks = BLOCK_OFFSETS.map((item) =>
        this.add.image(item.dx, item.dy, item.key),
      );
      this.container.add(this.blocks);
      // 嵌套:内层容器也是显示对象,可作为外层容器的子对象
      const nested = this.add.container(NESTED_OFFSET.dx, NESTED_OFFSET.dy);
      this.nestedRing = this.add.image(0, 0, 'cg-nested-ring');
      this.nestedDot = this.add.image(0, 0, 'cg-nested-dot');
      nested.add([this.nestedRing, this.nestedDot]);
      this.container.add(nested);
    } else {
      // 分组模式:成员各自在场景显示列表里,坐标就是世界坐标
      this.blocks = BLOCK_OFFSETS.map((item) =>
        this.add.image(CENTER.x + item.dx, CENTER.y + item.dy, item.key),
      );
      this.nestedRing = this.add.image(
        CENTER.x + NESTED_OFFSET.dx,
        CENTER.y + NESTED_OFFSET.dy,
        'cg-nested-ring',
      );
      this.nestedDot = this.add.image(
        CENTER.x + NESTED_OFFSET.dx,
        CENTER.y + NESTED_OFFSET.dy,
        'cg-nested-dot',
      );
      this.group = this.add.group([...this.blocks, this.nestedRing, this.nestedDot]);
    }

    this.applyChildDepth();
    this.applyStageParams();
  }

  /** 证据层:黄块世界包围盒 + 嵌套点世界包围盒,每帧按真实计算值重画。 */
  private drawOverlay() {
    const overlay = this.overlay;
    const yellow = this.blocks[1];
    if (!overlay || !yellow || !this.nestedDot) {
      return;
    }

    const yellowBounds = yellow.getBounds();
    overlay.clear();
    overlay.lineStyle(2, 0xf87171, 1);
    overlay.strokeRect(yellowBounds.x, yellowBounds.y, yellowBounds.width, yellowBounds.height);

    const nestedBounds = this.nestedDot.getBounds();
    overlay.lineStyle(2, 0xffffff, 1);
    overlay.strokeRect(nestedBounds.x, nestedBounds.y, nestedBounds.width, nestedBounds.height);
  }

  private report() {
    const yellow = this.blocks[1];
    if (!yellow || !this.nestedDot) {
      return;
    }

    const yellowBounds = yellow.getBounds();
    const nestedBounds = this.nestedDot.getBounds();
    this.emitSnapshot({
      mode: this.mode,
      yellowLocal: { x: yellow.x, y: yellow.y },
      yellowWorld: {
        x: yellowBounds.x + yellowBounds.width / 2,
        y: yellowBounds.y + yellowBounds.height / 2,
      },
      nestedWorld: {
        x: nestedBounds.x + nestedBounds.width / 2,
        y: nestedBounds.y + nestedBounds.height / 2,
      },
      containerBounds: this.container ? this.container.getBounds() : null,
      parentState: this.container
        ? {
            x: this.container.x,
            angle: this.container.angle,
            scale: this.container.scale,
            alpha: this.container.alpha,
          }
        : null,
      yellowDepth: yellow.depth,
      topName: this.computeTopName(),
      memberCount: this.container ? this.container.length : (this.group?.getLength() ?? 0),
    });
  }

  /**
   * 画面最上层的色块名:
   * - 容器模式:子对象按 list 数组顺序渲染,末尾成员最上层,depth 不参与;
   * - 分组模式:成员在场景显示列表里,按 depth 升序渲染,
   *   同 depth 保持加入顺序(后加入的画在上面)。
   */
  private computeTopName(): string {
    if (this.mode === 'container') {
      return BLOCK_OFFSETS[this.blocks.length - 1].name;
    }

    let topIndex = 0;
    for (let i = 1; i < this.blocks.length; i++) {
      // 同 depth 时后加入者在上:用 >= 让靠后的成员胜出
      if (this.blocks[i].depth >= this.blocks[topIndex].depth) {
        topIndex = i;
      }
    }
    return BLOCK_OFFSETS[topIndex].name;
  }

  /** 静态参考:60px 网格 + 中心参考线,叠放与位移一眼可读。 */
  private drawReferenceGrid() {
    const grid = this.add.graphics().setDepth(-10);
    grid.lineStyle(1, 0x253048, 1);
    for (let x = 60; x < GAME_WIDTH; x += 60) {
      grid.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 60; y < GAME_HEIGHT; y += 60) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }
    grid.lineStyle(1, 0x3b4a6b, 1);
    grid.lineBetween(CENTER.x, 0, CENTER.x, GAME_HEIGHT);
    grid.lineBetween(0, CENTER.y, GAME_WIDTH, CENTER.y);
  }

  /** 自包含素材:三个半透明色块 + 嵌套标记点(圆点 + 圆环)。 */
  private makeTextures() {
    const blockColors: Record<string, number> = {
      'cg-block-blue': 0x3b82f6,
      'cg-block-yellow': 0xfacc15,
      'cg-block-magenta': 0xe879f9,
    };
    for (const [key, color] of Object.entries(blockColors)) {
      if (this.textures.exists(key)) {
        continue;
      }
      const g = this.make.graphics();
      g.fillStyle(color, 0.55);
      g.fillRoundedRect(0, 0, 112, 72, 12);
      g.lineStyle(2, color, 1);
      g.strokeRoundedRect(1, 1, 110, 70, 12);
      g.generateTexture(key, 112, 72);
      g.destroy();
    }

    if (!this.textures.exists('cg-nested-ring')) {
      const ring = this.make.graphics();
      ring.lineStyle(2, 0x38bdf8, 1);
      ring.strokeCircle(16, 16, 14);
      ring.generateTexture('cg-nested-ring', 32, 32);
      ring.destroy();
    }
    if (!this.textures.exists('cg-nested-dot')) {
      const dot = this.make.graphics();
      dot.fillStyle(0xffffff, 1);
      dot.fillCircle(8, 8, 7);
      dot.generateTexture('cg-nested-dot', 16, 16);
      dot.destroy();
    }
  }
}

export function createContainersVsGroups(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ContainersVsGroupsSnapshot) => void,
): ContainersVsGroupsInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new CompareScene();
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [scene],
  });

  scene.emitSnapshot = emit;

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    apply(params: ContainersVsGroupsParams) {
      scene.apply(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}

