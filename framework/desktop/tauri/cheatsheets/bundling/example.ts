/**
 * 范例介绍:演示「目标平台 × 构建命令 → bundler 流水线执行哪些阶段、产出哪些安装包」。
 * 输入:目标平台(macOS / Windows / Linux)与构建命令(tauri build 及其常见变体)。
 * 主要操作:左栏画出三步流水线(前端构建 → Rust 编译 → 打包)并标注执行 / 跳过状态,
 *   右栏列出本次命令产出的安装包相对路径(--bundles dmg 在非 macOS 平台显示打包失败),
 *   底部给出未打包的裸二进制位置。
 * 预期结果:tauri build 按 targets "all" 的平台映射产出(app+dmg / msi+nsis / deb+rpm+appimage);
 *   --no-bundle 只有裸二进制;tauri bundle 复用已有二进制只跑打包;DMG 只能在 macOS 上构建。
 * 阅读主线:产物清单 = 平台 × targets;每种格式都有「在哪构建」的工具链边界。
 *   本图为定性模拟(产品名 Notes、版本 0.1.0、arch 取各平台典型值),目录结构与命名规则
 *   对照正文参考表;真实产物以本机 tauri build 输出为准,核对步骤见 bundling-verification.md。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type Platform = 'macOS' | 'Windows' | 'Linux';

export type BuildCommand =
  | 'tauri build'
  | 'tauri build --bundles dmg'
  | 'tauri build --bundles nsis'
  | 'tauri build --no-bundle'
  | 'tauri bundle';

export interface ExampleArgs {
  platform: Platform;
  command: BuildCommand;
}

export interface ExampleSnapshot {
  /** 读数:本次命令执行了流水线的哪些阶段。 */
  stages: string;
  /** 读数:产出多少安装包,或失败 / 跳过状态。 */
  artifactCount: string;
  /** 读数:安装包落盘的根目录。 */
  artifactDir: string;
  /** 读数:本场景的边界与提示。 */
  note: string;
}

/** 模拟基线:产品名与版本(与 configuration 课一致),文件名按 bundler 命名规则拼接。 */
const PRODUCT = 'Notes';
const VERSION = '0.1.0';

type StageStatus = 'run' | 'skip' | 'fail';

interface StagePlan {
  name: string;
  sub: string;
  status: StageStatus;
  statusText: string;
}

