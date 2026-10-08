/**
 * 范例介绍:演示「目标平台 × 本机已装项 → 环境检查缺哪些、init 与 dev 流水线在哪一步被阻断」。
 * 输入:目标平台(iOS / Android)与本机已安装项(工具链、环境变量、Rust targets)。
 * 主要操作:左栏按平台列出环境检查清单,缺失项标红并给出修复命令;
 *   右栏预演 tauri [android|ios] init 与 dev 流水线,被缺失项阻断的步骤标红并注明原因。
 * 预期结果:iOS 缺 Cocoapods 或 Rust targets 阻断 init、缺 Xcode 阻断 dev;
 *   Android 缺 Rust targets 阻断 init、缺 SDK/NDK/JAVA 环境变量阻断 dev;全部勾齐时流水线全绿。
 * 阅读主线:环境清单是交叉编译与原生壳工程的门槛,缺失项、修复命令、被阻断步骤一一对应。
 *   本图为定性模拟:只对照正文清单判断,不探测本机真实安装状态;真实环境以
 *   tauri [android|ios] init 能否走通为准,核对步骤见 mobile-setup-verification.md。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type Platform = 'iOS' | 'Android';

export interface ExampleArgs {
  platform: Platform;
  /** 本机已安装项,取值为各检查项的 id。 */
  installed: string[];
}

export interface ExampleSnapshot {
  /** 读数:环境状态(就绪或缺 N 项)。 */
  envStatus: string;
  /** 读数:缺失项名称。 */
  missing: string;
  /** 读数:init 与 dev 流水线的可执行 / 阻断状态。 */
  pipeline: string;
  /** 读数:下一步建议命令。 */
  next: string;
}

interface CheckItem {
  /** 与 stories 中 installed 选项一致的 id。 */
  id: string;
  /** 清单中的显示名。 */
  label: string;
  /** 清单中的补充说明。 */
  detail: string;
  /** 缺失时的修复命令(定性缩写,完整命令见正文)。 */
  fix: string;
  /** 缺失时阻断流水线的哪一步。 */
  blocks: 'init' | 'dev';
}

/** iOS 检查项:对应官方 Prerequisites 的 iOS 清单。 */
const IOS_ITEMS: CheckItem[] = [
  {
    id: 'Xcode',
    label: 'Xcode(完整版)',
    detail: 'xcodebuild · 模拟器随附',
    fix: 'App Store 安装完整 Xcode',
    blocks: 'dev',
  },
  {
    id: 'Cocoapods',
    label: 'Cocoapods',
    detail: 'gen/apple 壳工程的原生依赖',
    fix: 'brew install cocoapods',
    blocks: 'init',
  },
  {
    id: 'iOS Rust targets',
    label: 'iOS Rust targets ×3',
    detail: 'aarch64-apple-ios 等',
    fix: 'rustup target add aarch64-apple-ios 等 3 个',
    blocks: 'init',
  },
];

/** Android 检查项:Studio/SDK 组件与三个环境变量、四个 Rust targets。 */
const ANDROID_ITEMS: CheckItem[] = [
  {
    id: 'Android Studio',
    label: 'Android Studio',
    detail: '自带 JDK(JBR)· Device Manager 建 AVD',
    fix: '官网下载安装 Android Studio',
    blocks: 'dev',
  },
  {
    id: 'SDK 与 NDK 组件',
    label: 'SDK 与 NDK 组件',
    detail: 'Platform · Platform-Tools · NDK · Build-Tools',
    fix: 'SDK Manager 安装 Platform / NDK 等',
    blocks: 'dev',
  },
  {
    id: 'JAVA_HOME',
    label: 'JAVA_HOME',
    detail: '指向 Studio 自带 JDK',
    fix: 'export JAVA_HOME=…Android Studio.jbr',
    blocks: 'dev',
  },
  {
    id: 'ANDROID_HOME / NDK_HOME',
    label: 'ANDROID_HOME / NDK_HOME',
    detail: 'SDK 根目录与 ndk/<版本>',
    fix: 'export ANDROID_HOME=$HOME/Library/Android/sdk',
    blocks: 'dev',
  },
  {
    id: 'Android Rust targets',
    label: 'Android Rust targets ×4',
    detail: 'aarch64-linux-android 等',
    fix: 'rustup target add aarch64-linux-android 等 4 个',
    blocks: 'init',
  },
];

