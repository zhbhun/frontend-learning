/**
 * 范例:指针交互实验台——指针坐标、场景级事件、对象交互、命中区形状与 topOnly。
 * 输入(Controls):hitAreaShape(命中区形状:rect=纹理帧矩形默认,circle=贴图
 * 轮廓圆形)、topOnly(this.input.setTopOnly,只对最顶层交互对象派发事件)、
 * scrollX(摄像机水平滚动,演示 pointer.x 与 worldX 的分离)。
 * 前置状态:世界宽 1080 > 画布 720,拉大 scrollX 才能看到对象 D。
 * 主要操作:悬停 / 点击圆形对象(含 A、B 重叠区);把指针放到圆形贴图四角
 * 对比两种命中区;切换 topOnly 观察重叠区的命中数量;拉大 scrollX 对比
 * x 与 worldX 读数;点击空白处对比场景级与对象级计数。
 * 预期结果:readout 同步指针两套坐标、isDown / leftButtonDown、悬停对象名、
 * pointerdown / move / over / out 计数;同一次点击让对象级 pointerdown 与
 * 场景级 gameobjectdown 同步 +1,而空白点击只增加 pointerdown。
 * 阅读主线:create(建对象 + 三层事件注册)→ applyParams(Controls 入口:
 * 直接改 input.hitArea,不重建 InteractiveObject,监听不丢)
 * → update(点击闪烁恢复 + report)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  WORLD_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即时生效。 */
export interface PointerLabParams {
  /** 命中区形状:rect=纹理帧矩形(默认推断),circle=贴合圆形贴图的轮廓 */
  hitAreaShape: 'rect' | 'circle';
  /** this.input.setTopOnly:重叠时只对最顶层交互对象派发事件 */
  topOnly: boolean;
  /** 摄像机水平滚动量,0..360(世界 1080 - 画布 720) */
  scrollX: number;
}

/** readout 用的派生读数:全部来自 Pointer 真实属性与事件计数。 */
export interface PointerLabSnapshot {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  scrollX: number;
  isDown: boolean;
  leftDown: boolean;
  /** 当前悬停对象名(topOnly 关闭时可能多个,如 "A + B") */
  hover: string;
  /** 场景级 pointerdown / pointermove / pointerover / pointerout 计数 */
  downCount: number;
  moveCount: number;
  overCount: number;
  outCount: number;
  /** 对象级 pointerdown 合计(四个对象各自注册) */
  objDownCount: number;
  /** 场景级 gameobjectdown 计数 */
  gameobjectdownCount: number;
  /** 最近点击:对象名(该对象累计次数) */
  lastClick: string;
}

export interface PointerLabInstance {
  applyParams(params: PointerLabParams): void;
  dispose(): void;
}

/** 圆形贴图的直径;命中区演示全靠"贴图是圆的、默认命中区是矩形"这一点。 */
const CHIP_SIZE = 72;
const FLASH_TINT = 0x4ade80;
const FLASH_MS = 200;

/** 四个可交互对象:A、B 圆心距 65 < 半径和 72(命中区重叠),A 的 depth 更高
 *  在上层;D 只有滚动摄像机才能看到。 */
const CHIPS: Array<{
  name: string;
  x: number;
  y: number;
  color: number;
  depth: number;
}> = [
  { name: 'A', x: 190, y: 128, color: 0x60a5fa, depth: 10 },
  { name: 'B', x: 240, y: 170, color: 0xf472b6, depth: 5 },
  { name: 'C', x: 452, y: 148, color: 0x4ade80, depth: 5 },
  { name: 'D', x: 890, y: 246, color: 0xfbbf24, depth: 5 },
];

/** 与 stories 的默认 args 保持一致;create 前的首次 apply 由它兜底。 */
const DEFAULT_PARAMS: PointerLabParams = { hitAreaShape: 'rect', topOnly: true, scrollX: 0 };

interface Chip {
  image: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Image;
  flashUntil: number;
}

