/**
 * 范例:Sprite 与 Image 的能力差异——同一份双帧纹理,并排创建两类对象。
 * 输入:「播放动画」开关。
 * 主要操作:打开开关,右侧 Sprite 在 solid/ring 两帧间切换,左侧 Image 永远停在
 * 初始帧;关闭开关,Sprite 停在当前帧。
 * 预期结果:readout 显示 sprite.anims.isPlaying 随开关变化,image 上不存在
 * anims 组件——两者唯一的 API 差异就是动画能力。
 * 阅读主线:makeCoinSheet(单纹理双帧)→ create(并排对象与动画)
 * → setPlayback(Controls 入口)→ report(差异证据)。
 * 帧动画的完整用法属于 2.3.1,本范例只保留区分两类对象所需的最小动画代码。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

export interface SpriteVsImageSnapshot {
  playing: boolean;
  spriteFrame: string;
  imageFrame: string;
  imageHasAnims: boolean;
}

export interface SpriteVsImageInstance {
  setPlayback(playing: boolean): void;
  dispose(): void;
}

const SHEET_KEY = 'coin';
const BLINK_ANIM = 'blink';
const FRAME_SIZE = 48;

class SpriteVsImageScene extends Phaser.Scene {
  private image?: Phaser.GameObjects.Image;
  private sprite?: Phaser.GameObjects.Sprite;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: SpriteVsImageSnapshot) => void = () => {};

  constructor() {
    super({ key: 'SpriteVsImage' });
  }

  preload() {
    this.makeCoinSheet();
  }

  create() {
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '14px',
      color: '#8fa3c8',
    };

    // 左:Image——静态显示,没有 anims 组件,创建后只能换纹理/换帧,不能播放动画
    this.image = this.add
      .image(GAME_WIDTH / 2 - 120, GAME_HEIGHT / 2 - 12, SHEET_KEY, 'solid')
      .setScale(2);
    this.add
      .text(this.image.x, this.image.y + 72, 'Image', labelStyle)
      .setOrigin(0.5);

    // 右:Sprite——多出 AnimationState(anims),能 play 全局动画
    this.sprite = this.add
      .sprite(GAME_WIDTH / 2 + 120, GAME_HEIGHT / 2 - 12, SHEET_KEY, 'solid')
      .setScale(2);
    this.add
      .text(this.sprite.x, this.sprite.y + 72, 'Sprite', labelStyle)
      .setOrigin(0.5);

    // 全局动画注册一次,任意 Sprite 可复用;帧动画细节见 2.3.1
    this.anims.create({
      key: BLINK_ANIM,
      frames: [
        { key: SHEET_KEY, frame: 'solid' },
        { key: SHEET_KEY, frame: 'ring' },
      ],
      frameRate: 2,
      repeat: -1,
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 36, '两个对象用同一份纹理、同样的变换;唯一差异是动画能力', {
        ...labelStyle,
        fontSize: '12px',
      })
      .setOrigin(0.5, 1);

    this.report();
  }

  override update() {
    this.report();
  }

  /** Controls 入口:开 → play(已在播则忽略);关 → stop 停在当前帧。 */
  setPlayback(playing: boolean) {
    if (!this.sprite) {
      return;
    }
    if (playing) {
      this.sprite.play(BLINK_ANIM, true);
    } else {
      this.sprite.stop();
    }
  }

  private report() {
    if (!this.image || !this.sprite) {
      return;
    }

    this.emitSnapshot({
      playing: this.sprite.anims.isPlaying,
      spriteFrame: this.sprite.frame.name,
      imageFrame: this.image.frame.name,
      // 运行时证据:Image 实例上根本没有 anims 组件
      imageHasAnims: 'anims' in this.image,
    });
  }

  /** 自包含素材:一张 96×48 纹理手动切成 solid/ring 两帧,动画帧必须来自同一纹理。 */
  private makeCoinSheet() {
    if (this.textures.exists(SHEET_KEY)) {
      return;
    }
    const g = this.make.graphics();
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(24, 24, 20); // 左半帧:实心圆
    g.lineStyle(5, 0xfacc15, 1);
    g.strokeCircle(72, 24, 16); // 右半帧:空心圆
    g.generateTexture(SHEET_KEY, FRAME_SIZE * 2, FRAME_SIZE);
    g.destroy();

    // generateTexture 只有整图一帧;手动 add 两帧供 setTexture/play 引用
    const sheet = this.textures.get(SHEET_KEY);
    sheet.add('solid', 0, 0, 0, FRAME_SIZE, FRAME_SIZE);
    sheet.add('ring', 0, FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE);
  }
}

export function createSpriteVsImage(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SpriteVsImageSnapshot) => void,
): SpriteVsImageInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new SpriteVsImageScene();
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
    setPlayback(playing: boolean) {
      scene.setPlayback(playing);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
