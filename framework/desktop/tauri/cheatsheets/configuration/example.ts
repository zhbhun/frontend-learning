/**
 * 范例介绍：演示「修改 tauri.conf.json 的一个字段 → 哪些生效面跟着变」。
 * 输入：本次修改的字段（productName / app.windows[].title / identifier / bundle.active）。
 * 主要操作：左侧画出修改后的配置片段（改动行用强调色），右侧模拟 macOS 桌面的
 *   菜单栏、窗口标题栏与 Dock，底部两条读数列出安装包与数据目录；
 *   被当前字段影响的生效面点亮，其余置灰。
 * 预期结果：productName 点亮菜单栏、Dock 与安装包文件名；窗口 title 只点亮标题栏；
 *   identifier 只点亮数据目录；bundle.active 只点亮安装包行（true → false 后不再产出）。
 * 阅读主线：每个字段各管一面；配置改动不是热重载——dev 下保存会触发重编译重启，
 *   bundle 节只在 tauri build 时读取。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type EditTarget =
  | 'productName'
  | 'windowTitle'
  | 'identifier'
  | 'bundleActive';

const TEXT = '#172033';
const DIM = '#64748b';
const PALE = '#cbd5e1';
const ACCENT = '#4f7cff';
const ACCENT_LIGHT = '#8fb3ff';

export interface ExampleArgs {
  edit: EditTarget;
}

export interface ExampleSnapshot {
  edit: EditTarget;
  /** 读数：改动字段的配置路径。 */
  fieldPath: string;
  /** 读数：修改后的值。 */
  newValue: string;
  /** 读数：哪些生效面跟着变。 */
  surfaces: string;
  /** 读数：改动以什么方式生效。 */
  reload: string;
}

interface EditPreset {
  fieldPath: string;
  newValue: string;
  surfaces: string;
  reload: string;
}

/* 四个演示字段各自的生效面与生效方式（对应正文「修改配置项 → 对应生效面」）。 */
const EDITS: Record<EditTarget, EditPreset> = {
  productName: {
    fieldPath: '顶层 productName',
    newValue: '"tauri-app" → "Notes"',
    surfaces: '菜单栏与 Dock 应用名、安装包文件名',
    reload: 'tauri dev 检测到变更，重编译并重启窗口',
  },
  windowTitle: {
    fieldPath: 'app.windows[0].title',
    newValue: '"tauri-app" → "我的便签"',
    surfaces: '窗口标题栏',
    reload: 'tauri dev 检测到变更，重编译并重启窗口',
  },
  identifier: {
    fieldPath: '顶层 identifier',
    newValue: '"com.tauri-app.app" → "com.example.notes"',
    surfaces: '应用数据目录与打包元数据',
    reload: 'tauri dev 检测到变更，重编译并重启窗口',
  },
  bundleActive: {
    fieldPath: 'bundle.active',
    newValue: '"true" → "false"',
    surfaces: 'tauri build 是否产出安装包',
    reload: 'bundle 节只在 tauri build 时读取',
  },
};

/** 模拟桌面各生效面当前展示的值（其余字段保持模板基线值）。 */
interface SceneValues {
  productName: string;
  windowTitle: string;
  identifier: string;
  active: boolean;
}

function sceneFor(edit: EditTarget): SceneValues {
  return {
    productName: edit === 'productName' ? 'Notes' : 'tauri-app',
    windowTitle: edit === 'windowTitle' ? '我的便签' : 'tauri-app',
    identifier:
      edit === 'identifier' ? 'com.example.notes' : 'com.tauri-app.app',
    active: edit !== 'bundleActive',
  };
}

