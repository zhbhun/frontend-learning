/**
 * 范例介绍：演示 SVG 字符串经 loadSVGFromString 翻译成 Fabric 对象树的完整闭环——
 * 1. 五个预设覆盖视图框缩放、分组吸收、未支持元素、文字、空文档五类导入情形；
 * 2. 读数给出对象类型清单、被跳过的标签、viewBox 吸收与顶层结构，可核对映射行为；
 * 3. 画布级 toSVG 的输出摘要（长度与关键标记）验证导出形态随 suppressPreamble 变化。
 * 输入：SVG 预设、自定义 SVG 源码（填写则优先）、导入后合并成组、省略 XML 序言。
 * 预期结果：画布渲染解析出的对象树；读数同步变化；合并成组后顶层结构变为 Group(n)
 * 且可整体拖动；省略序言后 toSVG 标记里的 xml / doctype 消失。
 * 阅读主线：SVG_PRESETS 看输入设计；rebuild() 看导入、过滤 null 与重组；
 * emitSnapshot() 看派生读数与 toSVG 摘要。
 */
import { Canvas, loadSVGFromString, util } from 'fabric';
import type { FabricObject } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 预设 SVG：与 loadSVGFromString 的返回形态逐项对应，方便读者核对 */
export const SVG_PRESETS = {
  // viewBox 320×180 被宽高 640×360 吸收：每个对象 scale≈2，坐标落在最终坐标系
  viewbox: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="640" height="360">
  <rect x="24" y="24" width="130" height="80" rx="8" fill="#4f7cff"/>
  <circle cx="230" cy="64" r="40" fill="#f59e0b"/>
  <path d="M30 150 L150 150 L110 104 Z" fill="#10b981"/>
  <path d="M200 150 C240 96 300 96 300 150" fill="none" stroke="#e11d48" stroke-width="6"/>
</svg>`,
  // g 不产生对象：translate/rotate 与 fill 被子对象吸收，导入后是 4 个平铺对象
  grouped: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <g transform="translate(320,180) rotate(-8)" fill="#4f7cff">
    <rect x="-150" y="-70" width="200" height="140" rx="12"/>
    <circle cx="160" cy="0" r="44" fill="#f59e0b"/>
    <text x="-150" y="12" font-family="Georgia, serif" font-size="34" fill="#ffffff">SVG</text>
  </g>
  <path d="M80 320 L560 320" stroke="#94a3b8" stroke-width="3" fill="none"/>
</svg>`,
  // defs/mask/foo 不被翻译：渐变引用会变成 Gradient，mask 引用被忽略，未知标签跳过
  unsupported: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4f7cff"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <mask id="hole"><rect x="0" y="0" width="120" height="120" fill="#fff"/></mask>
  <rect x="60" y="60" width="220" height="140" rx="10" fill="url(#grad)"/>
  <circle cx="460" cy="130" r="70" fill="#10b981" mask="url(#hole)"/>
  <foo>不是形状</foo>
  <path d="M80 300 L560 300" stroke="#e11d48" stroke-width="5" fill="none"/>
</svg>`,
  // text → FabricText：text-anchor / letter-spacing 等属性一并翻译
  text: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <text x="60" y="120" font-family="Georgia, serif" font-size="44" font-weight="bold" fill="#172033">Fabric.js</text>
  <text x="320" y="200" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#475569">SVG 导入与导出</text>
  <text x="60" y="280" font-family="monospace" font-size="18" letter-spacing="4" fill="#94a3b8">loadSVGFromString</text>
</svg>`,
  // 空 SVG：解析成功但 objects 为空数组，读数归零——loadSVGFromString 不因“无形状”报错
  empty: `<svg xmlns="http://www.w3.org/2000/svg"></svg>`,
} as const;

export type SvgPreset = keyof typeof SVG_PRESETS;

/** 读者输入：对应 Controls 面板 */
export interface SvgLessonOptions {
  /** 内置预设；「自定义 SVG 源码」留空时生效 */
  preset: SvgPreset;
  /** 读者粘贴的 SVG 源码；留空跟随预设，填写则优先生效 */
  customSvg: string;
  /** 导入后用 util.groupSVGElements 合并成 Group（单对象时退化为原对象） */
  group: boolean;
  /** toSVG 传 suppressPreamble: true，省略 <?xml 与 DOCTYPE */
  suppressPreamble: boolean;
}

/** 派生读数：由 readout 显示 */
export interface SvgLessonSnapshot {
  objectCount: number;
  typeList: string;
  skippedTags: string;
  viewBoxAbsorption: string;
  topLevel: string;
  svgLength: string;
  svgMarks: string;
}

export interface SvgLessonInstance {
  update(options: SvgLessonOptions): void;
  dispose(): void;
}

/** 与 SVGParsingOutput 一致的结构（fabric 未导出该类型名，这里按 .d.ts 形态声明） */
interface ParsedSvg {
  objects: (FabricObject | null)[];
  options: Record<string, any>;
  elements: Element[];
  allElements: Element[];
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };

