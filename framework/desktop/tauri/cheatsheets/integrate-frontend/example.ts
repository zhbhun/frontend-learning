/**
 * 范例介绍：模拟已有 React/Vite 前端与 Tauri build 段的两侧对接。
 * 输入：tauri 命令（dev / build）、Vite dev server 实际监听的端口、build.devUrl 的端口。
 * 主要操作：左栏画前端侧当前状态，右栏画 tauri.conf.json 的 build 段并高亮当前命令消费的字段，中间画对接连线。
 * 预期结果：dev 下 devUrl 与 Vite 端口同值时窗口可加载，失配时窗口空白或 CLI 一直等待；build 只认 frontendDist，与端口无关。
 * 阅读主线：Tauri 不接管前端构建，只在约定好的地址与路径上对接；错配只发生在 dev 的窗口加载环节。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type CommandId = 'dev' | 'build';

const TEXT = '#172033';
const DIM = '#94a3b8';
const ACCENT = '#4f7cff';
const ACCENT_BG = '#eef2ff';
const OK = '#16a34a';
const OK_BG = '#ecfdf5';
const BAD = '#dc2626';
const BAD_BG = '#fef2f2';
const PANEL_BG = '#f8fafc';
const PANEL_BORDER = '#e2e8f0';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

export interface ExampleArgs {
  command: CommandId;
  vitePort: number;
  devUrlPort: number;
}

export interface ExampleSnapshot {
  commandLine: string;
  consumedFields: string;
  frontendEntry: string;
  connection: string;
}

function snapshotFor(args: ExampleArgs): ExampleSnapshot {
  if (args.command === 'dev') {
    const matched = args.vitePort === args.devUrlPort;
    return {
      commandLine: 'npm run tauri dev',
      consumedFields: 'beforeDevCommand + devUrl',
      frontendEntry: `build.devUrl → http://localhost:${args.devUrlPort}`,
      connection: matched
        ? 'devUrl 与 Vite 端口一致，窗口可加载'
        : `端口失配（:${args.devUrlPort} vs :${args.vitePort}），窗口空白`,
    };
  }
  return {
    commandLine: 'npm run tauri build',
    consumedFields: 'beforeBuildCommand + frontendDist',
    frontendEntry: 'build.frontendDist → ../dist',
    connection: '产物路径生效，与端口无关',
  };
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

  let current: ExampleArgs = {
    command: 'dev',
    vitePort: 1420,
    devUrlPort: 1420,
  };

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    drawingContext.beginPath();
    drawingContext.moveTo(x + r, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, r);
    drawingContext.arcTo(x + w, y + h, x, y + h, r);
    drawingContext.arcTo(x, y + h, x, y, r);
    drawingContext.arcTo(x, y, x + w, y, r);
    drawingContext.closePath();
  }

  function drawDot(x: number, y: number, color: string) {
    drawingContext.beginPath();
    drawingContext.arc(x, y, 5, 0, Math.PI * 2);
    drawingContext.fillStyle = color;
    drawingContext.fill();
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(400, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';
    drawingContext.lineWidth = 1;

    const margin = 24;
    const gutter = 88;

    // 顶部：标题与当前执行的命令。
    drawingContext.fillStyle = TEXT;
    drawingContext.font = `600 16px ${SANS}`;
    drawingContext.fillText('tauri 命令与前端侧的对接', margin, 38);

    const commandLine =
      current.command === 'dev' ? 'npm run tauri dev' : 'npm run tauri build';
    drawingContext.font = `600 13px ${MONO}`;
    const chipWidth = drawingContext.measureText(commandLine).width + 28;
    roundRect(margin, 52, chipWidth, 30, 8);
    drawingContext.fillStyle = ACCENT;
    drawingContext.fill();
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fillText(commandLine, margin + 14, 72);

    drawingContext.fillStyle = DIM;
    drawingContext.font = `12px ${SANS}`;
    drawingContext.fillText(
      '右栏高亮的字段即当前命令消费的约定',
      margin + chipWidth + 16,
      71,
    );

    // 两个面板：左 = 前端侧，右 = tauri.conf.json 的 build 段。
    const panelTop = 104;
    const panelBottom = height - 84;
    const leftWidth = Math.max(
      190,
      Math.round((width - margin * 2 - gutter) * 0.4),
    );
    const leftPanel = { x: margin, y: panelTop, w: leftWidth };
    const rightPanel = {
      x: margin + leftWidth + gutter,
      y: panelTop,
      w: width - margin - (margin + leftWidth + gutter),
    };
    const panelHeight = panelBottom - panelTop;

    roundRect(leftPanel.x, leftPanel.y, leftPanel.w, panelHeight, 12);
    drawingContext.fillStyle = PANEL_BG;
    drawingContext.fill();
    drawingContext.strokeStyle = PANEL_BORDER;
    drawingContext.stroke();

    roundRect(rightPanel.x, rightPanel.y, rightPanel.w, panelHeight, 12);
    drawingContext.fillStyle = PANEL_BG;
    drawingContext.fill();
    drawingContext.stroke();

    // 左栏：前端侧当前状态；URL 行 / dist/ 行是对接连线的起点。
    const rowH = 30;
    const leftStartY = leftPanel.y + 38;
    let frontendAnchorY = 0;

    if (current.command === 'dev') {
      drawDot(leftPanel.x + 22, leftStartY - 5, OK);
      drawingContext.fillStyle = TEXT;
      drawingContext.font = `600 13px ${SANS}`;
      drawingContext.fillText('Vite dev server', leftPanel.x + 36, leftStartY);

      frontendAnchorY = leftStartY + rowH - 9;
      drawingContext.fillStyle = ACCENT;
      drawingContext.font = `600 13px ${MONO}`;
      drawingContext.fillText(
        `http://localhost:${current.vitePort}`,
        leftPanel.x + 22,
        leftStartY + rowH - 5,
      );

      drawingContext.fillStyle = DIM;
      drawingContext.font = `12px ${SANS}`;
      drawingContext.fillText(
        '由 beforeDevCommand 启动',
        leftPanel.x + 22,
        leftStartY + rowH * 2 - 5,
      );
    } else {
      drawDot(leftPanel.x + 22, leftStartY - 5, OK);
      drawingContext.fillStyle = TEXT;
      drawingContext.font = `600 13px ${SANS}`;
      drawingContext.fillText('vite build 产物', leftPanel.x + 36, leftStartY);

      frontendAnchorY = leftStartY + rowH - 9;
      drawingContext.fillStyle = ACCENT;
      drawingContext.font = `600 13px ${MONO}`;
      drawingContext.fillText('dist/', leftPanel.x + 22, leftStartY + rowH - 5);

      drawingContext.fillStyle = TEXT;
      drawingContext.font = `13px ${MONO}`;
      drawingContext.fillText(
        '├─ index.html',
        leftPanel.x + 22,
        leftStartY + rowH * 2 - 5,
      );
      drawingContext.fillText(
        '└─ assets/',
        leftPanel.x + 22,
        leftStartY + rowH * 3 - 5,
      );

      drawingContext.fillStyle = DIM;
      drawingContext.font = `12px ${SANS}`;
      drawingContext.fillText(
        '由 beforeBuildCommand 产出',
        leftPanel.x + 22,
        leftStartY + rowH * 4 - 5,
      );
    }

    // 右栏：build 段四个字段，高亮当前命令消费的一组。
    const monoSize = rightPanel.w < 300 ? 12 : 13;
    const fieldRowH = 30;
    const fieldsStartY = rightPanel.y + 38;
    const fields = [
      { key: 'beforeDevCommand', value: '"npm run dev"', group: 'dev' as const },
      {
        key: 'devUrl',
        value: `"http://localhost:${current.devUrlPort}"`,
        group: 'dev' as const,
      },
      {
        key: 'beforeBuildCommand',
        value: '"npm run build"',
        group: 'build' as const,
      },
      { key: 'frontendDist', value: '"../dist"', group: 'build' as const },
    ];

    drawingContext.fillStyle = TEXT;
    drawingContext.font = `${monoSize}px ${MONO}`;
    drawingContext.fillText('build: {', rightPanel.x + 18, fieldsStartY);

    let devUrlBaselineY = 0;
    let frontendDistBaselineY = 0;
    fields.forEach((field, index) => {
      const baselineY = fieldsStartY + fieldRowH * (index + 1);
      if (field.key === 'devUrl') {
        devUrlBaselineY = baselineY;
      }
      if (field.key === 'frontendDist') {
        frontendDistBaselineY = baselineY;
      }

      const consumed = field.group === current.command;
      if (consumed) {
        roundRect(rightPanel.x + 10, baselineY - 17, rightPanel.w - 20, 24, 6);
        drawingContext.fillStyle = ACCENT_BG;
        drawingContext.fill();
      }

      drawingContext.fillStyle = consumed ? ACCENT : DIM;
      drawingContext.font = `${consumed ? '600 ' : ''}${monoSize}px ${MONO}`;
      drawingContext.fillText(
        `${field.key}: ${field.value}`,
        rightPanel.x + 18,
        baselineY,
      );
    });

    drawingContext.fillStyle = TEXT;
    drawingContext.font = `${monoSize}px ${MONO}`;
    drawingContext.fillText('}', rightPanel.x + 18, fieldsStartY + fieldRowH * 5);

    // 中间连线：dev 对接 devUrl（端口一致才通），build 对接 frontendDist（恒通）。
    const targetBaselineY =
      current.command === 'dev' ? devUrlBaselineY : frontendDistBaselineY;
    const matched = current.command === 'build' || current.vitePort === current.devUrlPort;
    const lineColor = matched ? OK : BAD;
    const startX = leftPanel.x + leftPanel.w;
    const endX = rightPanel.x;
    const midX = startX + gutter / 2;
    const anchorY = frontendAnchorY;
    const targetY = targetBaselineY - 5;

    drawingContext.strokeStyle = lineColor;
    drawingContext.lineWidth = 2;
    drawingContext.beginPath();
    drawingContext.moveTo(startX + 4, anchorY);
    drawingContext.lineTo(midX, anchorY);
    drawingContext.lineTo(midX, targetY);
    drawingContext.lineTo(endX - 8, targetY);
    drawingContext.stroke();

    drawingContext.fillStyle = lineColor;
    drawingContext.beginPath();
    drawingContext.moveTo(endX - 2, targetY);
    drawingContext.lineTo(endX - 10, targetY - 4);
    drawingContext.lineTo(endX - 10, targetY + 4);
    drawingContext.closePath();
    drawingContext.fill();

    const label =
      current.command === 'build'
        ? '✓ 产物路径'
        : matched
          ? '✓ 地址一致'
          : '✗ 端口失配';
    const midY = (anchorY + targetY) / 2;
    drawingContext.font = `600 11px ${SANS}`;
    const labelWidth = drawingContext.measureText(label).width + 12;
    drawingContext.fillStyle = '#ffffff';
    roundRect(midX - labelWidth / 2, midY - 9, labelWidth, 18, 9);
    drawingContext.fill();
    drawingContext.fillStyle = lineColor;
    drawingContext.textAlign = 'center';
    drawingContext.fillText(label, midX, midY + 4);
    drawingContext.textAlign = 'left';

    // 底部状态条：对接结果与后果。
    const status =
      current.command === 'dev'
        ? matched
          ? {
              bg: OK_BG,
              border: OK,
              color: OK,
              text: `✓ 窗口加载 devUrl（http://localhost:${current.devUrlPort}），前端改动即时热更新`,
            }
          : {
              bg: BAD_BG,
              border: BAD,
              color: BAD,
              text: `✗ devUrl 指向 :${current.devUrlPort}，Vite 运行在 :${current.vitePort}，窗口空白或 CLI 一直等待`,
            }
        : {
            bg: ACCENT_BG,
            border: ACCENT,
            color: ACCENT,
            text: '✓ frontendDist ../dist 的产物嵌入二进制，端口配置与本命令无关',
          };

    const statusY = height - 64;
    roundRect(margin, statusY, width - margin * 2, 40, 10);
    drawingContext.fillStyle = status.bg;
    drawingContext.fill();
    drawingContext.strokeStyle = status.border;
    drawingContext.stroke();
    drawingContext.fillStyle = status.color;
    drawingContext.font = `600 13px ${SANS}`;
    drawingContext.fillText(status.text, margin + 16, statusY + 25);

    emit(snapshotFor(current));
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