/** 左侧配置片段：改动行用 changed 标记，交给画布用强调色区分。 */
function configLines(
  edit: EditTarget,
  scene: SceneValues,
): { text: string; changed?: boolean }[] {
  return [
    { text: '{' },
    { text: '  "$schema": "https://schema.tauri.app/config/2",' },
    {
      text: `  "productName": "${scene.productName}",`,
      changed: edit === 'productName',
    },
    { text: '  "version": "0.1.0",' },
    {
      text: `  "identifier": "${scene.identifier}",`,
      changed: edit === 'identifier',
    },
    { text: '  "app": {' },
    { text: '    "windows": [' },
    { text: '      {' },
    {
      text: `        "title": "${scene.windowTitle}",`,
      changed: edit === 'windowTitle',
    },
    { text: '        "width": 800,' },
    { text: '        "height": 600' },
    { text: '      }' },
    { text: '    ]' },
    { text: '  },' },
    { text: '  "bundle": {' },
    {
      text: `    "active": ${scene.active}`,
      changed: edit === 'bundleActive',
    },
    { text: '  }' },
    { text: '}' },
  ];
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

  let current: ExampleArgs = { edit: 'productName' };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = Math.max(392, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';

    const edit = current.edit;
    const scene = sceneFor(edit);
    const midX = Math.round(width / 2);
    const leftX = 24;
    const rightX = midX + 20;
    const rightW = width - rightX - 24;

    // 左侧：修改后的配置片段；改动行用强调色，对应 Controls 里当前选择的字段。
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    configLines(edit, scene).forEach((line, index) => {
      drawingContext.fillStyle = line.changed ? ACCENT : TEXT;
      drawingContext.fillText(line.text, leftX, 48 + index * 14);
    });

    // 生效面 1：菜单栏。应用名来自顶层 productName。
    const menuActive = edit === 'productName';
    drawingContext.fillStyle = '#1e293b';
    roundRect(drawingContext, rightX, 46, rightW, 22, 5);
    drawingContext.fill();
    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.beginPath();
    drawingContext.arc(rightX + 15, 57, 4, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.fillStyle = menuActive ? ACCENT_LIGHT : DIM;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(scene.productName, rightX + 29, 61);

    // 生效面 2：窗口标题栏。标题来自 app.windows[].title，与 productName 无关。
    const titleActive = edit === 'windowTitle';
    const winW = Math.min(rightW - 16, 320);
    const winX = rightX + (rightW - winW) / 2;
    const winY = 84;
    const winH = 104;
    drawingContext.fillStyle = '#f8fafc';
    roundRect(drawingContext, winX, winY, winW, winH, 8);
    drawingContext.fill();
    drawingContext.strokeStyle = PALE;
    drawingContext.stroke();
    ['#ff5f57', '#febc2e', '#28c840'].forEach((color, index) => {
      drawingContext.fillStyle = color;
      drawingContext.beginPath();
      drawingContext.arc(winX + 15 + index * 14, winY + 14, 3.5, 0, Math.PI * 2);
      drawingContext.fill();
    });
    drawingContext.fillStyle = titleActive ? ACCENT : DIM;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'center';
    drawingContext.fillText(scene.windowTitle, winX + winW / 2, winY + 18);
    drawingContext.textAlign = 'left';
    drawingContext.strokeStyle = PALE;
    drawingContext.beginPath();
    drawingContext.moveTo(winX, winY + 27);
    drawingContext.lineTo(winX + winW, winY + 27);
    drawingContext.stroke();
    drawingContext.fillStyle = '#e2e8f0';
    [0.62, 0.4, 0.5].forEach((ratio, index) => {
      drawingContext.fillRect(
        winX + 16,
        winY + 42 + index * 17,
        (winW - 32) * ratio,
        6,
      );
    });

    // 生效面 3：Dock。应用名同样来自 productName（不是窗口标题）。
    const dockY = 214;
    drawingContext.fillStyle = menuActive ? ACCENT : PALE;
    roundRect(drawingContext, rightX + (rightW - 40) / 2, dockY, 40, 40, 9);
    drawingContext.fill();
    drawingContext.fillStyle = '#ffffff';
    drawingContext.beginPath();
    drawingContext.arc(rightX + rightW / 2, dockY + 20, 9, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.fillStyle = menuActive ? ACCENT : DIM;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'center';
    drawingContext.fillText(
      scene.productName,
      rightX + rightW / 2,
      dockY + 56,
    );
    drawingContext.textAlign = 'left';

    // 底部两条读数：安装包文件名由 productName + version 组成，数据目录由 identifier 决定。
    const dividerY = 298;
    drawingContext.strokeStyle = '#e2e8f0';
    drawingContext.beginPath();
    drawingContext.moveTo(24, dividerY);
    drawingContext.lineTo(width - 24, dividerY);
    drawingContext.stroke();

    const artifactActive = edit === 'productName' || edit === 'bundleActive';
    const artifact = scene.active
      ? `target/release/bundle/dmg/${scene.productName}_0.1.0_aarch64.dmg`
      : '未产出安装包（bundle.active 为 false，只有裸二进制）';
    drawingContext.fillStyle = TEXT;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('安装包', leftX, 322);
    drawingContext.fillStyle = artifactActive ? ACCENT : DIM;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(artifact, leftX + 64, 322);

    const dataDirActive = edit === 'identifier';
    drawingContext.fillStyle = TEXT;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('数据目录', leftX, 348);
    drawingContext.fillStyle = dataDirActive ? ACCENT : DIM;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `~/Library/Application Support/${scene.identifier}/`,
      leftX + 64,
      348,
    );

    emit({ edit, ...EDITS[edit] });
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
