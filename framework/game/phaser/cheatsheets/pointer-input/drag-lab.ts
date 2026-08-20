/**
 * 范例:拖拽与拖放实验台——draggable、drag 事件三段生命周期与 DropZone。
 * 输入(Controls):draggable(this.input.setDraggable 开关,关掉后 drag 事件
 * 全停而 pointerdown 类交互照常)、dragThreshold(this.input.
 * dragDistanceThreshold,按住后移动超过该像素才算拖拽,用于区分点击与拖动)。
 * 前置状态:一个可拖动令牌 + 左右两个 DropZone 托盘(Zone 对象本身不可见,
 * 由同尺寸 Rectangle 提供视觉)。
 * 主要操作:抓令牌任意位置(中心 / 边缘)拖动;拖入托盘再移出;在托盘上
 * 松手与在空地松手;调大判定距离后按住小幅晃动。
 * 预期结果:readout 同步 getDragState(4=拖拽中)、dragX/dragY(保持抓取
 * 偏移)、拖拽起点 dragStartX/Y、当前拖拽目标、dragstart/drag/dragend 与
 * dragenter/dragleave/drop 计数;drop 后令牌吸附托盘中心、dropped=true,
 * 空地松手 dropped=false 且令牌停在原地。
 * 阅读主线:create(令牌 + 两个 DropZone + 场景级 drag 事件)→
 * applyParams(Controls 入口)→ report(每帧证据)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即时生效。 */
export interface DragLabParams {
  /** this.input.setDraggable(token, value):false 时 drag 事件全停 */
  draggable: boolean;
  /** this.input.dragDistanceThreshold:按住后移动超过该像素才算拖拽 */
  dragThreshold: number;
}

/** readout 用的派生读数:全部来自真实属性与事件计数。 */
export interface DragLabSnapshot {
  /** this.input.getDragState(activePointer):0 未拖 2 判定中 4 拖拽中 */
  dragState: number;
  /** 最近一次 drag 事件的 dragX / dragY(自带抓取偏移的目标坐标) */
  dragX: number;
  dragY: number;
  /** 拖拽起点的对象坐标(gameObject.input.dragStartX/Y) */
  dragStartX: number;
  dragStartY: number;
  /** 令牌当前坐标 */
  tokenX: number;
  tokenY: number;
  /** 当前拖拽目标(DropZone 名) */
  target: string;
  /** 最近一次 dragend 的 dropped */
  lastDropped: string;
  draggable: boolean;
  dragThreshold: number;
  /** 场景级 dragstart / drag / dragend 计数 */
  dragstartCount: number;
  dragCount: number;
  dragendCount: number;
  /** 场景级 dragenter / dragleave 合计计数 */
  dragenterCount: number;
  dragleaveCount: number;
  /** 对象级 drop 计数(挂在令牌上,与场景级 drop 等价) */
  objDropCount: number;
  /** 各托盘收纳数 */
  leftStashed: number;
  rightStashed: number;
}

export interface DragLabInstance {
  applyParams(params: DragLabParams): void;
  dispose(): void;
}

const TOKEN_SIZE = 56;
const TRAY_WIDTH = 220;
const TRAY_HEIGHT = 150;
const TRAY_Y = 280;
const LEFT_X = 180;
const RIGHT_X = 540;

/** 与 stories 的默认 args 保持一致;create 前的首次 apply 由它兜底。 */
const DEFAULT_PARAMS: DragLabParams = { draggable: true, dragThreshold: 0 };

interface Tray {
  name: string;
  zone: Phaser.GameObjects.Zone;
  frame: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  countText: Phaser.GameObjects.Text;
  stashed: number;
}

