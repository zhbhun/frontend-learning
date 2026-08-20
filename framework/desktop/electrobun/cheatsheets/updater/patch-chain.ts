/**
 * 演示内容：Updater.downloadUpdate 在「补丁链」与「全量包兜底」之间的判定——
 *   本地 self-extraction 里是否有当前版 tar、服务器是否保留了从当前 hash 出发的
 *   {fromHash}.patch，共同决定逐级 bspatch 追赶还是回退全量下载。
 * 输入：用户当前版本（v1.0.0 ~ v1.3.0，对应一条真实感的发布链）、
 *   服务器补丁保留策略（全部保留 / 只留最近一条 / 没有补丁）、
 *   本地是否有当前版本的 tar。
 * 操作：在 Controls 中切换三个输入，观察发布链上的执行路径变化。
 * 预期结果：链完整时逐级补丁直达最新（usedPatchPath = true）；本地缺 tar 或
 *   链中途断开（patch-not-found）时回退全量下载；用户已在最新版时 checkForUpdate
 *   直接 no-update。
 * 阅读主线：resolvePath() 是唯一的判定逻辑，复刻 Updater.downloadUpdate 的分支
 *   顺序（先查本地 tar，再逐跳查补丁，断链即全量）；draw() 只负责画链与路径。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ServerPatchPolicy = 'all' | 'latest-only' | 'none';

export interface PatchChainOptions {
  userVersion: string;
  serverPatches: ServerPatchPolicy;
  localTar: boolean;
}

export interface PatchChainSnapshot {
  verdict: string;
  hopsApplied: string;
  usedPatchPath: string;
  breakAt: string;
}

export interface PatchChainInstance {
  update(options: PatchChainOptions): void;
  dispose(): void;
}

// 发布链：每次构建只对紧邻的上一版生成一条 {fromHash}.patch（官方 Updates 指南）。
// hash 取 8 位短哈希示意，与 artifacts/ 文件命名一致。
const RELEASES = [
  { version: 'v1.0.0', hash: 'a1b2c3d4' },
  { version: 'v1.1.0', hash: 'b2c3d4e5' },
  { version: 'v1.2.0', hash: 'c3d4e5f6' },
  { version: 'v1.3.0', hash: 'd4e5f6a7' },
] as const;

const LATEST_INDEX = RELEASES.length - 1;

const POLICY_LABELS: Record<ServerPatchPolicy, string> = {
  all: '全部历史补丁保留',
  'latest-only': '只保留最近一条补丁',
  none: '服务器没有补丁',
};

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  faint: '#94a3b8',
  plainBorder: '#94a3b8',
  ok: '#4f7cff',
  warn: '#b45309',
  latest: '#0f766e',
  boxFill: '#ffffff',
  arrow: '#64748b',
};

type PathTone = 'chain' | 'fallback' | 'latest';

interface PathResult {
  tone: PathTone;
  verdict: string;
  hopsApplied: number;
  hopsNeeded: number;
  usedPatchPath: boolean;
  breakAtHash: string | null;
  sequence: string;
}

function patchExists(
  policy: ServerPatchPolicy,
  hopFromIndex: number,
): boolean {
  if (policy === 'all') {
    return true;
  }
  if (policy === 'none') {
    return false;
  }
  // 只保留最近一条：即最新构建生成的 {c3d4e5f6}.patch（上一版 → 最新）
  return hopFromIndex === LATEST_INDEX - 1;
}

// 复刻 downloadUpdate 的分支顺序：本地 tar → 逐跳补丁 → 断链/缺 tar 即全量
function resolvePath(options: PatchChainOptions): PathResult {
  const releaseIndex = RELEASES.findIndex(
    (release) => release.version === options.userVersion,
  );
  const userIndex = releaseIndex === -1 ? LATEST_INDEX : releaseIndex;

  if (userIndex === LATEST_INDEX) {
    return {
      tone: 'latest',
      verdict: `已是最新（${RELEASES[LATEST_INDEX].version}）：无需下载`,
      hopsApplied: 0,
      hopsNeeded: 0,
      usedPatchPath: false,
      breakAtHash: null,
      sequence:
        'checkForUpdate → no-update（hash 相等，通常不应再调 downloadUpdate）',
    };
  }

  const hopsNeeded = LATEST_INDEX - userIndex;

  if (!options.localTar) {
    return {
      tone: 'fallback',
      verdict: `本地无 ${RELEASES[userIndex].hash}.tar → 直接全量下载`,
      hopsApplied: 0,
      hopsNeeded,
      usedPatchPath: false,
      breakAtHash: null,
      sequence:
        'download-starting → checking-local-tar → local-tar-missing → ' +
        'downloading-full-bundle → download-progress → decompressing → download-complete',
    };
  }

  // 从用户版本起逐跳检查补丁，找第一个断点
  let hopsApplied = 0;
  let breakAtHash: string | null = null;

  for (let hop = userIndex; hop < LATEST_INDEX; hop += 1) {
    if (patchExists(options.serverPatches, hop)) {
      hopsApplied += 1;
    } else {
      breakAtHash = RELEASES[hop].hash;
      break;
    }
  }

  if (breakAtHash === null) {
    return {
      tone: 'chain',
      verdict: `补丁链完整：${hopsNeeded} 级补丁逐级到达 ${RELEASES[LATEST_INDEX].version}`,
      hopsApplied,
      hopsNeeded,
      usedPatchPath: true,
      breakAtHash: null,
      sequence:
        'download-starting → checking-local-tar → local-tar-found → ' +
        '[fetching-patch → downloading-patch → applying-patch → patch-applied → extracting-version] ' +
        `×${hopsNeeded} → patch-chain-complete → download-complete`,
    };
  }

  const partial =
    hopsApplied > 0 ? `[已成功跳 ${hopsApplied} 级] → ` : '';

  return {
    tone: 'fallback',
    verdict: `链在 ${breakAtHash}.patch 处断开 → 断链回退全量下载`,
    hopsApplied,
    hopsNeeded,
    usedPatchPath: false,
    breakAtHash,
    sequence:
      'download-starting → checking-local-tar → local-tar-found → ' +
      `${partial}fetching-patch → patch-not-found → ` +
      'downloading-full-bundle → download-progress → decompressing → download-complete',
  };
}

// 在斜杠、空格与箭头后断行，避免超出面板宽度
function wrapText(
  text: string,
  maxWidth: number,
  context: CanvasRenderingContext2D,
): string[] {
  if (context.measureText(text).width <= maxWidth) {
    return [text];
  }

  const tokens = text.split(/(?<=\/)|(?<= )|(?<=→)/).filter((token) => token !== '');
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

function toneColor(tone: PathTone): string {
  if (tone === 'chain') {
    return COLORS.ok;
  }
  return tone === 'fallback' ? COLORS.warn : COLORS.latest;
}

export function createPatchChain(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PatchChainSnapshot) => void,
): PatchChainInstance {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  const drawingContext: CanvasRenderingContext2D = context;

  let current: PatchChainOptions = {
    userVersion: 'v1.2.0',
    serverPatches: 'all',
    localTar: true,
  };

  function drawPatchArrow(
    fromX: number,
    toX: number,
    y: number,
    exists: boolean,
    label: string,
  ) {
    drawingContext.strokeStyle = exists ? COLORS.ok : COLORS.faint;
    drawingContext.fillStyle = exists ? COLORS.ok : COLORS.faint;
    drawingContext.lineWidth = exists ? 1.8 : 1.2;
    drawingContext.setLineDash(exists ? [] : [4, 3]);
    drawingContext.beginPath();
    drawingContext.moveTo(fromX, y);
    drawingContext.lineTo(toX - 7, y);
    drawingContext.stroke();
    drawingContext.setLineDash([]);
    drawingContext.beginPath();
    drawingContext.moveTo(toX, y);
    drawingContext.lineTo(toX - 8, y - 4);
    drawingContext.lineTo(toX - 8, y + 4);
    drawingContext.closePath();
    drawingContext.fill();

    drawingContext.fillStyle = exists ? COLORS.ok : COLORS.faint;
    drawingContext.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    const text = exists ? label : `${label} 缺失`;
    const labelWidth = drawingContext.measureText(text).width;
    drawingContext.fillText(text, (fromX + toX - labelWidth) / 2, y - 8);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = Math.max(420, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const result = resolvePath(current);
    const userIndex = RELEASES.findIndex(
      (release) => release.version === current.userVersion,
    );
    const userAtLatest = userIndex === LATEST_INDEX;

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('downloadUpdate 路径判定：补丁链还是全量兜底', 24, 38);

    // 发布链：四个版本节点，节点间箭头标注来源版本哈希（即 {fromHash}.patch 的名字）
    const margin = 24;
    const chainTop = 76;
    const nodeGap = 88;
    const nodeWidth = (width - margin * 2 - nodeGap * (RELEASES.length - 1)) / RELEASES.length;
    const nodeHeight = 58;
    const centerY = chainTop + nodeHeight / 2;

    RELEASES.forEach((release, index) => {
      const x = margin + index * (nodeWidth + nodeGap);
      const isUser = index === userIndex;
      const isLatest = index === LATEST_INDEX;

      drawingContext.fillStyle = COLORS.boxFill;
      drawingContext.strokeStyle = isUser ? COLORS.ok : COLORS.plainBorder;
      drawingContext.lineWidth = isUser ? 2.5 : 1.5;
      drawingContext.beginPath();
      drawingContext.roundRect(x, chainTop, nodeWidth, nodeHeight, 8);
      drawingContext.fill();
      drawingContext.stroke();

      drawingContext.fillStyle = COLORS.heading;
      drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(release.version, x + 12, chainTop + 24);

      drawingContext.fillStyle = COLORS.muted;
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(release.hash, x + 12, chainTop + 42);

      if (isLatest) {
        drawingContext.fillStyle = COLORS.latest;
        drawingContext.font = '600 10px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText('latest', x + nodeWidth - 38, chainTop + 16);
      }

      if (isUser) {
        drawingContext.fillStyle = COLORS.ok;
        drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
        const tag = userAtLatest ? '本地 = 最新' : '本地 hash';
        const tagWidth = drawingContext.measureText(tag).width;
        drawingContext.fillText(
          tag,
          x + (nodeWidth - tagWidth) / 2,
          chainTop + nodeHeight + 16,
        );
        drawingContext.beginPath();
        drawingContext.moveTo(x + nodeWidth / 2 - 5, chainTop + nodeHeight + 2);
        drawingContext.lineTo(x + nodeWidth / 2 + 5, chainTop + nodeHeight + 2);
        drawingContext.lineTo(x + nodeWidth / 2, chainTop + nodeHeight - 6);
        drawingContext.closePath();
        drawingContext.fill();
      }
    });

    // 节点之间的补丁箭头：策略决定该跳补丁是否在服务器上
    for (let hop = 0; hop < LATEST_INDEX; hop += 1) {
      const fromX = margin + hop * (nodeWidth + nodeGap) + nodeWidth + 3;
      const toX = margin + (hop + 1) * (nodeWidth + nodeGap) - 3;
      drawPatchArrow(
        fromX,
        toX,
        centerY,
        patchExists(current.serverPatches, hop),
        RELEASES[hop].hash,
      );
    }

    // 配置摘要：本次判定依据与补丁命名规则
    const summaryY = chainTop + nodeHeight + 42;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `服务器补丁：${POLICY_LABELS[current.serverPatches]} · 本地 ${RELEASES[Math.max(userIndex, 0)].hash}.tar：${current.localTar ? '在' : '不在'}`,
      margin,
      summaryY,
    );
    drawingContext.fillText(
      '节点间箭头 = {fromHash}.patch（补丁名是来源版本的哈希，虚线 = 服务器上没有）',
      margin,
      summaryY + 18,
    );

    // 实际执行路径面板
    const panelTop = summaryY + 40;
    const panelHeight = height - panelTop - 20;
    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = toneColor(result.tone);
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.roundRect(margin, panelTop, width - margin * 2, panelHeight, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = toneColor(result.tone);
    drawingContext.font = '700 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(result.verdict, margin + 14, panelTop + 28);

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    let seqY = panelTop + 52;
    wrapText(result.sequence, width - margin * 2 - 28, drawingContext).forEach(
      (line) => {
        drawingContext.fillText(line, margin + 14, seqY);
        seqY += 16;
      },
    );

    emit({
      verdict: result.verdict,
      hopsApplied: `${result.hopsApplied}/${result.hopsNeeded}`,
      usedPatchPath: String(result.usedPatchPath),
      breakAt: result.breakAtHash ? `${result.breakAtHash}.patch` : '—',
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
