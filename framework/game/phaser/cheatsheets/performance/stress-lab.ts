/**
 * 范例:性能压力实验台(测量 → 定位 → 优化手段的对照现场)。
 * 输入:count(场上对象数量)、source(对象来源:pool 池复用 / alloc 每次新建)、
 *   updateMode(更新逻辑:reuse 复用工作对象 / alloc 每帧分配)、
 *   cullMode(剔除:none 不剔除 / manual 用 camera.worldView 手动判活)。
 * 主要操作:世界 1440×810(视口 720×405),摄像机每 16 秒来回巡视,对象在世界内
 *   弹走;每 150ms 随机退役 2 个对象,补充逻辑按来源分流——pool 走 killAndHide
 *   归还 + group.get 复用,alloc 走 destroy + 新建;逻辑步与渲染耗时挂在
 *   game 事件的 PRE_STEP/POST_STEP 与 PRE_RENDER/POST_RENDER 之间分段测量,
 *   draw 调用数通过包装 renderer.drawElements / drawInstancedArrays 计数
 *   (Phaser 4 的全部 GL 绘制都经过这两个方法)。
 * 预期结果:readout 实时显示 FPS、平均/峰值 delta、逻辑步与渲染耗时、draw 数、
 *   可见对象数、池复用/新建/销毁累计计数;alloc 来源让"新建/销毁"攀升,
 *   每帧分配让 delta 峰值变大(GC 停顿),manual 剔除让可见数与渲染耗时回落。
 * 阅读主线:createStressLab(计时与 draw 计数挂点)→ apply(参数路由)
 *   → update(运动 / 退役 / 剔除)→ pushFrame + report(滚动统计)。
 */
import Phaser from 'phaser';
import {
  BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  createGameLoopSuspender,
  type LoopSuspender,
} from './story-support';

/** Controls 直接驱动的参数,运行中修改立即生效;source 切换会整场重建。 */
export interface StressLabParams {
  /** 场上存活对象的目标数量 */
  count: number;
  /** 对象来源:pool = killAndHide/get 池复用;alloc = destroy/新建 */
  source: 'pool' | 'alloc';
  /** 更新逻辑:reuse = 复用工作对象;alloc = 每帧为每个对象新建(反面教材) */
  updateMode: 'reuse' | 'alloc';
  /** 剔除:none = 不剔除;manual = camera.worldView 手动判活 */
  cullMode: 'none' | 'manual';
}

/** readout 用的派生读数:计时与计数全部来自真实引擎状态。 */
export interface StressLabSnapshot {
  /** game.loop.actualFps:每秒更新一次的指数移动平均 */
  fps: number;
  /** 最近 90 帧 rawDelta 均值(未平滑的真实帧间隔) */
  avgDelta: number;
  /** 最近 90 帧 rawDelta 峰值:GC 停顿 / 卡顿尖峰看这里 */
  maxDelta: number;
  /** 最近 90 帧 PRE_STEP→POST_STEP 均值:游戏逻辑步耗时 */
  updateMs: number;
  /** 最近 90 帧 PRE_RENDER→POST_RENDER 均值:渲染耗时 */
  renderMs: number;
  /** 最近一帧 draw 调用数:WebGL 包装计数 / Canvas renderer.drawCount */
  draws: number;
  /** 实际使用的渲染器 */
  renderer: 'WebGL' | 'Canvas';
  /** 渲染器可用的并行纹理单元数(renderer.maxTextures,WebGL) */
  maxTextures: number | null;
  /** game config 的 batchSize:单批最多多少个 quad */
  batchSize: number;
  /** 当前存活的 GL 纹理数(glTextureWrappers.length,WebGL) */
  glTextures: number | null;
  /** 组内成员总数:池模式下退役成员仍在册(池从不销毁) */
  total: number;
  /** 存活(active)对象数:当前真正参与运动与渲染的对象 */
  alive: number;
  /** 可见对象数:cullMode none 时等于存活数(精灵无自动剔除) */
  visible: number;
  /** 累计:池复用次数(get 取回 inactive 成员) */
  reused: number;
  /** 累计:新建次数 */
  created: number;
  /** 累计:销毁次数 */
  destroyed: number;
  /** JS 堆用量 MB(仅 Chrome 暴露 performance.memory 时有值) */
  heapMb: number | null;
  /** 摄像机当前 scrollX:说明巡视位置与可见范围 */
  cameraX: number;
}

