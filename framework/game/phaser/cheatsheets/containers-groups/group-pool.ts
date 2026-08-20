/**
 * 范例:Group 的池化管理。
 * 输入:spawning(是否持续发射)、recycle(飞出画面后是否 killAndHide 回收)。
 * 主要操作:分组用 maxSize 限容,每 260ms 从池里 get() 一枚子弹向上飞;
 * recycle 开时飞出顶部即 killAndHide(失活并隐藏)归还池;关时子弹保持
 * active 停在画面外,池逐渐耗尽,get() 落到 createIfNull 路径直到 isFull。
 * 预期结果:readout 里 children 总数只增不减(池从不销毁对象),active 数
 * 随回收回落;recycle 关闭后 active 数爬到 maxSize,getTotalFree 归零、
 * isFull 变 true,画面不再出现新子弹。
 * 阅读主线:makeBulletTexture → create(建组)→ update(发射/飞行/回收)
 * → report(每帧池状态)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数,运行中修改立即生效。 */
export interface GroupPoolParams {
  /** true 时每 260ms 发射一枚;false 时停止发射,已飞出的继续飞 */
  spawning: boolean;
  /** true 时飞出画面即回收(killAndHide);false 时停在画面外保持 active */
  recycle: boolean;
}

/** readout 用的派生读数:全部来自 Group 真实状态。 */
export interface GroupPoolSnapshot {
  /** 池内成员总数:create 只增,get/killAndHide 不减 */
  total: number;
  /** active(true)成员数 */
  active: number;
  /** inactive(false)成员数 */
  inactive: number;
  /** maxSize - active:还能取多少枚再满 */
  totalFree: number;
  /** active 数是否已到 maxSize */
  isFull: boolean;
  /** 最近一次发射来源:'新建'(走 create) / '复用'(取回 inactive) / '(未发射)' */
  lastSource: string;
}

export interface GroupPoolInstance {
  apply(params: GroupPoolParams): void;
  dispose(): void;
}

const SCENE_KEY = 'GroupPool';
const POOL_MAX = 12;
const SPAWN_INTERVAL = 260;
/** 子弹回升速度:px/s,用 delta 换算保证不同帧率下速度一致。 */
const BULLET_SPEED = 220;
const CENTER_X = GAME_WIDTH / 2;

interface Bullet extends Phaser.GameObjects.Image {
  speedY?: number;
}

class GroupPoolScene extends Phaser.Scene {
  private group?: Phaser.GameObjects.Group;
  private spawnTimer = 0;
  private lastSource = '(未发射)';
  private params: GroupPoolParams = { spawning: true, recycle: true };

  emitSnapshot: (snapshot: GroupPoolSnapshot) => void = () => {};

  constructor() {
    super({ key: SCENE_KEY });
  }

  preload() {
    if (!this.textures.exists('cg-bullet')) {
      const g = this.make.graphics();
      g.fillStyle(0x38bdf8, 1);
      g.fillCircle(10, 10, 9);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(10, 10, 3);
      g.generateTexture('cg-bullet', 20, 20);
      g.destroy();
    }
  }

  create() {
    this.group = this.add.group({
      classType: Phaser.GameObjects.Image, // get()/create() 用哪个类造对象
      defaultKey: 'cg-bullet',             // create() 缺省纹理
      maxSize: POOL_MAX,                   // 池上限:create 在满员时返回 null
    });

    this.drawBelt();
    this.add
      .text(12, GAME_HEIGHT - 20, '发射器 = 底部白线 · 子弹 = 分组成员(非容器,各自独立飞行)', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#8fa3c8',
      })
      .setOrigin(0, 0.5)
      .setDepth(10);
  }

  /** Controls 入口:参数即时生效,不重建分组。 */
  apply(params: GroupPoolParams) {
    this.params = params;
  }

  override update(_time: number, delta: number) {
    if (!this.group) {
      return;
    }

    if (this.params.spawning) {
      this.spawnTimer += delta;
      while (this.spawnTimer >= SPAWN_INTERVAL) {
        this.spawnTimer -= SPAWN_INTERVAL;
        this.fire();
      }
    } else {
      this.spawnTimer = 0;
    }

    this.fly(delta);
    this.report();
  }

  /** 池取用:get(x, y) 取回第一个 inactive 成员并赋值坐标;没有则 create 新建。 */
  private fire() {
    const group = this.group;
    if (!group) {
      return;
    }

    const x = CENTER_X + Phaser.Math.Between(-110, 110);
    const before = group.getLength();
    const bullet = group.get(x, GAME_HEIGHT - 34) as Bullet | null;
    if (!bullet) {
      // isFull 时 get 的 createIfNull 走 create,create 在满员时返回 null
      this.lastSource = '(池满,create 返回 null)';
      return;
    }

    bullet.setActive(true).setVisible(true);
    bullet.speedY = -BULLET_SPEED * Phaser.Math.FloatBetween(0.75, 1.25);
    this.lastSource = group.getLength() > before ? '新建(create 路径)' : '复用(取回 inactive)';
  }

  /** 成员各自独立飞行:分组不提供任何"父级驱动",运动写在成员自身上。 */
  private fly(delta: number) {
    const group = this.group;
    if (!group) {
      return;
    }

    for (const member of group.getChildren()) {
      const bullet = member as Bullet;
      if (!bullet.active) {
        continue;
      }
      bullet.y += (bullet.speedY ?? -BULLET_SPEED) * (delta / 1000);

      if (bullet.y < -20) {
        if (this.params.recycle) {
          // 归还池:失活 + 隐藏,对象保留,下次 get() 直接复用
          group.killAndHide(bullet);
        }
        // recycle 关闭时保持 active 停在画面外:池被"占用",直到耗尽
      }
    }
  }

  private report() {
    const group = this.group;
    if (!group) {
      return;
    }

    this.emitSnapshot({
      total: group.getLength(),
      active: group.countActive(true),
      inactive: group.countActive(false),
      totalFree: group.getTotalFree(),
      isFull: group.isFull(),
      lastSource: this.lastSource,
    });
  }

  /** 发射台参考线。 */
  private drawBelt() {
    const belt = this.add.graphics().setDepth(-10);
    belt.lineStyle(2, 0x3b4a6b, 1);
    belt.lineBetween(CENTER_X - 130, GAME_HEIGHT - 24, CENTER_X + 130, GAME_HEIGHT - 24);
  }
}

export function createGroupPool(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GroupPoolSnapshot) => void,
): GroupPoolInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new GroupPoolScene();
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
    apply(params: GroupPoolParams) {
      scene.apply(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
