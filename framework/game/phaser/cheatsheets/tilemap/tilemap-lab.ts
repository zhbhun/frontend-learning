/**
 * 范例:瓦片地图——加载手工构建的 Tiled JSON(level.json,40×24,正交,
 * 地面/装饰/前景三个 tilelayer)与两个瓦片集(terrain.png / props.png),
 * 完整走一遍「加载图片 → tilemapTiledJSON → make.tilemap → addTilesetImage
 * → createLayer」的关卡装配链路。
 * 输入(Controls):三个图层的显隐开关、zoom 缩放(0.5–2)、skipCull 跳过剔除。
 * 主要操作:在画布上按住拖拽平移摄像机(滚动受 setBounds 钳制在地图内);
 * 切换图层显隐观察层叠(前景砖墙压住装饰层的树桩);开关 skipCull 对比
 * tilesDrawn(剔除只画镜头内的瓦片)。
 * 预期结果:readout 同步地图尺寸、tileWidth/tileHeight、orientation、
 * renderOrder、图层名列表、tileset 名与 firstgid、各层 tilesDrawn/tilesTotal、
 * 滚动位置与 zoom——全部来自 map 与 layer 的真实属性。
 * 阅读主线:preload(加载地图与瓦片集)→ create(装配三层 + 相机边界)
 * → update(拖拽平移 + report)→ applyParams(Controls 入口)。
 */
import Phaser from 'phaser';
import levelJsonUrl from './level.json?url';
import terrainPngUrl from './terrain.png?url';
import propsPngUrl from './props.png?url';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即时生效,不重建地图。 */
export interface TilemapLabParams {
  /** 地面层 setVisible */
  showGround: boolean;
  /** 装饰层 setVisible */
  showDecoration: boolean;
  /** 前景层 setVisible */
  showForeground: boolean;
  /** 摄像机 setZoom:0.5–2 的显示缩放 */
  zoom: number;
  /** 三个层一起 setSkipCull:关闭剔除,全部瓦片都进渲染列表 */
  skipCull: boolean;
}

/** readout 用的派生读数:全部来自 map / layer / camera 的真实属性。 */
export interface TilemapLabSnapshot {
  mapSize: string;
  tileSize: string;
  orientation: string;
  renderOrder: string;
  layerNames: string;
  tilesets: string;
  drawnPerLayer: string;
  drawnTotal: string;
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export interface TilemapLabInstance {
  applyParams(params: TilemapLabParams): void;
  dispose(): void;
}

class TilemapLabScene extends Phaser.Scene {
  private ground?: Phaser.Tilemaps.TilemapLayer;
  private decoration?: Phaser.Tilemaps.TilemapLayer;
  private foreground?: Phaser.Tilemaps.TilemapLayer;
  private ready = false;
  private pending: TilemapLabParams | null = null;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: TilemapLabSnapshot) => void = () => {};

  constructor() {
    super({ key: 'TilemapLab' });
  }

  preload() {
    // 第一步:瓦片集是普通图片,与地图文件各自独立加载。
    // 纹理 key 不必等于 Tiled 里的 tileset name,addTilesetImage 负责对接。
    this.load.image('terrain-tiles', terrainPngUrl);
    this.load.image('props-tiles', propsPngUrl);
    // 第二步:地图本体只是数据(不含像素),进 tilemap 缓存。
    this.load.tilemapTiledJSON('level', levelJsonUrl);
  }