export interface StressLabInstance {
  apply(params: StressLabParams): void;
  dispose(): void;
}

/** 滚动统计窗口:最近这么多帧的 delta / 耗时参与均值与峰值。 */
const STAT_WINDOW = 90;
const SCENE_KEY = 'StressLab';
const MAX_COUNT = 2000;
/** 世界是视口的 2×2:巡视时约一半对象在视口外,给剔除开关留出对照空间。 */
const WORLD_WIDTH = GAME_WIDTH * 2;
const WORLD_HEIGHT = GAME_HEIGHT * 2;
/** 每 150ms 退役 2 个对象:pool 模式制造"归还 → 复用"的池循环。 */
const RETIRE_INTERVAL = 150;
const RETIRE_BATCH = 2;
const PAN_PERIOD = 16_000;

interface Dot extends Phaser.GameObjects.Image {
  vx?: number;
  vy?: number;
}

/** 定长滚动窗口:push 覆盖最老样本,O(1) 且不产生每帧分配。 */
class RollingStat {
  private samples: number[] = new Array(STAT_WINDOW).fill(0);
  private index = 0;
  private filled = 0;

  push(value: number) {
    this.samples[this.index] = value;
    this.index = (this.index + 1) % STAT_WINDOW;
    this.filled = Math.min(this.filled + 1, STAT_WINDOW);
  }

  reset() {
    this.samples.fill(0);
    this.filled = 0;
    this.index = 0;
  }

  avg(): number {
    if (!this.filled) {
      return 0;
    }
    let sum = 0;
    for (let i = 0; i < this.filled; i++) {
      sum += this.samples[i];
    }
    return sum / this.filled;
  }

  max(): number {
    if (!this.filled) {
      return 0;
    }
    let top = this.samples[0];
    for (let i = 1; i < this.filled; i++) {
      if (this.samples[i] > top) {
        top = this.samples[i];
      }
    }
    return top;
  }
}

class StressLabScene extends Phaser.Scene {
  private group?: Phaser.GameObjects.Group;
  /** 成员快照缓存:getChildren() 每次返回新数组,缓存避免每帧分配。 */
  private members: Dot[] = [];
  private params: StressLabParams = {
    count: 500,
    source: 'pool',
    updateMode: 'reuse',
    cullMode: 'none',
  };
  private counters = { reused: 0, created: 0, destroyed: 0 };
  private retireTimer = 0;
  private hud?: Phaser.GameObjects.Text;
  /** 复用模式的工作对象:预分配一次,update 里只改值不 new。 */
  private scratch = new Phaser.Math.Vector2();
  /** 每帧分配模式的"垃圾池":故意保有小数组,让 push 制造增长垃圾。 */
  private sink: unknown[] = [];
  /** 由 createStressLab 每帧回填的一帧测量结果(见 pushFrame)。 */
  private frame = { rawDelta: 0, updateMs: 0, renderMs: 0, draws: 0 };
  private stats = {
    delta: new RollingStat(),
    update: new RollingStat(),
    render: new RollingStat(),
  };
  private frameCounter = 0;
  private rendererKind: 'WebGL' | 'Canvas' = 'WebGL';
  private maxTextures: number | null = null;
  private batchSize = 0;
  private glTextures: number | null = null;

  emitSnapshot: (snapshot: StressLabSnapshot) => void = () => {};

  constructor() {
    super({ key: SCENE_KEY });
  }

  preload() {
    if (!this.textures.exists('perf-dot')) {
      const g = this.make.graphics();
      g.fillStyle(0x38bdf8, 1);
      g.fillCircle(7, 7, 6);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(7, 7, 2);
      g.generateTexture('perf-dot', 14, 14);
      g.destroy();
    }
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.group = this.add.group({
      classType: Phaser.GameObjects.Image,
      defaultKey: 'perf-dot',
      maxSize: MAX_COUNT, // 池上限:count 最大档即 2000,get 不应撞上限
    });

    this.drawWorldFrame();
    this.hud = this.add
      .text(10, 10, '', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: '#8fa3c8',
      })
      .setScrollFactor(0)
      .setDepth(10);

