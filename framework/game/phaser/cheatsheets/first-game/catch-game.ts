/**
 * 范例:第一个小游戏——「接住下落物」。
 * 输入:「下落速度」(px/s)与「生成间隔」(ms)两个 Controls 参数,随时生效。
 * 主要操作:指针移动挡板(键盘 ←/→ 亦可);接住黄色圆形 +10 分,
 * 碰到红色方块扣 1 条生命,生命耗尽游戏结束,点击画布或按空格重开。
 * 预期结果:readout 展示得分、剩余生命、游戏状态与场上物体数,
 * 各项数值随玩法与难度参数同步变化;重开后 init 把状态归零。
 * 阅读主线:makeTextures(自包含素材)→ init/create/update(生命周期职责)
 * → spawnItem/handleCatch(生成与判定)→ gameOver/updateDifficulty(状态与难度)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** 难度参数:Controls 直接驱动,运行中修改立即生效。 */
export interface CatchGameDifficulty {
  /** 下落速度,px/s;同时作用于已在场上的物体 */
  fallSpeed: number;
  /** 生成间隔,ms;越小下落物出现越密 */
  spawnDelay: number;
}

export interface CatchGameSnapshot {
  score: number;
  lives: number;
  state: 'playing' | 'over';
  itemsOnScreen: number;
}

export interface CatchGameInstance {
  setDifficulty(difficulty: CatchGameDifficulty): void;
  dispose(): void;
}

const GOOD_KEY = 'good';
const BAD_KEY = 'bad';
const START_LIVES = 3;
const GOOD_SCORE = 10;
const BAD_RATIO = 0.3;
const PADDLE_SPEED = 420;

class CatchScene extends Phaser.Scene {
  /** 每轮启动应重置的状态,统一放在 init(场景实例会被 restart 复用)。 */
  private score = 0;
  private lives = START_LIVES;
  private state: 'playing' | 'over' = 'playing';