export function createSvgLesson(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: SvgLessonSnapshot) => void,
): SvgLessonInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#ffffff',
  });

  let currentKey = '';
  let suppressPreamble = false;
  let rebuildToken = 0;
  let lastParsed: ParsedSvg | null = null;
  let lastTopLevel = '（未导入）';

  function fmt(n: unknown): string {
    return typeof n === 'number' && Number.isFinite(n)
      ? String(Math.round(n * 10) / 10)
      : '—';
  }

  /** 解析结果派生全部读数；toSVG 摘要在每次输入变化后重算 */
  function emitSnapshot(parsed: ParsedSvg | null) {
    const objects = parsed?.objects ?? [];
    const live = objects.filter((o): o is FabricObject => o !== null);

    // 类型清单：按导入顺序去重；实例 type getter 返回小写类名，恰好与 SVG 标签名一致
    const typeList = live.length
      ? [...new Set(live.map((o) => o.type))].join('·')
      : '（无对象）';

    // 跳过标签：allElements 里未被转换的节点（defs/mask/未知标签/渐变定义等）
    let skippedTags = '—';
    if (parsed) {
      const converted = new Set(parsed.elements);
      const skipped = [
        ...new Set(
          parsed.allElements
            .filter((el) => !converted.has(el))
            .map((el) => el.tagName.toLowerCase()),
        ),
      ];
      skippedTags = skipped.length ? skipped.join('·') : '（无）';
    }

    // viewBox 吸收：SVG 根的 viewBox → width/height，倍率进对象 scale
    let viewBoxAbsorption = '（无 viewBox）';
    if (parsed && Number.isFinite(parsed.options.viewBoxWidth)) {
      const o = parsed.options;
      const scale = live[0] ? fmt(live[0].scaleX) : '—';
      viewBoxAbsorption = `${fmt(o.viewBoxWidth)}×${fmt(o.viewBoxHeight)} → ${fmt(o.width)}×${fmt(o.height)}（对象 scale≈${scale}）`;
    } else if (parsed && Number.isFinite(parsed.options.width)) {
      viewBoxAbsorption = `width=${fmt(parsed.options.width)}（无 viewBox，不缩放）`;
    }

    // toSVG 摘要：长度 + 关键标记存在性
    const svg = fabricCanvas.toSVG({ suppressPreamble });
    const marks: Array<[string, string]> = [
      ['xml', '<?xml'],
      ['doctype', '<!DOCTYPE'],
      ['desc', '<desc'],
      ['viewBox', 'viewBox='],
      ['rect', '<rect'],
      ['circle', '<circle'],
      ['path', '<path'],
      ['text', '<text'],
      ['gradient', '<linearGradient'],
      ['filter', '<filter'],
    ];
    const found = marks
      .filter(([, needle]) => svg.includes(needle))
      .map(([label]) => label);

    emit({
      objectCount: live.length,
      typeList,
      skippedTags,
      viewBoxAbsorption,
      topLevel: lastTopLevel,
      svgLength: `${svg.length} 字符`,
      svgMarks: found.length ? found.slice(0, 6).join('·') : '（无）',
    });
  }

  /** 解析 → 过滤 null → 按开关重组 → 入画布；token 防止旧解析结果覆盖新输入 */
  async function rebuild(svg: string, group: boolean) {
    const token = ++rebuildToken;
    fabricCanvas.remove(...fabricCanvas.getObjects());

    const parsed: ParsedSvg = await loadSVGFromString(svg);
    if (token !== rebuildToken) {
      return; // 输入已再次变化，本次结果过期
    }

    // objects 里图片加载失败的位置是 null，入画布前必须过滤
    const objects = parsed.objects.filter((o): o is FabricObject => o !== null);
    if (group && objects.length > 0) {
      const merged = util.groupSVGElements(objects, parsed.options);
      fabricCanvas.add(merged);
      lastTopLevel =
        objects.length > 1
          ? `Group(${objects.length})`
          : '单对象（合并退化为原对象）';
    } else {
      fabricCanvas.add(...objects);
      lastTopLevel = objects.length
        ? `${objects.length} 个平铺对象`
        : '（空导入）';
    }
    lastParsed = parsed;
    fabricCanvas.requestRenderAll(); // renderOnAddRemove 默认已请求，这里兜底
    emitSnapshot(parsed);
  }

  function syncSize() {
    // wrapperEl 的父级就是共享舞台；createResizeObserver 观察的正是“传入元素的父级”
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    fabricCanvas.setDimensions({ width, height });
  }

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  function update(options: SvgLessonOptions) {
    // 「自定义 SVG 源码」填写则优先，留空跟随预设
    const svg = options.customSvg.trim() || SVG_PRESETS[options.preset];
    const key = `${svg} ${options.group}`;
    if (key !== currentKey) {
      currentKey = key;
      void rebuild(svg, options.group);
    }

    if (options.suppressPreamble !== suppressPreamble) {
      // 只影响 toSVG 摘要，用上次解析结果重算读数，不需要重新解析
      suppressPreamble = options.suppressPreamble;
      if (lastParsed) {
        emitSnapshot(lastParsed);
      }
    }
  }

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      lastParsed = null;
      void fabricCanvas.dispose();
    },
  };
}