    this.readRendererInfo();
    this.spawnToTarget();
  }

  /** Controls 入口:source 切换整场重建(干净 A/B),其余参数即时生效。 */
  apply(params: StressLabParams) {
    const sourceChanged = params.source !== this.params.source;
    this.params = { ...params };

    if (sourceChanged) {
      this.rebuild();
    } else {
      this.spawnToTarget();
      this.retireExtras();
    }

    // 滚动统计清零:切换后重新积累,避免新旧工况混在同一个均值里。
    this.stats.delta.reset();
    this.stats.update.reset();
    this.stats.render.reset();
  }

  /** 补足到目标数量:两条来源路径都在这里分流。 */
  private spawnToTarget() {
    const group = this.group;
    if (!group) {
      return;
    }

    let missing = this.params.count - this.aliveCount();
    if (missing <= 0) {
      return; // 无缺口就早退:不刷新成员缓存,update 路径零分配
    }
    while (missing > 0) {
      if (!this.spawnOne()) {
        break; // 池满(create 返回 null)等异常:直接停,不硬造
      }
      missing--;
    }
    this.refreshMembers();
  }

  /** 造一个对象并激活:pool 走 group.get(优先复用 inactive),alloc 走新建。 */
  private spawnOne(): boolean {
    const group = this.group;
    if (!group) {
      return false;
    }

    const x = Phaser.Math.Between(20, WORLD_WIDTH - 20);
    const y = Phaser.Math.Between(20, WORLD_HEIGHT - 20);

    if (this.params.source === 'pool') {
      const before = group.getLength();
      const dot = group.get(x, y) as Dot | null;
      if (!dot) {
        return false;
      }
      dot.setActive(true).setVisible(true);
      // 长度没变 = 取回了 inactive 成员(复用);变长 = create 新建
      if (group.getLength() > before) {
        this.counters.created++;
      } else {
        this.counters.reused++;
      }
      this.arm(dot);
      return true;
    }

    // alloc 路径:每次都是全新对象,旧的已 destroy;仍登记进组,统计口径统一
    const dot = this.add.image(x, y, 'perf-dot') as Dot;
    group.add(dot);
    this.counters.created++;
    this.arm(dot);
    return true;
  }

  private arm(dot: Dot) {
    const speed = Phaser.Math.FloatBetween(40, 120);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    dot.vx = Math.cos(angle) * speed;
    dot.vy = Math.sin(angle) * speed;
  }

  private aliveCount(): number {
    return this.group ? this.group.countActive(true) : 0;
  }

  /** 退役一批存活对象:pool = killAndHide 归还池;alloc = destroy 真销毁。 */
  private retireBatch() {
    const group = this.group;
    if (!group || this.members.length === 0) {
      return;
    }

    for (let i = 0; i < RETIRE_BATCH; i++) {
      const dot = this.members[Phaser.Math.Between(0, this.members.length - 1)];
      if (!dot.active) {
        continue; // 随机命中已退役成员:跳过,下一轮再退
      }

      if (this.params.source === 'pool') {
        group.killAndHide(dot); // 失活 + 隐藏,对象保留,等 get() 复用
      } else {
        this.counters.destroyed++;
        dot.destroy(); // destroy 自动从组里移除,成员表变化 → 刷新缓存
      }
    }

    if (this.params.source === 'alloc') {
      this.refreshMembers();
    }
  }

  /** 数量档位调小:pool 多余成员 killAndHide 留在池里;alloc 直接销毁。 */
  private retireExtras() {
    const group = this.group;
    if (!group) {
      return;
    }

    let excess = this.aliveCount() - this.params.count;
    for (const dot of this.members) {
      if (excess <= 0) {
        break;
      }
      if (!dot.active) {
        continue;
      }
      if (this.params.source === 'pool') {
        group.killAndHide(dot);
      } else {
        this.counters.destroyed++;
        dot.destroy();
      }
      excess--;
    }

    if (this.params.source === 'alloc') {
      this.refreshMembers();
    }
  }

  /** source 切换:销毁全部成员、计数清零、按新来源重建,保证 A/B 干净。 */
  private rebuild() {
    const group = this.group;
    if (!group) {
      return;
    }

    for (const dot of this.members) {
      dot.destroy(); // destroy 自动从组与场景移除
    }
    this.refreshMembers();
    this.counters = { reused: 0, created: 0, destroyed: 0 };
    this.spawnToTarget();
  }

  /** 刷新成员快照缓存:仅成员增删时调用,update 内不产生数组分配。 */
  private refreshMembers() {
    this.members = (this.group?.getChildren() ?? []) as Dot[];
  }

  override update(time: number, delta: number) {
    if (!this.group) {
      return;
    }

    // 摄像机来回巡视:一部分对象持续出入视口,给剔除开关提供对照
    const span = WORLD_WIDTH - GAME_WIDTH;
    this.cameras.main.scrollX = (span / 2) * (1 + Math.sin((time / PAN_PERIOD) * Math.PI * 2));

    // 退役节拍:与来源无关,每 150ms 退役 2 个
    this.retireTimer += delta;
    while (this.retireTimer >= RETIRE_INTERVAL) {
      this.retireTimer -= RETIRE_INTERVAL;
      this.retireBatch();
    }

    this.spawnToTarget(); // 有退役就补足(池模式下 get() 立即取回刚归还的成员)

    const view = this.cameras.main.worldView;
    const margin = 20;
    const seconds = delta / 1000;
    let aliveCount = 0;
    let visibleCount = 0;

    for (const dot of this.members) {
      if (!dot.active) {
        continue;
      }
      aliveCount++;

      // 运动:delta 换算,不同帧率下速度一致
      dot.x += (dot.vx ?? 0) * seconds;
      dot.y += (dot.vy ?? 0) * seconds;
      if (dot.x < 8 || dot.x > WORLD_WIDTH - 8) {
        dot.vx = -(dot.vx ?? 0);
        dot.x = Phaser.Math.Clamp(dot.x, 8, WORLD_WIDTH - 8);
      }
      if (dot.y < 8 || dot.y > WORLD_HEIGHT - 8) {
        dot.vy = -(dot.vy ?? 0);
        dot.y = Phaser.Math.Clamp(dot.y, 8, WORLD_HEIGHT - 8);
      }

      // 更新逻辑对照:两种模式做同等的数学,差别只在"是否每帧新建对象"
      if (this.params.updateMode === 'alloc') {
        // 反面教材:每个对象每帧 new 一个 Vector2 + 一个对象字面量 + 拼一个字符串
        const p = new Phaser.Math.Vector2(dot.x, dot.y).scale(0.5);
        const tag = 'sim-' + Math.floor(p.x);
        this.sink.push({ p, tag });
        if (this.sink.length > 64) {
          this.sink.length = 0; // 清空让旧条目全部变成垃圾
        }
      } else {
        // 复用模式:预分配的 scratch 反复改写,零分配
        this.scratch.set(dot.x, dot.y).scale(0.5);
      }

      // 剔除对照:none 时全部保持可见——精灵不会因为出了视口就被自动剔除
      if (this.params.cullMode === 'manual') {
        dot.setVisible(
          dot.x > view.x - margin &&
            dot.x < view.right + margin &&
            dot.y > view.y - margin &&
            dot.y < view.bottom + margin,
        );
      } else if (!dot.visible) {
        dot.setVisible(true);
      }

      if (dot.visible) {
        visibleCount++;
      }
    }

    if (this.hud) {
      // HUD 文本只在内容变化时 setText,避免每帧重绘文本纹理
      const text = `成员 ${this.members.length} · 存活 ${aliveCount} · 可见 ${visibleCount} · 摄像机 x ${Math.round(this.cameras.main.scrollX)}`;
      if (this.hud.text !== text) {
        this.hud.setText(text);
      }
    }

    this.visibleCount = visibleCount;
    this.aliveInView = aliveCount;
  }

  private visibleCount = 0;
  private aliveInView = 0;

  /** createStressLab 在每帧 POST_RENDER 回填测量结果并驱动 readout。 */
  pushFrame(rawDelta: number, updateMs: number, renderMs: number, draws: number) {
    this.frame = { rawDelta, updateMs, renderMs, draws };
    this.stats.delta.push(rawDelta);
    this.stats.update.push(updateMs);
    this.stats.render.push(renderMs);
    this.frameCounter++;

    if (this.frameCounter % 6 === 0) {
      this.report(); // 每 6 帧组装一次快照,readout 外壳再节流到 100ms
    }
  }

  private report() {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    this.emitSnapshot({
      fps: this.game.loop.actualFps,
      avgDelta: this.stats.delta.avg(),
      maxDelta: this.stats.delta.max(),
      updateMs: this.stats.update.avg(),
      renderMs: this.stats.render.avg(),
      draws: this.frame.draws,
      renderer: this.rendererKind,
      maxTextures: this.maxTextures,
      batchSize: this.batchSize,
      glTextures: this.glTextures,
      total: this.members.length,
      alive: this.aliveInView,
      visible: this.visibleCount,
      reused: this.counters.reused,
      created: this.counters.created,
      destroyed: this.counters.destroyed,
      heapMb: memory ? memory.usedJSHeapSize / 1048576 : null,
      cameraX: this.cameras.main.scrollX,
    });
  }

  private readRendererInfo() {
    const renderer = this.game.renderer;
    if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.rendererKind = 'WebGL';
      this.maxTextures = renderer.maxTextures;
      this.glTextures = renderer.glTextureWrappers.length;
    } else {
      this.rendererKind = 'Canvas';
    }
    this.batchSize = this.game.config.batchSize;
  }

  private drawWorldFrame() {
    const frame = this.add.graphics().setDepth(-10);
    frame.lineStyle(2, 0x3b4a6b, 1);
    frame.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    // 视口宽度的参考线:巡视时能看到"视口只盖住世界的一半"
    frame.lineStyle(1, 0x2a3654, 0.8);
    frame.lineBetween(GAME_WIDTH, 0, GAME_WIDTH, WORLD_HEIGHT);
    frame.lineBetween(GAME_WIDTH * 2 - 1, 0, GAME_WIDTH * 2 - 1, WORLD_HEIGHT);
  }
}

