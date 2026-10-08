/**
 * 范例介绍:用「工程树 + 选中文件职责」演示 Tauri 工程的双目录模型。
 * 输入:下拉选择的文件/目录(「选中文件」),与「显示生成物」开关。
 * 主要操作:左侧画出工程树并高亮选中项,右侧列出该条目的职责说明;
 *   关闭「显示生成物」时,dist/、src-tauri/gen/、src-tauri/target/ 从树上隐藏。
 * 预期结果:任何条目都能在树中定位;读数给出归属、读取者与版本库状态——
 *   生成物被 .gitignore 忽略,其余文件入库。
 * 阅读主线:根目录是标准前端工程,src-tauri/ 是标准 Rust 工程,
 *   tauri.conf.json 与 Cargo.toml 各管一半,由 @tauri-apps/cli 与编译期宏缝合。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SelectionId =
  | 'index.html'
  | 'package.json'
  | 'vite.config.ts'
  | 'src/'
  | 'dist/'
  | 'src-tauri/Cargo.toml'
  | 'src-tauri/tauri.conf.json'
  | 'src-tauri/build.rs'
  | 'src-tauri/capabilities/'
  | 'src-tauri/icons/'
  | 'src-tauri/gen/'
  | 'src-tauri/target/';

export interface ExampleArgs {
  selected: SelectionId;
  showGenerated: boolean;
}

interface NodeInfo {
  /** 归属层。 */
  owner: string;
  /** 谁在什么阶段读它。 */
  reader: string;
  /** 版本库状态。 */
  git: '提交' | '忽略';
  /** 右侧职责说明,每行一条。 */
  duty: string[];
  /** 生成物:受「显示生成物」开关控制。 */
  generated?: boolean;
}

/* 每个条目的职责、读取者与入库状态,内容与官方 Project Structure 页面和
   create-tauri-app 模板基线对应。 */
const NODES: Record<SelectionId, NodeInfo> = {
  'index.html': {
    owner: '前端工程',
    reader: 'Vite',
    git: '提交',
    duty: [
      'Vite 的入口 HTML,以 module script 加载 src/main.tsx。',
      'dev 时由 devUrl 直接服务,build 后随前端产物嵌入二进制。',
    ],
  },
  'package.json': {
    owner: '前端工程',
    reader: 'npm + @tauri-apps/cli',
    git: '提交',
    duty: [
      '前端依赖与 npm 脚本都在这,"tauri": "tauri" 指向本地 @tauri-apps/cli。',
      'Rust 依赖不在这里——那是 src-tauri/Cargo.toml 的事。',
    ],
  },
  'vite.config.ts': {
    owner: '前端工程',
    reader: 'Vite dev server',
    git: '提交',
    duty: [
      '脚手架已预置 Tauri 专用配置:clearScreen: false,固定 1420 端口(strictPort)。',
      'server.watch 忽略 src-tauri/,避免 Rust 改动触发前端无效刷新。',
    ],
  },
  'src/': {
    owner: '前端工程',
    reader: 'Vite',
    git: '提交',
    duty: [
      'React 界面代码,纯浏览器视角的 SPA,本身不知道 Tauri 的存在。',
      '通过 @tauri-apps/api 的 invoke / listen 与 Rust 核心通信。',
    ],
  },
  'dist/': {
    owner: '前端构建产物',
    reader: '@tauri-apps/cli(嵌入)',
    git: '忽略',
    generated: true,
    duty: [
      'vite build 的输出目录,由 build.frontendDist 指向(默认 ../dist)。',
      '路径相对 src-tauri/ 而不是工程根;生成物,不手改、不入库。',
    ],
  },
  'src-tauri/Cargo.toml': {
    owner: 'Rust 工程',
    reader: 'cargo',
    git: '提交',
    duty: [
      'Rust 包清单:tauri、serde 等依赖加在这里,tauri-build 在 build-dependencies。',
      '[lib] 的 crate-type 三件套是为移动端把应用编译成库准备的。',
    ],
  },
  'src-tauri/tauri.conf.json': {
    owner: 'Tauri 配置',
    reader: '@tauri-apps/cli + tauri-build',
    git: '提交',
    duty: [
      '应用总配置:窗口、bundle、build 驱动段;也是 CLI 定位 Rust 工程的标记。',
      '改它影响窗口标题、打包产物与 dev / build 行为;字段细节见「配置」一课。',
    ],
  },
  'src-tauri/build.rs': {
    owner: 'Rust 工程',
    reader: 'cargo(编译期)',
    git: '提交',
    duty: [
      'Cargo 构建脚本,只做一件事:调用 tauri_build::build()。',
      '编译期生成 gen/schemas、处理配置与资源,是 conf 生效的枢纽之一。',
    ],
  },
  'src-tauri/capabilities/': {
    owner: 'Tauri 配置(2.x 特有)',
    reader: 'tauri-build(编译期)',
    git: '提交',
    duty: [
      '能力文件把 core:default、opener:default 等权限授予 windows 匹配的窗口。',
      '未授权的 API 调用会被拒绝;脚手架默认只有 default.json。',
    ],
  },
  'src-tauri/icons/': {
    owner: 'Tauri 配置',
    reader: 'tauri-build + bundler',
    git: '提交',
    duty: [
      'tauri icon 命令的输出目录,由 bundle.icon 列表引用。',
      '编译期嵌进二进制,打包时作为各平台图标。',
    ],
  },
  'src-tauri/gen/': {
    owner: '生成物',
    reader: 'tauri-build 自动生成',
    git: '忽略',
    generated: true,
    duty: [
      'gen/schemas 存放配置与能力的 JSON schema,供编辑器补全与校验。',
      '接入移动端后还会生成 gen/apple、gen/android 原生工程。',
    ],
  },
  'src-tauri/target/': {
    owner: '生成物',
    reader: 'cargo',
    git: '忽略',
    generated: true,
    duty: [
      'cargo 的编译产物:debug 与 release 二进制都在这,打包产物在 release/bundle/。',
      '体积大且可再生,已被模板 .gitignore 忽略。',
    ],
  },
};