type StepStatus = 'run' | 'fail' | 'skip';

interface StepPlan {
  name: string;
  sub: string;
  status: StepStatus;
  statusText: string;
}

interface ScenePlan {
  items: CheckItem[];
  missing: CheckItem[];
  steps: StepPlan[];
  commandLine: string;
  envStatus: string;
  missingText: string;
  pipelineText: string;
  nextText: string;
}

function itemsFor(platform: Platform): CheckItem[] {
  return platform === 'iOS' ? IOS_ITEMS : ANDROID_ITEMS;
}

function scenePlan(args: ExampleArgs): ScenePlan {
  const items = itemsFor(args.platform);
  const installed = new Set(args.installed);
  const missing = items.filter((item) => !installed.has(item.id));

  // 阻断规则:targets / Cocoapods 缺失先卡 init;Xcode / SDK 与环境变量缺失卡 dev。
  const initMissing = missing.filter((item) => item.blocks === 'init');
  const devMissing = missing.filter((item) => item.blocks === 'dev');
  const initOk = initMissing.length === 0;
  const devOk = devMissing.length === 0;

  const initSub = args.platform === 'iOS' ? '生成 gen/apple 壳工程' : '生成 gen/android 壳工程';
  const devName = `tauri ${args.platform === 'iOS' ? 'ios' : 'android'} dev`;

  const steps: StepPlan[] = [
    {
      name: `① tauri ${args.platform === 'iOS' ? 'ios' : 'android'} init`,
      sub: initOk ? initSub : `缺:${initMissing.map((item) => item.label).join('、')}`,
      status: initOk ? 'run' : 'fail',
      statusText: initOk ? '执行' : '阻断',
    },
    {
      name: `② ${devName} · 前端 dev server`,
      sub: initOk ? 'beforeDevCommand → devUrl · 热重载' : '待 ① 通过后执行',
      status: !initOk ? 'skip' : devOk ? 'run' : 'fail',
      statusText: !initOk ? '待前序' : devOk ? '执行' : '阻断',
    },
    {
      name: `③ ${devName} · 交叉编译与部署`,
      sub: !initOk
        ? '待 ① 通过后执行'
        : devOk
          ? 'cargo 编译手机 target → 模拟器 / 真机'
          : `缺:${devMissing.map((item) => item.label).join('、')}`,
      status: !initOk ? 'skip' : devOk ? 'run' : 'fail',
      statusText: !initOk ? '待前序' : devOk ? '执行' : '阻断',
    },
  ];

  return {
    items,
    missing,
    steps,
    commandLine: `$ npm run tauri ${
      args.platform === 'iOS' ? 'ios' : 'android'
    } init · npm run ${devName}`,
    envStatus: missing.length === 0 ? '就绪' : `缺 ${missing.length} 项`,
    missingText: missing.length === 0 ? '—' : missing.map((item) => item.label).join('、'),
    pipelineText: initOk
      ? devOk
        ? 'init 可执行 · dev 可执行'
        : 'init 可执行 · dev 阻断'
      : 'init 阻断 · dev 待前序',
    nextText: missing.length === 0 ? `npm run ${devName}` : '补齐缺失项后重新检查',
  };
}