interface ScenePlan {
  stages: StagePlan[];
  /** 右栏产物清单(target/release/ 下的相对路径)。 */
  artifacts: string[];
  /** 打包失败的原因;null 表示打包未失败。 */
  failure: string | null;
  /** 未打包二进制的位置。 */
  binary: string;
  stagesReadout: string;
  artifactCount: string;
  artifactDir: string;
  note: string;
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

/** targets "all" 在三个平台上的产出映射(tauri-bundler 按当前平台决定)。 */
function allFormats(platform: Platform): string[] {
  switch (platform) {
    case 'macOS':
      return ['app', 'dmg'];
    case 'Windows':
      return ['msi', 'nsis'];
    case 'Linux':
      return ['deb', 'rpm', 'appimage'];
  }
}

/** 各格式在对应平台的产物文件名(bundler 命名规则的模拟)。返回 null 表示该格式无法在此平台构建。 */
function artifactPath(platform: Platform, format: string): string | null {
  switch (format) {
    case 'app':
      return `bundle/macos/${PRODUCT}.app`;
    case 'dmg':
      return platform === 'macOS'
        ? `bundle/dmg/${PRODUCT}_${VERSION}_aarch64.dmg`
        : null;
    case 'msi':
      return platform === 'Windows'
        ? `bundle/msi/${PRODUCT}_${VERSION}_x64_en-US.msi`
        : null;
    case 'nsis': {
      // NSIS 的 arch 段跟随构建目标:macOS(Apple Silicon)→ arm64,其余 → x64。
      const arch = platform === 'macOS' ? 'arm64' : 'x64';
      return `bundle/nsis/${PRODUCT}_${VERSION}_${arch}-setup.exe`;
    }
    case 'deb':
      return `bundle/deb/${PRODUCT}_${VERSION}_amd64.deb`;
    case 'rpm':
      return `bundle/rpm/${PRODUCT}-${VERSION}-1.x86_64.rpm`;
    case 'appimage':
      return `bundle/appimage/${PRODUCT}_${VERSION}_amd64.AppImage`;
    default:
      return null;
  }
}

/** 本次命令请求的打包格式:--bundles 覆盖 targets,其余按 "all" 映射。 */
function requestedFormats(platform: Platform, command: BuildCommand): string[] {
  switch (command) {
    case 'tauri build --bundles dmg':
      return ['dmg'];
    case 'tauri build --bundles nsis':
      return ['nsis'];
    default:
      return allFormats(platform);
  }
}

function scenePlan(platform: Platform, command: BuildCommand): ScenePlan {
  const binary =
    platform === 'Windows'
      ? 'target/release/Notes.exe'
      : 'target/release/Notes';

  // 流水线三步:--no-bundle 跳过第三步,tauri bundle 只跑第三步。
  const stages: StagePlan[] = [
    {
      name: '① 前端构建',
      sub: 'beforeBuildCommand → frontendDist',
      status: command === 'tauri bundle' ? 'skip' : 'run',
      statusText: command === 'tauri bundle' ? '跳过' : '执行',
    },
    {
      name: '② Rust 编译',
      sub: 'cargo build --release',
      status: command === 'tauri bundle' ? 'skip' : 'run',
      statusText: command === 'tauri bundle' ? '跳过' : '执行',
    },
    {
      name: '③ 打包 bundler',
      sub: '读 bundle 节:active · targets · icon · 元数据',
      status: command === 'tauri build --no-bundle' ? 'skip' : 'run',
      statusText: command === 'tauri build --no-bundle' ? '跳过' : '执行',
    },
  ];

  if (command === 'tauri build --no-bundle') {
    return {
      stages,
      artifacts: [],
      failure: null,
      binary,
      stagesReadout: '前端构建 → Rust 编译(打包被跳过)',
      artifactCount: '0 个安装包(仅裸二进制)',
      artifactDir: '—(未执行打包)',
      note: 'bundle.active 为 true 也会被跳过;裸二进制不进 bundle/ 目录',
    };
  }

  const formats = requestedFormats(platform, command);
  const artifacts: string[] = [];
  let failure: string | null = null;

  for (const format of formats) {
    const path = artifactPath(platform, format);
    if (path) {
      artifacts.push(path);
    } else {
      // 官方文档明确的两条硬边界:DMG 需在 macOS 上构建,MSI 的 WiX 只能跑在 Windows。
      failure =
        format === 'dmg'
          ? `打包失败:DMG 需在 macOS 上构建(--bundles dmg × ${platform})`
          : `打包失败:${format} 无法在 ${platform} 上构建`;
    }
  }

  if (failure) {
    // 打包阶段以失败态呈现,与右栏报错一致。
    stages[2] = { ...stages[2], status: 'fail', statusText: '失败' };
    return {
      stages,
      artifacts,
      failure,
      binary,
      stagesReadout: '前端构建 → Rust 编译 → 打包(失败)',
      artifactCount: '构建失败',
      artifactDir: '—',
      note:
        formats[0] === 'dmg'
          ? 'DMG 需在 macOS 上运行 tauri CLI;换个平台观察同一命令'
          : `${formats[0]} 需在对应平台上构建`,
    };
  }

  const note =
    command === 'tauri bundle'
      ? '不重新编译,复用 target/release/ 下的已有二进制'
      : command === 'tauri build --bundles dmg'
        ? 'DMG 只能在 macOS 上构建,其余平台会报错'
        : command === 'tauri build --bundles nsis'
          ? 'NSIS 三平台都可用(Linux/macOS 需先安装 NSIS 工具)'
          : 'targets "all" 的产出随平台变化:macOS 为 app 与 dmg,Windows 为 msi 与 nsis,Linux 为 deb、rpm 与 appimage';

  return {
    stages,
    artifacts,
    failure: null,
    binary,
    stagesReadout:
      command === 'tauri bundle'
        ? '仅打包(复用既有产物)'
        : '前端构建 → Rust 编译 → 打包',
    artifactCount: `${artifacts.length} 个安装包`,
    artifactDir: 'src-tauri/target/release/bundle/',
    note,
  };
}

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

