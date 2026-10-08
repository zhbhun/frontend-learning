/**
 * 范例介绍:模拟「发布 → 检查 → 下载 → 验签 → 安装」的自动更新全链路,回答每一步的成败条件。
 * 输入:本机版本、清单 version、清单 signature(构建签名 / 私钥不匹配)、更新策略
 *   (静默安装 / 询问后更新 / 询问后取消)。
 * 主要操作:顶部流水线按示意节奏推进——发布方两步完成后,check() 比较版本,按策略
 *   弹出询问框或直接下载,下载完成后用内置 pubkey 校验工件签名,通过才安装重启;
 *   右栏同步显示端点清单与内置公钥的对应关系,左下读数给出每步结论。
 * 预期结果:清单不比本机新 → 终止于 check;signature 与 pubkey 不配对 → 下载完成后
 *   终止于验签,不进入安装;询问后取消 → 停在确认框;全部通过 → 重启后运行新版本。
 * 阅读主线:客户端只信内置 pubkey——版本、签名任何一环对不上,更新就地终止。
 * 边界:时序与字节数为示意,真实节奏取决于网络、产物体积与平台安装器。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// ── 输入与读数 ──────────────────────────────────────────────

export type LocalVersion = '1.0.0' | '1.0.2';
export type ManifestVersion = '1.0.2' | '1.0.0';
export type SignatureKind =
  | '构建签名(与 pubkey 配对)'
  | '私钥不匹配(演示)';
export type UpdatePolicy = '静默安装' | '询问后更新' | '询问后取消';

export interface FlowArgs {
  /** 客户端当前安装的版本。 */
  localVersion: LocalVersion;
  /** 更新清单 latest.json 里的 version 字段。 */
  manifestVersion: ManifestVersion;
  /** 清单里 signature 与客户端内置 pubkey 的配对关系。 */
  signature: SignatureKind;
  /** 客户端拿到更新后的处理策略。 */
  policy: UpdatePolicy;
}

export interface FlowSnapshot {
  /** 读数:check() 的比较结论。 */
  checkResult: string;
  /** 读数:内置 pubkey 对工件签名的校验结论。 */
  verify: string;
  /** 读数:下载进度(示意)。 */
  download: string;
  /** 读数:本次链路的结局。 */
  outcome: string;
}

export interface FlowInstance {
  update(options: FlowArgs): void;
  dispose(): void;
}

// ── 示意常量 ────────────────────────────────────────────────

// 各阶段示意时长(毫秒),只表达相对节奏,不代表真实网络与安装耗时。
const T_CHECK = 600;
const T_DIALOG = 1500;
const T_VERIFY = 500;
const T_INSTALL = 700;
const T_RELAUNCH = 700;
const DOWNLOAD_MS = 2200;
const TICK_MS = 40;
/** 示意产物大小,进度条与读数用它换算。 */
const CONTENT_LENGTH = 24_600_000;
const NOTES = '自动更新链路与窗口体验修复';
const PUB_DATE = '2026-10-07T08:00:00Z';
/** minisign 格式的示意串:真实的 .sig / 公钥都以 untrusted comment 注释行开头。 */
const SIG_PREVIEW = 'dW50cnVzdGVkIGNvbW1lbnQ6…';
const PUBKEY_PREVIEW = 'dW50cnVzdGVkIGNvbW1lbnQ6…';
const SIG_OK: SignatureKind = '构建签名(与 pubkey 配对)';

// ── 画布配色与字体 ──────────────────────────────────────────

const DIM = '#64748b';
const TEXT = '#172033';
const KEY = '#475569';
const TRACK = '#eef2f7';
const BOX_BORDER = '#dbe3f0';
const GREEN = '#15803d';
const RED = '#dc2626';
const BLUE = '#4f7cff';
const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// ── 流水线与模拟状态 ────────────────────────────────────────

const STAGES = [
  '构建签名工件',
  '发布清单',
  'check()',
  '下载',
  '验签',
  '安装',
  '重启',
];

type StageStatus = 'pending' | 'running' | 'done' | 'failed';

type Outcome =
  | 'pending'
  | 'no-update'
  | 'verify-failed'
  | 'declined'
  | 'installed';