  create() {
    // 第三步:从缓存解析出 Tilemap(尺寸、图层、tileset 全部来自 JSON)。
    const map = this.make.tilemap({ key: 'level' });

    // 第四步:按 Tiled 里的 tileset name 关联已加载的纹理,
    // 返回解析好的 Tileset(含 firstgid / 行列数),供 createLayer 使用。
    const terrain = map.addTilesetImage('terrain', 'terrain-tiles');
    const props = map.addTilesetImage('props', 'props-tiles');
    if (!terrain || !props) {
      throw new Error('addTilesetImage 失败:检查 tileset name 与纹理 key');
    }

    // 第五步:逐层创建渲染层。装饰层混用两个 tileset(数组传入);
    // createLayer 的层名必须与 Tiled 里的 layers[].name 完全一致。
    // 不传 gpu 时运行时返回 TilemapLayer,类型上是联合,这里收窄给场景字段。
    this.ground = map.createLayer('地面', terrain) as Phaser.Tilemaps.TilemapLayer;
    this.decoration = map.createLayer('装饰', [
      terrain,
      props,
    ]) as Phaser.Tilemaps.TilemapLayer;
    this.foreground = map.createLayer('前景', props) as Phaser.Tilemaps.TilemapLayer;

    // 层是普通显示对象:显式 setDepth 固定层叠顺序,不依赖创建顺序。
    this.ground.setDepth(0);
    this.decoration.setDepth(1);
    this.foreground.setDepth(2);

    // 相机边界 = 地图像素尺寸,滚动被钳制在地图内(见 2.5.1 摄像机控制)。
    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    // 开局对准地图左上的石板区
    cam.centerOn(320, 240);

    this.ready = true;
    if (this.pending) {
      this.applyParams(this.pending);
      this.pending = null;
    }
  }

  override update(): void {
    const cam = this.cameras.main;
    // 拖拽平移:指针按下时反向移动滚动量(除以 zoom,保证缩放后手感一致)。
    // bounds 已开启,越界的 scroll 每帧自动被钳回。
    const pointer = this.input.activePointer;
    if (pointer.isDown) {
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    }
    this.report();
  }

  /** Controls 入口:显隐与剔除在变化时写入对应层,zoom 写入相机。 */
  applyParams(params: TilemapLabParams) {
    if (!this.ready) {
      this.pending = params;
      return;
    }
    this.ground?.setVisible(params.showGround);
    this.decoration?.setVisible(params.showDecoration);
    this.foreground?.setVisible(params.showForeground);
    this.cameras.main.setZoom(params.zoom);

    for (const layer of [this.ground, this.decoration, this.foreground]) {
      layer?.setSkipCull(params.skipCull);
    }
  }

  private report() {
    const map = this.ground?.tilemap;
    if (!map) {
      return;
    }
    const cam = this.cameras.main;

    // tilesDrawn:上一帧真正进渲染列表的瓦片数(剔除后的可见瓦片);
    // tilesTotal:该层网格总数(width × height,含空格)。隐藏层按 0 计。
    const layers = [
      ['地面', this.ground],
      ['装饰', this.decoration],
      ['前景', this.foreground],
    ] as const;
    const drawn = layers.map(([name, layer]) => {
      const n = layer?.visible ? layer.tilesDrawn : 0;
      return `${name} ${n}`;
    });
    const drawnSum = layers.reduce(
      (sum, [, layer]) => sum + (layer?.visible ? layer.tilesDrawn : 0),
      0,
    );
    const totalSum = layers.reduce(
      (sum, [, layer]) => sum + (layer?.tilesTotal ?? 0),
      0,
    );

    this.emitSnapshot({
      mapSize: `${map.width} × ${map.height} 瓦片(${map.widthInPixels} × ${map.heightInPixels} px)`,
      tileSize: `${map.tileWidth} × ${map.tileHeight}`,
      orientation: map.orientation,
      renderOrder: map.renderOrder,
      layerNames: map.getTileLayerNames().join(' / '),
      tilesets: map.tilesets
        .map((t) => `${t.name}(firstgid ${t.firstgid})`)
        .join(' + '),
      drawnPerLayer: drawn.join(' · '),
      drawnTotal: `${drawnSum} / ${totalSum} 格`,
      scrollX: Math.round(cam.scrollX),
      scrollY: Math.round(cam.scrollY),
      zoom: cam.zoom,
    });
  }
}

export function createTilemapLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TilemapLabSnapshot) => void,
): TilemapLabInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new TilemapLabScene();
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    // 像素风瓦片:关闭反走样 + 整像素渲染(见正文「像素清晰」一节)
    pixelArt: true,
    scene: [scene],
  });

  scene.emitSnapshot = emit;

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    applyParams(params: TilemapLabParams) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