  let current: ExampleArgs = { platform: 'macOS', command: 'tauri build' };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(780, size.width);
    const height = Math.max(356, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';

    const plan = scenePlan(current.platform, current.command);
    const leftX = 24;
    const leftW = 300;
    const rightX = leftX + leftW + 36;

    // 顶部:本次执行的完整命令。
    drawingContext.fillStyle = TEXT;
    drawingContext.font =
      '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`$ npm run ${current.command}`, leftX, 38);

    // 左栏:三步流水线;执行=蓝、跳过=灰、失败=红。
    const stageH = 56;
    const stageGap = 12;
    plan.stages.forEach((stage, index) => {
      const y = 64 + index * (stageH + stageGap);
      const bg =
        stage.status === 'run'
          ? ACCENT_BG
          : stage.status === 'fail'
            ? FAIL_BG
            : SKIP_BG;
      const border =
        stage.status === 'run'
          ? ACCENT
          : stage.status === 'fail'
            ? FAIL
            : SKIP_BORDER;
      drawingContext.fillStyle = bg;
      roundRect(drawingContext, leftX, y, leftW, stageH, 8);
      drawingContext.fill();
      drawingContext.strokeStyle = border;
      drawingContext.stroke();

      drawingContext.fillStyle = TEXT;
      drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(stage.name, leftX + 14, y + 22);
      drawingContext.fillStyle = DIM;
      drawingContext.font =
        '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(stage.sub, leftX + 14, y + 41);

      const statusColor =
        stage.status === 'run'
          ? ACCENT
          : stage.status === 'fail'
            ? FAIL
            : DIM;
      drawingContext.fillStyle = statusColor;
      drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.textAlign = 'right';
      drawingContext.fillText(stage.statusText, leftX + leftW - 14, y + 22);
      drawingContext.textAlign = 'left';
    });

    // 右栏:产物清单(相对 target/release/),最多三行;失败或跳过时给对应状态行。
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('产物(src-tauri/target/release/ 下)', rightX, 76);

    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    if (plan.artifacts.length > 0) {
      plan.artifacts.forEach((path, index) => {
        const y = 102 + index * 20;
        drawingContext.fillStyle = ACCENT;
        drawingContext.fillText('▪', rightX, y);
        drawingContext.fillStyle = TEXT;
        drawingContext.fillText(path, rightX + 12, y);
      });
    } else if (plan.failure) {
      drawingContext.fillStyle = FAIL;
      drawingContext.fillText(plan.failure, rightX, 102);
    } else {
      drawingContext.fillStyle = DIM;
      drawingContext.fillText('(无安装包——打包被跳过)', rightX, 102);
    }

    // 右栏下半:未打包二进制的位置(所有命令都会先产出它)。
    const binaryY = 196;
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('裸二进制', rightX, binaryY);
    drawingContext.fillStyle = DIM;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(plan.binary, rightX + 64, binaryY);

    // 底部注:模拟基线说明。
    const dividerY = height - 40;
    drawingContext.strokeStyle = PALE;
    drawingContext.beginPath();
    drawingContext.moveTo(24, dividerY);
    drawingContext.lineTo(width - 24, dividerY);
    drawingContext.stroke();
    drawingContext.fillStyle = DIM;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '模拟基线:productName "Notes" · version "0.1.0" · arch 取各平台典型值;目录与命名规则见正文参考表',
      24,
      dividerY + 22,
    );

    emit({
      stages: plan.stagesReadout,
      artifactCount: plan.artifactCount,
      artifactDir: plan.artifactDir,
      note: plan.note,
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
