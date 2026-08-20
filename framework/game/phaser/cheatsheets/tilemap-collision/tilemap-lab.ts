/**
 * 范例:瓦片地图碰撞实验室——平台跳跃场景,素材自包含:
 * level.json 是手写的 Tiled JSON(Terrain 地形层 + Entities 对象层),
 * tileset.png 是自制瓦片集(草地/泥土/石块在 tileset 定义里带
 * { collides: true } 自定义属性,金币/尖刺/草丛不带)。
 * 输入(Controls):「瓦片碰撞可视化」用 layer.renderDebug 画出碰撞瓦片与
 * interesting faces;「物理调试」开关 Arcade body 绘制;「放置图块」选择
 * 点击画布时 putTileAtWorldXY 放石块(碰撞)还是金币瓦片(拾取回调)。
 * 主要操作:←/→ 移动,↑/空格 跳;踩金币瓦片触发 setTileIndexCallback 拾取;
 * 碰尖刺触发 setTileLocationCallback 命中与击退;拾取 createFromObjects
 * 生成的金币精灵(Tiled 自定义属性 score 落在 data store);点击瓦片:
 * 空位放置、已占用移除(动态改图)。
 * 预期结果:readout 展示玩家瓦片坐标、脚下瓦片 hasTileAt/collides、
 * 拾取与命中计数、最近 tile 回调、点击编辑计数、地形/碰撞瓦片总数。
 * 阅读主线:preload → create(地图解析 → 碰撞注册 → tile 回调 → 对象层
 * 实体化)→ update(移动 + renderDebug 重画)→ 各回调 → applyOptions。
 */
import Phaser from 'phaser';
import levelSource from './level.json?raw';
import tilesetUrl from './tileset.png?url';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的实验参数。 */
export interface TilemapLabOptions {
  /** 瓦片碰撞可视化:layer.renderDebug 画碰撞瓦片与 interesting faces */
  tileDebug: boolean;
  /** 物理 body 调试绘制 */
  bodyDebug: boolean;
  /** 点击画布放置的图块:石块(碰撞)或金币(拾取回调) */
  brush: 'stone' | 'coin';
}

export interface TilemapLabSnapshot {
  /** 玩家中心所在瓦片坐标,如 "(7, 6)" */
  playerTile: string;
  /** 脚下瓦片:hasTileAt、index、collides */
  footTile: string;
  /** 瓦片金币 / 精灵金币拾取数 */
  pickups: string;
  /** 尖刺命中数(setTileLocationCallback) */
  spikeHits: number;
  /** 最近一次 tile 回调的双方与瓦片 */
  lastTileCallback: string;
  /** 最近一次对象层金币拾取(含 data store 里的 score) */
  lastSpritePickup: string;
  /** 点击编辑统计:放置 / 移除 */
  edits: string;
  /** 全图瓦片统计:地形 / 碰撞 */
  tileStats: string;
}

export interface TilemapLabInstance {
  applyOptions(options: TilemapLabOptions): void;
  dispose(): void;
}

// 瓦片 gid,与 level.json 的 tileset 一一对应:
// 1 草地顶 2 泥土 3 石块(均带 collides:true)4 金币 5 尖刺 6 草丛
const TILE_GRASS = 1;
const TILE_DIRT = 2;
const TILE_STONE = 3;
const TILE_COIN = 4;
const TILE_SPIKE = 5;
const TILE_PLANT = 6;
const TILE_SIZE = 45;

const GRAVITY_Y = 900;
const PLAYER_SPEED = 240;
const JUMP_VELOCITY = -430;
const SPIKE_COOLDOWN_MS = 600;
/** 尖刺区(瓦片坐标):setTileLocationCallback 的注册区域 */
const SPIKE_REGION = { tileX: 9, tileY: 6, width: 2, height: 1 };

class TilemapLabScene extends Phaser.Scene {
  /** 逐轮状态在 create 归零(场景实例会被 restart 复用)。 */
  private tileCoins = 0;
  private spriteCoins = 0;
  private spikeHits = 0;
  private lastTileCallback = '—';
  private lastSpritePickup = '—';
  private placedCount = 0;
  private removedCount = 0;
  private lastSpikeAt = 0;
  private frames = 0;

