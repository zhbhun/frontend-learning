/**
 * 范例介绍:模拟「选平台 → 勾凭据 → build → 签名 → 商店提交」的移动端发布流水线。
 * 输入:目标平台(iOS / Android)与已备好的凭据清单(iOS 4 项 / Android 4 项)。
 * 主要操作:左栏按平台列出凭据(绿点 = 已备好,红点 = 缺失);右栏流水线逐段
 *   显示执行 / 跳过 / 中断与原因,底部给出目标发布物及其签名状态。
 * 预期结果:iOS 缺 Apple Developer 计划或签名凭据 → 签名中断,无 ipa;签名通过
 *   但缺 App Store Connect API key → 上传跳过(可改走 Xcode Organizer);Android
 *   缺任一签名项 → Gradle 照常产出未签名 AAB,上传中断;全部勾齐 → 全绿流水线。
 * 阅读主线:iOS 签名是构建的前置(失败即中断),Android 签名是构建的后置
 *   (缺了出未签名包);提交通道各有硬性凭据(API key / Play Console 账号)。
 * 边界:定性模拟,只对照课程「iOS 签名」「Android 签名」两节的配置要求判断,
 *   不校验凭据真伪、不运行 Xcode / Gradle;真实核对见 mobile-release-verification.md。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TargetPlatform = 'iOS' | 'Android';

export interface ExampleArgs {
  platform: TargetPlatform;
  prepared: string[];
}

export interface ExampleSnapshot {
  /** 读数:目标发布物与签名状态。 */
  artifact: string;
  /** 读数:签名路线或状态。 */
  signing: string;
  /** 读数:商店提交通道状态。 */
  submit: string;
  /** 读数:缺失凭据清单。 */
  missing: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

/** 流水线段落状态。 */
type StageStatus = 'done' | 'skipped' | 'blocked' | 'unsigned';

interface Stage {
  name: string;
  status: StageStatus;
  /** 原因或路线说明(一行)。 */
  note: string;
}

const STATUS_WORD: Record<StageStatus, string> = {
  done: '执行',
  skipped: '跳过',
  blocked: '中断',
  unsigned: '未签名',
};

/** 两个平台的凭据清单与流水线判定。 */

const IOS_PLAN = 'Apple Developer 计划';
const IOS_AUTO = 'Xcode 账号(自动签名)';
const IOS_MANUAL = '手动签名三件套';
const IOS_API_KEY = 'App Store Connect API key';

const AND_KEYSTORE = 'upload keystore(jks)';
const AND_PROPS = 'keystore.properties';
const AND_WIRING = 'signingConfig 接线';
const AND_PLAY = 'Play Console 账号';

const IOS_ITEMS = [IOS_PLAN, IOS_AUTO, IOS_MANUAL, IOS_API_KEY];
const ANDROID_ITEMS = [AND_KEYSTORE, AND_PROPS, AND_WIRING, AND_PLAY];

interface Pipeline {
  items: string[];
  stages: Stage[];
  /** 底部产物框:两行展示。 */
  artifactLines: [string, string];
  artifact: string;
  signing: string;
  submit: string;
  missing: string[];
}