const TEXT = '#172033';
const ACCENT = '#4f7cff';
const DIM = '#94a3b8';
const ROOT_LABEL = 'tauri-app/';

interface TreeLine {
  text: string;
  id?: SelectionId;
  /** 生成物,用浅色区分。 */
  dim?: boolean;
}

interface RsGroup {
  id: SelectionId;
  label: string;
  child?: string;
}

/* src-tauri/ 内的固定成员顺序;生成物是否显示由 buildTree 过滤。 */
const RS_GROUPS: RsGroup[] = [
  { id: 'src-tauri/Cargo.toml', label: 'Cargo.toml' },
  { id: 'src-tauri/tauri.conf.json', label: 'tauri.conf.json' },
  { id: 'src-tauri/build.rs', label: 'build.rs' },
  { id: 'src-tauri/capabilities/', label: 'capabilities/', child: 'default.json' },
  { id: 'src-tauri/icons/', label: 'icons/' },
  { id: 'src-tauri/gen/', label: 'gen/', child: 'schemas/' },
  { id: 'src-tauri/target/', label: 'target/' },
];

function buildTree(args: ExampleArgs): TreeLine[] {
  const { selected, showGenerated } = args;
  const shown = (id: SelectionId) =>
    showGenerated || !NODES[id].generated || id === selected;

  const lines: TreeLine[] = [
    { text: ROOT_LABEL },
    { text: '├─ index.html', id: 'index.html' },
    { text: '├─ package.json', id: 'package.json' },
    { text: '├─ vite.config.ts', id: 'vite.config.ts' },
    { text: '├─ src/', id: 'src/' },
    { text: '│  ├─ main.tsx' },
    { text: '│  └─ App.tsx' },
  ];

  if (shown('dist/')) {
    lines.push({ text: '├─ dist/', id: 'dist/', dim: true });
  }

  lines.push({ text: '└─ src-tauri/' });

  const groups = RS_GROUPS.filter((group) => shown(group.id));
  groups.forEach((group, index) => {
    const last = index === groups.length - 1;
    const connector = last ? '   └─ ' : '   ├─ ';
    const childPrefix = last ? '      └─ ' : '   │  └─ ';
    const info = NODES[group.id];
    lines.push({ text: `${connector}${group.label}`, id: group.id, dim: info.generated });
    if (group.child) {
      lines.push({ text: `${childPrefix}${group.child}`, dim: info.generated });
    }
  });

  return lines;
}

export interface ExampleSnapshot {
  selected: SelectionId;
  path: string;
  owner: string;
  reader: string;
  git: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const rows: string[] = [];
  let row = '';
  for (const char of text) {
    if (row && context.measureText(row + char).width > maxWidth) {
      rows.push(row);
      row = char;
    } else {
      row += char;
    }
  }
  if (row) {
    rows.push(row);
  }
  if (rows.length <= 3) {
    return rows;
  }
  let third = rows[2];
  while (third && context.measureText(`${third}…`).width > maxWidth) {
    third = third.slice(0, -1);
  }
  return [rows[0], rows[1], `${third}…`];
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

  let current: ExampleArgs = {
    selected: 'src-tauri/tauri.conf.json',
    showGenerated: true,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(400, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const midX = Math.round(width / 2);
    const leftX = 20;
    const rightX = midX + 24;
    const rightWidth = width - rightX - 20;

    // 左侧:工程树。选中项高亮,生成物(浅色)受「显示生成物」开关控制。
    const tree = buildTree(current);
    const treeStartY = 46;
    const lineH = Math.min(
      19,
      Math.max(13, Math.floor((height - treeStartY - 16) / tree.length)),
    );
    drawingContext.textAlign = 'left';
    tree.forEach((line, index) => {
      const y = treeStartY + index * lineH;
      const isSelected = line.id !== undefined && line.id === current.selected;
      if (isSelected) {
        drawingContext.fillStyle = 'rgba(79, 124, 255, 0.12)';
        drawingContext.fillRect(leftX - 8, y - 13, midX - leftX - 24, lineH);
      }
      drawingContext.font = `${isSelected ? 600 : 400} 13px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillStyle = isSelected
        ? ACCENT
        : line.dim
          ? DIM
          : TEXT;
      drawingContext.fillText(line.text, leftX, y);
    });

    // 右侧:选中条目的路径与职责说明,与读数互为补充(职责讲"做什么",读数给字段)。
    const info = NODES[current.selected];
    drawingContext.fillStyle = ACCENT;
    drawingContext.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(current.selected, rightX, 50);

    drawingContext.fillStyle = TEXT;
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    let dutyY = 84;
    info.duty.forEach((line) => {
      wrapText(drawingContext, line, rightWidth).forEach((rowText) => {
        drawingContext.fillText(rowText, rightX, dutyY);
        dutyY += 19;
      });
      dutyY += 10;
    });

    emit({
      selected: current.selected,
      path: current.selected,
      owner: info.owner,
      reader: info.reader,
      git: info.git,
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
