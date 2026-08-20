/**
 * 演示内容：electrobun dev --watch 收到一次文件保存时，配置如何判定「触发重建」
 * 还是「无反应」——固定忽略目录、build.watchIgnore glob、监听目录推导三道闸门。
 * 输入：工程预设（hello-world / vanilla-vite，对应工作区 tester 与 vite-tester 的
 *   electrobun.config.ts 形态）、保存的文件路径、是否启用模板自带 watchIgnore、
 *   build.watch 追加目录。
 * 操作：在 Controls 中切换预设、修改文件路径、开关模板 watchIgnore、追加 build.watch。
 * 预期结果：默认的 vanilla-vite 场景里 dist/ 下的 Vite 产物被 watchIgnore 拦下
 *   （外部构建不打断 Electrobun）；关掉它则落入 copy 源监听目录、触发整轮重建重启；
 *   hello-world 场景里 src/shared 下的共享代码不在监听范围，追加 build.watch 后命中。
 * 阅读主线：resolveVerdict() 是唯一的判定逻辑（glob 匹配与监听目录推导都在内），
 *   draw() 只负责把结果画出来。glob 为通用语义示意，与 CLI 实际实现的差异
 *   以真实 --watch 日志为准。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type WatchPreset = 'hello-world' | 'vanilla-vite';

export interface WatchVerdictOptions {
  preset: WatchPreset;
  changedFile: string;
  usePresetIgnore: boolean;
  extraWatch: string;
}

export interface WatchVerdictSnapshot {
  preset: string;
  changedFile: string;
  watchIgnore: string;
  extraWatch: string;
  verdict: string;
  reason: string;
}

export interface WatchVerdictInstance {
  update(options: WatchVerdictOptions): void;
  dispose(): void;
}

interface PresetConfig {
  label: string;
  copySummary: string;
  presetIgnore: string[];
  watchedDirs: Array<{ dir: string; source: string }>;
}

// 两个预设取自工作区 tester/ 与 vite-tester/ 的真实 electrobun.config.ts：
// 监听目录由「入口目录 + copy 源 + build.watch」推导而来
const PRESETS: Record<WatchPreset, PresetConfig> = {
  'hello-world': {
    label: 'hello-world（tester 形态）',
    copySummary: 'copy：src/mainview/index.html、index.css → views/mainview/',
    presetIgnore: [],
    watchedDirs: [
      { dir: 'src/bun', source: 'build.bun 入口目录' },
      { dir: 'src/mainview', source: 'build.views 入口目录' },
      { dir: 'src/mainview', source: 'build.copy 源所在目录' },
    ],
  },
  'vanilla-vite': {
    label: 'vanilla-vite（vite-tester 形态）',
    copySummary: 'copy：dist/index.html、dist/assets → views/mainview/',
    presetIgnore: ['dist/**'],
    watchedDirs: [
      { dir: 'src/bun', source: 'build.bun 默认入口目录' },
      { dir: 'dist', source: 'copy 源 index.html 所在目录' },
      { dir: 'dist/assets', source: 'copy 源目录' },
    ],
  },
};

const ALWAYS_IGNORED = ['build', 'artifacts', 'node_modules'];

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  faint: '#94a3b8',
  plainBorder: '#94a3b8',
  ok: '#4f7cff',
  warn: '#b45309',
  bad: '#d64545',
  boxFill: '#ffffff',
  arrow: '#64748b',
};

type VerdictTone = 'rebuild' | 'ignored' | 'unwatched';
type GateStatus = 'hit' | 'miss' | 'skip';

interface GateState {
  label: string;
  status: GateStatus;
  detail: string;
}

interface VerdictResult {
  file: string;
  presetLabel: string;
  copySummary: string;
  watchIgnore: string[];
  extraWatchDirs: string[];
  gates: GateState[];
  verdictLabel: string;
  reasonLines: string[];
  tone: VerdictTone;
}

function normalizeRelativePath(raw: string): string {
  return raw
    .trim()
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '');
}

function fallbackFile(preset: WatchPreset): string {
  return preset === 'vanilla-vite'
    ? 'dist/assets/index-Df4xQ2.js'
    : 'src/mainview/index.html';
}

// glob 示意实现：** 跨目录匹配，* 只在单段内匹配，其余字符按字面比较
function globToRegExp(pattern: string): RegExp {
  let source = '';
  let index = 0;

  while (index < pattern.length) {
    const char = pattern[index];

    if (char === '*') {
      if (pattern[index + 1] === '*') {
        source += '.*';
        index += 2;
        while (pattern[index] === '*') {
          index += 1;
        }
        if (pattern[index] === '/') {
          index += 1;
        }
      } else {
        source += '[^/]*';
        index += 1;
      }
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      index += 1;
    }
  }

  return new RegExp(`^${source}$`);
}

function splitList(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((item) => normalizeRelativePath(item))
    .filter((item) => item !== '');
}

function underDir(path: string, dir: string): boolean {
  return path === dir || path.startsWith(`${dir}/`);
}

function resolveVerdict(options: WatchVerdictOptions): VerdictResult {
  const preset = PRESETS[options.preset];
  const file =
    normalizeRelativePath(options.changedFile) || fallbackFile(options.preset);
  const ignorePatterns = options.usePresetIgnore ? preset.presetIgnore : [];
  const extraWatchDirs = splitList(options.extraWatch);
  const watched = [
    ...preset.watchedDirs,
    ...extraWatchDirs.map((dir) => ({ dir, source: 'build.watch 声明' })),
  ];

  const base = {
    file,
    presetLabel: preset.label,
    copySummary: preset.copySummary,
    watchIgnore: ignorePatterns,
    extraWatchDirs,
  };

  // 闸门一：build/、artifacts/、node_modules/ 永远自动忽略，直接短路
  const alwaysHit = ALWAYS_IGNORED.find((dir) => underDir(file, dir));

  if (alwaysHit) {
    return {
      ...base,
      gates: [
        { label: '固定忽略目录', status: 'hit', detail: `${alwaysHit}/ 自动忽略` },
        { label: 'watchIgnore glob', status: 'skip', detail: '未到达' },
        { label: '监听目录', status: 'skip', detail: '未到达' },
      ],
      verdictLabel: '已忽略',
      reasonLines: ['固定忽略目录内的变更', '永不触发重建'],
      tone: 'ignored',
    };
  }

  // 闸门二：build.watchIgnore 的 glob 匹配项目相对路径
  const ignoreHit = ignorePatterns.find((pattern) =>
    globToRegExp(pattern).test(file),
  );

  if (ignoreHit) {
    return {
      ...base,
      gates: [
        {
          label: '固定忽略目录',
          status: 'miss',
          detail: 'build/ · artifacts/ · node_modules/ 之外',
        },
        { label: 'watchIgnore glob', status: 'hit', detail: `命中 ${ignoreHit}` },
        { label: '监听目录', status: 'skip', detail: '未到达' },
      ],
      verdictLabel: '已忽略',
      reasonLines: [`匹配 watchIgnore 模式「${ignoreHit}」`, '本次变更被排除'],
      tone: 'ignored',
    };
  }

  // 闸门三：是否落在任一监听目录内（入口目录 / copy 源 / build.watch）
  const watchHit = watched.find(({ dir }) => underDir(file, dir));

  if (watchHit) {
    return {
      ...base,
      gates: [
        {
          label: '固定忽略目录',
          status: 'miss',
          detail: 'build/ · artifacts/ · node_modules/ 之外',
        },
        {
          label: 'watchIgnore glob',
          status: 'miss',
          detail: ignorePatterns.length
            ? `未命中 ${ignorePatterns.join('、')}`
            : '未配置模式',
        },
        {
          label: '监听目录',
          status: 'hit',
          detail: `${watchHit.dir}（${watchHit.source}）`,
        },
      ],
      verdictLabel: '触发重建',
      reasonLines: [
        `位于监听目录 ${watchHit.dir}`,
        `依据：${watchHit.source}`,
        '重建并重启应用',
      ],
      tone: 'rebuild',
    };
  }

  return {
    ...base,
    gates: [
      {
        label: '固定忽略目录',
        status: 'miss',
        detail: 'build/ · artifacts/ · node_modules/ 之外',
      },
      {
        label: 'watchIgnore glob',
        status: 'miss',
        detail: ignorePatterns.length
          ? `未命中 ${ignorePatterns.join('、')}`
          : '未配置模式',
      },
      {
        label: '监听目录',
        status: 'miss',
        detail: '入口 / copy / watch 目录之外',
      },
    ],
    verdictLabel: '不监听',
    reasonLines: [
      '不在任何监听目录',
      '保存不会触发重建',
      '（可用 build.watch 补充）',
    ],
    tone: 'unwatched',
  };
}

// 在斜杠和空格后断行，避免超出方框宽度
function wrapText(
  text: string,
  maxWidth: number,
  context: CanvasRenderingContext2D,
): string[] {
  if (context.measureText(text).width <= maxWidth) {
    return [text];
  }

  const tokens = text.split(/(?<=\/)|(?<= )/).filter((token) => token !== '');
  const lines: string[] = [];
  let line = '';

  for (const token of tokens) {
    const candidate = line + token;

    if (line && context.measureText(candidate.trimEnd()).width > maxWidth) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = candidate;
    }
  }

  if (line) {
    lines.push(line.trimEnd());
  }

  return lines;
}

function toneColor(tone: VerdictTone): string {
  if (tone === 'rebuild') {
    return COLORS.ok;
  }
  return tone === 'ignored' ? COLORS.warn : COLORS.bad;
}

export function createWatchVerdict(
  canvas: HTMLCanvasElement,
  emit: (snapshot: WatchVerdictSnapshot) => void,
): WatchVerdictInstance {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  const drawingContext: CanvasRenderingContext2D = context;

  let current: WatchVerdictOptions = {
    preset: 'vanilla-vite',
    changedFile: 'dist/assets/index-Df4xQ2.js',
    usePresetIgnore: true,
    extraWatch: '',
  };

  function drawPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    tone: VerdictTone | null,
  ) {
    const borderColor =
      tone === null
        ? COLORS.plainBorder
        : tone === 'rebuild'
          ? COLORS.ok
          : tone === 'ignored'
            ? COLORS.warn
            : COLORS.bad;

    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = borderColor;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(title, x + 12, y + 22);
  }

  function drawArrow(fromX: number, toX: number, y: number, label: string) {
    drawingContext.strokeStyle = COLORS.arrow;
    drawingContext.fillStyle = COLORS.arrow;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.moveTo(fromX, y);
    drawingContext.lineTo(toX - 8, y);
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.moveTo(toX, y);
    drawingContext.lineTo(toX - 9, y - 4.5);
    drawingContext.lineTo(toX - 9, y + 4.5);
    drawingContext.closePath();
    drawingContext.fill();

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(label, fromX + 2, y - 8);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(330, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const verdict = resolveVerdict(current);

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`dev --watch 触发判定`, 24, 38);

    const margin = 24;
    const top = 74;
    const gap = Math.max(24, Math.min(40, width * 0.05));
    const boxWidth = (width - margin * 2 - gap * 2) / 3;
    const boxHeight = 178;

    // 面板一：保存的文件
    drawPanel(margin, top, boxWidth, boxHeight, '保存的文件', null);
    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const fileLines = wrapText(verdict.file, boxWidth - 24, drawingContext);
    fileLines.forEach((line, index) => {
      drawingContext.fillText(line, margin + 12, top + 50 + index * 16);
    });
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      verdict.presetLabel,
      margin + 12,
      top + 50 + fileLines.length * 16 + 12,
    );

    // 面板二：三道闸门，逐道判定、命中即短路
    const gateX = margin + boxWidth + gap;
    drawPanel(gateX, top, boxWidth, boxHeight, '三道闸门（命中即短路）', null);
    const gateOrder = ['①', '②', '③'];
    verdict.gates.forEach((gate, index) => {
      const gateY = top + 46 + index * 44;
      const decisive =
        (gate.status === 'hit') ||
        (verdict.gates.every((item) => item.status !== 'hit') &&
          gate.status === 'miss' &&
          index === 2);
      const nameColor =
        gate.status === 'skip'
          ? COLORS.faint
          : decisive && gate.status === 'hit'
            ? toneColor(verdict.tone)
            : decisive && verdict.tone === 'unwatched'
              ? COLORS.bad
              : COLORS.muted;

      const statusText =
        gate.status === 'hit'
          ? '✓ 命中'
          : gate.status === 'miss'
            ? '✗ 未命中'
            : '— 未评估';

      drawingContext.fillStyle = nameColor;
      drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        `${gateOrder[index]} ${gate.label}  ${statusText}`,
        gateX + 12,
        gateY,
      );
      drawingContext.fillStyle =
        gate.status === 'skip' ? COLORS.faint : COLORS.muted;
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(gate.detail, boxWidth - 24, drawingContext).forEach(
        (line, lineIndex) => {
          drawingContext.fillText(line, gateX + 12, gateY + 17 + lineIndex * 14);
        },
      );
    });

    // 面板三：结论
    const resultX = gateX + boxWidth + gap;
    drawPanel(resultX, top, boxWidth, boxHeight, '结论', verdict.tone);
    drawingContext.fillStyle = toneColor(verdict.tone);
    drawingContext.font = '700 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(verdict.verdictLabel, resultX + 12, top + 50);
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    let reasonY = top + 76;
    verdict.reasonLines.forEach((line) => {
      wrapText(line, boxWidth - 24, drawingContext).forEach(
        (wrapped, wrappedIndex) => {
          drawingContext.fillText(wrapped, resultX + 12, reasonY);
          reasonY += 17;
        },
      );
    });

    // 箭头连接三个面板
    const arrowY = top + boxHeight / 2;
    drawArrow(margin + boxWidth + 4, gateX - 4, arrowY, '逐道判定');
    drawArrow(gateX + boxWidth + 4, resultX - 4, arrowY, '');

    // 底部展示本次判定所依据的配置形态
    const bottomY = top + boxHeight + 34;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(verdict.copySummary, margin, bottomY);
    const ignoreText = verdict.watchIgnore.join('、') || '无';
    const watchText = verdict.extraWatchDirs.join('、') || '无';
    drawingContext.fillText(
      `watchIgnore：${ignoreText} · build.watch：${watchText}`,
      margin,
      bottomY + 18,
    );

    emit({
      preset: verdict.presetLabel,
      changedFile: verdict.file,
      watchIgnore: ignoreText,
      extraWatch: watchText,
      verdict: verdict.verdictLabel,
      reason: verdict.reasonLines.join('；'),
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