function buildPipeline(platform: TargetPlatform, prepared: string[]): Pipeline {
  const has = (item: string): boolean => prepared.includes(item);

  if (platform === 'iOS') {
    const plan = has(IOS_PLAN);
    const auto = has(IOS_AUTO);
    const manual = has(IOS_MANUAL);
    const apiKey = has(IOS_API_KEY);
    // iOS 签名是构建的前置:计划 + (Xcode 账号 或 手动三件套)缺一即中断。
    const signed = plan && (auto || manual);

    const signingStage: Stage = !plan
      ? {
          name: '签名',
          status: 'blocked',
          note: '无付费计划:免费账号只能真机调试,签不出商店包',
        }
      : auto
        ? { name: '签名', status: 'done', note: '自动签名:Xcode 账号管理证书与 profile' }
        : manual
          ? { name: '签名', status: 'done', note: '手动签名:IOS_CERTIFICATE + IOS_MOBILE_PROVISION' }
          : { name: '签名', status: 'blocked', note: '缺 Xcode 账号或手动三件套,证书与 profile 无从获取' };

    const missing: string[] = [];
    if (!plan) {
      missing.push(IOS_PLAN);
    }
    if (plan && !auto && !manual) {
      missing.push(`${IOS_AUTO} 或 ${IOS_MANUAL}`);
    }
    if (signed && !apiKey) {
      missing.push(IOS_API_KEY);
    }

    return {
      items: IOS_ITEMS,
      stages: [
        {
          name: '前端构建 + Rust 交叉编译',
          status: 'done',
          note: 'iOS targets 见 6.1;默认 aarch64',
        },
        {
          name: 'Xcode Archive(xcodebuild)',
          status: 'done',
          note: 'gen/apple 壳工程;--export-method 决定导出方式',
        },
        signingStage,
        signed
          ? {
              name: '导出 ipa',
              status: 'done',
              note: 'gen/apple/build/arm64/<app-name>.ipa',
            }
          : { name: '导出 ipa', status: 'blocked', note: '签名未通过,无 ipa 产出' },
        signed && apiKey
          ? {
              name: 'altool 上传 → TestFlight',
              status: 'done',
              note: 'App Store Connect 接收,校验通过进 TestFlight',
            }
          : signed
            ? {
                name: 'altool 上传 → TestFlight',
                status: 'skipped',
                note: '缺 API key:可补三件套或走 Xcode Organizer',
              }
            : {
                name: 'altool 上传 → TestFlight',
                status: 'blocked',
                note: '前置签名未完成',
              },
      ],
      artifactLines: signed
        ? ['gen/apple/build/arm64/<app-name>.ipa', '已签名 · --export-method 决定渠道']
        : ['签名中断,无 ipa 产出', '补齐凭据后重新 build'],
      artifact: signed
        ? 'gen/apple/build/arm64/<app-name>.ipa(已签名)'
        : '无 —— 签名中断',
      signing: plan && auto
        ? '自动签名(Xcode 账号)'
        : plan && manual
          ? '手动签名(三件套)'
          : '签名中断',
      submit: signed && apiKey
        ? 'altool 上传 → TestFlight'
        : signed
          ? '跳过 · 可走 Xcode Organizer'
          : '阻断',
      missing,
    };
  }

  // Android:签名是构建的后置,三项配置缺一即出未签名包。
  const keystore = has(AND_KEYSTORE);
  const props = has(AND_PROPS);
  const wiring = has(AND_WIRING);
  const play = has(AND_PLAY);
  const signed = keystore && props && wiring;

  const missing: string[] = [];
  if (!keystore) {
    missing.push(AND_KEYSTORE);
  }
  if (!props) {
    missing.push(AND_PROPS);
  }
  if (!wiring) {
    missing.push(AND_WIRING);
  }
  if (signed && !play) {
    missing.push(AND_PLAY);
  }

  return {
    items: ANDROID_ITEMS,
    stages: [
      {
        name: '前端构建 + Rust 交叉编译',
        status: 'done',
        note: '默认 4 架构:aarch64 / armv7 / i686 / x86_64',
      },
      {
        name: 'Gradle release 构建',
        status: 'done',
        note: 'gen/android 壳工程;--aab 出商店格式',
      },
      signed
        ? {
            name: '签名(signingConfig)',
            status: 'done',
            note: 'keystore.properties → signingConfigs.release',
          }
        : {
            name: '签名(signingConfig)',
            status: 'unsigned',
            note: '配置未接齐:Gradle 照常出包,但不签名',
          },
      {
        name: '产出 AAB',
        status: signed ? 'done' : 'unsigned',
        note: signed
          ? 'gen/android/app/build/outputs/bundle/universalRelease/'
          : '同路径产物,但未签名 —— 不能上传商店',
      },
      signed && play
        ? {
            name: 'Play Console 上传',
            status: 'done',
            note: '可上传 · 首次须网页手动,建议启用 Play App Signing',
          }
        : signed
          ? { name: 'Play Console 上传', status: 'skipped', note: '缺 Play Console 开发者账号' }
          : { name: 'Play Console 上传', status: 'blocked', note: '未签名产物不能上传' },
    ],
    artifactLines: signed
      ? [
          '…/outputs/bundle/universalRelease/',
          'app-universal-release.aab · 已签名',
        ]
      : [
          'app-universal-release.aab',
          '未签名 —— 上传商店必被拒',
        ],
    artifact: signed
      ? 'gen/android/…/universalRelease/app-universal-release.aab(已签名)'
      : 'gen/android/…/universalRelease/app-universal-release.aab(未签名)',
    signing: signed ? 'release keystore' : '未签名',
    submit: signed && play
      ? 'Play Console(首传手动)'
      : signed
        ? '跳过 · 缺 Play Console 账号'
        : '阻断 · 未签名',
    missing,
  };
}

const DONE = '#15803d';
const DONE_BG = '#dcfce7';
const WARN = '#b45309';
const WARN_BG = '#fef3c7';
const FAIL = '#b91c1c';
const FAIL_BG = '#fee2e2';

const STATUS_COLOR: Record<StageStatus, string> = {
  done: DONE,
  skipped: WARN,
  blocked: FAIL,
  unsigned: FAIL,
};
const STATUS_BG: Record<StageStatus, string> = {
  done: DONE_BG,
  skipped: WARN_BG,
  blocked: FAIL_BG,
  unsigned: FAIL_BG,
};

const TEXT = '#172033';
const MUTED = '#334155';
const DIM = '#64748b';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

