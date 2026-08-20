/**
 * 范例:深度排序实验台——depth 值与列表位置如何共同决定"谁盖住谁"。
 * 输入:depthA / depthB(-3..3,Controls 直接驱动 setDepth)与
 * orderOp(一次性的列表位置操作:A.setToTop / setToBack / setAbove(B) / setBelow(B))。
 * 前置状态:四个 168px 色块 A蓝/B黄/C绿/D品红 按此顺序加入场景,全部 depth 默认 0。
 * 主要操作:调节两个 depth;切换 orderOp 只在变化时执行一次(不重置列表)。
 * 预期结果:渲染顺序 = 显示列表数组顺序(每帧渲染前按 depth 稳定排序,
 * depth 相同保持既有数组顺序即加入顺序);depth 值不同时 setToTop 家族
 * "盖不上去",等值时立刻换位;列表位置操作不改 depth 读数。
 * 阅读主线:makeBlockTexture(自包含纹理)→ create(按序加入四块)
 * → apply(Controls 入口)→ report(先 depthSort 再读真实数组顺序)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数;orderOp 变化时场景执行一次对应列表操作。 */
export interface DepthOrderParams {
  /** A 的 depth 值,setDepth 立即生效并排队重排 */
  depthA: number;
  /** B 的 depth 值 */
  depthB: number;
  /** 列表位置操作;仅在与上一次不同(且不为 none)时执行一次 */
  orderOp: OrderOp;
}

export type OrderOp = 'none' | 'a-to-top' | 'a-to-back' | 'a-above-b' | 'a-below-b';

/** readout 用的派生读数:全部来自显示列表与对象的真实属性。 */
export interface DepthOrderSnapshot {
  /** 显示列表数组顺序(即渲染顺序,自下而上);格式如 "A蓝(0) → B黄(0) → ..." */
  renderOrder: string;
  /** 当前画面最上层的色块名 */
  topName: string;
  depthA: number;
  depthB: number;
  depthC: number;
  depthD: number;
  /** 最近一次执行的列表位置操作描述 */
  lastOp: string;
}

export interface DepthOrderInstance {
  apply(params: DepthOrderParams): void;
  dispose(): void;
}

const BLOCK_SIZE = 168;
/** 四块沿对角错位叠放,中心区域四块重叠,对角外露便于辨认。 */
const CENTER = { x: GAME_WIDTH / 2 - 60, y: GAME_HEIGHT / 2 };
const OFFSET = 34;
const LAYOUT = [
  { key: 'blockA', name: 'A 蓝', color: '#60a5fa', dx: -OFFSET, dy: -OFFSET },
  { key: 'blockB', name: 'B 黄', color: '#facc15', dx: OFFSET, dy: -OFFSET },
  { key: 'blockC', name: 'C 绿', color: '#4ade80', dx: -OFFSET, dy: OFFSET },
  { key: 'blockD', name: 'D 品红', color: '#f472b6', dx: OFFSET, dy: OFFSET },
];

class DepthOrderScene extends Phaser.Scene {
  private blocks: Phaser.GameObjects.Image[] = [];
  private names = new Map<Phaser.GameObjects.GameObject, string>();
  /** 上一次执行的 orderOp,用于"仅在变化时执行一次"。 */
  private lastOrderOp: OrderOp = 'none';
  private lastOpLabel = '无';

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: DepthOrderSnapshot) => void = () => {};

  constructor() {
    super({ key: 'DepthOrder' });
  }

  preload() {
    for (const item of LAYOUT) {
      this.makeBlockTexture(item.key, item.name, item.color);
    }
  }

  create() {
    // 按数组的顺序加入显示列表:同 depth 时后加入者后渲染、盖在上面
    for (const item of LAYOUT) {
      const block = this.add.image(CENTER.x + item.dx, CENTER.y + item.dy, item.key);
      this.blocks.push(block);
      this.names.set(block, item.name);
    }

    this.add
      .text(12, GAME_HEIGHT - 20, '同 depth 按加入顺序:A → B → C → D,后画的盖住先画的', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#8fa3c8',
      })
      .setOrigin(0, 0.5)
      .setDepth(10);

    this.report();
  }

  override update() {
    // readout 与渲染看到同一份排序结果:先消费排队的 depthSort 再读数组
    this.report();
  }

  /** Controls 入口:depthA/depthB 每次都施加;orderOp 只在变化时执行一次。 */
  apply(params: DepthOrderParams) {
    // 首次 apply 可能早于场景 create(blocks 尚未创建),跳过等 Controls 下次变化
    if (this.blocks.length < 2) {
      return;
    }
    const [a, b] = this.blocks;
    a.setDepth(params.depthA);
    b.setDepth(params.depthB);

    if (params.orderOp !== this.lastOrderOp) {
      this.lastOrderOp = params.orderOp;
      this.runOrderOp(params.orderOp);
    }
  }

  /** 列表位置操作:只挪数组位置,不改任何 depth 值。 */
  private runOrderOp(op: OrderOp) {
    const [a, b] = this.blocks;
    switch (op) {
      case 'a-to-top':
        a.setToTop();
        this.lastOpLabel = 'A.setToTop()(列表位置,depth 不变)';
        break;
      case 'a-to-back':
        a.setToBack();
        this.lastOpLabel = 'A.setToBack()(列表位置,depth 不变)';
        break;
      case 'a-above-b':
        a.setAbove(b);
        this.lastOpLabel = 'A.setAbove(B)(紧贴 B 之上)';
        break;
      case 'a-below-b':
        a.setBelow(b);
        this.lastOpLabel = 'A.setBelow(B)(紧贴 B 之下)';
        break;
      default:
        this.lastOpLabel = '无';
        break;
    }
  }

  private report() {
    // 渲染前每帧调用 depthSort:只在 sortChildrenFlag 被排队(setDepth/增删对象)时
    // 真正排序,排序是稳定排序——depth 相同保持既有数组顺序
    this.children.depthSort();

    // 显示列表数组顺序 = 渲染顺序 = 遮盖顺序(自下而上)
    const experiment = new Set<Phaser.GameObjects.GameObject>(this.blocks);
    const order = this.children.getChildren().filter((obj) => experiment.has(obj));
    const label = (obj: Phaser.GameObjects.GameObject) => {
      const depth = (obj as Phaser.GameObjects.Image).depth;
      return `${this.names.get(obj)}(${depth})`;
    };
    const [a, b, c, d] = this.blocks;

    this.emitSnapshot({
      renderOrder: order.map(label).join(' → '),
      topName: this.names.get(order.at(-1) ?? a) ?? '—',
      depthA: a.depth,
      depthB: b.depth,
      depthC: c.depth,
      depthD: d.depth,
      lastOp: this.lastOpLabel,
    });
  }

  /** 自包含素材:色块纹理,字母烘进纹理,不依赖场景内的 Text 排序。 */
  private makeBlockTexture(key: string, name: string, color: string) {
    if (this.textures.exists(key)) {
      return;
    }
    const texture = this.textures.createCanvas(key, BLOCK_SIZE, BLOCK_SIZE);
    if (!texture) {
      return;
    }
    const ctx = texture.context;
    const radius = 16;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(2, 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, radius);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 84px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, BLOCK_SIZE / 2, BLOCK_SIZE / 2 + 4);
    texture.refresh();
  }
}

export function createDepthOrder(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DepthOrderSnapshot) => void,
): DepthOrderInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new DepthOrderScene();
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
    apply(params: DepthOrderParams) {
      scene.apply(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
