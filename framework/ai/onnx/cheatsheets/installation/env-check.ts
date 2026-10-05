/**
 * 范例介绍：真实导入 onnxruntime-web（默认入口），读取运行时版本，检测 WebGPU
 * 适配器与跨域隔离状态，形成一组安装自检读数。
 * 输入：期望版本号（Controls「期望版本」）；前置：工作区已安装 onnxruntime-web@1.30.0。
 * 主要操作：比对 ort.env.versions.web 与期望版本；用 requestAdapter 异步检测 WebGPU。
 * 预期结果：版本读数为 1.30.0；把期望版本改成其他号后「版本对齐」读数变为不一致。
 * 阅读主线：import 只加载 JS——本实例刻意不创建会话、不下载 wasm 工件
 * （工件在首次创建会话时才拉取，见正文「wasm 工件路径」）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import * as ort from 'onnxruntime-web';

/** WebGPU 检测只依赖 requestAdapter 一个入口，用最小结构类型避免绑定具体 DOM 版本。 */
interface MinimalGpuAdapter {
  info?: { vendor?: string; architecture?: string };
}

interface MinimalGpu {
  requestAdapter(): Promise<MinimalGpuAdapter | null>;
}

export interface EnvCheckOptions {
  expectedVersion: string;
}

export interface EnvCheckSnapshot {
  runtimeVersion: string;
  expectedVersion: string;
  alignmentLabel: string;
  webgpuLabel: string;
  isolationLabel: string;
  hardwareConcurrency: number;
}

export interface EnvCheckInstance {
  update(options: EnvCheckOptions): void;
  dispose(): void;
}

const DETECT_TIMEOUT_MS = 3000;

const COLOR_TEXT = '#172033';
const COLOR_MUTED = '#475569';
const COLOR_OK = '#16a34a';
const COLOR_WARN = '#b45309';
const COLOR_BAD = '#dc2626';

const gpu: MinimalGpu | undefined = (
  navigator as Navigator & { gpu?: MinimalGpu }
).gpu;

const runtimeVersion = ort.env.versions.web ?? '未知';

const crossOriginIsolated =
  typeof globalThis.crossOriginIsolated === 'boolean'
    ? globalThis.crossOriginIsolated
    : false;

const hardwareConcurrency =
  typeof navigator.hardwareConcurrency === 'number'
    ? navigator.hardwareConcurrency
    : 0;

async function detectWebGpu(): Promise<string> {
  if (!gpu) {
    return '不可用（无 navigator.gpu）';
  }

  try {
    const adapter = await Promise.race([
      gpu.requestAdapter(),
      new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), DETECT_TIMEOUT_MS);
      }),
    ]);

    if (adapter === 'timeout') {
      return '检测超时';
    }
    if (!adapter) {
      return '不可用（无适配器）';
    }

    const vendor = adapter.info?.vendor || '未知厂商';
    const architecture = adapter.info?.architecture;
    return architecture ? `可用（${vendor} / ${architecture}）` : `可用（${vendor}）`;
  } catch {
    return '检测失败';
  }
}

export function createEnvCheck(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EnvCheckSnapshot) => void,
): EnvCheckInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let expectedVersion = '1.30.0';
  let webgpuLabel = '检测中…';
  let disposed = false;

  function alignmentLabel(): string {
    return runtimeVersion === expectedVersion
      ? '一致'
      : `不一致（期望 ${expectedVersion}）`;
  }

  function emitSnapshot() {
    emit({
      runtimeVersion,
      expectedVersion,
      alignmentLabel: alignmentLabel(),
      webgpuLabel,
      isolationLabel: crossOriginIsolated
        ? '已隔离（可多线程）'
        : '未隔离（单线程 wasm）',
      hardwareConcurrency,
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = COLOR_TEXT;
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('onnxruntime-web 运行时自检', 48, 56);

    drawingContext.font = '600 16px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillStyle = '#4f7cff';
    drawingContext.fillText(`ort.env.versions.web = "${runtimeVersion}"`, 48, 96);

    const rows: Array<[string, string, string]> = [
      ['导入入口', 'onnxruntime-web（默认）', COLOR_MUTED],
      ['版本对齐', alignmentLabel(), runtimeVersion === expectedVersion ? COLOR_OK : COLOR_BAD],
      ['WebGPU 适配器', webgpuLabel, webgpuLabel.startsWith('可用') ? COLOR_OK : COLOR_WARN],
      ['跨域隔离', crossOriginIsolated ? '已隔离（可多线程）' : '未隔离（单线程 wasm）', COLOR_MUTED],
      ['逻辑核数', `${hardwareConcurrency}`, COLOR_MUTED],
    ];

    let y = 144;
    for (const [label, value, color] of rows) {
      drawingContext.fillStyle = COLOR_MUTED;
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(label, 48, y);

      drawingContext.fillStyle = color;
      drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(value, 280, y);
      y += 30;
    }

    emitSnapshot();
  }

  // WebGPU 检测是异步的：结果到达后只更新读数，不阻塞面板首次绘制。
  void detectWebGpu().then((label) => {
    if (disposed) {
      return;
    }
    webgpuLabel = label;
    draw();
  });

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      expectedVersion = options.expectedVersion;
      draw();
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
    },
  };
}
