/**
 * 范例介绍:演示一条 WebDriver 端到端会话的完整流水线——测试 spec、客户端、驱动层、应用二进制、系统 WebView。
 * 输入:测试方案(@wdio/tauri-service / WebdriverIO + tauri-driver / Selenium + tauri-driver)+ 运行平台(macOS / Windows / Linux)。
 * 主要操作:按所选方案逐行画出五段流水线;驱动层是唯一随方案与平台变化的段落,手动路线在其下挂平台原生驱动;
 *   手动路线 + macOS 时驱动段变红断开,读数「会话结果」显示会话建立失败。
 * 预期结果:服务路线在任何平台都走应用内嵌 WebDriver 服务器(无需外部驱动,macOS 可用);
 *   手动路线经 tauri-driver 接平台原生驱动(Windows 用 msedgedriver、Linux 用 WebKitWebDriver),macOS 无可用驱动。
 * 阅读主线:端到端会话 = 客户端、驱动、二进制三层协作——换平台换的是原生驱动,换方案换的是驱动层的组织方式。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type Approach = 'tauri-service' | 'manual-wdio' | 'selenium';
export type Platform = 'macos' | 'windows' | 'linux';

export interface ExampleArgs {
  approach: Approach;
  platform: Platform;
}

export interface ExampleSnapshot {
  /** 读数:会话能否建立(直接对应③驱动层是否可用)。 */
  sessionResult: string;
  /** 读数:驱动链路(客户端 → 驱动 → 原生驱动)。 */
  chain: string;
  /** 读数:该方案对 macOS 的支持情况。 */
  macosSupport: string;
  /** 读数:该方案要求在应用内安装的插件。 */
  appPlugins: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

interface ApproachPreset {
  label: string;
  client: string;
  driver: string;
  nativeDriver: (platform: Platform) => string;
  macosSupport: string;
  appPlugins: string;
  /** 手动路线在 macOS 上没有可用驱动,流水线在驱动段断开。 */
  supports(platform: Platform): boolean;
}

const MANUAL_NATIVE_DRIVERS: Record<Platform, string> = {
  macos: '无可用驱动',
  windows: 'msedgedriver',
  linux: 'WebKitWebDriver',
};

const MANUAL_MACOS_SUPPORT = '不支持——macOS 无 WKWebView 驱动工具';

const APPROACHES: Record<Approach, ApproachPreset> = {
  'tauri-service': {
    label: '@wdio/tauri-service(官方推荐)',
    client: 'WebdriverIO(@wdio/tauri-service)',
    driver: '内嵌 WebDriver 服务器(随应用运行)',
    nativeDriver: () => '无需外部驱动(嵌入式)',
    macosSupport: '支持(全平台,含 macOS)',
    appPlugins: '需装 tauri-plugin-wdio-webdriver、tauri-plugin-wdio',
    supports: () => true,
  },
  'manual-wdio': {
    label: 'WebdriverIO + tauri-driver(手动)',
    client: 'WebdriverIO(wdio.conf.js)',
    driver: 'tauri-driver',
    nativeDriver: (platform) => MANUAL_NATIVE_DRIVERS[platform],
    macosSupport: MANUAL_MACOS_SUPPORT,
    appPlugins: '不需要',
    supports: (platform) => platform !== 'macos',
  },
  selenium: {
    label: 'Selenium + tauri-driver(手动)',
    client: 'Selenium Builder(指向 127.0.0.1:4444)',
    driver: 'tauri-driver',
    nativeDriver: (platform) => MANUAL_NATIVE_DRIVERS[platform],
    macosSupport: MANUAL_MACOS_SUPPORT,
    appPlugins: '不需要',
    supports: (platform) => platform !== 'macos',
  },
};

const WEBVIEWS: Record<Platform, string> = {
  macos: 'WKWebView',
  windows: 'WebView2',
  linux: 'WebKitGTK',
};

const TEXT = '#172033';
const DIM = '#64748b';
const PALE = '#cbd5e1';
const ACCENT = '#4f7cff';
const ACCENT_BG = '#eef3ff';
const ERR = '#b91c1c';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';
const ERR_BG = '#fef2f2';
const ERR_BORDER = '#dc2626';