interface Sim {
  checkRunning: boolean;
  checkDone: boolean;
  hasUpdate: boolean;
  dialogVisible: boolean;
  dialogChoice: 'later' | 'update' | null;
  downloadRunning: boolean;
  downloadedBytes: number;
  downloadDone: boolean;
  verifyRunning: boolean;
  verifyDone: boolean;
  verifyOk: boolean;
  installRunning: boolean;
  installDone: boolean;
  relaunchRunning: boolean;
  relaunched: boolean;
  outcome: Outcome;
}

function freshSim(): Sim {
  return {
    checkRunning: true,
    checkDone: false,
    hasUpdate: false,
    dialogVisible: false,
    dialogChoice: null,
    downloadRunning: false,
    downloadedBytes: 0,
    downloadDone: false,
    verifyRunning: false,
    verifyDone: false,
    verifyOk: false,
    installRunning: false,
    installDone: false,
    relaunchRunning: false,
    relaunched: false,
    outcome: 'pending',
  };
}

/** 简化 SemVer 比较(示例只用 x.y.z 数字段):正数表示 a 更新。 */
function compareVersion(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function fmtMB(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function stageStatus(i: number, sim: Sim): StageStatus {
  switch (i) {
    case 0:
    case 1:
      return 'done';
    case 2:
      return sim.checkRunning ? 'running' : 'done';
    case 3:
      if (!sim.checkDone || !sim.hasUpdate) {
        return 'pending';
      }
      return sim.downloadRunning ? 'running' : sim.downloadDone ? 'done' : 'pending';
    case 4:
      if (!sim.downloadDone) {
        return 'pending';
      }
      return sim.verifyRunning ? 'running' : sim.verifyOk ? 'done' : 'failed';
    case 5:
      if (!sim.verifyDone || !sim.verifyOk) {
        return 'pending';
      }
      return sim.installRunning ? 'running' : sim.installDone ? 'done' : 'pending';
    case 6:
      if (!sim.installDone) {
        return 'pending';
      }
      return sim.relaunchRunning ? 'running' : sim.relaunched ? 'done' : 'pending';
    default:
      return 'pending';
  }
}

function stageCaption(i: number, sim: Sim, args: FlowArgs): string {
  switch (i) {
    case 0:
      return '工件 + .sig';
    case 1:
      return `version ${args.manifestVersion}`;
    case 2:
      if (sim.checkRunning) {
        return '请求端点…';
      }
      return sim.hasUpdate
        ? `${args.localVersion} → ${args.manifestVersion}`
        : '无更新';
    case 3: {
      if (!sim.checkDone || !sim.hasUpdate) {
        return '—';
      }
      if (sim.downloadRunning) {
        return `${Math.round((sim.downloadedBytes / CONTENT_LENGTH) * 100)}%`;
      }
      return sim.downloadDone ? '完成' : '—';
    }
    case 4:
      if (!sim.downloadDone) {
        return '—';
      }
      if (sim.verifyRunning) {
        return '校验中…';
      }
      return sim.verifyOk ? '通过' : '不配对';
    case 5:
      if (!sim.verifyDone || !sim.verifyOk) {
        return '—';
      }
      return sim.installDone ? '完成' : '进行中…';
    case 6:
      if (!sim.installDone) {
        return '—';
      }
      return sim.relaunched ? args.manifestVersion : '进行中…';
    default:
      return '';
  }
}

function statusPalette(status: StageStatus): {
  fill: string;
  border: string;
  text: string;
} {
  switch (status) {
    case 'done':
      return { fill: '#dcfce7', border: GREEN, text: GREEN };
    case 'running':
      return { fill: '#dbeafe', border: '#1d4ed8', text: '#1d4ed8' };
    case 'failed':
      return { fill: '#fee2e2', border: RED, text: RED };
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

export function createUpdateFlow(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FlowSnapshot) => void,
): FlowInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: FlowArgs = {
    localVersion: '1.0.0',
    manifestVersion: '1.0.2',
    signature: SIG_OK,
    policy: '询问后更新',
  };
  let sim = freshSim();
  let timers: number[] = [];
  let downloadTimer: number | undefined;

  function clearTimers(): void {
    timers.forEach((id) => window.clearTimeout(id));
    timers = [];
    if (downloadTimer !== undefined) {
      window.clearInterval(downloadTimer);
      downloadTimer = undefined;
    }
  }

  function schedule(fn: () => void, delay: number): void {
    timers.push(window.setTimeout(fn, delay));
  }

  function outcomeText(): string {
    switch (sim.outcome) {
      case 'no-update':
        return '本机已是最新,链路终止于 check';
      case 'verify-failed':
        return '更新终止于验签,未安装';
      case 'declined':
        return '用户选择「稍后」,未下载未安装';
      case 'installed':
        return `已安装并重启,当前运行 ${current.manifestVersion}`;
      default:
        return '进行中…';
    }
  }

  function statusLine(): string {
    if (sim.dialogVisible && !sim.dialogChoice) {
      return '等待用户选择…';
    }
    if (sim.outcome !== 'pending') {
      return outcomeText();
    }
    if (!sim.checkDone) {
      return '正在向更新端点确认本机是否有更新…';
    }
    if (sim.downloadRunning) {
      return '正在下载更新工件…';
    }
    if (sim.verifyRunning) {
      return '下载完成,正在用内置 pubkey 校验工件签名…';
    }
    return outcomeText();
  }

  function statusTextColor(): string {
    switch (sim.outcome) {
      case 'verify-failed':
        return RED;
      case 'installed':
        return GREEN;
      default:
        return KEY;
    }
  }

  function emitSnapshot(): void {
    const { localVersion, manifestVersion } = current;
    const cmp = compareVersion(manifestVersion, localVersion);
    const checkResult = !sim.checkDone
      ? '请求端点中…'
      : sim.hasUpdate
        ? `有更新:${localVersion} → ${manifestVersion}`
        : cmp < 0
          ? '无更新:清单版本比本机旧'
          : '无更新:本机已是最新';
    const verify = !sim.downloadDone
      ? '—'
      : sim.verifyRunning
        ? '校验中…'
        : sim.verifyDone
          ? sim.verifyOk
            ? '通过'
            : '失败:与内置 pubkey 不配对'
          : '—';
    const download = !sim.checkDone || !sim.hasUpdate
      ? '—'
      : sim.downloadDone
        ? '完成'
        : sim.downloadRunning
          ? `${fmtMB(sim.downloadedBytes)} / ${fmtMB(CONTENT_LENGTH)}`
          : '—';
    emit({ checkResult, verify, download, outcome: outcomeText() });
  }

  function startDownload(): void {
    sim.downloadRunning = true;
    draw();
    emitSnapshot();
    const step = CONTENT_LENGTH / (DOWNLOAD_MS / TICK_MS);
    downloadTimer = window.setInterval(() => {
      sim.downloadedBytes = Math.min(CONTENT_LENGTH, sim.downloadedBytes + step);
      if (sim.downloadedBytes >= CONTENT_LENGTH) {
        window.clearInterval(downloadTimer);
        downloadTimer = undefined;
        sim.downloadRunning = false;
        sim.downloadDone = true;
        // 下载完成后才验签:用内置 pubkey 校验下载到的工件与清单 signature。
        sim.verifyRunning = true;
        draw();
        emitSnapshot();
        schedule(() => {
          sim.verifyRunning = false;
          sim.verifyDone = true;
          sim.verifyOk = current.signature === SIG_OK;
          draw();
          emitSnapshot();
          if (!sim.verifyOk) {
            sim.outcome = 'verify-failed';
            draw();
            emitSnapshot();
            return;
          }
          sim.installRunning = true;
          draw();
          emitSnapshot();
          schedule(() => {
            sim.installRunning = false;
            sim.installDone = true;
            sim.relaunchRunning = true;
            draw();
            emitSnapshot();
            schedule(() => {
              sim.relaunchRunning = false;
              sim.relaunched = true;
              sim.outcome = 'installed';
              draw();
              emitSnapshot();
            }, T_RELAUNCH);
          }, T_INSTALL);
        }, T_VERIFY);
      } else {
        draw();
        emitSnapshot();
      }
    }, TICK_MS);
  }

  function plan(): void {
    clearTimers();
    sim = freshSim();
    draw();
    emitSnapshot();

    // check():拉取清单并比较版本——不比本机新就地终止。
    schedule(() => {
      sim.checkRunning = false;
      sim.checkDone = true;
      sim.hasUpdate =
        compareVersion(current.manifestVersion, current.localVersion) > 0;
      draw();
      emitSnapshot();
      if (!sim.hasUpdate) {
        sim.outcome = 'no-update';
        draw();
        emitSnapshot();
        return;
      }

      // 策略:静默直接下载;询问则先弹确认框。
      if (current.policy === '静默安装') {
        startDownload();
        return;
      }
      sim.dialogVisible = true;
      draw();
      emitSnapshot();
      schedule(() => {
        if (current.policy === '询问后取消') {
          sim.dialogChoice = 'later';
          sim.outcome = 'declined';
          draw();
          emitSnapshot();
          return;
        }
        sim.dialogVisible = false;
        sim.dialogChoice = 'update';
        startDownload();
      }, T_DIALOG);
    }, T_CHECK);
  }

  // ── 绘制 ────────────────────────────────────────────────

  function drawButton(
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    active: boolean,
  ): void {
    if (active) {
      ctx.fillStyle = BLUE;
      roundRect(ctx, x, y, w, h, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.strokeStyle = '#94a3b8';
      roundRect(ctx, x, y, w, h, 5);
      ctx.stroke();
      ctx.fillStyle = KEY;
    }
    ctx.font = `11px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 4);
    ctx.textAlign = 'left';
  }

  function manifestLines(): Array<{
    text: string;
    note?: string;
    noteColor?: string;
  }> {
    const manifest = current.manifestVersion;
    const cmp = compareVersion(manifest, current.localVersion);
    const versionNote =
      cmp > 0
        ? { note: '← 比本机新,触发更新', noteColor: GREEN }
        : { note: '← 不比本机新,无更新', noteColor: RED };
    const signatureNote =
      current.signature === SIG_OK
        ? { note: '↑ 与内置 pubkey 配对,客户端放行', noteColor: GREEN }
        : { note: '↑ 与内置 pubkey 不配对,更新终止', noteColor: RED };
    return [
      { text: '{' },
      {
        text: `  "version": "${manifest}",`,
        note: versionNote.note,
        noteColor: versionNote.noteColor,
      },
      { text: `  "notes": "${NOTES}",` },
      { text: `  "pub_date": "${PUB_DATE}",` },
      { text: '  "platforms": { "darwin-aarch64": {' },
      {
        text: `    "url": "…/myapp/${manifest}/myapp.app.tar.gz",`,
      },
      {
        text: `    "signature": "${SIG_PREVIEW}"`,
      },
      { text: '  } }' },
      { text: '}' },
      {
        text: '',
        note: signatureNote.note,
        noteColor: signatureNote.noteColor,
      },
    ];
  }

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(740, size.width);
    const height = Math.max(340, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const x0 = 24;
    const barW = width - x0 - 24;
    const midX = x0 + Math.round(barW / 2) + 14;
    const leftW = midX - x0 - 20;

    // ── 顶部:更新链路流水线 ──────────────────────────────
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('更新链路(发布 → 客户端)', x0, 24);

    const gap = 8;
    const boxW = (barW - gap * (STAGES.length - 1)) / STAGES.length;
    const boxY = 32;
    const boxH = 46;
    for (let i = 0; i < STAGES.length; i += 1) {
      const x = x0 + i * (boxW + gap);
      if (i > 0) {
        ctx.strokeStyle = BOX_BORDER;
        ctx.beginPath();
        ctx.moveTo(x - gap + 1, boxY + boxH / 2);
        ctx.lineTo(x - 1, boxY + boxH / 2);
        ctx.stroke();
      }
      const palette = statusPalette(stageStatus(i, sim));
      ctx.fillStyle = palette.fill;
      roundRect(ctx, x, boxY, boxW, boxH, 6);
      ctx.fill();
      ctx.strokeStyle = palette.border;
      ctx.stroke();

      ctx.fillStyle = palette.text;
      ctx.font = `600 11px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(STAGES[i], x + boxW / 2, boxY + 19);
      ctx.font = `10px ${MONO}`;
      ctx.fillText(stageCaption(i, sim, current), x + boxW / 2, boxY + 36);
      ctx.textAlign = 'left';
    }

    // ── 左栏:客户端画面(策略与进度) ─────────────────────
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('客户端画面', x0, 102);

    if (sim.dialogVisible) {
      const dlgW = Math.min(leftW, 330);
      const dlgH = 96;
      const dlgX = x0 + (leftW - dlgW) / 2;
      const dlgY = 112;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, dlgX, dlgY, dlgW, dlgH, 8);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();

      ctx.fillStyle = TEXT;
      ctx.font = `600 12px ${SANS}`;
      ctx.fillText(`发现新版本 ${current.manifestVersion}`, dlgX + 16, dlgY + 24);
      ctx.fillStyle = KEY;
      ctx.font = `11px ${SANS}`;
      ctx.fillText(`更新说明:${NOTES}`, dlgX + 16, dlgY + 46);

      const btnY = dlgY + 62;
      const btnH = 26;
      const updateBtnW = 92;
      const laterBtnW = 62;
      const updateBtnX = dlgX + dlgW - updateBtnW - 12;
      const laterBtnX = updateBtnX - laterBtnW - 8;
      drawButton(
        '稍后',
        laterBtnX,
        btnY,
        laterBtnW,
        btnH,
        sim.dialogChoice === 'later',
      );
      drawButton(
        '立即更新',
        updateBtnX,
        btnY,
        updateBtnW,
        btnH,
        sim.dialogChoice === 'update',
      );
    } else {
      ctx.fillStyle = KEY;
      ctx.font = `11px ${SANS}`;
      ctx.fillText(
        current.policy === '静默安装'
          ? '策略:静默安装 — 验签通过后直接安装'
          : '策略:询问后更新(用户已确认)',
        x0,
        122,
      );

      const trackY = 134;
      ctx.fillStyle = TRACK;
      roundRect(ctx, x0, trackY, leftW, 18, 4);
      ctx.fill();
      ctx.strokeStyle = BOX_BORDER;
      ctx.stroke();
      const pct = Math.min(1, sim.downloadedBytes / CONTENT_LENGTH);
      if (pct > 0) {
        ctx.fillStyle = BLUE;
        roundRect(ctx, x0, trackY, Math.max(2, leftW * pct), 18, 4);
        ctx.fill();
      }
      ctx.fillStyle = KEY;
      ctx.font = `10px ${MONO}`;
      ctx.fillText(
        `${fmtMB(sim.downloadedBytes)} / ${fmtMB(CONTENT_LENGTH)} · ${Math.round(pct * 100)}%`,
        x0,
        170,
      );
    }

    // 状态行:左栏共用结论(避开左下角读数区)。
    ctx.fillStyle = statusTextColor();
    ctx.font = `12px ${SANS}`;
    ctx.fillText(statusLine(), x0, 226);

    // ── 右栏:端点清单与内置公钥 ──────────────────────────
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('端点清单(latest.json)与内置公钥', midX, 102);

    ctx.fillStyle = KEY;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(`内置 pubkey:${PUBKEY_PREVIEW}`, midX, 120);

    let lineY = 140;
    ctx.font = `10px ${MONO}`;
    for (const line of manifestLines()) {
      if (line.text) {
        ctx.fillStyle = KEY;
        ctx.fillText(line.text, midX, lineY);
      }
      if (line.note) {
        const w = line.text ? ctx.measureText(line.text).width : 60;
        ctx.fillStyle = line.noteColor ?? RED;
        ctx.fillText(line.note, midX + w + 8, lineY);
      }
      lineY += 16;
    }

    ctx.fillStyle = DIM;
    ctx.font = `10px ${SANS}`;
    ctx.textAlign = 'right';
    ctx.fillText(
      '时序与字节数为示意;真实节奏取决于网络、产物体积与平台安装器。',
      width - 24,
      height - 12,
    );
    ctx.textAlign = 'left';
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  plan();

  return {
    update(options) {
      current = options;
      plan();
    },
    dispose() {
      clearTimers();
      resizeObserver.disconnect();
    },
  };
}