class PointerLabScene extends Phaser.Scene {
  private chips: Chip[] = [];
  private clicks = new Map<string, number>();
  private hovered = new Set<string>();
  private counts = { down: 0, move: 0, over: 0, out: 0, objDown: 0, gobDown: 0 };
  private lastClick = '—';
  private created = false;
  private pendingParams?: PointerLabParams;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: PointerLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'PointerLab' });
  }

  create() {
    // 世界比画布宽,摄像机才有滚动空间;bounds 属摄像机话题,这里只为演示坐标分离
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    this.makeTextures();
    this.drawRuler();
    this.addHint();

    for (const def of CHIPS) {
      // 无参 setInteractive:按纹理帧建 72x72 矩形命中区——透明四角也算命中,
      // 这正是"切圆形命中区"要对比的现象
      const image = this.add
        .image(def.x, def.y, `chip-${def.name}`)
        .setDepth(def.depth) // depth 决定渲染顺序,也决定 topOnly 的"最顶层"
        .setInteractive({ useHandCursor: true });
      const ring = this.add
        .image(def.x, def.y, 'chip-ring')
        .setDepth(def.depth)
        .setVisible(false);

      // 对象级事件:悬停高亮、点击闪烁计数(参数含 localX/localY,此处未用)
      image.on('pointerover', () => {
        this.hovered.add(def.name);
        ring.setVisible(true);
      });
      image.on('pointerout', () => {
        this.hovered.delete(def.name);
        ring.setVisible(false);
      });
      image.on('pointerdown', () => {
        const total = (this.clicks.get(def.name) ?? 0) + 1;
        this.clicks.set(def.name, total);
        this.lastClick = `${def.name}(${total})`;
        this.counts.objDown++;
        image.setTint(FLASH_TINT);
        this.findChip(image).flashUntil = this.time.now + FLASH_MS;
      });

      this.chips.push({ image, ring, flashUntil: 0 });
    }

    // 场景级指针事件:任意位置都派发(pointerdown 空点也触发)。
    // pointerover/pointerout 的第二参数是"本步新进入 / 刚离开"的对象数组
    this.input.on('pointerdown', () => this.counts.down++);
    this.input.on('pointermove', () => this.counts.move++);
    this.input.on('pointerover', (_p: Phaser.Input.Pointer, justOver: unknown[]) => {
      this.counts.over += justOver.length;
    });
    this.input.on('pointerout', (_p: Phaser.Input.Pointer, justOut: unknown[]) => {
      this.counts.out += justOut.length;
    });
    // 场景级对象转发:命中交互对象才触发——与对象级计数应同步增长
    this.input.on('gameobjectdown', () => this.counts.gobDown++);

    this.created = true;
    // create 是异步启动的:story 的首次 apply 若先到,在这里补投
    this.applyParams(this.pendingParams ?? DEFAULT_PARAMS);
    this.report();
  }

  override update(): void {
    // 点击闪烁到期后恢复原色(悬停描边由 ring 负责,与 tint 不冲突)
    const now = this.time.now;
    for (const chip of this.chips) {
      if (chip.flashUntil > 0 && now >= chip.flashUntil) {
        chip.flashUntil = 0;
        chip.image.clearTint();
      }
    }
    this.report();
  }

  /** Controls 入口:三个参数都即时生效,不销毁对象、不重挂监听。 */
  applyParams(params: PointerLabParams) {
    if (!this.created) {
      this.pendingParams = params;
      return; // 场景尚未就绪,create() 会用 pendingParams 补投
    }
    // 注意:对象已有 InteractiveObject 时再调 setInteractive(shape) 只会
    // enable 旧对象,不会换形状——换形状必须直接改 input.hitArea
    for (const chip of this.chips) {
      const io = chip.image.input;
      if (!io) {
        continue;
      }
      if (params.hitAreaShape === 'circle') {
        io.hitArea = new Phaser.Geom.Circle(CHIP_SIZE / 2, CHIP_SIZE / 2, CHIP_SIZE / 2);
        io.hitAreaCallback = Phaser.Geom.Circle.Contains;
      } else {
        io.hitArea = new Phaser.Geom.Rectangle(0, 0, CHIP_SIZE, CHIP_SIZE);
        io.hitAreaCallback = Phaser.Geom.Rectangle.Contains;
      }
    }
    this.input.setTopOnly(params.topOnly);
    this.cameras.main.scrollX = params.scrollX;
  }

  private findChip(image: Phaser.GameObjects.Image): Chip {
    return this.chips.find((chip) => chip.image === image)!;
  }

  private report() {
    const pointer = this.input.activePointer;
    // worldX/worldY 只在指针事件期间刷新;事件外读取前按官方要求
    // 用指定摄像机重算一次(updateWorldPoint),readout 才是新鲜值
    pointer.updateWorldPoint(this.cameras.main);

    const hover = [...this.hovered].sort().join(' + ') || '—';
    this.emitSnapshot({
      x: Math.round(pointer.x),
      y: Math.round(pointer.y),
      worldX: Math.round(pointer.worldX),
      worldY: Math.round(pointer.worldY),
      scrollX: Math.round(this.cameras.main.scrollX),
      isDown: pointer.isDown,
      leftDown: pointer.leftButtonDown(),
      hover,
      downCount: this.counts.down,
      moveCount: this.counts.move,
      overCount: this.counts.over,
      outCount: this.counts.out,
      objDownCount: this.counts.objDown,
      gameobjectdownCount: this.counts.gobDown,
      lastClick: this.lastClick,
    });
  }

  /** 自包含素材:圆形贴图 + 悬停描边环,Graphics 画完 generateTexture 烘焙。 */
  private makeTextures() {
    if (this.textures.exists('chip-A')) {
      return;
    }
    const half = CHIP_SIZE / 2;
    for (const def of CHIPS) {
      const g = this.make.graphics();
      g.fillStyle(def.color, 1);
      g.fillCircle(half, half, half - 3);
      g.lineStyle(2, 0x0b1120, 1);
      g.strokeCircle(half, half, half - 3);
      g.generateTexture(`chip-${def.name}`, CHIP_SIZE, CHIP_SIZE);
      g.destroy();
    }
    const ring = this.make.graphics();
    ring.lineStyle(3, 0xffffff, 0.9);
    ring.strokeCircle(half + 2, half + 2, half + 1);
    ring.generateTexture('chip-ring', CHIP_SIZE + 8, CHIP_SIZE + 8);
    ring.destroy();
  }

  /** 世界刻度尺:每 60px 一刻度、120px 一标注,滚动时提供位移参照。 */
  private drawRuler() {
    const ruler = this.add.graphics();
    ruler.lineStyle(1, 0x3b4a6b, 1);
    for (let wx = 0; wx <= WORLD_WIDTH; wx += 60) {
      const tall = wx % 120 === 0;
      ruler.lineBetween(wx, tall ? 352 : 358, wx, 364);
      if (tall) {
        this.add
          .text(wx, 368, String(wx), {
            fontFamily: 'ui-monospace, monospace',
            fontSize: '10px',
            color: '#64748b',
          })
          .setOrigin(0.5, 0);
      }
    }
    // 画布右缘参照线:scrollX=0 时与世界 720 刻度对齐
    ruler.lineStyle(1, 0x475569, 0.6);
    ruler.lineBetween(GAME_WIDTH, 340, GAME_WIDTH, 364);
  }

  /** 固定在屏幕上的操作提示:setScrollFactor(0) 不随摄像机滚动。 */
  private addHint() {
    this.add
      .text(
        12,
        18,
        '悬停 / 点击对象(A、B 重叠,D 需滚动) · 空点对比计数 · 圆形贴图四角试命中区',
        {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '12px',
          color: '#8fa3c8',
        },
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
  }
}

export function createPointerLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PointerLabSnapshot) => void,
): PointerLabInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new PointerLabScene();
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
    applyParams(params: PointerLabParams) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
