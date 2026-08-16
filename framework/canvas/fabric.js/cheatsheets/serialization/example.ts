/**
 * 范例介绍：一个"往返实验台"——同一场景在四个导出开关下的 toObject 产物与 loadFromJSON 往返结果。
 * 场景含五类序列化形态：渐变填充的红块（带白名单外自定义属性 taskId/remark）、Pattern 填充的方格块、
 * 普通圆、文本、嵌套 Group。读者开「自定义属性白名单」核对 taskId/remark 是否落盘（读数「红块自定义键」）；
 * 开「导出 viewportTransform」核对顶层键新增 viewportTransform（默认不在导出里）；关「包含默认值
 * includeDefaultValues」核对对象键数与 JSON 体积骤降（画布级开关级联到每个对象）；开「红块排除导出
 * excludeFromExport」核对导出对象数从 5 变 4；开「执行往返」后 toObject 产物经 JSON.stringify 喂给
 * loadFromJSON——渐变/Pattern 从纯数据复活为实例（读数「fill（场景）」「fill（导出）」前后对照）、
 * 白名单外的自定义属性在未进白名单时丢失（读数「往返后红块」的 taskId）、被排除的红块不还原（画布上消失）。
 * 输入：Controls 面板四个布尔开关 + 往返开关；画布上可直接拖动对象（object:moving/modified 驱动读数联动）。
 * 预期结果：画布内容与读数（顶层键、导出对象数、红块自定义键、JSON 体积、fill 形态、往返后红块、导出
 * version）逐项可核对；关掉「执行往返」即重建初始场景。
 * 阅读主线：update() 是状态机——重建场景 / 应用开关 / 计算导出快照 emitSnapshot()；doRoundtrip()
 * 演示 toObject → JSON.stringify → loadFromJSON(Promise) → requestRenderAll 的完整闭环。
 */
import {
  Canvas,
  Circle,
  FabricText,
  Gradient,
  Group,
  Pattern,
  Rect,
} from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };

/** 白名单外自定义属性的样例字段：不开「自定义属性白名单」就不进导出 */
const CUSTOM_KEYS = ['taskId', 'remark'];

/** 读者输入：对应 Controls 面板 */
export interface SerializationOptions {
  /** 自定义属性白名单：序列化时是否传 propertiesToInclude(['taskId','remark']) */
  customProps: boolean;
  /** 导出 viewportTransform：白名单是否额外包含 'viewportTransform'（画布级字段） */
  exportVpt: boolean;
  /** 包含默认值 includeDefaultValues：画布级开关，级联覆盖对象自身值 */
  includeDefaults: boolean;
  /** 红块排除导出 excludeFromExport：只挡导出，不挡渲染 */
  excludeRed: boolean;
  /** 执行往返：toObject → JSON.stringify → loadFromJSON；关掉即重建初始场景 */
  roundtrip: boolean;
}

/** 派生读数：由 readout 显示 */
export interface SerializationSnapshot {
  sceneObjectsLabel: string;
  exportedObjectsLabel: string;
  topKeysLabel: string;
  customKeysLabel: string;
  jsonSizeLabel: string;
  fillSceneLabel: string;
  fillExportLabel: string;
  roundtripLabel: string;
  versionLabel: string;
}

export interface SerializationInstance {
  update(options: SerializationOptions): void;
  dispose(): void;
}

/** 8×8 棋盘格贴片：Pattern 的数据源（导出时被降级为 data URL 字符串） */
function createPatternTile(): HTMLCanvasElement {
  const tile = document.createElement('canvas');
  tile.width = 8;
  tile.height = 8;
  const ctx = tile.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 4, 4);
    ctx.fillRect(4, 4, 4, 4);
  }
  return tile;
}

