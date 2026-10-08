/**
 * 范例介绍:演示「平台 + 签名凭据状态 → tauri build 流水线中签名/公证环节的走向」。
 * 输入:凭据场景(macOS 5 个、Windows 4 个,选项清单见 SCENARIOS)。
 * 主要操作:按所选场景画出该平台的签名流水线,每个环节一行:状态徽标(执行/跳过/中断)、
 *   环节名、使用的工具与一行原因;读数输出场景名、产物信任状态、用户侧结果与关键原因。
 * 预期结果:macOS 凭据齐全时全流程通过;缺公证凭据只警告跳过;Apple ID 缺 APPLE_TEAM_ID
 *   在公证环节中断;ad-hoc 跳过公证与 DMG 签名。Windows 的 certificateThumbprint 路线
 *   只在 Windows 主机生效,跨编译必须改用 signCommand。
 * 阅读主线:Tauri 不生产信任,只搬运凭据——配什么签什么,缺什么跳过并警告,错什么当场中断。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

const TEXT = '#172033';
const DIM = '#64748b';
const PALE = '#cbd5e1';
const PASS = '#16a34a';
const FAIL = '#dc2626';
const FAIL_TEXT = '#b91c1c';

/** 单个流水线环节的走向:pass 执行、skip 跳过(警告后继续)、fail 中断构建。 */
export type StageStatus = 'pass' | 'skip' | 'fail';

export interface Stage {
  /** 环节名。 */
  title: string;
  /** 使用的工具或执行者。 */
  tool: string;
  status: StageStatus;
  /** 一行原因或说明。 */
  note: string;
}

export interface ScenarioSpec {
  /** 场景全名,同时是 Controls 里「凭据场景」的选项。 */
  label: string;
  /** 读数:产物的信任状态。 */
  artifactState: string;
  /** 读数:用户侧结果。 */
  userOutcome: string;
  /** 读数:关键原因。 */
  keyReason: string;
  stages: Stage[];
}

/* macOS 流水线:构建 → codesign 由内向外签名 → notarytool 公证 → stapler 钉票据
   → 生成 DMG → 签名 DMG。公证发生在 DMG 之前,DMG 不单独公证。 */
function macStages(
  sign: Stage,
  notarize: Stage,
  staple: Stage,
  dmgSign: Stage,
): Stage[] {
  return [
    {
      title: '构建 .app',
      tool: 'bundler',
      status: 'pass',
      note: 'Rust 编译 + 前端产物入包',
    },
    sign,
    notarize,
    staple,
    {
      title: '生成 DMG',
      tool: 'bundler',
      status: 'pass',
      note: '从 .app 打包磁盘映像',
    },
    dmgSign,
  ];
}

/* Windows 流水线:构建主二进制 → 签主二进制 → 打包安装包 → 签安装包。 */
function winStages(sign: Stage, bundle: Stage, installerSign: Stage): Stage[] {
  return [
    {
      title: '构建主二进制',
      tool: 'cargo build',
      status: 'pass',
      note: 'release 目标编译',
    },
    sign,
    bundle,
    installerSign,
  ];
}

const SIGNED_BUNDLE: Stage = {
  title: '打包安装包',
  tool: 'NSIS / WiX',
  status: 'pass',
  note: '包内 DLL、资源、卸载器一并签名',
};

const PLAIN_BUNDLE: Stage = {
  title: '打包安装包',
  tool: 'NSIS / WiX',
  status: 'pass',
  note: '照常打包,产物无签名',
};