  /** create 里创建的句柄;shutdown 自动清空,不在 init 重置。 */
  private paddle?: Phaser.Physics.Arcade.Image;
  private items?: Phaser.Physics.Arcade.Group;
  private spawner?: Phaser.Time.TimerEvent;
  private scoreText?: Phaser.GameObjects.Text;
  private livesText?: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  /** 当前难度:工厂注入,Controls 变化时更新。 */
  private difficulty: CatchGameDifficulty = { fallSpeed: 160, spawnDelay: 800 };

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: CatchGameSnapshot) => void = () => {};

  constructor() {
    super({ key: 'Catch' });
  }

  init() {
    // restart 会复用同一个场景实例,这里把逐轮状态显式归零
    this.score = 0;
    this.lives = START_LIVES;
    this.state = 'playing';
  }

  preload() {
    this.makeTextures();
  }

  create() {
    // 挡板:immovable 让它被撞时纹丝不动,物理仍能参与 overlap 判定
    this.paddle = this.physics.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT - 36, 'paddle')
      .setImmovable(true);

    // 下落物统一放进物理组:关重力,用恒定速度下落(便于难度参数直接控制)
    this.items = this.physics.add.group({ allowGravity: false });

    // 生成节奏:循环 TimerEvent,间隔即第二个难度参数
    this.spawner = this.time.addEvent({
      delay: this.difficulty.spawnDelay,
      loop: true,
      callback: this.spawnItem,
      callbackScope: this,
    });

    // 接住判定:overlap 不产生推挤,适合"接住/碰到"这类触发式交互
    this.physics.add.overlap(
      this.paddle,
      this.items,
      this.handleCatch,
      undefined,
      this,
    );

    this.scoreText = this.add.text(24, 20, '', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '16px',
      color: '#e2e8f0',
    });
    this.livesText = this.add.text(GAME_WIDTH - 24, 20, '', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '16px',
      color: '#e2e8f0',
    });
    this.livesText.setOrigin(1, 0);
    this.add.text(24, GAME_HEIGHT - 18, '移动指针或按 ←/→ 操控挡板', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '12px',
      color: '#8fa3c8',
    }).setOrigin(0, 1);
    this.refreshHud();

    this.cursors = this.input.keyboard?.createCursorKeys();
    // 指针跟随:worldX 已换算到世界坐标,相机滚动时依然正确
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.state !== 'playing' || !this.paddle) {
        return;
      }
      this.paddle.x = Phaser.Math.Clamp(pointer.worldX, 60, GAME_WIDTH - 60);
    });

    this.report();
  }

  override update() {
    if (this.state !== 'playing') {
      return;
    }

    // 键盘方案:用速度驱动挡板,与指针直设坐标并存,后触发者生效
    if (this.paddle && this.cursors) {
      if (this.cursors.left.isDown) {
        this.paddle.setVelocityX(-PADDLE_SPEED);
      } else if (this.cursors.right.isDown) {
        this.paddle.setVelocityX(PADDLE_SPEED);
      } else {
        this.paddle.setVelocityX(0);
      }
    }

    // 出界回收:落出屏幕下沿的下落物直接销毁(漏接不扣分)
    if (this.items) {
      for (const child of [...this.items.getChildren()]) {
        if ((child as Phaser.Physics.Arcade.Image).y > GAME_HEIGHT + 24) {
          child.destroy();
        }
      }
    }

    if (this.updateTick() % 6 === 0) {
      this.report();
    }
  }

  /** 帧计数:仅为节流 readout 刷新频率。 */
  private frames = 0;

  private updateTick(): number {
    this.frames += 1;
    return this.frames;
  }

  private spawnItem() {
    if (!this.items || this.state !== 'playing') {
      return;
    }
    // 约 30% 生成危险物;Between 取闭区间随机整数
    const key = Math.random() < BAD_RATIO ? BAD_KEY : GOOD_KEY;
    const x = Phaser.Math.Between(36, GAME_WIDTH - 36);
    const item = this.items.create(x, -18, key) as Phaser.Physics.Arcade.Image;
    item.setVelocityY(this.difficulty.fallSpeed);
  }

  /** overlap 回调:两参顺序与注册时 object1/object2 对应,用官方回调类型获得参数推断。 */
  private handleCatch: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _paddle,
    item,
  ) => {
    const caught = item as Phaser.Physics.Arcade.Image;
    if (caught.texture.key === GOOD_KEY) {
      this.score += GOOD_SCORE;
    } else {
      this.lives -= 1;
      if (this.lives <= 0) {
        caught.destroy();
        this.gameOver();
        return;
      }
    }
    caught.destroy();
    this.refreshHud();
    this.report();
  };

  private gameOver() {
    this.state = 'over';
    this.spawner?.remove();
    this.items?.clear(true, true);
    this.paddle?.setVelocity(0, 0);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '游戏结束\n点击画布或按空格重开', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '22px',
        color: '#f87171',
        align: 'center',
      })
      .setOrigin(0.5);
    // 只在结束后监听重开:once 触发一次即摘除
    this.input.once('pointerdown', this.requestRestart, this);
    this.input.keyboard?.once('keydown-SPACE', this.requestRestart, this);
    this.report();
  }

  private requestRestart() {
    if (this.state === 'over') {
      this.scene.restart();
    }
  }

  private refreshHud() {
    this.scoreText?.setText(`得分 ${this.score}`);
    this.livesText?.setText(`生命 ${this.lives}`);
  }

  private report() {
    this.emitSnapshot({
      score: this.score,
      lives: Math.max(0, this.lives),
      state: this.state,
      itemsOnScreen: this.items?.getLength() ?? 0,
    });
  }

  /** 难度更新:下落速度立即作用于场上物体;间隔是只读的,定时器须重建。 */
  updateDifficulty(difficulty: CatchGameDifficulty) {
    this.difficulty = difficulty;
    if (this.state !== 'playing') {
      // 结束态场上已清空,无需重建;重启后 create 按最新难度新建定时器
      return;
    }
    this.items?.getChildren().forEach((child) => {
      (child as Phaser.Physics.Arcade.Image).setVelocityY(difficulty.fallSpeed);
    });
    if (this.spawner && this.spawner.delay !== difficulty.spawnDelay) {
      this.spawner.remove();
      this.spawner = this.time.addEvent({
        delay: difficulty.spawnDelay,
        loop: true,
        callback: this.spawnItem,
        callbackScope: this,
      });
    }
  }

  /** 自包含素材:Graphics 画完 generateTexture 烘焙成普通纹理,不依赖外部文件。 */
  private makeTextures() {
    if (this.textures.exists('paddle')) {
      return;
    }
    const paddle = this.make.graphics();
    paddle.fillStyle(0x4ade80, 1);
    paddle.fillRoundedRect(0, 0, 104, 18, 9);
    paddle.generateTexture('paddle', 104, 18);
    paddle.destroy();

    const good = this.make.graphics();
    good.fillStyle(0xfacc15, 1);
    good.fillCircle(14, 14, 14);
    good.generateTexture(GOOD_KEY, 28, 28);
    good.destroy();

    const bad = this.make.graphics();
    bad.fillStyle(0xf87171, 1);
    bad.fillRect(0, 0, 26, 26);
    bad.generateTexture(BAD_KEY, 26, 26);
    bad.destroy();
  }
}

export function createCatchGame(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CatchGameSnapshot) => void,
): CatchGameInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    // 整个游戏只用 Arcade 的"速度 + overlap"能力:重力设 0,下落节奏完全由参数控制
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
    scene: [CatchScene],
  });

  const scene = game.scene.getScene('Catch') as CatchScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    setDifficulty(difficulty: CatchGameDifficulty) {
      scene?.updateDifficulty(difficulty);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