const LABEL_X = 24;
const BOX_X = 110;
const BOX_H = 26;
const BOX_H_NOTE = 40;
const LINE_H = 14;
const GAP = 16;

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ExampleArgs = { approach: 'tauri-service', platform: 'macos' };

  function drawStage(
    y: number,
    width: number,
    label: string,
    main: string,
    note: string | undefined,
    state: 'normal' | 'accent' | 'broken',
  ): number {
    const boxH = note ? BOX_H_NOTE : BOX_H;
    const boxW = Math.max(280, width - BOX_X - 24);
    const broken = state === 'broken';

    if (broken || state === 'accent') {
      drawingContext.fillStyle = broken ? ERR_BG : ACCENT_BG;
      drawingContext.strokeStyle = broken ? ERR_BORDER : ACCENT;
      drawingContext.lineWidth = broken ? 1.5 : 1;
    } else {
      drawingContext.fillStyle = BOX_BG;
      drawingContext.strokeStyle = BOX_BORDER;
      drawingContext.lineWidth = 1;
    }
    roundRect(drawingContext, BOX_X, y, boxW, boxH, 6);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = DIM;
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(label, LABEL_X, y + boxH / 2 + 4);

    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillStyle = broken ? ERR : TEXT;
    drawingContext.fillText(main, BOX_X + 12, y + 17);

    if (note) {
      drawingContext.fillStyle = broken ? ERR : DIM;
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(note, BOX_X + 12, y + 17 + LINE_H);
    }

    return y + boxH;
  }

  function drawArrow(from: number, to: number): void {
    drawingContext.strokeStyle = PALE;
    drawingContext.beginPath();
    drawingContext.moveTo(70, from + 3);
    drawingContext.lineTo(70, to - 8);
    drawingContext.stroke();
    drawingContext.fillStyle = PALE;
    drawingContext.beginPath();
    drawingContext.moveTo(70, to - 2);
    drawingContext.lineTo(66.5, to - 9);
    drawingContext.lineTo(73.5, to - 9);
    drawingContext.closePath();
    drawingContext.fill();
  }

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(700, size.width);
    const height = Math.max(400, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';

    const preset = APPROACHES[current.approach];
    const nativeDriver = preset.nativeDriver(current.platform);
    const supported = preset.supports(current.platform);
    const webview = WEBVIEWS[current.platform];

    // 顶部标题:当前方案名,与读数和正文一一对应
    drawingContext.fillStyle = TEXT;
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`端到端会话流水线:${preset.label}`, LABEL_X, 20);

    // 五段流水线:每段 = 左侧标签 + 右侧内容框;③驱动层是方案与平台的变化点
    let y = 36;
    let prevBottom = 0;
    const stages: {
      label: string;
      main: string;
      note?: string;
      state: 'normal' | 'accent' | 'broken';
    }[] = [
      {
        label: '① 测试 spec',
        main: "it('标题以 Hello 开头', …)",
        note: '选择器落在真实 WebView 渲染的 DOM 上',
        state: 'normal',
      },
      { label: '② 客户端', main: preset.client, state: 'normal' },
      {
        label: '③ 驱动层',
        main: preset.driver,
        note: supported
          ? current.approach === 'tauri-service'
            ? '由应用内插件提供,随二进制一起启动'
            : `额外配对原生驱动:${nativeDriver}`
          : '桌面端不支持 macOS——没有可用的 WKWebView 驱动工具',
        state: supported ? 'accent' : 'broken',
      },
      {
        label: '④ 应用二进制',
        main: 'tauri build --debug --no-bundle',
        note: 'src-tauri/target/debug/<productName>',
        state: 'normal',
      },
      {
        label: '⑤ 系统 WebView',
        main: webview,
        note: '由操作系统提供,Tauri 不打包',
        state: 'normal',
      },
    ];

    stages.forEach((stage) => {
      if (prevBottom > 0) {
        drawArrow(prevBottom, y);
      }
      prevBottom = drawStage(
        y,
        width,
        stage.label,
        stage.main,
        stage.note,
        stage.state,
      );
      y = prevBottom + GAP;
    });

    // 会话能否建立在读数「会话结果」中给出,直接对应③的驱动层是否可用
    emit({
      sessionResult: supported
        ? '✓ 建立,$("body > h1") 断言通过'
        : '✗ 失败:macOS 无可用 WKWebView 驱动',
      chain:
        current.approach === 'tauri-service'
          ? 'WDIO → 应用内嵌 WebDriver 服务器'
          : `${current.approach === 'manual-wdio' ? 'WDIO' : 'Selenium'} → tauri-driver → ${nativeDriver}`,
      macosSupport: preset.macosSupport,
      appPlugins: preset.appPlugins,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
