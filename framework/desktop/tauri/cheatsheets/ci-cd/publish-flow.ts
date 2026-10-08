/**
 * 范例介绍:模拟「推送 tag → runner 矩阵并行构建 → tauri-action 收尾发布」的 CI 流水线,
 * 回答一次 tag 推送之后流水线怎么走、每一步产出什么、什么配置会让它停在哪一步。
 * 输入:更新签名私钥(已注入 secret / 缺失)、GITHUB_TOKEN 权限(contents: write / 只读)、
 *   releaseDraft(草稿 / 直接发布)、Rust 缓存(命中 / 冷缓存)。
 * 主要操作:推送 tag app-v1.0.2 后,四个 job 在 macOS(双架构)/ Ubuntu / Windows runner 上
 *   并行执行 checkout → 系统依赖(Ubuntu 专属)→ 工具链 → rust-cache → 前端依赖 →
 *   tauri build → 上传;全部成功后 tauri-action 创建 Release,底部面板展示资产与
 *   latest.json,左下读数给出矩阵、产物、Release 与更新清单四个结论。
 * 预期结果:私钥缺失 → 四个 job 各自止于 tauri build(fail-fast: false 下互不连坐);
 *   token 只读 → 构建全部成功,创建 Release 报 Resource not accessible by integration;
 *   releaseDraft 决定草稿或直接发布;冷缓存时 rust-cache 与 tauri build 段明显变长。
 * 阅读主线:矩阵把三平台一次跑齐,tauri-action 把产物汇总成一个 Release;流水线停在哪一步,
 *   取决于凭据与权限有没有接对。
 * 边界:时序为示意,真实构建以分钟计;产物用扩展名示意,不代表默认命名模板。
 */
import { createRenderLoop, readCanvasSize } from '../../assets/canvas-runtime.js';

// ── 输入与读数 ──────────────────────────────────────────────

export type SigningSecret = '已注入 secret' | '缺失(演示)';
export type TokenPermission = 'contents: write' | '只读(演示)';
export type RustCacheState = '命中(非首次)' | '冷缓存(首次)';

export interface FlowArgs {
  /** updater 私钥 secret 是否注入到构建进程。 */
  signingSecret: SigningSecret;
  /** GITHUB_TOKEN 对仓库 contents 的权限。 */
  tokenPermission: TokenPermission;
  /** tauri-action 的 releaseDraft 输入。 */
  releaseDraft: boolean;
  /** rust-cache 是否命中(首次构建必然未命中)。 */
  rustCache: RustCacheState;
}

export interface FlowSnapshot {
  /** 读数:矩阵 job 的整体结论。 */
  jobs: string;
  /** 读数:发布产物结论。 */
  artifacts: string;
  /** 读数:Release 结论。 */
  release: string;
  /** 读数:latest.json(updater 清单)结论。 */
  updaterJson: string;
}

export interface FlowInstance {
  update(options: FlowArgs): void;
  dispose(): void;
}

// ── 常量:tag 解析、矩阵与步骤 ────────────────────────────────

const APP_VERSION = '1.0.2';
const TAG = `app-v${APP_VERSION}`;
const RELEASE_NAME = `App v${APP_VERSION}`;

/** 与官方指南一致的 matrix:macOS 双 target + ubuntu-22.04 + windows-latest。 */
interface LaneSpec {
  platform: string;
  runner: string;
  args: string;
  ubuntuOnly: boolean;
  assets: string;
}

const LANES: LaneSpec[] = [
  {
    platform: 'macOS · Apple Silicon',
    runner: 'macos-latest',
    args: '--target aarch64-apple-darwin',
    ubuntuOnly: false,
    assets: 'app.tar.gz+sig · dmg',
  },
  {
    platform: 'macOS · Intel',
    runner: 'macos-latest',
    args: '--target x86_64-apple-darwin',
    ubuntuOnly: false,
    assets: 'app.tar.gz+sig · dmg',
  },
  {
    platform: 'Linux · x86_64',
    runner: 'ubuntu-22.04',
    args: '(默认 target)',
    ubuntuOnly: true,
    assets: 'AppImage+sig · deb · rpm',
  },
  {
    platform: 'Windows · x86_64',
    runner: 'windows-latest',
    args: '(默认 target)',
    ubuntuOnly: false,
    assets: 'NSIS exe+sig · msi+sig',
  },
];

