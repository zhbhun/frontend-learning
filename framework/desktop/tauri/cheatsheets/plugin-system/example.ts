/**
 * 范例介绍:演示一个官方插件在工程里的四个落点——前端包、核心包、注册、权限。
 * 输入:要观察的插件(dialog / fs / http / opener / clipboard-manager / notification /
 *   store / log / global-shortcut / single-instance,涵盖常规、无默认权限、桌面专用、
 *   纯 Rust 四种形态)。
 * 主要操作:顶部给出一条命令的一键安装,下方按「前端包 → 核心包 → 注册 → 权限」
 *   逐行画出命令/代码与落点文件;每个插件的四行内容与差异说明同步切换。
 * 预期结果:常规插件四件套齐全且带 default 权限;global-shortcut 无 default 权限集,
 *   需逐项声明;single-instance 无 JS API,前端包与权限两行显示「不需要」。
 * 阅读主线:插件是打包好的「命令 + 权限」——装哪个插件,动的都是同样四个位置,
 *   只是各插件在默认权限、目标平台、有无 JS API 上存在差异。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type PluginId =
  | 'dialog'
  | 'fs'
  | 'http'
  | 'opener'
  | 'clipboard-manager'
  | 'notification'
  | 'store'
  | 'log'
  | 'global-shortcut'
  | 'single-instance';

export interface ExampleArgs {
  variant: PluginId;
}

export interface ExampleSnapshot {
  /** 读数:插件用途一句话。 */
  purpose: string;
  /** 读数:一键安装命令。 */
  addCommand: string;
  /** 读数:前端包有无与包名。 */
  frontendPackage: string;
  /** 读数:权限默认策略。 */
  permissionDefault: string;
}

/** 四件套中的一行:主代码 + 落点说明 + 补充说明。 */
interface Row {
  main: string;
  /** 主代码为灰色(该插件没有这一件)。 */
  dim?: boolean;
  note1?: string;
  note2?: string;
}

interface Preset {
  purpose: string;
  frontendPackage: string;
  permissionDefault: string;
  /** 依次为:前端包 / 核心包 / 注册 / 权限。 */
  rows: [Row, Row, Row, Row];
}

const CRATE_TARGET = '落点 src-tauri/Cargo.toml(命令在 src-tauri 目录下执行)';
const REG_BUILDER = '落点 src-tauri/src/lib.rs 的 Builder 链';
const CAP_TARGET = '落点 src-tauri/capabilities/default.json';

const FRONT_NOTE = '落点 package.json —— 前端绑定包,把插件命令封装成函数';