/**
 * 工厂:创建 Phaser 实例并布置测量挂点。
 * 一帧内的顺序:PRE_STEP →(场景 PRE_UPDATE/UPDATE/POST_UPDATE)→ POST_STEP
 * → PRE_RENDER →(各相机渲染)→ POST_RENDER。逻辑步耗时取 PRE_STEP→POST_STEP,
 * 渲染耗时取 PRE_RENDER→POST_RENDER;draw 数在 PRE_RENDER 清零、POST_RENDER 读取。
 */
export function createStressLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StressLabSnapshot) => void,
): StressLabInstance {
  // Phaser 4 场景注册是异步 boot:直接把场景实例传入 config,
  // 构造完成后即可安全挂载 emitSnapshot,无需 getScene 再取回。
  const scene = new StressLabScene();
  const game = new Phaser.Game({
    type: document.createElement('canvas').getContext('webgl') ? Phaser.WEBGL : Phaser.CANVAS,
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: BACKGROUND_COLOR,
    scene: [scene],
  });

  scene.emitSnapshot = emit;

  // --- draw 调用计数:WebGL 下包装渲染器的两个绘制入口 ---
  const renderer = game.renderer;
  const isGL = renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer;
  let draws = 0;
  let restoreDrawElements: (() => void) | undefined;

  if (isGL) {
    const glr = renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    const origin = glr.drawElements;
    glr.drawElements = function patchedDrawElements(
      this: Phaser.Renderer.WebGL.WebGLRenderer,
      ...args: Parameters<typeof origin>
    ) {
      draws++;
      return origin.apply(this, args);
    };
    restoreDrawElements = () => {
      glr.drawElements = origin;
    };
  }

  // --- 分段计时:挂在 game 事件上,覆盖全部场景 ---
  const clock = { stepStart: 0, renderStart: 0 };
  let updateMs = 0;
  let renderMs = 0;

  game.events.on(Phaser.Core.Events.PRE_STEP, () => {
    clock.stepStart = performance.now();
  });
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    updateMs = performance.now() - clock.stepStart;
  });
  game.events.on(Phaser.Core.Events.PRE_RENDER, () => {
    clock.renderStart = performance.now();
    draws = 0; // Canvas 模式没有包装,draws 在 POST_RENDER 直接读 drawCount
  });
  game.events.on(Phaser.Core.Events.POST_RENDER, () => {
    renderMs = performance.now() - clock.renderStart;
    if (!isGL) {
      draws = (renderer as Phaser.Renderer.Canvas.CanvasRenderer).drawCount;
    }
    scene.pushFrame(game.loop.rawDelta, updateMs, renderMs, draws);
  });

  const suspender: LoopSuspender = createGameLoopSuspender(
    game,
    canvas.parentElement ?? canvas,
  );

  return {
    apply(params: StressLabParams) {
      scene.apply(params);
    },
    dispose() {
      suspender.dispose();
      restoreDrawElements?.();
      game.destroy(true);
    },
  };
}