const STEPS = [
  'checkout',
  '系统依赖',
  '工具链',
  'rust-cache',
  '前端依赖',
  'tauri build',
  '上传',
] as const;

const BUILD_STEP = 5;

/** 上传到 Release 的资产(扩展名示意),latest.json 由 tauri-action 自动生成。 */
const ASSET_CHIPS = [
  '.app.tar.gz + .sig ×2',
  '.dmg ×2',
  '.AppImage + .sig',
  '.deb',
  '.rpm',
  'NSIS .exe + .sig',
  '.msi + .sig',
  'latest.json',
];

const STAGGER_MS = 140;
const RELEASE_CREATE_MS = 450;

interface StepSpan {
  step: string;
  from: number;
  to: number;
}

interface Timeline {
  spans: StepSpan[];
  end: number;
}

/** 每个 job 的示意时长;冷缓存拖长 rust-cache 与构建段,Ubuntu 多一段系统依赖。 */
function laneTimeline(args: FlowArgs, laneIndex: number): Timeline {
  const cold = args.rustCache === '冷缓存(首次)';
  const durations = [
    220, // checkout
    LANES[laneIndex].ubuntuOnly ? 520 : 70, // 系统依赖(if 条件只对 Ubuntu 生效)
    260, // 工具链
    cold ? 480 : 200, // rust-cache
    240, // 前端依赖
    (cold ? 2100 : 1500) + laneIndex * 90, // tauri build
    420, // 上传
  ];
  let cursor = laneIndex * STAGGER_MS; // 矩阵 job 几乎同时启动,只留一点错峰
  const spans = durations.map((dur, i) => {
    const span = { step: STEPS[i], from: cursor, to: cursor + dur };
    cursor += dur;
    return span;
  });
  return { spans, end: cursor };
}

type Outcome =
  | 'building'
  | 'build-failed'
  | 'creating-release'
  | 'release-failed'
  | 'draft-created'
  | 'published';

function resolveOutcome(args: FlowArgs, timelines: Timeline[], t: number): Outcome {
  if (args.signingSecret === '缺失(演示)') {
    const failAt = Math.max(...timelines.map((tl) => tl.spans[BUILD_STEP].to));
    return t >= failAt ? 'build-failed' : 'building';
  }
  const releaseStart = Math.max(...timelines.map((tl) => tl.end));
  if (t < releaseStart) {
    return 'building';
  }
  if (t < releaseStart + RELEASE_CREATE_MS) {
    return 'creating-release';
  }
  if (args.tokenPermission === '只读(演示)') {
    return 'release-failed';
  }
  return args.releaseDraft ? 'draft-created' : 'published';
}

// ── 画布配色与字体 ──────────────────────────────────────────

const DIM = '#64748b';
const TEXT = '#172033';
const KEY = '#475569';
const TRACK = '#eef2f7';
const BOX_BORDER = '#dbe3f0';
const GREEN = '#15803d';
const RED = '#dc2626';
const AMBER = '#b45309';
const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

type SegStatus = 'queued' | 'running' | 'done' | 'failed' | 'skipped';

function segmentStatus(
  t: number,
  segIndex: number,
  laneIndex: number,
  timeline: Timeline,
  signingMissing: boolean,
): SegStatus {
  const span = timeline.spans[segIndex];
  if (t < span.from) {
    return 'queued';
  }
  if (signingMissing) {
    // 私钥缺失:构建步结束时该 job 失败,之后的步骤永远排不上。
    if (segIndex === BUILD_STEP) {
      return t >= span.to ? 'failed' : 'running';
    }
    if (segIndex > BUILD_STEP) {
      return 'queued';
    }
  }
  if (segIndex === 1 && !LANES[laneIndex].ubuntuOnly) {
    return 'skipped'; // 系统依赖步骤的 if 条件:只装在 Ubuntu runner 上
  }
  return t >= span.to ? 'done' : 'running';
}