  private map?: Phaser.Tilemaps.Tilemap;
  private layer?: Phaser.Tilemaps.TilemapLayer;
  private player?: Phaser.Physics.Arcade.Image;
  private coinGroup?: Phaser.Physics.Arcade.Group;
  private tileDebugGraphic?: Phaser.GameObjects.Graphics;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private jumpKey?: Phaser.Input.Keyboard.Key;

  /** Controls 当前值,applyOptions 更新。 */
  private options: TilemapLabOptions = {
    tileDebug: true,
    bodyDebug: false,
    brush: 'stone',
  };

  emitSnapshot: (snapshot: TilemapLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'TilemapLab' });
  }

  preload() {
    this.load.image('tileset', tilesetUrl);
    this.makeTextures();
  }

  create() {
    this.tileCoins = 0;
    this.spriteCoins = 0;
    this.spikeHits = 0;
    this.lastTileCallback = '—';
    this.lastSpritePickup = '—';
    this.placedCount = 0;
    this.removedCount = 0;

    this.buildMap();
    this.setupPlayer();
    this.setupTileCallbacks();
    this.spawnCoinSprites();
    this.setupEditing();

    // 瓦片碰撞可视化:renderDebug 画在 Graphics 自己的坐标系里,深度抬高
    this.tileDebugGraphic = this.add.graphics().setDepth(998);
    this.physics.world.debugGraphic.setDepth(999);

    this.add.text(
      12,
      10,
      '←/→ 移动,↑/空格 跳;点击瓦片放置/移除;金币瓦片与尖刺有特殊回调',
      {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#8fa3c8',
      },
    );

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.jumpKey = this.input.keyboard?.addKey('SPACE');
    this.report();
  }

  /** 解析手写 Tiled JSON → 创建图层 → 按属性注册碰撞。 */
  private buildMap() {
    // 手写 JSON 直接注入 tilemap 缓存,等价 load.tilemapTiledJSON 的产物;
    // 正规项目在 preload 里 this.load.tilemapTiledJSON('level', 'level.json')
    this.cache.tilemap.add('level', {
      format: Phaser.Tilemaps.Formats.TILED_JSON,
      data: JSON.parse(levelSource),
    });
    this.map = this.make.tilemap({ key: 'level' });
    const tileset = this.map.addTilesetImage('tiles', 'tileset');
    // gpu 缺省 false → 返回普通 TilemapLayer(动态改图与 Arcade 碰撞都用它);
    // 类型上仍是联合,收窄给本例使用
    const layer = this.map.createLayer(
      'Terrain',
      tileset!,
      0,
      0,
      false,
    ) as Phaser.Tilemaps.TilemapLayer;
    this.layer = layer;

    // 属性驱动:tileset 定义里草地/泥土/石块的 { collides: true }
    // 已在解析时合并到 tile.properties,这里按属性值圈定碰撞瓦片
    layer.setCollisionByProperty({ collides: true });
  }

  /** 出生点直接读对象层原始数据(getObjectLayer),不必生成游戏对象。 */
  private readSpawn(): { x: number; y: number } {
    const objectLayer = this.map!.getObjectLayer('Entities');
    const spawn = objectLayer?.objects.find((object) => object.name === 'spawn');
    return { x: spawn?.x ?? 157, y: spawn?.y ?? 290 };
  }

  /** 玩家 + 两类判定注册:collider 负责分离,overlap 让非碰撞瓦片的回调可触发。 */
  private setupPlayer() {
    const spawn = this.readSpawn();
    this.player = this.physics.add
      .image(spawn.x, spawn.y, 'player')
      .setCollideWorldBounds(true)
      .setName('player');

    // collider:只处理「碰撞且有 interesting face」的瓦片,站在地形上靠它
    this.physics.add.collider(this.player, this.layer!);
    // overlap:对相交的全部瓦片跑判定——金币/尖刺这类不碰撞的瓦片,
    // 它们的 tile 回调只有 overlap 这条通路才会被触发
    this.physics.add.overlap(this.player, this.layer!);
  }

  /** tile 回调:金币按 index 全图生效,尖刺按区域注册。 */
  private setupTileCallbacks() {
    // 按图块 id 注册:所有(含运行时放置的)金币瓦片踩上都走这里
    this.layer!.setTileIndexCallback(TILE_COIN, this.collectTileCoin, this);
    // 按瓦片区域注册:同一坐标系下的矩形(尖刺在 (9,6) 起 2×1 格)
    this.layer!.setTileLocationCallback(
      SPIKE_REGION.tileX,
      SPIKE_REGION.tileY,
      SPIKE_REGION.width,
      SPIKE_REGION.height,
      this.hitSpike,
      this,
    );
  }

  /** 对象层实体化:按 type 匹配生成金币精灵,score 属性落进 data store。 */
  private spawnCoinSprites() {
    const sprites = this.map!.createFromObjects('Entities', {
      type: 'coin',
      key: 'coin',
    }) as Phaser.GameObjects.Sprite[];
    this.coinGroup = this.physics.add.group({ allowGravity: false });
    sprites.forEach((sprite) => {
      this.coinGroup!.add(sprite);
    });
    this.physics.add.overlap(
      this.player!,
      this.coinGroup,
      this.collectSpriteCoin,
      undefined,
      this,
    );
  }

  /** 点击画布:空位放置当前笔刷瓦片,已占用则移除。 */
  private setupEditing() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const layer = this.layer!;
      const tile = layer.getTileAtWorldXY(pointer.worldX, pointer.worldY);
      if (tile && tile.index !== -1) {
        // 移除:默认把格子替换为 null,碰撞与面随瓦片一起消失
        layer.removeTileAt(tile.x, tile.y);
        this.removedCount += 1;
      } else {
        const index = this.options.brush === 'stone' ? TILE_STONE : TILE_COIN;
        layer.putTileAtWorldXY(index, pointer.worldX, pointer.worldY);
        if (index === TILE_STONE) {
          // putTileAt 只认 layer.collideIndexes(setCollision 写入的表),
          // setCollisionByProperty 不写它——属性驱动的碰撞在改图后重设一次,
          // 新放的石块才会挡人;金币瓦片不需要碰撞,跳过
          layer.setCollisionByProperty({ collides: true });
        }
        this.placedCount += 1;
      }
      this.report();
    });
  }

  /**
   * 金币瓦片回调(签名 (gameObject, tile)):在分离/回调主流程之前触发。
   * 不返回值 = 不否决;回调每步都会来,拾取即移除瓦片防重复计数。
   */
  private collectTileCoin(
    gameObject: Phaser.GameObjects.GameObject,
    tile: Phaser.Tilemaps.Tile,
  ) {
    this.tileCoins += 1;
    this.lastTileCallback = `${(gameObject as Phaser.Physics.Arcade.Image).name} ↔ tile(${tile.x},${tile.y}) #${tile.index}`;
    this.layer!.removeTileAt(tile.x, tile.y);
    this.report();
  }

  /** 尖刺区域回调:overlap 不分离,击退与冷却自己写。 */
  private hitSpike(
    gameObject: Phaser.GameObjects.GameObject,
    tile: Phaser.Tilemaps.Tile,
  ) {
    const now = this.time.now;
    if (now - this.lastSpikeAt < SPIKE_COOLDOWN_MS) {
      return;
    }
    this.lastSpikeAt = now;
    this.spikeHits += 1;
    this.lastTileCallback = `${(gameObject as Phaser.Physics.Arcade.Image).name} ↔ tile(${tile.x},${tile.y}) #${tile.index}`;
    (gameObject as Phaser.Physics.Arcade.Image).setVelocityY(-330);
    this.report();
  }

  /** 对象层金币:同名属性能直接 set 的落在对象上,其余进 data store。 */
  private collectSpriteCoin(_player: unknown, coinObject: unknown) {
    const coin = coinObject as Phaser.GameObjects.Sprite;
    const score = (coin.getData('score') as number | undefined) ?? 0;
    this.spriteCoins += 1;
    this.lastSpritePickup = `${coin.name}(score=${score})`;
    coin.destroy();
    this.report();
  }

  override update() {
    const player = this.player;
    if (player && this.cursors) {
      if (this.cursors.left.isDown) {
        player.setVelocityX(-PLAYER_SPEED);
      } else if (this.cursors.right.isDown) {
        player.setVelocityX(PLAYER_SPEED);
      } else {
        player.setVelocityX(0);
      }
      // 图块分离写的是 blocked(不是 touching),落地判定两者都查
      const onGround = player.body!.blocked.down || player.body!.touching.down;
      if (onGround && (this.cursors.up.isDown || this.jumpKey?.isDown)) {
        player.setVelocityY(JUMP_VELOCITY);
      }
    }

    // 改图会改变碰撞与 interesting faces,可视化每帧重画
    if (this.tileDebugGraphic) {
      this.tileDebugGraphic.clear();
      if (this.options.tileDebug && this.layer) {
        this.layer.renderDebug(this.tileDebugGraphic, {
          tileColor: null, // 非碰撞瓦片不铺色
          collidingTileColor: new Phaser.Display.Color(67, 176, 255, 90),
          faceColor: new Phaser.Display.Color(255, 75, 216, 230),
        });
      }
    }

    this.frames += 1;
    if (this.frames % 6 === 0) {
      this.report();
    }
  }

  /** 汇总 readout:瓦片坐标、脚下瓦片、计数与全图统计。 */
  private report() {
    const player = this.player;
    const map = this.map;
    const layer = this.layer;

    let playerTile = '—';
    let footTile = '—';
    if (player && map && layer) {
      // 世界坐标 → 瓦片坐标(默认向下取整到所在格)
      const tileXY = map.worldToTileXY(player.x, player.y)!;
      playerTile = `(${tileXY.x}, ${tileXY.y})`;

      // 脚下:玩家 body 底边往下 2px 的那格,坑上为空格 → hasTileAt false
      const foot = map.worldToTileXY(player.x, player.body!.bottom + 2)!;
      const has = layer.hasTileAt(foot.x, foot.y);
      const tile = layer.getTileAt(foot.x, foot.y);
      footTile = has
        ? `has=true #${tile?.index} collides=${tile?.collides === true}`
        : `has=false(空格或界外)`;
    }

    let terrainCount = 0;
    let collidingCount = 0;
    layer?.forEachTile(() => {
      terrainCount += 1;
    }, undefined, undefined, undefined, undefined, undefined, {
      isNotEmpty: true, // FilteringOptions:只数非空瓦片
    });
    layer?.forEachTile(() => {
      collidingCount += 1;
    }, undefined, undefined, undefined, undefined, undefined, {
      isColliding: true,
    });

    this.emitSnapshot({
      playerTile,
      footTile,
      pickups: `瓦片 ${this.tileCoins} / 精灵 ${this.spriteCoins}`,
      spikeHits: this.spikeHits,
      lastTileCallback: this.lastTileCallback,
      lastSpritePickup: this.lastSpritePickup,
      edits: `放 ${this.placedCount} / 移 ${this.removedCount}`,
      tileStats: `${terrainCount} / ${collidingCount}`,
    });
  }

  /** Controls 落地点:可视化开关与物理调试直接改公开属性。 */
  applyOptions(options: TilemapLabOptions) {
    this.options = options;
    this.physics.world.debugGraphic.setVisible(options.bodyDebug);
  }

  /** 自包含素材:玩家与对象层金币用 Graphics 烘焙,不依赖外部文件。 */
  private makeTextures() {
    if (this.textures.exists('player')) {
      return;
    }
    const player = this.make.graphics();
    player.fillStyle(0x38bdf8, 1);
    player.fillRoundedRect(0, 0, 34, 44, 8);
    player.generateTexture('player', 34, 44);
    player.destroy();

    const coin = this.make.graphics();
    coin.fillStyle(0xfacc15, 1);
    coin.fillCircle(14, 14, 14);
    coin.lineStyle(3, 0xca8a04);
    coin.strokeCircle(14, 14, 12);
    coin.generateTexture('coin', 28, 28);
    coin.destroy();
  }
}

export function createTilemapLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TilemapLabSnapshot) => void,
): TilemapLabInstance {
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
        debug: true, // 范例常备 debug 绘制,Controls 里默认隐藏
      },
    },
    scene: [TilemapLabScene],
  });

  const scene = game.scene.getScene('TilemapLab') as TilemapLabScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    applyOptions(options: TilemapLabOptions) {
      scene?.applyOptions(options);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