/* 十个演示插件各自的四件套形态(与官方插件文档页核对)。 */
const PLUGINS: Record<PluginId, Preset> = {
  dialog: {
    purpose: '文件与消息对话框',
    frontendPackage: '@tauri-apps/plugin-dialog',
    permissionDefault: 'default 权限集',
    rows: [
      {
        main: 'npm install @tauri-apps/plugin-dialog',
        note1: FRONT_NOTE,
        note2: "import { ask } from '@tauri-apps/plugin-dialog'",
      },
      { main: 'cargo add tauri-plugin-dialog', note1: CRATE_TARGET },
      { main: '.plugin(tauri_plugin_dialog::init())', note1: REG_BUILDER },
      {
        main: '"dialog:default"',
        note1: CAP_TARGET,
        note2: 'default 集 = allow-open / allow-save / allow-message',
      },
    ],
  },
  fs: {
    purpose: '文件系统访问',
    frontendPackage: '@tauri-apps/plugin-fs',
    permissionDefault: 'default 权限集',
    rows: [
      {
        main: 'npm install @tauri-apps/plugin-fs',
        note1: FRONT_NOTE,
        note2: "import { readTextFile } from '@tauri-apps/plugin-fs'",
      },
      { main: 'cargo add tauri-plugin-fs', note1: CRATE_TARGET },
      { main: '.plugin(tauri_plugin_fs::init())', note1: REG_BUILDER },
      {
        main: '"fs:default"',
        note1: CAP_TARGET,
        note2: '默认权限集之外,可操作的路径范围由 scope 控制',
      },
    ],
  },
  http: {
    purpose: 'Rust HTTP 客户端',
    frontendPackage: '@tauri-apps/plugin-http',
    permissionDefault: 'default 权限集',
    rows: [
      {
        main: 'npm install @tauri-apps/plugin-http',
        note1: FRONT_NOTE,
        note2: "import { fetch } from '@tauri-apps/plugin-http'",
      },
      { main: 'cargo add tauri-plugin-http', note1: CRATE_TARGET },
      { main: '.plugin(tauri_plugin_http::init())', note1: REG_BUILDER },
      {
        main: '"http:default"',
        note1: CAP_TARGET,
        note2: '命令可用后,可请求的 URL 范围由 scope 决定',
      },
    ],
  },
  opener: {
    purpose: '用系统默认应用打开 URL/文件',
    frontendPackage: '@tauri-apps/plugin-opener',
    permissionDefault: 'default 权限集',
    rows: [
      {
        main: 'npm install @tauri-apps/plugin-opener',
        note1: FRONT_NOTE,
        note2: "import { openUrl } from '@tauri-apps/plugin-opener'",
      },
      { main: 'cargo add tauri-plugin-opener', note1: CRATE_TARGET },
      { main: '.plugin(tauri_plugin_opener::init())', note1: REG_BUILDER },
      {
        main: '"opener:default"',
        note1: CAP_TARGET,
        note2:
          'default 集 = allow-open-url / allow-reveal-item-in-dir / allow-default-urls',
      },
    ],
  },
  'clipboard-manager': {
    purpose: '读写系统剪贴板',
    frontendPackage: '@tauri-apps/plugin-clipboard-manager',
    permissionDefault: 'default 权限集',
    rows: [
      {
        main: 'npm install @tauri-apps/plugin-clipboard-manager',
        note1: FRONT_NOTE,
        note2: "import { writeText } from '@tauri-apps/plugin-clipboard-manager'",
      },
      { main: 'cargo add tauri-plugin-clipboard-manager', note1: CRATE_TARGET },
      {
        main: '.plugin(tauri_plugin_clipboard_manager::init())',
        note1: REG_BUILDER,
      },
      { main: '"clipboard-manager:default"', note1: CAP_TARGET },
    ],
  },
  notification: {
    purpose: '发送系统通知',
    frontendPackage: '@tauri-apps/plugin-notification',
    permissionDefault: 'default 权限集',
    rows: [
      {
        main: 'npm install @tauri-apps/plugin-notification',
        note1: FRONT_NOTE,
        note2: "import { sendNotification } from '@tauri-apps/plugin-notification'",
      },
      { main: 'cargo add tauri-plugin-notification', note1: CRATE_TARGET },
      { main: '.plugin(tauri_plugin_notification::init())', note1: REG_BUILDER },
      { main: '"notification:default"', note1: CAP_TARGET },
    ],
  },
  store: {
    purpose: '键值持久化存储',
    frontendPackage: '@tauri-apps/plugin-store',
    permissionDefault: 'default 权限集',
    rows: [
      {
        main: 'npm install @tauri-apps/plugin-store',
        note1: FRONT_NOTE,
        note2: "import { load } from '@tauri-apps/plugin-store'",
      },
      { main: 'cargo add tauri-plugin-store', note1: CRATE_TARGET },
      { main: '.plugin(tauri_plugin_store::init())', note1: REG_BUILDER },
      { main: '"store:default"', note1: CAP_TARGET },
    ],
  },
  log: {
    purpose: '可配置的日志',
    frontendPackage: '@tauri-apps/plugin-log',
    permissionDefault: 'default 权限集',
    rows: [
      {
        main: 'npm install @tauri-apps/plugin-log',
        note1: FRONT_NOTE,
        note2: "import { info } from '@tauri-apps/plugin-log'",
      },
      { main: 'cargo add tauri-plugin-log', note1: CRATE_TARGET },
      {
        main: '.plugin(tauri_plugin_log::Builder::new().build())',
        note1: '落点 src-tauri/src/lib.rs 的 Builder 链;要配置日志等级/输出时用 Builder 形式',
      },
      { main: '"log:default"', note1: CAP_TARGET },
    ],
  },
  'global-shortcut': {
    purpose: '全局快捷键(桌面)',
    frontendPackage: '@tauri-apps/plugin-global-shortcut',
    permissionDefault: '无 default,需逐项声明',
    rows: [
      {
        main: 'npm install @tauri-apps/plugin-global-shortcut',
        note1: FRONT_NOTE,
        note2: "import { register } from '@tauri-apps/plugin-global-shortcut'",
      },
      {
        main: 'cargo add tauri-plugin-global-shortcut',
        note1: `${CRATE_TARGET};桌面专用插件,加 --target 限定桌面平台`,
      },
      {
        main: '.plugin(tauri_plugin_global_shortcut::init())',
        note1: REG_BUILDER,
      },
      {
        main: '"global-shortcut:allow-register"',
        note1: CAP_TARGET,
        note2: '无 default 权限集 —— 需逐项声明(allow-register / allow-unregister …)',
      },
    ],
  },
  'single-instance': {
    purpose: '单实例运行(桌面,仅 Rust)',
    frontendPackage: '无(Rust-only 插件)',
    permissionDefault: '无需配置',
    rows: [
      { main: '(没有 JS API —— 纯 Rust 插件,不需要前端包)', dim: true },
      {
        main: 'cargo add tauri-plugin-single-instance',
        note1: `${CRATE_TARGET};桌面专用插件,加 --target 限定桌面平台`,
      },
      {
        main: 'app.handle().plugin(tauri_plugin_single_instance::init(|app, args, cwd| {}))',
        note1: '落点 src-tauri/src/lib.rs;闭包里处理第二次启动,且要求第一个注册',
      },
      { main: '(无需配置 —— 没有 JS API,前端没有可授权的命令)', dim: true },
    ],
  },
};