function segPalette(status: SegStatus): { fill: string; border: string; text: string } {
  switch (status) {
    case 'done':
      return { fill: '#dcfce7', border: GREEN, text: GREEN };
    case 'running':
      return { fill: '#dbeafe', border: '#1d4ed8', text: '#1d4ed8' };
    case 'failed':
      return { fill: '#fee2e2', border: RED, text: RED };
    case 'skipped':
      return { fill: '#f1f5f9', border: '#e2e8f0', text: '#cbd5e1' };
    default:
      return { fill: TRACK, border: BOX_BORDER, text: '#94a3b8' };
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.closePath();
}

// ── 实例 ────────────────────────────────────────────────────

export function createPublishFlow(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FlowSnapshot) => void,
): FlowInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: FlowArgs = {
    signingSecret: '已注入 secret',
    tokenPermission: 'contents: write',
    releaseDraft: true,
    rustCache: '命中(非首次)',
  };
  let timelines: Timeline[] = LANES.map((_, i) => laneTimeline(current, i));
  // 进入视口的第一帧才开始计时,避免读者滚动到位时动画已经播完。
  let simStart = 0;
  let started = false;
  let viewW = 760;
  let viewH = 340;

  const renderLoop = createRenderLoop(canvas, () => {
    if (!started) {
      started = true;
      simStart = performance.now();
    }
    draw(performance.now() - simStart);
  });

  function draw(elapsed: number): void {
    const size = readCanvasSize(canvas);
    viewW = Math.max(760, size.width);
    viewH = Math.max(340, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(viewW * pixelRatio);
    canvas.height = Math.round(viewH * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const outcome = resolveOutcome(current, timelines, elapsed);
    drawHeader();
    drawLanes(elapsed, outcome);
    drawReleasePanel(outcome);
    drawFooter();
    emit(snapshotFor(outcome));
  }

  function drawHeader(): void {
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText(
      "push tags 'app-v*' + workflow_dispatch · permissions: contents: write · fail-fast: false",
      22,
      22,
    );
    ctx.fillStyle = KEY;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(
      `tagName: app-v__VERSION__ → ${TAG} · releaseName: '${RELEASE_NAME}' · releaseDraft: ${current.releaseDraft}`,
      22,
      39,
    );
  }

  function drawLanes(elapsed: number, outcome: Outcome): void {
    const laneTop = 58;
    const pitch = 40;
    const labelX = 22;
    const barX = labelX + 178;
    const statusX = viewW - 24 - 236;
    const signingMissing = current.signingSecret === '缺失(演示)';

    for (let i = 0; i < LANES.length; i += 1) {
      const y = laneTop + i * pitch;
      const spec = LANES[i];
      const timeline = timelines[i];

      ctx.fillStyle = TEXT;
      ctx.font = `600 11px ${SANS}`;
      ctx.fillText(spec.platform, labelX, y + 14);
      ctx.fillStyle = DIM;
      ctx.font = `9px ${MONO}`;
      ctx.fillText(spec.runner, labelX, y + 29);

      // 分段进度条:段宽按时长占比,呈现同一时刻各 job 的推进差异。
      const barW = statusX - barX - 14;
      const totalDur = timeline.spans[6].to - timeline.spans[0].from;
      let sx = barX;
      for (let s = 0; s < timeline.spans.length; s += 1) {
        const span = timeline.spans[s];
        const w = Math.max(22, ((span.to - span.from) / totalDur) * barW);
        const status = segmentStatus(elapsed, s, i, timeline, signingMissing);
        const palette = segPalette(status);
        ctx.fillStyle = palette.fill;
        roundRect(ctx, sx, y + 5, w, 20, 4);
        ctx.fill();
        ctx.strokeStyle = palette.border;
        ctx.stroke();
        if (w >= 46 && status !== 'queued') {
          ctx.fillStyle = palette.text;
          ctx.font = `8px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.fillText(span.step, sx + w / 2, y + 18);
          ctx.textAlign = 'left';
        }
        sx += w + 3;
      }

      drawLaneStatus(i, y, statusX, elapsed, signingMissing);
      if (i < LANES.length - 1) {
        ctx.strokeStyle = '#edf1f7';
        ctx.beginPath();
        ctx.moveTo(labelX, y + pitch - 5);
        ctx.lineTo(statusX + 236, y + pitch - 5);
        ctx.stroke();
      }
    }
  }

  function drawLaneStatus(
    i: number,
    y: number,
    statusX: number,
    elapsed: number,
    signingMissing: boolean,
  ): void {
    const timeline = timelines[i];
    const argsText = LANES[i].args;

    if (elapsed < timeline.spans[0].from) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `10px ${SANS}`;
      ctx.fillText('排队中…', statusX, y + 14);
      drawArgs(argsText, statusX, y + 29);
      return;
    }
    // 私钥缺失时按 job 各自失败的时刻判断——fail-fast: false,互不连坐。
    if (signingMissing && elapsed >= timeline.spans[BUILD_STEP].to) {
      ctx.fillStyle = RED;
      ctx.font = `600 10px ${SANS}`;
      ctx.fillText('✗ 止于 tauri build', statusX, y + 14);
      ctx.fillStyle = RED;
      ctx.font = `9px ${MONO}`;
      ctx.fillText('缺 TAURI_SIGNING_PRIVATE_KEY', statusX, y + 29);
      return;
    }
    if (segmentStatus(elapsed, 6, i, timeline, signingMissing) === 'done') {
      ctx.fillStyle = GREEN;
      ctx.font = `600 10px ${SANS}`;
      ctx.fillText('✓ 完成', statusX, y + 14);
      ctx.fillStyle = DIM;
      ctx.font = `9px ${MONO}`;
      ctx.fillText(LANES[i].assets, statusX, y + 29);
      return;
    }
    // 运行中:显示当前步骤与该 job 的矩阵参数。
    let stepName: string = timeline.spans[0].step;
    for (const span of timeline.spans) {
      if (elapsed >= span.from) {
        stepName = span.step;
      }
    }
    ctx.fillStyle = KEY;
    ctx.font = `10px ${SANS}`;
    ctx.fillText(`${stepName}…`, statusX, y + 14);
    drawArgs(argsText, statusX, y + 29);
  }

  function drawArgs(argsText: string, x: number, y: number): void {
    ctx.fillStyle = DIM;
    ctx.font = `9px ${MONO}`;
    ctx.fillText(argsText, x, y);
  }

  function drawReleasePanel(outcome: Outcome): void {
    const panelTop = 226;
    const panelH = 80;
    const x0 = 22;
    const w = viewW - 44;

    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x0, panelTop, w, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();

    const badge = badgeFor(outcome);
    ctx.fillStyle = badge.fill;
    roundRect(ctx, x0 + 14, panelTop + 12, badge.w, 18, 4);
    ctx.fill();
    ctx.strokeStyle = badge.border;
    ctx.stroke();
    ctx.fillStyle = badge.text;
    ctx.font = `600 10px ${SANS}`;
    ctx.fillText(
      badge.label,
      x0 + 14 + (badge.w - ctx.measureText(badge.label).width) / 2,
      panelTop + 25,
    );

    ctx.fillStyle = TEXT;
    ctx.font = `600 12px ${SANS}`;
    ctx.fillText(`Release ${RELEASE_NAME}`, x0 + 82, panelTop + 25);

    switch (outcome) {
      case 'building':
        ctx.fillStyle = DIM;
        ctx.font = `10px ${SANS}`;
        ctx.fillText('等待矩阵完成…', x0 + 14, panelTop + 46);
        break;
      case 'build-failed':
        ctx.fillStyle = RED;
        ctx.font = `10px ${SANS}`;
        ctx.fillText('矩阵未全部成功,tauri-action 未创建 Release。', x0 + 14, panelTop + 46);
        break;
      case 'creating-release':
        ctx.fillStyle = DIM;
        ctx.font = `10px ${SANS}`;
        ctx.fillText('正在创建 Release 并上传资产…', x0 + 14, panelTop + 46);
        break;
      case 'release-failed':
        ctx.fillStyle = RED;
        ctx.font = `10px ${SANS}`;
        ctx.fillText(
          'Resource not accessible by integration — GITHUB_TOKEN 需要 contents: write。',
          x0 + 14,
          panelTop + 46,
        );
        break;
      case 'draft-created':
      case 'published': {
        drawChips(x0 + 14, panelTop + 38, w - 28);
        ctx.fillStyle = outcome === 'draft-created' ? AMBER : GREEN;
        ctx.font = `9px ${SANS}`;
        ctx.textAlign = 'right';
        ctx.fillText(
          outcome === 'draft-created' ? 'Publish 前客户端拉不到产物' : '已公开,updater 端点就绪',
          x0 + w - 14,
          panelTop + 70,
        );
        ctx.textAlign = 'left';
        break;
      }
    }
  }

  function badgeFor(outcome: Outcome): {
    label: string;
    fill: string;
    border: string;
    text: string;
    w: number;
  } {
    switch (outcome) {
      case 'draft-created':
        return { label: '草稿', fill: '#fef3c7', border: '#d97706', text: AMBER, w: 48 };
      case 'published':
        return { label: '已发布', fill: '#dcfce7', border: GREEN, text: GREEN, w: 56 };
      case 'creating-release':
        return { label: '创建中', fill: '#dbeafe', border: '#1d4ed8', text: '#1d4ed8', w: 56 };
      case 'release-failed':
        return { label: '失败', fill: '#fee2e2', border: RED, text: RED, w: 48 };
      default:
        return { label: '—', fill: '#f1f5f9', border: '#e2e8f0', text: '#94a3b8', w: 32 };
    }
  }

  function drawChips(x: number, y: number, maxW: number): void {
    let cx = x;
    let cy = y;
    for (const chip of ASSET_CHIPS) {
      ctx.font = `9px ${MONO}`;
      const isJson = chip === 'latest.json';
      const cw = ctx.measureText(chip).width + 14;
      if (cx + cw > x + maxW) {
        cx = x;
        cy += 24;
      }
      ctx.fillStyle = isJson ? '#f0fdf4' : '#f8fafc';
      roundRect(ctx, cx, cy, cw, 17, 4);
      ctx.fill();
      ctx.strokeStyle = isJson ? GREEN : BOX_BORDER;
      ctx.stroke();
      ctx.fillStyle = isJson ? GREEN : KEY;
      ctx.fillText(chip, cx + 7, cy + 12);
      cx += cw + 6;
    }
  }

  function drawFooter(): void {
    ctx.fillStyle = DIM;
    ctx.font = `9px ${SANS}`;
    ctx.textAlign = 'right';
    ctx.fillText(
      '时序为示意;真实构建以分钟计,Rust 缓存决定重复编译是否重来。',
      viewW - 22,
      viewH - 10,
    );
    ctx.textAlign = 'left';
  }

  function snapshotFor(outcome: Outcome): FlowSnapshot {
    switch (outcome) {
      case 'building':
        return {
          jobs: '4 个 job 并行进行中…',
          artifacts: '—(未到上传步)',
          release: '—',
          updaterJson: '—',
        };
      case 'build-failed':
        return {
          jobs: '4/4 止于 tauri build:缺更新签名私钥',
          artifacts: '—(未产出可发布产物)',
          release: '—(未创建)',
          updaterJson: '—',
        };
      case 'creating-release':
        return {
          jobs: '4/4 成功 · 正在创建 Release…',
          artifacts: '构建产物就绪,等待上传',
          release: '创建中…',
          updaterJson: '—',
        };
      case 'release-failed':
        return {
          jobs: '4/4 构建成功',
          artifacts: '已构建,未能上传(创建 Release 被拒)',
          release: '失败:Resource not accessible by integration',
          updaterJson: '—',
        };
      case 'draft-created':
        return {
          jobs: '4/4 成功(并行完成)',
          artifacts: 'dmg×2 · app.tar.gz×2 · AppImage · deb · rpm · NSIS · MSI(各带 .sig)',
          release: `草稿 ${TAG} · 检查后手动 Publish`,
          updaterJson: '已生成并上传 · Publish 后 updater 可拉取',
        };
      case 'published':
        return {
          jobs: '4/4 成功(并行完成)',
          artifacts: 'dmg×2 · app.tar.gz×2 · AppImage · deb · rpm · NSIS · MSI(各带 .sig)',
          release: `已发布 ${TAG} · 公开可下载`,
          updaterJson: '已生成并上传 · updater 端点就绪',
        };
    }
  }

  function plan(): void {
    timelines = LANES.map((_, i) => laneTimeline(current, i));
    started = false;
  }

  plan();

  return {
    update(options) {
      current = options;
      plan();
    },
    dispose() {
      renderLoop.dispose();
    },
  };
}
