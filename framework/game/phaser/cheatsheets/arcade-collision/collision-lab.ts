/**
 * 范例:Arcade 碰撞实验室——玩家 + 平台 + 收集物 + 危险物的经典组合。
 * 输入(Controls):「箱子判定」在 collider / overlap 间切换(演示两者机制差异与
 * Collider.active 句柄);「箱子 immovable」演示推挤语义;「玩家 bounce」演示
 * 分离后的反弹;「平台带动」即 friction(骑乘者跟随移动平台的比例);
 * 「debug 绘制」开关物理调试渲染;「暂停物理」调用 world.pause()/resume()。
 * 主要操作:←/→ 移动,↑/空格 跳;走上移动平台体验带动;撞箱子推挤;
 * 吃星星计收集;碰尖刺计命中并被弹开。
 * 预期结果:readout 展示收集数、命中数、箱子判定事件数、最近回调对象对、
 * 玩家 touching/blocked、活动 collider 数与物理暂停状态,随操作同步变化。
 * 阅读主线:makeTextures(自包含素材)→ create(场景布局 + 6 个 collider/
 * overlap 注册)→ update(输入、平台巡逻、星星浮动)→ 各回调(计数与最近对)
 * → apply(Controls 参数如何落到 body 与 Collider 上)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的实验参数。 */
export interface CollisionLabOptions {
  /** 玩家 vs 箱子的判定方式:collider 会分离推挤,overlap 只回调不分离 */
  crateJudge: 'collider' | 'overlap';
  /** 箱子是否 immovable:true 时玩家撞上被弹开,箱子纹丝不动 */
  cratesImmovable: boolean;
  /** 玩家 bounce:分离后的速度保留比例 */
  playerBounce: number;
  /** 移动平台 friction:骑乘者被平台水平带动的比例(0~1) */
  moverCarry: number;
  /** 是否显示物理 debug 绘制 */
  debugBodies: boolean;
  /** 是否暂停物理世界 */
  physicsPaused: boolean;
}

export interface CollisionLabSnapshot {
  stars: number;
  hits: number;
  crateEvents: number;
  crateJudge: 'collider' | 'overlap';
  lastPair: string;
  touching: string;
  blockedDown: boolean;
  activeColliders: number;
  totalColliders: number;
  paused: boolean;
  playerX: number;
}

export interface CollisionLabInstance {
  applyOptions(options: CollisionLabOptions): void;
  dispose(): void;
}

const GRAVITY_Y = 900;
const PLAYER_SPEED = 260;
const JUMP_VELOCITY = -420;
const MOVER_SPEED = 90;
const MOVER_MIN_X = 250;
const MOVER_MAX_X = 590;
const SPIKE_COOLDOWN_MS = 600;
const STAR_RESPAWN_MS = 1600;

class CollisionScene extends Phaser.Scene {
  /** 逐轮状态在 init 归零(场景实例会被 restart 复用)。 */
  private stars = 0;
  private hits = 0;
  private crateEvents = 0;
  private lastPair = '—';

  private player?: Phaser.Physics.Arcade.Image;
  private mover?: Phaser.Physics.Arcade.Image;
  private crates?: Phaser.Physics.Arcade.Group;
  private starGroup?: Phaser.Physics.Arcade.Group;
  private spikes?: Phaser.Physics.Arcade.StaticGroup;
  private crateCollider?: Phaser.Physics.Arcade.Collider;
  private crateOverlap?: Phaser.Physics.Arcade.Collider;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private jumpKey?: Phaser.Input.Keyboard.Key;
  private lastHitAt = 0;
  private starIndex = 0;

  /** 当前生效的箱子判定方式:applyOptions 切换两个 Collider 的 active。 */
  private crateJudge: 'collider' | 'overlap' = 'collider';