/* 九个场景:macOS 五个、Windows 四个,覆盖「配什么签什么 / 缺什么跳过 / 错什么中断」。 */
const SCENARIO_LIST = [
  {
    label: 'macOS · 未配置',
    artifactState: '未签名',
    userOutcome: '本机可运行;浏览器下载后提示「已损坏,无法打开」',
    keyReason: '缺签名身份:整个签名环节被跳过',
    stages: macStages(
      {
        title: '签名 .app',
        tool: 'codesign',
        status: 'skip',
        note: '未配置 signingIdentity / APPLE_SIGNING_IDENTITY',
      },
      {
        title: '公证 .app',
        tool: 'xcrun notarytool',
        status: 'skip',
        note: '无公证凭据,整个环节跳过',
      },
      {
        title: '钉入公证票据',
        tool: 'xcrun stapler',
        status: 'skip',
        note: '无公证结果可钉',
      },
      {
        title: '签名 DMG',
        tool: 'codesign',
        status: 'skip',
        note: '无身份可签',
      },
    ),
  },
  {
    label: 'macOS · 仅签名身份',
    artifactState: '已签名(Developer ID)· 未公证',
    userOutcome:
      '首次打开提示「无法验证开发者」,右键打开或在「隐私与安全性」放行',
    keyReason: '公证凭据是独立输入:有身份不等于会公证',
    stages: macStages(
      {
        title: '签名 .app',
        tool: 'codesign',
        status: 'pass',
        note: 'Developer ID,由内向外签名',
      },
      {
        title: '公证 .app',
        tool: 'xcrun notarytool',
        status: 'skip',
        note: '未配置公证凭据,警告 skipping app notarization',
      },
      {
        title: '钉入公证票据',
        tool: 'xcrun stapler',
        status: 'skip',
        note: '无公证结果可钉',
      },
      {
        title: '签名 DMG',
        tool: 'codesign',
        status: 'pass',
        note: 'DMG 用同一身份签名',
      },
    ),
  },
  {
    label: 'macOS · 签名身份 + 公证凭据',
    artifactState: '已签名 · 已公证 · 票据已钉入',
    userOutcome: '浏览器下载后可直接打开,无 Gatekeeper 拦截',
    keyReason: '全流程通过——这是可分发状态',
    stages: macStages(
      {
        title: '签名 .app',
        tool: 'codesign',
        status: 'pass',
        note: 'Developer ID,由内向外签名',
      },
      {
        title: '公证 .app',
        tool: 'xcrun notarytool',
        status: 'pass',
        note: 'submit --wait 等待 Apple 扫描结果',
      },
      {
        title: '钉入公证票据',
        tool: 'xcrun stapler',
        status: 'pass',
        note: '票据钉进 .app,离线可验',
      },
      {
        title: '签名 DMG',
        tool: 'codesign',
        status: 'pass',
        note: 'DMG 用同一身份签名',
      },
    ),
  },
  {
    label: 'macOS · ad-hoc("-")',
    artifactState: 'ad-hoc 签名',
    userOutcome: '本机(Apple Silicon)可运行;分发后需在「隐私与安全性」放行',
    keyReason: 'ad-hoc 只满足「必须有签名」,不建立信任',
    stages: macStages(
      {
        title: '签名 .app',
        tool: 'codesign',
        status: 'pass',
        note: '伪身份「-」,不携带发布者信息',
      },
      {
        title: '公证 .app',
        tool: 'xcrun notarytool',
        status: 'skip',
        note: 'ad-hoc 无法公证',
      },
      {
        title: '钉入公证票据',
        tool: 'xcrun stapler',
        status: 'skip',
        note: '无公证结果可钉',
      },
      {
        title: '签名 DMG',
        tool: 'codesign',
        status: 'skip',
        note: '跳过 ad-hoc 的 DMG 自签',
      },
    ),
  },
  {
    label: 'macOS · Apple ID 缺 APPLE_TEAM_ID',
    artifactState: '无产物(构建在公证环节失败)',
    userOutcome: '终端报错,tauri build 非零退出',
    keyReason: 'Apple ID 路线三件套缺一不可;API key 路线不受影响',
    stages: macStages(
      {
        title: '签名 .app',
        tool: 'codesign',
        status: 'pass',
        note: 'Developer ID,由内向外签名',
      },
      {
        title: '公证 .app',
        tool: 'xcrun notarytool',
        status: 'fail',
        note: 'APPLE_ID + APPLE_PASSWORD 缺 APPLE_TEAM_ID → MissingTeamId',
      },
      {
        title: '钉入公证票据',
        tool: 'xcrun stapler',
        status: 'skip',
        note: '公证中断,未执行',
      },
      {
        title: '签名 DMG',
        tool: 'codesign',
        status: 'skip',
        note: '公证中断,未执行',
      },
    ),
  },
  {
    label: 'Windows · 未配置',
    artifactState: '未签名',
    userOutcome: 'SmartScreen 提示「Windows 已保护你的电脑」,需「更多信息 → 仍要运行」',
    keyReason: '缺证书与签名配置,MSI/NSIS 产物同样无签名',
    stages: winStages(
      {
        title: '签名主二进制',
        tool: 'signtool / signCommand',
        status: 'skip',
        note: '未配置 certificateThumbprint / signCommand',
      },
      PLAIN_BUNDLE,
      {
        title: '签名安装包',
        tool: 'signtool / signCommand',
        status: 'skip',
        note: '同主二进制一起跳过',
      },
    ),
  },
  {
    label: 'Windows · certificateThumbprint',
    artifactState: '已签名(Authenticode)',
    userOutcome: '发布者已验证;SmartScreen 仍看信誉,但不再是「未知发布者」',
    keyReason: '全流程通过——仅限 Windows 主机',
    stages: winStages(
      {
        title: '签名主二进制',
        tool: 'signtool',
        status: 'pass',
        note: '证书取自证书商店 Cert:\\CurrentUser\\My',
      },
      SIGNED_BUNDLE,
      {
        title: '签名安装包',
        tool: 'signtool',
        status: 'pass',
        note: 'digestAlgorithm + timestampUrl 加时间戳',
      },
    ),
  },
  {
    label: 'Windows · signCommand',
    artifactState: '已签名(自定义工具)',
    userOutcome: '与 thumbprint 路线一致;跨编译也可用',
    keyReason: '全流程通过——工具不限 signtool',
    stages: winStages(
      {
        title: '签名主二进制',
        tool: 'signCommand',
        status: 'pass',
        note: '自定义命令,%1 = 待签文件路径',
      },
      SIGNED_BUNDLE,
      {
        title: '签名安装包',
        tool: 'signCommand',
        status: 'pass',
        note: '每个待签文件调用一次命令',
      },
    ),
  },
  {
    label: 'Windows · 跨编译 + certificateThumbprint',
    artifactState: '未签名(构建本身不失败)',
    userOutcome: '与未配置相同:SmartScreen 拦截',
    keyReason: '跨编译必须改用 signCommand',
    stages: winStages(
      {
        title: '签名主二进制',
        tool: 'signtool',
        status: 'skip',
        note: '默认签名仅支持 Windows 主机,CLI 警告后跳过',
      },
      PLAIN_BUNDLE,
      {
        title: '签名安装包',
        tool: 'signtool',
        status: 'skip',
        note: '同主二进制一起跳过',
      },
    ),
  },
] as const satisfies readonly ScenarioSpec[];

