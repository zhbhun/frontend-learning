/**
 * 范例：逐一读取 ort.env 的公开标志，验证参考表中的默认值是「语义默认」——
 * 未设置的标志读取为 undefined，真正的默认值由首次会话创建时的初始化落盘。
 * 前置状态：仅 import onnxruntime-web；刻意不创建会话、不下载 wasm 工件、无网络请求。
 * 操作：无输入，打开页面即完成读取。
 * 预期结果：logLevel 显示 'warning'（唯一自带运行时初始值的标志），debug、trace
 * 与 env.wasm 全部标志显示「未设置」；面板底部给出当前浏览器的跨域隔离状态与
 * 逻辑核数，它们决定 numThreads 自动解析的结果。
 * 阅读主线：collectSnapshot() 如何逐项读取 ort.env；画布面板与读数属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { env } from 'onnxruntime-web';

/** 把标志的运行时值转成可读文本；undefined 显示为「未设置」。 */
function formatFlag(value: unknown): string {
  if (value === undefined) {
    return '未设置';
  }
  if (typeof value === 'string') {
    return `'${value}'`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export interface EnvFlagGroup {
  title: string;
  items: Array<[string, string]>;
}

export interface EnvSnapshotData {
  /** 读数行：正文表格引用的关键标志。 */
  rows: Array<[string, string]>;
  /** 画布面板的完整分组数据。 */
  groups: EnvFlagGroup[];
  /** 当前页面是否跨域隔离（决定 numThreads 自动解析结果）。 */
  isolated: boolean;
  /** 逻辑核数（隔离时自动线程数 = min(4, ceil(cores / 2))）。 */
  cores: number;
}

export interface EnvSnapshotInstance {
  update(): void;
  dispose(): void;
}

/** 逐项读取 ort.env 的公开标志；不创建会话，全部是即时读取的真实值。 */
export function collectSnapshot(): EnvSnapshotData {
  const isolated =
    typeof self !== 'undefined' && self.crossOriginIsolated === true;
  const cores =
    typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1;

  const topLevel: EnvFlagGroup = {
    title: 'env 顶层',
    items: [
      ['logLevel', formatFlag(env.logLevel)],
      ['debug', formatFlag(env.debug)],
      ['trace', formatFlag(env.trace)],
      ['versions.web', formatFlag(env.versions.web)],
    ],
  };
  const wasmFlags: EnvFlagGroup = {
    title: 'env.wasm',
    items: [
      ['numThreads', formatFlag(env.wasm.numThreads)],
      ['simd', formatFlag(env.wasm.simd)],
      ['proxy', formatFlag(env.wasm.proxy)],
      ['initTimeout', formatFlag(env.wasm.initTimeout)],
      ['wasmPaths', formatFlag(env.wasm.wasmPaths)],
      ['wasmBinary', formatFlag(env.wasm.wasmBinary)],
    ],
  };

  return {
    rows: [
      ['logLevel', formatFlag(env.logLevel)],
      ['wasm.numThreads', formatFlag(env.wasm.numThreads)],
      ['wasm.wasmPaths', formatFlag(env.wasm.wasmPaths)],
      ['crossOriginIsolated', String(isolated)],
      ['逻辑核数', String(cores)],
    ],
    groups: [topLevel, wasmFlags],
    isolated,
    cores,
  };
}

const COLOR_TEXT = '#172033';
const COLOR_MUTED = '#475569';
const COLOR_FADED = '#94a3b8';
const COLOR_ACCENT = '#4f7cff';

export function createEnvSnapshot(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EnvSnapshotData) => void,
): EnvSnapshotInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  function drawGroup(x: number, y: number, group: EnvFlagGroup) {
    ctx.fillStyle = COLOR_ACCENT;
    ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(group.title, x, y + 16);

    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    group.items.forEach(([name, value], index) => {
      const rowY = y + 44 + index * 24;
      ctx.fillStyle = COLOR_MUTED;
      ctx.fillText(name, x, rowY);
      ctx.fillStyle = value === '未设置' ? COLOR_FADED : COLOR_TEXT;
      ctx.fillText(value, x + 150, rowY);
    });
  }

  function draw() {
    const data = collectSnapshot();
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = COLOR_TEXT;
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('ort.env 当前值（创建首个会话前）', 28, 40);

    const columnWidth = (width - 64) / 2;
    drawGroup(28, 60, data.groups[0]);
    drawGroup(28 + columnWidth + 8, 60, data.groups[1]);

    // 未设置的标志读取为 undefined——文档默认值要等首次初始化才落盘。
    ctx.fillStyle = COLOR_MUTED;
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('本实例不创建会话——以上是首次初始化将读到的输入', 28, height - 44);

    // numThreads 的自动解析规则（隔离时 min(4, ceil(核数/2))，否则 1）。
    const prediction = data.isolated
      ? Math.min(4, Math.ceil(data.cores / 2))
      : 1;
    ctx.fillStyle = COLOR_MUTED;
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(
      `crossOriginIsolated=${data.isolated} · 逻辑核数=${data.cores} · numThreads 自动解析预测=${prediction}`,
      28,
      height - 20,
    );

    emit(data);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update() {
      // 无输入；重复调用只重绘当前快照。
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