  emitSnapshot: (snapshot: CollisionLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'CollisionLab' });
  }

  preload() {
    this.makeTextures();
  }

  create() {
    this.stars = 0;
    this.hits = 0;
    this.crateEvents = 0;
    this.lastPair = '—';
    this.starIndex = 0;

    // 静态平台组:地面 + 两块悬浮板。静态体 immovable 恒为 true,只当"墙"
    const platforms = this.physics.add.staticGroup();
    platforms.create(GAME_WIDTH / 2, GAME_HEIGHT - 12, 'ground');
    platforms.create(150, 250, 'slab');
    platforms.create(GAME_WIDTH - 150, 250, 'slab');

    // 危险物:两个尖刺,同样放进静态组
    this.spikes = this.physics.add.staticGroup();
    const spike1 = this.spikes.create(360, GAME_HEIGHT - 36, 'spike');
    const spike2 = this.spikes.create(410, GAME_HEIGHT - 36, 'spike');
    spike1.setName('spike1');
    spike2.setName('spike2');

    // 玩家:动态体,与世界边界碰撞,起始 bounce 由 Controls 决定
    this.player = this.physics.add
      .image(120, GAME_HEIGHT - 60, 'player')
      .setCollideWorldBounds(true)
      .setBounce(0);
    this.player.setName('player');

    // 移动平台:动态体 + immovable——会移动、能骑,但永不被推动
    this.mover = this.physics.add
      .image(MOVER_MIN_X + 60, 190, 'mover')
      .setImmovable(true)
      .setVelocityX(MOVER_SPEED);
    this.mover.setName('mover');

    // 箱子:动态组,组配置的 dragX 会套给每个成员;create 后逐个命名
    this.crates = this.physics.add.group({ dragX: 600 });
    const crateXs = [230, 272, 314];
    crateXs.forEach((x, i) => {
      const crate = this.crates!.create(x, GAME_HEIGHT - 41, 'crate');
      crate.setName(`crate${i + 1}`);
    });

    // 收集物:动态组关重力,update 里做正弦浮动
    this.starGroup = this.physics.add.group({ allowGravity: false });
    this.spawnStar(150, 190);
    this.spawnStar(GAME_WIDTH - 150, 190);
    this.spawnStar(360, 90);
    this.spawnStar(560, 90);

    // ---- 6 个判定注册:1 个 overlap × 3 + collider × 2 + 切换用的一对 ----
    this.physics.add.collider(this.player, platforms);
    this.physics.add.collider(this.player, this.mover);

    // 玩家 vs 箱子:collider 与 overlap 各注册一个,靠 active 二选一
    // (Collider 创建时 active 恒为 true,先按默认模式 collider 关掉另一个)
    this.crateCollider = this.physics.add.collider(
      this.player,
      this.crates,
      this.onCratePair,
      undefined,
      this,
    );
    this.crateOverlap = this.physics.add.overlap(
      this.player,
      this.crates,
      this.onCratePair,
      undefined,
      this,
    );
    this.crateOverlap.active = false;

    this.physics.add.overlap(
      this.player,
      this.starGroup,
      this.collectStar,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.spikes,
      this.hitSpike,
      undefined,
      this,
    );

    // debug 绘制:config 里 debug: true 已创建 debugGraphic,抬高深度盖在精灵上
    this.physics.world.debugGraphic.setDepth(999);

    this.add.text(24, 16, '←/→ 移动,↑/空格 跳;撞箱子、吃星星、避开尖刺', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '12px',
      color: '#8fa3c8',
    });

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.jumpKey = this.input.keyboard?.addKey('SPACE');

    this.report();
  }

  /** 帧计数:仅为节流 readout 刷新频率。 */
  private frames = 0;

  override update(time: number) {
    const player = this.player;
    if (player && this.cursors) {
      if (this.cursors.left.isDown) {
        player.setVelocityX(-PLAYER_SPEED);
      } else if (this.cursors.right.isDown) {
        player.setVelocityX(PLAYER_SPEED);
      } else {
        player.setVelocityX(0);
      }
      // 落地判定:blocked.down 撞的是世界边界/图块,touching.down 撞的是另一个 body
      const onGround = player.body!.blocked.down || player.body!.touching.down;
      if (onGround && (this.cursors.up.isDown || this.jumpKey?.isDown)) {
        player.setVelocityY(JUMP_VELOCITY);
      }
    }

    // 移动平台巡逻:到端点反向
    if (this.mover) {
      const v = this.mover.body!.velocity.x;
      if (this.mover.x <= MOVER_MIN_X && v < 0) {
        this.mover.setVelocityX(MOVER_SPEED);
      } else if (this.mover.x >= MOVER_MAX_X && v > 0) {
        this.mover.setVelocityX(-MOVER_SPEED);
      }
    }

    // 星星正弦浮动:直接改坐标即可,overlap 只看 body 是否相交
    this.starGroup?.getChildren().forEach((child, i) => {
      const star = child as Phaser.Physics.Arcade.Image;
      star.y = star.getData('baseY') + Math.sin(time * 0.004 + i * 1.3) * 6;
    });

    this.frames += 1;
    if (this.frames % 6 === 0) {
      this.report();
    }
  }

  private spawnStar(x: number, y: number) {
    const star = this.starGroup!.create(x, y, 'star');
    this.starIndex += 1;
    star.setName(`star${this.starIndex}`);
    star.setData('baseY', y);
  }

  /** 玩家 vs 箱子:collider 与 overlap 两种模式下都走这里,计数与最近对相同,差别只在是否分离。 */
  private onCratePair: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    object1,
    object2,
  ) => {
    // 回调参数类型是游戏对象与 body 的并集,这里两者都是命了名的游戏对象
    const name1 = (object1 as Phaser.GameObjects.GameObject).name;
    const name2 = (object2 as Phaser.GameObjects.GameObject).name;
    this.crateEvents += 1;
    this.lastPair = `${name1} ↔ ${name2}`;
  };

  private collectStar: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _player,
    starObject,
  ) => {
    const star = starObject as Phaser.Physics.Arcade.Image;
    this.stars += 1;
    this.lastPair = `player ↔ ${star.name}`;
    star.destroy();
    // 1.6s 后在顶部随机位置补一颗,演示持续可玩;回调里销毁对象是安全模式
    this.time.delayedCall(STAR_RESPAWN_MS, () => {
      this.spawnStar(Phaser.Math.Between(60, GAME_WIDTH - 60), Phaser.Math.Between(60, 200));
      this.report();
    });
    this.report();
  };

  private hitSpike: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    playerObject,
    spikeObject,
  ) => {
    // overlap 每对每步都会触发:用冷却窗口把"一次碰撞"折算成一次命中
    const now = this.time.now;
    if (now - this.lastHitAt < SPIKE_COOLDOWN_MS) {
      return;
    }
    this.lastHitAt = now;
    const player = playerObject as Phaser.Physics.Arcade.Image;
    const spike = spikeObject as Phaser.Physics.Arcade.Image;
    this.hits += 1;
    this.lastPair = `player ↔ ${spike.name}`;
    // 击退:方向取玩家相对尖刺的一侧——overlap 不分离,位移逻辑自己写
    const dir = Math.sign(player.x - spike.x) || 1;
    player.setVelocity(dir * 220, -320);
    this.report();
  };

  private report() {
    const body = this.player?.body;
    const touching = body?.touching;
    const touchingLabel = touching
      ? (['up', 'down', 'left', 'right'] as const).find((side) => touching[side]) ??
        'none'
      : 'none';
    const colliders = this.physics.world.colliders.getActive();
    this.emitSnapshot({
      stars: this.stars,
      hits: this.hits,
      crateEvents: this.crateEvents,
      crateJudge: this.crateJudge,
      lastPair: this.lastPair,
      touching: touchingLabel,
      blockedDown: body?.blocked.down ?? false,
      activeColliders: colliders.filter((c) => c.active).length,
      totalColliders: colliders.length,
      paused: this.physics.world.isPaused,
      playerX: Math.round(this.player?.x ?? 0),
    });
  }

  /** Controls 落地点:每个参数直接改对应 body / Collider / world 的公开属性。 */
  applyOptions(options: CollisionLabOptions) {
    const judgeChanged = options.crateJudge !== this.crateJudge;
    this.crateJudge = options.crateJudge;
    // 同一对对象注册了 collider 与 overlap 两个 Collider,靠 active 二选一
    if (this.crateCollider) {
      this.crateCollider.active = options.crateJudge === 'collider';
    }
    if (this.crateOverlap) {
      this.crateOverlap.active = options.crateJudge === 'overlap';
    }
    if (judgeChanged) {
      this.report();
    }
    this.crates?.getChildren().forEach((child) => {
      (child as Phaser.Physics.Arcade.Image).setImmovable(options.cratesImmovable);
    });
    this.player?.setBounce(options.playerBounce);
    this.mover?.setFriction(options.moverCarry);
    this.physics.world.debugGraphic.setVisible(options.debugBodies);
    if (options.physicsPaused) {
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
    }
  }

  /** 自包含素材:Graphics 画完 generateTexture 烘焙成普通纹理,不依赖外部文件。 */
  private makeTextures() {
    if (this.textures.exists('player')) {
      return;
    }
    const player = this.make.graphics();
    player.fillStyle(0x38bdf8, 1);
    player.fillRoundedRect(0, 0, 28, 36, 6);
    player.generateTexture('player', 28, 36);
    player.destroy();

    const ground = this.make.graphics();
    ground.fillStyle(0x334155, 1);
    ground.fillRect(0, 0, GAME_WIDTH, 24);
    ground.generateTexture('ground', GAME_WIDTH, 24);
    ground.destroy();

    const slab = this.make.graphics();
    slab.fillStyle(0x64748b, 1);
    slab.fillRoundedRect(0, 0, 160, 18, 8);
    slab.generateTexture('slab', 160, 18);
    slab.destroy();

    const mover = this.make.graphics();
    mover.fillStyle(0xf59e0b, 1);
    mover.fillRoundedRect(0, 0, 120, 16, 7);
    mover.generateTexture('mover', 120, 16);
    mover.destroy();

    const crate = this.make.graphics();
    crate.fillStyle(0xa16207, 1);
    crate.fillRect(0, 0, 34, 34);
    crate.lineStyle(2, 0x713f12);
    crate.strokeRect(1, 1, 32, 32);
    crate.generateTexture('crate', 34, 34);
    crate.destroy();

    const star = this.make.graphics();
    star.fillStyle(0xfacc15, 1);
    star.fillCircle(13, 13, 13);
    star.generateTexture('star', 26, 26);
    star.destroy();

    const spike = this.make.graphics();
    spike.fillStyle(0xf87171, 1);
    spike.fillTriangle(0, 24, 12, 0, 24, 24);
    spike.generateTexture('spike', 24, 24);
    spike.destroy();
  }
}

export function createCollisionLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CollisionLabSnapshot) => void,
): CollisionLabInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: GRAVITY_Y },
        // 范例常开 debug:绘制 body 描边/静态体/速度线,Controls 可隐藏
        debug: true,
      },
    },
    scene: [CollisionScene],
  });

  const scene = game.scene.getScene('CollisionLab') as CollisionScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    applyOptions(options: CollisionLabOptions) {
      scene?.applyOptions(options);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