class DragLabScene extends Phaser.Scene {
  private token?: Phaser.GameObjects.Image;
  private trays: Tray[] = [];
  private counts = {
    dragstart: 0,
    drag: 0,
    dragend: 0,
    dragenter: 0,
    dragleave: 0,
    objDrop: 0,
  };
  private lastDrag = { x: Number.NaN, y: Number.NaN };
  private dragStart = { x: Number.NaN, y: Number.NaN };
  private target = '—';
  private lastDropped = '—';
  private created = false;
  private pendingParams?: DragLabParams;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: DragLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'DragLab' });
  }

  create() {
    this.makeTokenTexture();
    this.addHint();

    // 两个 DropZone:Zone 不可见,负责命中;Rectangle 负责视觉,不参与输入
    this.trays = [this.makeTray('左托盘', LEFT_X), this.makeTray('右托盘', RIGHT_X)];

    // 令牌:配置对象一次带上 draggable 与手型光标
    this.token = this.add
      .image(GAME_WIDTH / 2, 110, 'drag-token')
      .setInteractive({ draggable: true, useHandCursor: true });

    this.registerDragEvents();

    this.created = true;
    // create 是异步启动的:story 的首次 apply 若先到,在这里补投
    this.applyParams(this.pendingParams ?? DEFAULT_PARAMS);
    this.report();
  }

  /** 场景级 drag 事件:位置写回与落点吸附都在回调里手动完成。 */
  private registerDragEvents() {
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      this.counts.dragstart++;
      // 回调参数类型是宽泛的 GameObject;本范例只有令牌可拖,断言回 Image
      const token = gameObject as Phaser.GameObjects.Image;
      token.setDepth(100); // 拖起时提到最上层,避免被托盘遮挡
      const io = token.input;
      this.dragStart = { x: io?.dragStartX ?? Number.NaN, y: io?.dragStartY ?? Number.NaN };
    });

    // Phaser 不自动移动对象:dragX/dragY 是"保持抓取偏移"的目标坐标,写回才动
    this.input.on(
      'drag',
      (_p: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
        this.counts.drag++;
        const token = gameObject as Phaser.GameObjects.Image;
        token.x = dragX;
        token.y = dragY;
        this.lastDrag = { x: dragX, y: dragY };
      },
    );

    this.input.on(
      'dragend',
      (_p: Phaser.Input.Pointer, _gameObject: Phaser.GameObjects.GameObject, dropped: boolean) => {
        this.counts.dragend++;
        this.lastDropped = dropped ? 'true' : 'false';
        this.target = '—';
        this.refreshTrayHighlight();
      },
    );

    // DropZone 三事件:target 是命中的托盘;高亮与收纳数都由回调驱动
    this.input.on(
      'dragenter',
      (_p: Phaser.Input.Pointer, _gameObject: Phaser.GameObjects.GameObject, target: Phaser.GameObjects.GameObject) => {
        this.counts.dragenter++;
        this.target = this.trayName(target);
        this.refreshTrayHighlight();
      },
    );
    this.input.on(
      'dragleave',
      (_p: Phaser.Input.Pointer, _gameObject: Phaser.GameObjects.GameObject, _target: Phaser.GameObjects.GameObject) => {
        this.counts.dragleave++;
        this.target = '—';
        this.refreshTrayHighlight();
      },
    );
    this.input.on(
      'drop',
      (_p: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, target: Phaser.GameObjects.GameObject) => {
        const tray = this.trays.find((item) => item.zone === target);
        if (tray) {
          tray.stashed++;
          tray.countText.setText(`收纳 ${tray.stashed}`);
        }
        // 落点吸附自己做:把令牌对齐托盘中心
        const zone = target as Phaser.GameObjects.Zone;
        (gameObject as Phaser.GameObjects.Image).setPosition(zone.x, zone.y);
      },
    );

    // 对象级 drop(挂在令牌上)与场景级 drop 对同一次松手各派发一次
    this.token?.on('drop', () => this.counts.objDrop++);
  }

  override update(): void {
    this.report();
  }

  /** Controls 入口:setDraggable 随时开关拖拽;阈值对整个场景生效。 */
  applyParams(params: DragLabParams) {
    if (!this.created) {
      this.pendingParams = params;
      return; // 场景尚未就绪,create() 会用 pendingParams 补投
    }
    if (this.token) {
      this.input.setDraggable(this.token, params.draggable);
    }
    this.input.dragDistanceThreshold = params.dragThreshold;
  }

  private makeTray(name: string, x: number): Tray {
    const frame = this.add
      .rectangle(x, TRAY_Y, TRAY_WIDTH, TRAY_HEIGHT, 0x1c2537, 1)
      .setStrokeStyle(2, 0x3b4a6b, 1);
    const label = this.add
      .text(x, TRAY_Y - TRAY_HEIGHT / 2 + 16, name, {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '13px',
        color: '#8fa3c8',
      })
      .setOrigin(0.5, 0.5);
    const countText = this.add
      .text(x, TRAY_Y + TRAY_HEIGHT / 2 - 16, '收纳 0', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#64748b',
      })
      .setOrigin(0.5, 0.5);

    // Zone:不可见的纯输入区域;setDropZone 默认按尺寸建矩形命中区
    const zone = this.add.zone(x, TRAY_Y, TRAY_WIDTH, TRAY_HEIGHT).setDropZone();
    return { name, zone, frame, label, countText, stashed: 0 };
  }

  private trayName(target: Phaser.GameObjects.GameObject): string {
    return this.trays.find((tray) => tray.zone === target)?.name ?? '?';
  }

  private refreshTrayHighlight() {
    for (const tray of this.trays) {
      const active = tray.name === this.target;
      tray.frame.setStrokeStyle(active ? 3 : 2, active ? 0x4ade80 : 0x3b4a6b, 1);
    }
  }

  private report() {
    const token = this.token;
    if (!token) {
      return;
    }
    this.emitSnapshot({
      dragState: this.input.getDragState(this.input.activePointer),
      dragX: this.lastDrag.x,
      dragY: this.lastDrag.y,
      dragStartX: this.dragStart.x,
      dragStartY: this.dragStart.y,
      tokenX: token.x,
      tokenY: token.y,
      target: this.target,
      lastDropped: this.lastDropped,
      draggable: token.input?.draggable ?? false,
      dragThreshold: this.input.dragDistanceThreshold,
      dragstartCount: this.counts.dragstart,
      dragCount: this.counts.drag,
      dragendCount: this.counts.dragend,
      dragenterCount: this.counts.dragenter,
      dragleaveCount: this.counts.dragleave,
      objDropCount: this.counts.objDrop,
      leftStashed: this.trays[0]?.stashed ?? 0,
      rightStashed: this.trays[1]?.stashed ?? 0,
    });
  }

  /** 自包含素材:圆角方块令牌,Graphics 画完 generateTexture 烘焙。 */
  private makeTokenTexture() {
    if (this.textures.exists('drag-token')) {
      return;
    }
    const g = this.make.graphics();
    g.fillStyle(0x60a5fa, 1);
    g.fillRoundedRect(3, 3, TOKEN_SIZE - 6, TOKEN_SIZE - 6, 10);
    g.lineStyle(2, 0x0b1120, 1);
    g.strokeRoundedRect(3, 3, TOKEN_SIZE - 6, TOKEN_SIZE - 6, 10);
    g.fillStyle(0xe2e8f0, 1);
    g.fillCircle(TOKEN_SIZE / 2, TOKEN_SIZE / 2, 5);
    g.generateTexture('drag-token', TOKEN_SIZE, TOKEN_SIZE);
    g.destroy();
  }

  private addHint() {
    this.add.text(
      12,
      18,
      '抓取令牌任意位置拖动 · 拖入托盘松手即收纳 · 空地松手留在原地',
      {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#8fa3c8',
      },
    ).setOrigin(0, 0.5);
  }
}

export function createDragLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DragLabSnapshot) => void,
): DragLabInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new DragLabScene();
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
    applyParams(params: DragLabParams) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
