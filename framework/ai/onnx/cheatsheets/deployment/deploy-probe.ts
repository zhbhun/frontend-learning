/**
 * 范例介绍：部署自检面板——读取当前页面的公开运行条件，按目标后端汇总就绪判定。
 * 输入：Controls「目标后端」（wasm / webgpu）与「期望版本」；前置：已安装 onnxruntime-web。
 * 主要操作：读 ort.env.versions.web、isSecureContext、crossOriginIsolated 与
 *   SharedArrayBuffer 暴露状态，异步探测 WebGPU 适配器，按目标后端汇总「必须项」。
 * 预期结果：版本读数与安装一致；本工作区没有隔离响应头，「跨域隔离」与
 *   「SharedArrayBuffer」两行显示未满足——这正是多数托管默认状态的现场，
 *   把 COOP/COEP 配到自己站点后，同一段代码会读到已隔离。
 * 阅读主线：面板只读页面状态，不创建会话、不下载 wasm 工件；
 *   部署后把这段代码嵌进应用（或贴进控制台），即可在线上核对运行条件。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import * as ort from 'onnxruntime-web';

/** WebGPU 探测只依赖 requestAdapter 一个入口，用最小结构类型避免绑定具体 DOM 版本。 */
interface MinimalGpuAdapter {
  info?: { vendor?: string };
}

interface MinimalGpu {
  requestAdapter(): Promise<MinimalGpuAdapter | null>;
}

export type DeployTarget = 'wasm' | 'webgpu';

export interface DeployProbeOptions {
  target: DeployTarget;
  expectedVersion: string;
}

export interface DeployProbeSnapshot {
  target: DeployTarget;
  runtimeVersion: string;
  expectedVersion: string;
  versionAligned: boolean;
  secureContext: boolean;
  isolated: boolean;
  sabReady: boolean;
  webgpuLabel: string;
  verdict: string;
}

export interface DeployProbeInstance {
  update(options: DeployProbeOptions): void;
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

// 运行条件由部署环境（响应头、https、安装版本）决定，页面存续期内不变，加载时读取一次。
const runtimeVersion = ort.env.versions.web ?? '未知';
const secureContext = self.isSecureContext === true;
const isolated = self.crossOriginIsolated === true;

// 非隔离页面连 SharedArrayBuffer 构造器都不可见，用结构类型读 typeof 判定。
const windowScope = window as unknown as { SharedArrayBuffer?: unknown };
const sabReady = typeof windowScope.SharedArrayBuffer !== 'undefined';

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
    return `可用（${vendor}）`;
  } catch {
    return '检测失败';
  }
}

export function createDeployProbe(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DeployProbeSnapshot) => void,
): DeployProbeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let target: DeployTarget = 'wasm';
  let expectedVersion = '1.30.0';
  let webgpuLabel = '检测中…';
  let disposed = false;

  function versionAligned(): boolean {
    return runtimeVersion === expectedVersion;
  }

  // 综合判定：只汇总所选目标后端的「必须项」，可选能力缺失不算失败。
  function verdict(): string {
    if (!versionAligned()) {
      return `未就绪：运行时 ${runtimeVersion} ≠ 期望 ${expectedVersion}`;
    }
    if (target === 'webgpu') {
      if (!secureContext) {
        return '未就绪：非安全上下文（WebGPU 需要 https 或 localhost）';
      }
      if (!webgpuLabel.startsWith('可用')) {
        return `未就绪：WebGPU ${webgpuLabel}`;
      }
      return 'WebGPU 就绪';
    }
    return 'wasm 基线就绪（未隔离时按单线程运行）';
  }

  function emitSnapshot() {
    emit({
      target,
      runtimeVersion,
      expectedVersion,
      versionAligned: versionAligned(),
      secureContext,
      isolated,
      sabReady,
      webgpuLabel,
      verdict: verdict(),
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(260, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = COLOR_TEXT;
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('部署自检：当前页面的运行条件', 48, 52);

    const aligned = versionAligned();
    const webgpuOk = webgpuLabel.startsWith('可用');
    const secureNeeded = target === 'webgpu';
    const rows: Array<[string, string, string]> = [
      [
        '版本对齐',
        aligned ? '一致' : `不一致（期望 ${expectedVersion}）`,
        aligned ? COLOR_OK : COLOR_BAD,
      ],
      [
        '安全上下文',
        secureContext ? '是（https 或 localhost）' : '否',
        secureContext
          ? COLOR_OK
          : secureNeeded
            ? COLOR_BAD
            : COLOR_WARN,
      ],
      [
        '跨域隔离',
        isolated ? '已隔离（可多线程）' : '未隔离（单线程 wasm）',
        isolated ? COLOR_OK : COLOR_MUTED,
      ],
      [
        'SharedArrayBuffer',
        sabReady ? '可用' : '不可见',
        sabReady ? COLOR_OK : COLOR_MUTED,
      ],
      [
        'WebGPU 适配器',
        webgpuLabel,
        webgpuOk ? COLOR_OK : secureNeeded ? COLOR_BAD : COLOR_WARN,
      ],
    ];

    let y = 92;
    for (const [label, value, color] of rows) {
      drawingContext.fillStyle = COLOR_MUTED;
      drawingContext.font = '14px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(label, 48, y);

      drawingContext.fillStyle = color;
      drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(value, 220, y);
      y += 30;
    }

    const summary = verdict();
    drawingContext.fillStyle = summary.startsWith('未就绪') ? COLOR_BAD : COLOR_OK;
    drawingContext.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(summary, 48, y + 16);

    emitSnapshot();
  }

  // WebGPU 探测是异步的：结果到达后只刷新面板，不阻塞首次绘制。
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
      target = options.target;
      expectedVersion = options.expectedVersion;
      draw();
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
    },
  };
}
