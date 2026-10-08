/**
 * 范例介绍：模拟「脚手架选项 → 生成工程 → tauri 命令流水线」的端到端链路。
 * 输入：create-tauri-app 的前端模板（react-ts / vue-ts / vanilla-ts）与要执行的命令（dev / build）。
 * 主要操作：左侧画出生成的工程结构，右侧画出当前命令串起的流水线；切换控件后立即重画。
 * 预期结果：换模板只替换 src/ 内文件，src-tauri/ 骨架不变；dev 与 build 的步骤和产物位置不同。
 * 阅读主线：同一份双目录工程，src/ 随模板变化、src-tauri/ 固定；dev / build 共用工程，只是产物不同。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TemplateId = 'react-ts' | 'vue-ts' | 'vanilla-ts';
export type CommandId = 'dev' | 'build';

const TEXT = '#172033';
const ACCENT = '#4f7cff';

interface TemplatePreset {
  /** 读数里展示的模板名。 */
  label: string;
  /** src/ 内随模板变化的框架文件。 */
  srcFiles: string[];
}

/* create-tauri-app 各模板的 src/ 差异（以官方仓库 templates/ 为准）。 */
const TEMPLATES: Record<TemplateId, TemplatePreset> = {
  'react-ts': {
    label: 'react-ts（React + TypeScript）',
    srcFiles: ['main.tsx', 'App.tsx'],
  },
  'vue-ts': { label: 'vue-ts（Vue）', srcFiles: ['main.ts', 'App.vue'] },
  'vanilla-ts': {
    label: 'vanilla-ts（原生 TypeScript）',
    srcFiles: ['main.ts', 'styles.css'],
  },
};

interface Pipeline {
  title: string;
  steps: string[];
}

/* 两条命令的步骤示意：与 tauri.conf.json 的 build 段和官方 CLI 说明对应。 */
const PIPELINES: Record<CommandId, Pipeline> = {
  dev: {
    title: 'tauri dev：开发模式',
    steps: [
      'beforeDevCommand：npm run dev',
      '等待 Vite dev server（默认 :1420）',
      'cargo 编译 Rust（debug）',
      '打开窗口，加载 devUrl',
      '热重载：前端 HMR，Rust 变更重启',
    ],
  },
  build: {
    title: 'tauri build：发布构建',
    steps: [
      'beforeBuildCommand：npm run build',
      '前端产物写入 dist/',
      'cargo 编译 Rust（--release）',
      'bundle 打包安装包',
      '产物：target/release/ + bundle/',
    ],
  },
};

interface TreeLine {
  text: string;
  /** src/ 内随模板变化的文件，用强调色标出。 */
  highlight?: boolean;
}

function buildTree(template: TemplateId): TreeLine[] {
  const files = TEMPLATES[template].srcFiles;
  const srcLines: TreeLine[] = files.map((file, index) => ({
    text: `${index === files.length - 1 ? '│  └─' : '│  ├─'} ${file}`,
    highlight: true,
  }));

  return [
    { text: 'tauri-app/' },
    { text: '├─ index.html' },
    { text: '├─ package.json' },
    { text: '├─ vite.config.ts' },
    { text: '├─ src/' },
    ...srcLines,
    { text: '└─ src-tauri/' },
    { text: '   ├─ Cargo.toml' },
    { text: '   ├─ tauri.conf.json' },
    { text: '   ├─ capabilities/' },
    { text: '   ├─ icons/' },
    { text: '   └─ src/（main.rs、lib.rs）' },
  ];
}

export interface ExampleArgs {
  template: TemplateId;
  command: CommandId;
}

export interface ExampleSnapshot {
  template: TemplateId;
  command: CommandId;
  templateLabel: string;
  commandLine: string;
  frontendEntry: string;
  artifact: string;
}

function snapshotFor(
  template: TemplateId,
  command: CommandId,
): ExampleSnapshot {
  return {
    template,
    command,
    templateLabel: TEMPLATES[template].label,
    commandLine: command === 'dev' ? 'npm run tauri dev' : 'npm run tauri build',
    frontendEntry:
      command === 'dev'
        ? 'build.devUrl http://localhost:1420'
        : 'build.frontendDist ../dist',
    artifact:
      command === 'dev'
        ? 'target/debug/ 可执行文件 + 开发窗口'
        : 'target/release/ 二进制 + bundle/ 安装包',
  };
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
  if (rows.length <= 2) {
    return rows;
  }
  let second = rows[1];
  while (second && context.measureText(`${second}…`).width > maxWidth) {
    second = second.slice(0, -1);
  }
  return [rows[0], `${second}…`];
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

  let current: ExampleArgs = { template: 'react-ts', command: 'dev' };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(480, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const midX = Math.round(width / 2);
    const leftX = 20;
    const rightX = midX + 16;
    const rightWidth = width - rightX - 20;

    // 左侧：模板决定生成的工程结构；src/ 内文件（强调色）随模板替换，src-tauri/ 固定。
    const tree = buildTree(current.template);
    const treeStartY = 58;
    const lineH = Math.max(
      13,
      Math.min(20, Math.floor((height - treeStartY - 90) / tree.length)),
    );
    drawingContext.textAlign = 'left';
    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    tree.forEach((line, index) => {
      drawingContext.fillStyle = line.highlight ? ACCENT : TEXT;
      drawingContext.fillText(line.text, leftX, treeStartY + index * lineH);
    });

    // 右侧：当前命令的流水线；序号与连接线强调步骤顺序，结论进入底部读数。
    const pipeline = PIPELINES[current.command];
    const stepStartY = 88;
    const stepH = (height - stepStartY - 16) / pipeline.steps.length;
    pipeline.steps.forEach((step, index) => {
      const baseY = stepStartY + index * stepH;

      if (index < pipeline.steps.length - 1) {
        drawingContext.strokeStyle = '#cbd5e1';
        drawingContext.beginPath();
        drawingContext.moveTo(rightX + 9, baseY + 6);
        drawingContext.lineTo(rightX + 9, baseY + stepH - 16);
        drawingContext.stroke();
      }

      drawingContext.beginPath();
      drawingContext.arc(rightX + 9, baseY - 5, 9, 0, Math.PI * 2);
      drawingContext.fillStyle = ACCENT;
      drawingContext.fill();
      drawingContext.fillStyle = '#ffffff';
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.textAlign = 'center';
      drawingContext.fillText(String(index + 1), rightX + 9, baseY - 1);
      drawingContext.textAlign = 'left';

      drawingContext.fillStyle = TEXT;
      drawingContext.font =
        '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(drawingContext, step, rightWidth - 30).forEach(
        (rowText, rowIndex) => {
          drawingContext.fillText(
            rowText,
            rightX + 26,
            baseY - 1 + rowIndex * 17,
          );
        },
      );
    });

    drawingContext.fillStyle = TEXT;
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(pipeline.title, rightX, 56);

    emit(snapshotFor(current.template, current.command));
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
