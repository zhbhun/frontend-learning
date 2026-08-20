/**
 * 范例:摄像机效果实验台——shake / flash / fade 三种效果,加上多摄像机
 * (HUD 层的 setScrollFactor(0) 与 camera.ignore 两种方案、画中画小地图)。
 * 输入(Controls):shakeIntensity(shake 强度)、flashColor(flash 颜色)、
 * fadeDuration / fadeDirection(fade 时长与方向)、minimap(小地图开关)、
 * hudMode(HUD 方案:off / scrollFactor / ignore)。
 * 主要操作:点击画布底部的 SHAKE / FLASH / FADE 按钮(画布内对象,
 * scrollFactor 0,由主摄像机渲染)在主摄像机上触发效果;
 * Controls 开关小地图与 HUD 方案,观察对象归属与效果隔离。
 * 预期结果:readout 同步三种效果的 isRunning / progress、最近效果事件、
 * 摄像机数量与 id、各摄像机 scroll;小地图内出现主摄像机视野框;
 * hudMode = scrollFactor 时 HUD 被小地图重复渲染(方案缺陷的可观察证据),
 * 切到 ignore 后 HUD 由独立 UI 摄像机渲染,主摄像机的 shake / fade 都不再影响它。
 * 阅读主线:create(纹理、世界、HUD、按钮、事件钩子)→ update(巡航 + 视野框)
 * → applyParams / syncCameras(Controls 入口与摄像机编排)→ report。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数:变化即时生效,不重建世界。 */
export interface CameraEffectsParams {
  /** cam.shake 的 intensity:0–1 的视口比例,按钮触发时读取 */
  shakeIntensity: number;
  /** cam.flash 的颜色,'#rrggbb' */
  flashColor: string;
  /** cam.fadeOut / fadeIn 的 duration(ms) */
  fadeDuration: number;
  /** fade 方向:'out' = fadeOut(透明→颜色),'in' = fadeIn(颜色→透明) */
  fadeDirection: 'out' | 'in';
  /** 是否添加第二台摄像机(右上角画中画小地图) */
  minimap: boolean;
  /** HUD 方案:off 隐藏 / scrollFactor = setScrollFactor(0) / ignore = UI 摄像机 */
  hudMode: 'off' | 'scrollFactor' | 'ignore';
}

/** readout 用的效果读数:全部来自效果对象的真实状态。 */
export interface EffectStatus {
  running: boolean;
  progress: number;
  /** 仅 fade 有:完成后保持 true,画面仍被颜色覆盖 */
  complete: boolean;
  direction: 'out' | 'in' | null;
}

export interface CameraEffectsSnapshot {
  shake: EffectStatus;
  flash: EffectStatus;
  fade: EffectStatus;
  /** 最近一次触发的效果事件名(事件挂在摄像机上) */
  lastEvent: string;
  cameraCount: number;
  /** 每台摄像器的名字、id(ignore 的位掩码)与 scroll */
  cameras: { name: string; id: number; scrollX: number; scrollY: number }[];
  mainZoom: number;
  hudMode: CameraEffectsParams['hudMode'];
  target: { x: number; y: number };
}

export interface CameraEffectsInstance {
  applyParams(params: CameraEffectsParams): void;
  dispose(): void;
}

const GRID_KEY = 'fx-grid';
const MARKER_KEY = 'fx-marker';
const TARGET_KEY = 'fx-target';

const WAYPOINTS = [
  { x: 200, y: 160 },
  { x: 1240, y: 160 },
  { x: 1240, y: 650 },
  { x: 200, y: 650 },
];
const TARGET_SPEED = 170; // px/s

/** 小地图(画中画)视口:右上角,宽高比与世界一致,zoom = 视口宽 / 世界宽恰好看满。 */
const PIP = { x: GAME_WIDTH - 216, y: 8, w: 208, h: 117 };
const PIP_ZOOM = PIP.w / WORLD_WIDTH;

/** 按钮触发的固定时长:足够在 readout 里观察 progress。 */
const SHAKE_DURATION = 600;
const FLASH_DURATION = 400;

/** 效果完成 / 开始事件全部挂在摄像机上,这里记录最近一次供 readout 展示。 */
const EFFECT_EVENTS = [
  'camerashakestart',
  'camerashakecomplete',
  'cameraflashstart',
  'cameraflashcomplete',
  'camerafadeoutstart',
  'camerafadeoutcomplete',
  'camerafadeinstart',
  'camerafadeincomplete',
] as const;

const LABEL_STYLE = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '11px',
  color: '#64789c',
};
const HUD_STYLE = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12px',
  color: '#e7edf7',
};
const BUTTON_STYLE = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '13px',
  color: '#e7edf7',
};