const TEXT = '#172033';
const DIM = '#64748b';
const ACCENT = '#4f7cff';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

const LABEL_X = 24;
const BOX_X = 110;
const BOX_MIN_H = 26;
const LINE_H = 14;
const GAP = 16;
const ROW_LABELS = ['前端包', '核心包', '注册', '权限'] as const;

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

  let current: PluginId = 'dialog';

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(700, size.width);
    const height = Math.max(430, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';

    const preset = PLUGINS[current];
    const addCommand = `npm run tauri add ${current}`;
    const boxW = width - BOX_X - 24;

    // 顶部:一键安装。CLI 自动完成下面四步,命令只换插件短名。
    drawingContext.fillStyle = DIM;
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('一键安装', LABEL_X, 24);
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillStyle = ACCENT;
    drawingContext.fillText(addCommand, BOX_X + 12, 24);
    drawingContext.fillStyle = DIM;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '—— 等于下面四步',
      BOX_X + 12 + drawingContext.measureText(addCommand).width + 16,
      24,
    );

    // 四行落点:每行 = 左侧标签 + 右侧内容框(主代码 + 落点 + 补充说明)。
    let y = 44;
    preset.rows.forEach((row, index) => {
      const rows = 1 + (row.note1 ? 1 : 0) + (row.note2 ? 1 : 0);
      const h = BOX_MIN_H + (rows - 1) * LINE_H;

      drawingContext.fillStyle = DIM;
      drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(ROW_LABELS[index], LABEL_X, y + h / 2 + 4);

      drawingContext.fillStyle = BOX_BG;
      roundRect(drawingContext, BOX_X, y, boxW, h, 6);
      drawingContext.fill();
      drawingContext.strokeStyle = BOX_BORDER;
      drawingContext.stroke();

      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      let lineY = y + 17;
      drawingContext.fillStyle = row.dim ? DIM : TEXT;
      drawingContext.fillText(row.main, BOX_X + 12, lineY);
      lineY += LINE_H;

      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillStyle = DIM;
      if (row.note1) {
        drawingContext.fillText(row.note1, BOX_X + 12, lineY + 1);
        lineY += LINE_H;
      }
      if (row.note2) {
        drawingContext.fillText(row.note2, BOX_X + 12, lineY + 1);
      }

      y += h + GAP;
    });

    emit({
      purpose: preset.purpose,
      addCommand,
      frontendPackage: preset.frontendPackage,
      permissionDefault: preset.permissionDefault,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options.variant;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
