/**
 * 范例:preload 之外手动加载。
 * 输入:「加载项」单选控件,切换后在 create 阶段排队并手动 load.start()。
 * 主要操作:分别加载 svg 图标、位图字体(png + fnt 两个文件)、
 * 一个必然失败的 url(触发 loaderror),以及用重复 key 排队两次
 * (第 2 次因 key 冲突被跳过)。
 * 预期结果:readout 显示每轮入队数、完成/失败数与逐事件日志;
 * svg 进纹理管理器且按 svgConfig 尺寸缩放,位图字体进 cache.bitmapFont,
 * 失败文件不进缓存,重复 key 不重复下载。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  TEXT_STYLE,
  TITLE_STYLE,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';
import flagUrl from './flag.svg?url&no-inline';
import digitsFontUrl from './digits-font.png?url&no-inline';
import digitsFntUrl from './digits.fnt?url&no-inline';

/** 必然加载失败的相对 url:请求当前页面目录下不存在的文件 */
const MISSING_URL = 'missing-asset.png';

export type ManualLoadAction =
  | 'none'
  | 'svg'
  | 'bitmapFont'
  | 'missing'
  | 'duplicate';

export interface ManualLoadSnapshot {
  action: string;
  queued: string;
  loading: boolean;
  done: string;
  eventLog: string;
  flagTexture: string;
  bitmapFont: string;
  ghostTexture: string;
}

export interface ManualLoadInstance {
  perform(action: ManualLoadAction): void;
  dispose(): void;
}

const ACTION_LABELS: Record<ManualLoadAction, string> = {
  none: '(无)',
  svg: "load.svg('flag')",
  bitmapFont: "load.bitmapFont('digits')",
  missing: "load.image('ghost', 缺失 url)",
  duplicate: "load.image('flag') ×2",
};

class ManualScene extends Phaser.Scene {
  private action: ManualLoadAction = 'none';
  private queuedCount = 0;
  private eventLog: string[] = ['(尚未加载)'];
  private actionLayer?: Phaser.GameObjects.Container;

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout */
  emitSnapshot: (snapshot: ManualLoadSnapshot) => void = () => {};

  constructor() {
    super({ key: 'ManualLoad' });
  }

  create() {
    // 场景没有 preload,bootScene 不会自动启动加载器
    this.wireLoaderEvents();

    this.add.text(24, 20, 'create 阶段手动加载', TITLE_STYLE);
    this.add.text(
      24,
      48,
      '队列排队后必须手动 this.load.start(),加载完成才能拿到资源',
      TEXT_STYLE,
    );
    this.report();
  }

  perform(action: ManualLoadAction) {
    if (action === 'none') {
      return;
    }

    this.action = action;
    this.eventLog = [];
    this.actionLayer?.destroy();
    this.actionLayer = this.add.container(0, 0);

    switch (action) {
      case 'svg':
        this.load.svg('flag', flagUrl, { width: 48, height: 48 });
        break;
      case 'bitmapFont':
        this.load.bitmapFont('digits', digitsFontUrl, digitsFntUrl);
        break;
      case 'missing':
        this.load.image('ghost', MISSING_URL);
        break;
      case 'duplicate':
        // 同一批里用同一 key 排队两次:第 2 次命中队列冲突,直接被跳过
        this.load.image('flag', flagUrl);
        this.load.image('flag', flagUrl);
        break;
    }

    this.queuedCount = this.load.list.size;
    this.pushLog(`排队 ${this.queuedCount} 个文件`);
    this.drawPendingLabel(action);
    this.load.start();
    this.report();
  }

  private drawPendingLabel(action: ManualLoadAction) {
    const layer = this.actionLayer!;
    layer.add(
      this.add.text(24, 300, `${ACTION_LABELS[action]} → 加载中…`, TEXT_STYLE),
    );
  }

  private wireLoaderEvents() {
    const E = Phaser.Loader.Events;

    this.load.on(E.FILE_COMPLETE, (key: string, type: string) => {
      this.pushLog(`filecomplete ${key}(${type})`);
      this.report();
    });

    this.load.on(E.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.pushLog(`loaderror ${file.key}(${file.type})`);
      this.report();
    });

    this.load.on(E.COMPLETE, () => {
      this.pushLog(
        `complete 成功 ${this.load.totalComplete} / 失败 ${this.load.totalFailed}`,
      );
      this.drawActionResult();
      this.report();
    });
  }

  private drawActionResult() {
    const layer = this.actionLayer;
    if (!layer) {
      return;
    }

    layer.removeAll(true);

    if (this.action === 'svg' && this.textures.exists('flag')) {
      layer.add(this.add.image(48, 180, 'flag').setOrigin(0));
      layer.add(this.add.text(96, 178, 'svg → 纹理 flag(已按 svgConfig 缩放)', TEXT_STYLE));
    } else if (this.action === 'bitmapFont' && this.cache.bitmapFont.exists('digits')) {
      layer.add(this.add.bitmapText(48, 160, 'digits', '102', 32));
      layer.add(this.add.text(48, 210, "bitmapText 用 cache.bitmapFont 里的 'digits' 渲染", TEXT_STYLE));
    } else if (this.action === 'missing') {
      layer.add(this.add.text(48, 180, 'ghost 加载失败:loaderror,不进任何缓存', { ...TEXT_STYLE, color: '#e74c3c' }));
    } else if (this.action === 'duplicate') {
      layer.add(
        this.add.text(48, 180, `排队 2 次,入队 ${this.queuedCount} 个(key 冲突被跳过)`, TEXT_STYLE),
      );
    }
  }

  private pushLog(entry: string) {
    this.eventLog.push(entry);
    if (this.eventLog.length > 4) {
      this.eventLog = this.eventLog.slice(-4);
    }
  }

  private flagTextureInfo(): string {
    if (!this.textures.exists('flag')) {
      return '未加载';
    }
    const frame = this.textures.getFrame('flag');
    return `命中 ${frame.width}×${frame.height}px`;
  }

  private report() {
    this.emitSnapshot({
      action: ACTION_LABELS[this.action],
      queued: `${this.queuedCount} 个`,
      loading: this.load.isLoading(),
      done: `成功 ${this.load.totalComplete} / 失败 ${this.load.totalFailed}`,
      eventLog: this.eventLog.join(' → '),
      flagTexture: this.flagTextureInfo(),
      bitmapFont: this.cache.bitmapFont.exists('digits') ? '命中 cache.bitmapFont' : '未加载',
      ghostTexture: this.textures.exists('ghost') ? '命中(异常)' : '不在缓存',
    });
  }
}

export function createManualLoad(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ManualLoadSnapshot) => void,
): ManualLoadInstance {
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [ManualScene],
  });

  const scene = game.scene.getScene('ManualLoad') as ManualScene | undefined;
  if (scene) {
    scene.emitSnapshot = emit;
  }

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    perform(action) {
      scene?.perform(action);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}