export const SCENARIOS: readonly ScenarioSpec[] = SCENARIO_LIST;

export type ScenarioLabel = (typeof SCENARIO_LIST)[number]['label'];

const DEFAULT_SCENARIO: ScenarioLabel = 'macOS · 签名身份 + 公证凭据';

export interface ExampleArgs {
  scenario: ScenarioLabel;
}

export interface ExampleSnapshot {
  scenarioLabel: string;
  artifactState: string;
  userOutcome: string;
  keyReason: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

/* 状态徽标:绿底白勾(执行)、浅底灰杠(跳过)、红底白叉(中断)。 */
function drawMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  status: StageStatus,
): void {
  context.beginPath();
  context.arc(x, y, 8, 0, Math.PI * 2);
  if (status === 'pass') {
    context.fillStyle = PASS;
    context.fill();
    context.strokeStyle = '#ffffff';
    context.lineCap = 'round';
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(x - 3.4, y + 0.2);
    context.lineTo(x - 1, y + 2.8);
    context.lineTo(x + 3.6, y - 2.6);
    context.stroke();
  } else if (status === 'skip') {
    context.fillStyle = '#f1f5f9';
    context.fill();
    context.strokeStyle = PALE;
    context.lineWidth = 1.4;
    context.stroke();
    context.strokeStyle = '#94a3b8';
    context.lineCap = 'round';
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(x - 3.4, y);
    context.lineTo(x + 3.4, y);
    context.stroke();
  } else {
    context.fillStyle = FAIL;
    context.fill();
    context.strokeStyle = '#ffffff';
    context.lineCap = 'round';
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(x - 3, y - 3);
    context.lineTo(x + 3, y + 3);
    context.moveTo(x + 3, y - 3);
    context.lineTo(x - 3, y + 3);
    context.stroke();
  }
  /* 复位描边状态,避免影响后续绘制。 */
  context.lineWidth = 1;
  context.lineCap = 'butt';
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

  let current: ExampleArgs = { scenario: DEFAULT_SCENARIO };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const spec =
      SCENARIO_LIST.find((item) => item.label === current.scenario) ??
      SCENARIO_LIST[2];
    const height = Math.max(348, 66 + spec.stages.length * 46 + 20);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';
    drawingContext.lineWidth = 1;

    const platform = spec.label.startsWith('macOS') ? 'macOS' : 'Windows';
    drawingContext.fillStyle = TEXT;
    drawingContext.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `tauri build · ${platform} 签名流水线(模拟)`,
      24,
      34,
    );

    spec.stages.forEach((stage, index) => {
      const y = 66 + index * 46;

      drawMark(drawingContext, 32, y + 4, stage.status);

      drawingContext.fillStyle = TEXT;
      drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(stage.title, 50, y + 9);

      drawingContext.fillStyle = DIM;
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.textAlign = 'right';
      drawingContext.fillText(stage.tool, width - 24, y + 9);
      drawingContext.textAlign = 'left';

      drawingContext.fillStyle = stage.status === 'fail' ? FAIL_TEXT : DIM;
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(stage.note, 50, y + 27);
    });

    emit({
      scenarioLabel: spec.label,
      artifactState: spec.artifactState,
      userOutcome: spec.userOutcome,
      keyReason: spec.keyReason,
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