/** 按「、」边界把缺失清单折成最多两行,避免溢出面板。 */
function foldMissing(text: string, maxChars: number): [string, string] {
  if (text.length <= maxChars) {
    return [text, ''];
  }
  const limit = Math.ceil(text.length / 2);
  let splitAt = text.indexOf('、', limit);
  if (splitAt < 0) {
    splitAt = text.lastIndexOf('、');
  }
  if (splitAt < 0) {
    return [text.slice(0, maxChars) + '…', ''];
  }
  return [text.slice(0, splitAt), text.slice(splitAt + 1)];
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
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: ExampleArgs = {
    platform: 'iOS',
    prepared: [IOS_PLAN, IOS_AUTO, IOS_MANUAL, IOS_API_KEY],
  };

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = Math.max(470, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const pipeline = buildPipeline(current.platform, current.prepared);

    // ── 左栏:发布凭据清单 ──────────────────────────────────
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText(`发布凭据 · ${current.platform}`, 24, 24);
    ctx.fillStyle = MUTED;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('绿点 = 已备好', 150, 24);

    ctx.fillStyle = BOX_BG;
    roundRect(ctx, 24, 34, 300, height - 64, 6);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();

    let ly = 60;
    for (const item of pipeline.items) {
      const ready = current.prepared.includes(item);
      ctx.fillStyle = ready ? DONE : FAIL;
      ctx.beginPath();
      ctx.arc(42, ly - 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TEXT;
      ctx.font = `11px ${SANS}`;
      ctx.fillText(item, 52, ly - 2);
      const word = ready ? '已备好' : '缺失';
      ctx.fillStyle = ready ? DONE : FAIL;
      ctx.font = `600 10px ${SANS}`;
      ctx.fillText(word, 310 - ctx.measureText(word).width, ly - 2);
      ly += 26;
    }

    // 左栏底部:目标产物框。
    const boxTop = height - 128;
    ctx.strokeStyle = BOX_BORDER;
    ctx.beginPath();
    ctx.moveTo(36, boxTop);
    ctx.lineTo(312, boxTop);
    ctx.stroke();
    ctx.fillStyle = DIM;
    ctx.font = `600 10px ${SANS}`;
    ctx.fillText('目标产物', 36, boxTop + 18);
    ctx.fillStyle = TEXT;
    ctx.font = `10.5px ${MONO}`;
    pipeline.artifactLines.forEach((line, index) => {
      ctx.fillText(line, 36, boxTop + 38 + index * 16);
    });

    // ── 右栏:build → 签名 → 提交流水线 ─────────────────────
    const rx = 348;
    const rw = width - rx - 24;

    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('build → 签名 → 提交流水线', rx, 24);
    ctx.fillStyle = MUTED;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('每段标注执行 / 跳过 / 中断与原因', rx + 176, 24);

    ctx.fillStyle = BOX_BG;
    roundRect(ctx, rx, 34, rw, height - 64, 6);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();

    let sy = 62;
    for (const stage of pipeline.stages) {
      const word = STATUS_WORD[stage.status];
      ctx.fillStyle = STATUS_BG[stage.status];
      roundRect(ctx, rx + 14, sy - 14, 52, 20, 5);
      ctx.fill();
      ctx.strokeStyle = STATUS_COLOR[stage.status];
      ctx.stroke();
      ctx.fillStyle = STATUS_COLOR[stage.status];
      ctx.font = `600 11px ${SANS}`;
      ctx.fillText(
        word,
        rx + 40 - ctx.measureText(word).width / 2,
        sy,
      );

      ctx.fillStyle = stage.status === 'done' ? TEXT : STATUS_COLOR[stage.status];
      ctx.font = `600 11.5px ${SANS}`;
      ctx.fillText(stage.name, rx + 80, sy);

      ctx.fillStyle = MUTED;
      ctx.font = `10.5px ${SANS}`;
      ctx.fillText(stage.note, rx + 80, sy + 16);
      sy += 48;
    }

    // 右栏底部:缺失凭据读数(最多两行)。
    const missingText =
      pipeline.missing.length > 0 ? pipeline.missing.join('、') : '无 —— 可以提交';
    const missingLines = foldMissing(missingText, 40);
    ctx.strokeStyle = BOX_BORDER;
    ctx.beginPath();
    ctx.moveTo(rx + 14, height - 84);
    ctx.lineTo(rx + rw - 14, height - 84);
    ctx.stroke();
    ctx.fillStyle = DIM;
    ctx.font = `600 10px ${SANS}`;
    ctx.fillText('缺失凭据', rx + 14, height - 62);
    ctx.fillStyle = pipeline.missing.length > 0 ? FAIL : DONE;
    ctx.font = `10.5px ${SANS}`;
    ctx.fillText(missingLines[0], rx + 74, height - 62);
    if (missingLines[1]) {
      ctx.fillText(missingLines[1], rx + 74, height - 46);
    }

    emit({
      artifact: pipeline.artifact,
      signing: pipeline.signing,
      submit: pipeline.submit,
      missing: pipeline.missing.length > 0 ? pipeline.missing.join('、') : '无',
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