export function createSerializationLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: SerializationSnapshot) => void,
): SerializationInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#eef2ff',
  });

  const initial: SerializationOptions = {
    customProps: true,
    exportVpt: false,
    includeDefaults: true,
    excludeRed: false,
    roundtrip: false,
  };

  /** 红块引用：往返后会被还原出的新实例替换 */
  let red: Rect;
  /** 往返是否已施加到当前画布：决定「往返后红块」读数显示什么 */
  let roundtripApplied = false;
  /** 往返令牌：开关快速切换时丢弃过期的异步结果 */
  let roundtripToken = 0;

  /** 重建初始场景：新实例、原始位置，作为可复现的读数基准 */
  function rebuildScene() {
    fabricCanvas.discardActiveObject();
    fabricCanvas.remove(...fabricCanvas.getObjects());
    red = new Rect({
      left: 90,
      top: 64,
      width: 140,
      height: 90,
      angle: 6,
      opacity: 0.95,
      stroke: '#0f172a',
      strokeWidth: 2,
      fill: new Gradient({
        type: 'linear',
        gradientUnits: 'percentage',
        coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
        colorStops: [
          { offset: 0, color: '#f43f5e' },
          { offset: 1, color: '#7dd3fc' },
        ],
      }),
    });
    red.set('taskId', 'a-001');
    red.set('remark', '业务标注');

    const patternRect = new Rect({
      left: 300,
      top: 52,
      width: 104,
      height: 104,
      opacity: 0.9,
      fill: new Pattern({
        source: createPatternTile(),
        repeat: 'repeat',
      }),
    });
    const blue = new Circle({
      left: 486,
      top: 84,
      radius: 44,
      fill: '#38bdf8',
      stroke: '#0f172a',
      strokeWidth: 2,
    });
    const label = new FabricText('往返实验', {
      left: 96,
      top: 248,
      fontSize: 26,
      fill: '#0f172a',
    });
    const pair = new Group([
      new Rect({
        left: 300,
        top: 232,
        width: 120,
        height: 84,
        fill: '#fbbf24',
        stroke: '#0f172a',
        strokeWidth: 2,
      }),
      new Circle({
        left: 384,
        top: 244,
        radius: 28,
        fill: '#a78bfa',
        stroke: '#0f172a',
        strokeWidth: 2,
      }),
    ]);
    fabricCanvas.backgroundColor = '#eef2ff';
    fabricCanvas.add(red, patternRect, blue, label, pair);
  }

  /** 按当前开关拼白名单：canvas.toObject 的同一份数组同时作用于画布自身与每个对象 */
  function buildWhitelist(options: SerializationOptions): string[] {
    const whitelist: string[] = [];
    if (options.customProps) {
      whitelist.push(...CUSTOM_KEYS);
    }
    if (options.exportVpt) {
      whitelist.push('viewportTransform');
    }
    return whitelist;
  }

  function fillerSceneLabel(value: unknown): string {
    if (value instanceof Gradient) {
      return `Gradient 实例（${value.type}）`;
    }
    if (value instanceof Pattern) {
      return 'Pattern 实例';
    }
    return typeof value === 'string' ? `字符串 "${value}"` : String(value);
  }

  /** 导出产物里的 fill 是纯数据：渐变带 type/coords/colorStops，Pattern 的 source 变 data URL 字符串 */
  function fillerExportLabel(value: unknown): string {
    if (value && typeof value === 'object' && 'type' in value) {
      const data = value as {
        type: string;
        colorStops?: unknown[];
        source?: string;
        repeat?: string;
      };
      if (data.type === 'pattern') {
        const sourceLength = data.source ? data.source.length : 0;
        return `纯数据 type=pattern · source=dataURL(${sourceLength} 字符) · repeat=${data.repeat}`;
      }
      const stops = data.colorStops ? data.colorStops.length : 0;
      return `纯数据 type=${data.type} · ${stops} 个色标`;
    }
    return typeof value === 'string' ? `字符串 "${value}"` : String(value);
  }

  /** 计算当前时刻的导出快照并推送读数（不执行往返，只看导出形态） */
  function emitSnapshot(options: SerializationOptions) {
    const dump = fabricCanvas.toObject(buildWhitelist(options));
    const dumpObjects = dump.objects as Array<Record<string, unknown>>;
    // 红块在导出中的条目：白名单开时凭 taskId 认（唯一）；白名单关时按画布实位回退
    // （红块最先 add，未被排除时导出条目同样排第一）；被排除或不在画布时不回退
    const liveIndex = red ? fabricCanvas.getObjects().indexOf(red) : -1;
    const redDump = dumpObjects.find((entry) => 'taskId' in entry);
    const redEntry =
      redDump ??
      (!options.excludeRed && liveIndex === 0 ? dumpObjects[0] : undefined);
    const hasCustom = redEntry !== undefined && 'taskId' in redEntry;

    let roundtripLabel = '（未往返）';
    if (roundtripApplied) {
      if (red && fabricCanvas.getObjects().includes(red)) {
        const fillName =
          red.fill instanceof Gradient
            ? 'Gradient（已复活）'
            : red.fill instanceof Pattern
              ? 'Pattern（已复活）'
              : String(red.fill);
        const taskId =
          typeof red.get('taskId') === 'string'
            ? red.get('taskId')
            : '（丢失：未进白名单）';
        roundtripLabel = `left=${Math.round(red.left)} angle=${red.angle} taskId=${taskId} fill=${fillName}`;
      } else {
        roundtripLabel = '（红块被 excludeFromExport 排除，未还原）';
      }
    }

    emit({
      sceneObjectsLabel:
        fabricCanvas
          .getObjects()
          .map((object) => object.type.toLowerCase())
          .join(' · ') || '（空）',
      exportedObjectsLabel: `${dump.objects.length} 个：${
        dump.objects
          .map((entry) => String(entry.type).toLowerCase())
          .join(' · ') || '（空）'
      }`,
      topKeysLabel: Object.keys(dump).join(' · '),
      customKeysLabel: hasCustom
        ? `taskId: ${String(redEntry?.taskId)} · remark: ${String(redEntry?.remark)}`
        : options.excludeRed
          ? '（红块被排除导出）'
          : '（未进白名单）',
      jsonSizeLabel: `${JSON.stringify(dump).length} 字符`,
      fillSceneLabel: fillerSceneLabel(red?.fill),
      fillExportLabel: redEntry
        ? fillerExportLabel(redEntry.fill)
        : '（红块不在导出中）',
      roundtripLabel,
      versionLabel: String(dump.version),
    });
  }

  /** 完整闭环：toObject → JSON.stringify → loadFromJSON(Promise) → requestRenderAll */
  async function doRoundtrip(options: SerializationOptions) {
    const token = ++roundtripToken;
    const json = JSON.stringify(fabricCanvas.toObject(buildWhitelist(options)));
    await fabricCanvas.loadFromJSON(json);
    if (token !== roundtripToken) {
      return; // 开关已切走，丢弃过期结果
    }
    // 还原后的红块是全新实例：未被排除时按添加顺序取第一个（红块最先 add）；
    // 被排除时红块不还原，保留旧引用让读数显示"未还原"
    if (!options.excludeRed) {
      const restored = fabricCanvas.getObjects()[0];
      if (restored instanceof Rect) {
        red = restored;
      }
    }
    roundtripApplied = true;
    fabricCanvas.requestRenderAll();
    emitSnapshot(options);
  }

  function update(options: SerializationOptions) {
    if (!options.roundtrip && roundtripApplied) {
      // 关掉「执行往返」：重建初始场景，读数回到基准
      rebuildScene();
      roundtripApplied = false;
      roundtripToken++;
    }
    if (!red) {
      rebuildScene();
    }

    // 开关 1/2/3：只改导出行为，场景视觉不变（excludeFromExport 不挡渲染）
    if (red) {
      red.excludeFromExport = options.excludeRed;
    }
    fabricCanvas.includeDefaultValues = options.includeDefaults;

    fabricCanvas.requestRenderAll();
    emitSnapshot(options);

    // 开关 4：执行往返（false → true 的跳变触发一次）
    if (options.roundtrip && !roundtripApplied) {
      void doRoundtrip(options);
    }
  }

  function syncSize() {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    fabricCanvas.setDimensions({ width, height });
  }

  // 画布上拖动对象时读数联动（left/top 进导出、体积随之微变）
  let lastOptions: SerializationOptions = initial;
  const onLiveChange = () => emitSnapshot(lastOptions);
  fabricCanvas.on('object:modified', onLiveChange);
  fabricCanvas.on('object:moving', onLiveChange);

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  const wrappedUpdate = (options: SerializationOptions) => {
    lastOptions = options;
    update(options);
  };

  wrappedUpdate(initial);

  return {
    update: wrappedUpdate,
    dispose() {
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}