const TEXT = '#172033';
const DIM = '#64748b';
const ACCENT = '#4f7cff';
const ACCENT_BG = '#eef4ff';
const FAIL = '#dc2626';
const FAIL_BG = '#fef2f2';
const SKIP_BG = '#f1f5f9';
const SKIP_BORDER = '#cbd5e1';
const PALE = '#e2e8f0';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

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

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
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

  let current: ExampleArgs = { platform: 'iOS', installed: [] };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(780, size.width);
    const height = Math.max(448, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';

    const plan = scenePlan(current);
    const leftX = 24;
    const leftW = 336;
    const rightX = leftX + leftW + 30;
    const rightW = width - rightX - 24;

    // 顶部:预演的两条命令。
    drawingContext.fillStyle = TEXT;
    drawingContext.font = `600 13px ${MONO}`;
    drawingContext.fillText(plan.commandLine, leftX, 38);

    // 左栏:环境检查清单;缺失 = 红 + 修复命令。
    drawingContext.fillStyle = '#475569';
    drawingContext.font = `600 12px ${SANS}`;
    drawingContext.fillText(`环境检查 — ${current.platform}`, leftX, 76);

    const rowH = 62;
    plan.items.forEach((item, index) => {
      const y = 92 + index * rowH;
      const isMissing = plan.missing.includes(item);

      drawingContext.fillStyle = TEXT;
      drawingContext.font = `600 13px ${SANS}`;
      drawingContext.fillText(item.label, leftX + 14, y + 20);

      drawingContext.fillStyle = isMissing ? FAIL : ACCENT;
      drawingContext.font = `600 12px ${SANS}`;
      drawingContext.textAlign = 'right';
      drawingContext.fillText(isMissing ? '缺失' : '就绪', leftX + leftW - 14, y + 20);
      drawingContext.textAlign = 'left';

      drawingContext.fillStyle = DIM;
      drawingContext.font = `11px ${MONO}`;
      drawingContext.fillText(item.detail, leftX + 14, y + 38);

      if (isMissing) {
        drawingContext.fillStyle = FAIL;
        drawingContext.font = `10px ${MONO}`;
        drawingContext.fillText(`→ ${item.fix}`, leftX + 14, y + 53);
      }
    });

    // 右栏:init → dev 流水线;执行 = 蓝、阻断 = 红、待前序 = 灰。
    drawingContext.fillStyle = '#475569';
    drawingContext.font = `600 12px ${SANS}`;
    drawingContext.fillText('init → dev 流水线(预演)', rightX, 76);

    const stepH = 68;
    const stepGap = 14;
    plan.steps.forEach((step, index) => {
      const y = 92 + index * (stepH + stepGap);
      const bg =
        step.status === 'run' ? ACCENT_BG : step.status === 'fail' ? FAIL_BG : SKIP_BG;
      const border =
        step.status === 'run' ? ACCENT : step.status === 'fail' ? FAIL : SKIP_BORDER;
      drawingContext.fillStyle = bg;
      roundRect(drawingContext, rightX, y, rightW, stepH, 8);
      drawingContext.fill();
      drawingContext.strokeStyle = border;
      drawingContext.stroke();

      drawingContext.fillStyle = TEXT;
      drawingContext.font = `600 13px ${SANS}`;
      drawingContext.fillText(step.name, rightX + 14, y + 24);

      drawingContext.fillStyle = step.status === 'fail' ? FAIL : DIM;
      drawingContext.font = `11px ${MONO}`;
      drawingContext.fillText(step.sub, rightX + 14, y + 45);

      drawingContext.fillStyle =
        step.status === 'run' ? ACCENT : step.status === 'fail' ? FAIL : DIM;
      drawingContext.font = `600 12px ${SANS}`;
      drawingContext.textAlign = 'right';
      drawingContext.fillText(step.statusText, rightX + rightW - 14, y + 24);
      drawingContext.textAlign = 'left';
    });

    // 底部注:模拟基线说明。
    const dividerY = height - 36;
    drawingContext.strokeStyle = PALE;
    drawingContext.beginPath();
    drawingContext.moveTo(24, dividerY);
    drawingContext.lineTo(width - 24, dividerY);
    drawingContext.stroke();
    drawingContext.fillStyle = DIM;
    drawingContext.font = `11px ${SANS}`;
    drawingContext.fillText(
      '模拟基线:macOS(Apple Silicon);只对照正文清单判断,不探测本机真实安装状态',
      24,
      dividerY + 22,
    );

    emit({
      envStatus: plan.envStatus,
      missing: plan.missingText,
      pipeline: plan.pipelineText,
      next: plan.nextText,
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