/** '#rrggbb' → { r, g, b },喂给 cam.flash(duration, r, g, b)。 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

class EffectsLabScene extends Phaser.Scene {
  private target?: Phaser.GameObjects.Image;
  /** 主摄像机视野框:世界坐标图形,只交给小地图渲染(主摄像机 ignore 它) */
  private viewOutline?: Phaser.GameObjects.Graphics;
  private worldObjects: Phaser.GameObjects.GameObject[] = [];
  private hud: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text)[] = [];
  private hudModeText?: Phaser.GameObjects.Text;
  private hudTargetText?: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.GameObject[] = [];
  private fadeLabel?: Phaser.GameObjects.Text;
  private pip?: Phaser.Cameras.Scene2D.Camera;
  private uiCam?: Phaser.Cameras.Scene2D.Camera;
  private params: CameraEffectsParams = {
    shakeIntensity: 0.05,
    flashColor: '#ffffff',
    fadeDuration: 1000,
    fadeDirection: 'out',
    minimap: true,
    hudMode: 'scrollFactor',
  };
  private cruise = true;
  private waypoint = 1;
  private ready = false;
  private pending: CameraEffectsParams | null = null;
  private lastEvent = '—(尚未触发)';

  /** 由工厂注入的快照出口,把场景内部读数送到 Storybook readout。 */
  emitSnapshot: (snapshot: CameraEffectsSnapshot) => void = () => {};

  constructor() {
    super({ key: 'CameraEffects' });
  }

  create() {
    this.makeTextures();
    this.buildWorld();
    this.buildHud();
    this.buildButtons();
    this.hookEffectEvents();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.startFollow(this.target!, false, 0.08, 0.08);

    this.ready = true;
    if (this.pending) {
      this.applyParams(this.pending);
      this.pending = null;
    } else {
      this.applyParams(this.params);
    }
  }

  override update(_time: number, delta: number): void {
    const target = this.target;
    if (target && this.cruise) {
      // 沿航点矩形巡航:朝下一个航点匀速前进,接近后切换
      const wp = WAYPOINTS[this.waypoint];
      const dx = wp.x - target.x;
      const dy = wp.y - target.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        this.waypoint = (this.waypoint + 1) % WAYPOINTS.length;
      } else {
        const step = (TARGET_SPEED * delta) / 1000;
        target.x += (dx / dist) * step;
        target.y += (dy / dist) * step;
      }
    }

    // 小地图里的青色视野框 = 主摄像机 worldView(世界坐标,随滚动实时变化)
    const view = this.cameras.main.worldView;
    this.viewOutline
      ?.clear()
      ?.lineStyle(2, 0x22d3ee, 0.9)
      ?.strokeRect(view.x, view.y, view.width, view.height);
    this.hudTargetText?.setText(
      `目标:(${Math.round(this.target?.x ?? 0)}, ${Math.round(this.target?.y ?? 0)})`,
    );

    this.report();
  }

  /** Controls 入口:参数即时生效;摄像机编排统一走 syncCameras。 */
  applyParams(params: CameraEffectsParams) {
    if (!this.ready) {
      this.pending = params;
      return;
    }
    this.params = params;
    this.fadeLabel?.setText(`FADE ${params.fadeDirection.toUpperCase()}`);
    this.syncCameras();
  }

  /**
   * 摄像机编排:增删小地图与 UI 摄像机,再“先清零后分配”对象归属。
   * ignore 的本质是对象身上的 cameraFilter 位掩码(cameraFilter |= camera.id),
   * 没有官方撤销 API——重算归属时直接把对象的 cameraFilter 清零最可靠。
   */
  private syncCameras() {
    const cams = this.cameras;
    const p = this.params;

    if (p.minimap && !this.pip) {
      const pip = cams.add(PIP.x, PIP.y, PIP.w, PIP.h, false, 'pip');
      pip.setBackgroundColor('#0d1526');
      pip.setZoom(PIP_ZOOM); // 208 / 1440 ≈ 0.144:小视口看满全世界
      pip.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
      this.pip = pip;
    } else if (!p.minimap && this.pip) {
      cams.remove(this.pip);
      this.pip = undefined;
    }

    if (p.hudMode === 'ignore' && !this.uiCam) {
      // UI 摄像机:铺满画布、只渲染 HUD,排在最后渲染(盖在一切之上)
      this.uiCam = cams.add(0, 0, GAME_WIDTH, GAME_HEIGHT, false, 'ui');
    } else if (p.hudMode !== 'ignore' && this.uiCam) {
      cams.remove(this.uiCam);
      this.uiCam = undefined;
    }

    for (const obj of [...this.worldObjects, ...this.hud, ...this.buttons]) {
      obj.cameraFilter = 0;
    }

    const main = cams.main;
    main.ignore(this.viewOutline!); // 视野框只出现在小地图里
    this.pip?.ignore(this.buttons); // 按钮由主摄像机渲染

    if (p.hudMode === 'ignore') {
      // HUD 归 UI 摄像机独占:主摄像机与小地图都不渲染它
      main.ignore(this.hud);
      this.pip?.ignore(this.hud);
      this.uiCam?.ignore([...this.worldObjects, ...this.buttons]);
    }
    // hudMode = 'scrollFactor' 时刻意不 ignore:HUD 被小地图以 zoom ≈ 0.14
    // 重复渲染成左上角的小残影,正是 setScrollFactor(0) 不隔离归属的可观察证据

    const hudVisible = p.hudMode !== 'off';
    for (const obj of this.hud) {
      obj.setVisible(hudVisible);
    }
    this.hudModeText?.setText(
      p.hudMode === 'ignore'
        ? '方案:camera.ignore + UI 摄像机'
        : '方案:setScrollFactor(0)',
    );
  }

  /** 按钮触发:同类效果默认互斥(force = false),运行中重复点击不会重启。 */
  private triggerShake() {
    this.cameras.main.shake(SHAKE_DURATION, this.params.shakeIntensity);
  }

  private triggerFlash() {
    const { r, g, b } = hexToRgb(this.params.flashColor);
    this.cameras.main.flash(FLASH_DURATION, r, g, b);
  }

  private triggerFade() {
    const cam = this.cameras.main;
    if (this.params.fadeDirection === 'out') {
      cam.fadeOut(this.params.fadeDuration, 0, 0, 0);
    } else {
      // fadeIn / fadeOut 内部恒 force:即使上一次 fadeOut 已完成(画面保持黑)也能恢复
      cam.fadeIn(this.params.fadeDuration, 0, 0, 0);
    }
  }

  /** 效果的开始 / 完成事件都挂在本台摄像机上,记录最近一次供 readout 展示。 */
  private hookEffectEvents() {
    for (const name of EFFECT_EVENTS) {
      this.cameras.main.on(name, () => {
        this.lastEvent = name;
      });
    }
  }

  private report() {
    const cam = this.cameras.main;
    const fade = cam.fadeEffect;
    this.emitSnapshot({
      shake: {
        running: cam.shakeEffect.isRunning,
        progress: cam.shakeEffect.progress,
        complete: false,
        direction: null,
      },
      flash: {
        running: cam.flashEffect.isRunning,
        progress: cam.flashEffect.progress,
        complete: false,
        direction: null,
      },
      fade: {
        running: fade.isRunning,
        progress: fade.progress,
        complete: fade.isComplete,
        // direction:true = fade out(透明→颜色),false = fade in(颜色→透明)
        direction: fade.direction ? 'out' : 'in',
      },
      lastEvent: this.lastEvent,
      cameraCount: this.cameras.getTotal(),
      cameras: this.cameras.cameras.map((c) => ({
        name: c.name || '(未命名)',
        id: c.id,
        scrollX: Math.round(c.scrollX),
        scrollY: Math.round(c.scrollY),
      })),
      mainZoom: Math.round(cam.zoom * 100) / 100,
      hudMode: this.params.hudMode,
      target: {
        x: Math.round(this.target?.x ?? 0),
        y: Math.round(this.target?.y ?? 0),
      },
    });
  }

  /** 自包含素材:Graphics 画完 generateTexture 烘焙成普通纹理。 */
  private makeTextures() {
    if (!this.textures.exists(GRID_KEY)) {
      const g = this.make.graphics();
      g.fillStyle(0x1a2334, 1);
      g.fillRect(0, 0, 60, 60);
      g.lineStyle(1, 0x2e3b57, 1);
      g.strokeRect(0, 0, 60, 60);
      g.generateTexture(GRID_KEY, 60, 60);
      g.destroy();
    }

    if (!this.textures.exists(MARKER_KEY)) {
      const g = this.make.graphics();
      g.lineStyle(1, 0x8fa3c8, 1);
      g.lineBetween(2, 0, 2, 4);
      g.lineBetween(0, 2, 4, 2);
      g.lineBetween(2, 4, 2, 8);
      g.lineBetween(4, 2, 8, 2);
      g.generateTexture(MARKER_KEY, 8, 8);
      g.destroy();
    }

    if (!this.textures.exists(TARGET_KEY)) {
      const pts = [
        new Phaser.Math.Vector2(0, 14),
        new Phaser.Math.Vector2(14, 0),
        new Phaser.Math.Vector2(28, 14),
        new Phaser.Math.Vector2(14, 28),
      ];
      const g = this.make.graphics();
      g.fillStyle(0xf59e0b, 1);
      g.fillPoints(pts, true);
      g.lineStyle(2, 0x141a26, 1);
      g.strokePoints(pts, true, true);
      g.generateTexture(TARGET_KEY, 28, 28);
      g.destroy();
    }
  }

  /** 大于视口的世界:网格平铺 + 边界框 + 坐标标记物 + 巡航路径 + 巡航目标。 */
  private buildWorld() {
    const grid = this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, GRID_KEY)
      .setOrigin(0);
    this.worldObjects.push(grid);

    const border = this.add.graphics();
    border.lineStyle(2, 0x4f7cff, 0.8);
    border.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const path = this.add.graphics();
    path.lineStyle(1, 0x4f7cff, 0.35);
    path.strokeRect(
      WAYPOINTS[0].x,
      WAYPOINTS[0].y,
      WAYPOINTS[1].x - WAYPOINTS[0].x,
      WAYPOINTS[2].y - WAYPOINTS[1].y,
    );
    this.worldObjects.push(border, path);

    for (const x of [360, 720, 1080]) {
      for (const y of [270, 540]) {
        this.worldObjects.push(
          this.add.image(x, y, MARKER_KEY),
          this.add.text(x + 8, y + 6, `(${x}, ${y})`, LABEL_STYLE),
        );
      }
    }
    this.worldObjects.push(
      this.add.image(720, 405, MARKER_KEY),
      this.add.text(728, 411, '(720, 405) 世界中心', LABEL_STYLE),
    );

    this.target = this.add.image(WAYPOINTS[0].x, WAYPOINTS[0].y, TARGET_KEY);
    this.worldObjects.push(this.target);

    this.viewOutline = this.add.graphics();
    this.worldObjects.push(this.viewOutline);
  }

  /** HUD 层:半透明面板 + 实时文本,全部 setScrollFactor(0) 固定在屏幕左上角。 */
  private buildHud() {
    const bg = this.add
      .rectangle(16, 12, 238, 86, 0x000000, 0.45)
      .setOrigin(0)
      .setStrokeStyle(1, 0x8fa3c8, 0.35)
      .setScrollFactor(0)
      .setDepth(10);
    const title = this.add
      .text(26, 20, 'HUD 层(固定屏幕位置)', {
        ...HUD_STYLE,
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hudModeText = this.add
      .text(26, 40, '方案:setScrollFactor(0)', HUD_STYLE)
      .setScrollFactor(0)
      .setDepth(10);
    this.hudTargetText = this.add
      .text(26, 58, '目标:(0, 0)', HUD_STYLE)
      .setScrollFactor(0)
      .setDepth(10);
    const hint = this.add
      .text(26, 76, '滚动 / shake / fade 时的表现见正文', {
        ...HUD_STYLE,
        fontSize: '10px',
        color: '#8fa3c8',
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hud.push(bg, title, this.hudModeText, this.hudTargetText, hint);
  }

  /** 画布内按钮:scrollFactor 0 固定在底部,由主摄像机渲染(小地图 / UI 摄像机 ignore)。 */
  private buildButtons() {
    const cy = GAME_HEIGHT - 30;
    const make = (x: number, label: string, onClick: () => void) => {
      const rect = this.add
        .rectangle(x + 52, cy, 104, 26, 0x27344c, 0.92)
        .setStrokeStyle(1, 0x4f7cff, 0.9)
        .setScrollFactor(0)
        .setDepth(11);
      const text = this.add
        .text(x + 52, cy, label, BUTTON_STYLE)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(12);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', onClick);
      rect.on('pointerover', () => rect.setFillStyle(0x3a4d75, 0.95));
      rect.on('pointerout', () => rect.setFillStyle(0x27344c, 0.92));
      this.buttons.push(rect, text);
      return text;
    };
    make(16, 'SHAKE', () => this.triggerShake());
    make(126, 'FLASH', () => this.triggerFlash());
    this.fadeLabel = make(236, 'FADE OUT', () => this.triggerFade());
  }
}

export function createEffectsLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CameraEffectsSnapshot) => void,
): CameraEffectsInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new EffectsLabScene();
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
    applyParams(params: CameraEffectsParams) {
      scene.applyParams(params);
    },
    dispose() {
      suspender.dispose();
      game.destroy(true);
    },
  };
}

