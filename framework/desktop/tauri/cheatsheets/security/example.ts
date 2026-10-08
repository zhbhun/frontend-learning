/**
 * 范例介绍:模拟「一份安全配置 × 一类攻击 → 攻击链在防线上的判定结果」。
 * 输入:CSP 三档(未配置 / 宽松带 CDN / 收紧仅 self)、withGlobalTauri 开关、
 *   capability 是否授权 remote 域、四类攻击(内联脚本注入 / CDN 脚本注入 /
 *   远程页面调 IPC / fs 越出应用目录)。
 * 主要操作:左栏按当前开关画出 tauri.conf.json 与 capabilities 的关键片段,
 *   右栏重放该攻击要连过的防线(① CSP → ② IPC 授权(ACL) → ③ scope),
 *   每道门给出拦截/放行与依据,读数汇总结论与拦截层。
 * 预期结果:未配置 CSP 时脚本类攻击直接得手;宽松白名单里的 CDN 域照常放行;
 *   收紧后脚本停在 ①;远程页面默认零授权,勾开 remote 后按权限并集放行;
 *   fs 越权路径停在 ③(命令授权不等于资源可达)。
 * 阅读主线:攻击停在哪道门,取决于配置把哪道门收紧——防线是串联的,缺一道就漏。
 * 边界:演示应用的 capabilities 固定为 main 窗口 + core:default + fs:default,
 *   不模拟每条命令的完整 ACL 展开;devCsp、freezePrototype、isolation 不进本模拟。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type CspMode = '未配置' | '宽松(带 CDN)' | '收紧(仅 self)';

export type AttackKind =
  | '内联脚本注入'
  | 'CDN 脚本注入'
  | '远程页面调 IPC'
  | 'fs 越出应用目录';

export interface ExampleArgs {
  csp: CspMode;
  withGlobalTauri: boolean;
  remoteGrant: boolean;
  attack: AttackKind;
}

export interface ExampleSnapshot {
  /** 读数:模拟的攻击类型。 */
  attack: string;
  /** 读数:已拦截 / 得手,附拦截层。 */
  result: string;
  /** 读数:结论一句话。 */
  summary: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

/** 防线门的名称(与正文「攻击链判定」一一对应)。 */
const GATE_CSP = '① CSP 加载执行';
const GATE_ACL = '② IPC 授权(ACL)';
const GATE_SCOPE = '③ scope 资源范围';

type GateState = '拦截' | '放行' | '未到达' | '不适用';

interface GateStep {
  gate: string;
  state: GateState;
  /** 依据一句话。 */
  note: string;
}

interface Decision {
  steps: GateStep[];
  result: '已拦截' | '得手';
  /** 拦截发生在哪道防线;得手时说明攻击推进到了哪里。 */
  layer: string;
  summary: string;
}

function decide(args: ExampleArgs): Decision {
  const { csp, withGlobalTauri, remoteGrant, attack } = args;

  // —— 脚本类攻击:第一道门是 CSP 的加载策略 ————————————————
  if (attack === '内联脚本注入' || attack === 'CDN 脚本注入') {
    const isCdn = attack === 'CDN 脚本注入';
    let cspState: GateState;
    let cspNote: string;
    if (csp === '未配置') {
      cspState = '放行';
      cspNote = '未配置 csp,页面没有任何加载策略';
    } else if (isCdn && csp === '宽松(带 CDN)') {
      cspState = '放行';
      cspNote = 'cdn.example.com 就在 script-src 白名单里——防线移交给了那个域';
    } else {
      cspState = '拦截';
      cspNote = '打包脚本靠自动注入的 nonce/hash 放行;这个脚本没有,不执行';
    }

    if (cspState === '拦截') {
      return {
        steps: [
          { gate: GATE_CSP, state: cspState, note: cspNote },
          { gate: GATE_ACL, state: '未到达', note: '脚本没执行,走不到 IPC' },
          { gate: GATE_SCOPE, state: '未到达', note: '' },
        ],
        result: '已拦截',
        layer: 'CSP',
        summary: 'CSP 把脚本挡在执行之前——最便宜的一道门,拦住就不需要后面的门。',
      };
    }

    // 脚本执行了:IPC 桥对页面开放,伤害上限由 ②③ 决定。
    return {
      steps: [
        { gate: GATE_CSP, state: '放行', note: cspNote },
        {
          gate: GATE_ACL,
          state: '放行',
          note: withGlobalTauri
            ? 'withGlobalTauri=true:全套 API 挂在 window.__TAURI__,脚本直接调用'
            : 'IPC 桥对页面开放;能调到的命令仍由 capability 与 scope 决定',
        },
        {
          gate: GATE_SCOPE,
          state: '未到达',
          note: 'scope 只能限制伤害,拦不住已执行的脚本',
        },
      ],
      result: '得手',
      layer: '脚本已执行',
      summary: withGlobalTauri
        ? '得手:注入脚本一步拿到全套 Tauri API——withGlobalTauri 主动降低了利用门槛。'
        : '得手:脚本可在页面内执行;能调到什么,由 ② ACL 与 ③ scope 事后兜底。',
    };
  }

  // —— 远程页面调 IPC:CSP 不适用,关键门是 ACL 的 remote 匹配 ——————
  if (attack === '远程页面调 IPC') {
    const acl: GateStep = remoteGrant
      ? {
          gate: GATE_ACL,
          state: '放行',
          note: 'remote.urls 命中 partner.example,按权限并集判定',
        }
      : {
          gate: GATE_ACL,
          state: '拦截',
          note: 'capability 默认 local:true;remote.urls 未授权该域 → 零授权',
        };
    const blocked = !remoteGrant;
    return {
      steps: [
        {
          gate: GATE_CSP,
          state: '不适用',
          note: '远程页面按它自己的来源加载,本地 CSP 管不到',
        },
        acl,
        {
          gate: GATE_SCOPE,
          state: '未到达',
          note: blocked ? '' : '已授权命令可及的资源,由各自 scope 决定',
        },
      ],
      result: blocked ? '已拦截' : '得手',
      layer: blocked ? 'ACL' : 'ACL 放行',
      summary: blocked
        ? '默认拒绝:远程页面什么也调不到。要授权,URL 与命令都得逐条最小化。'
        : '得手:远程页面拿到了 capability 授权的命令(fs:default → 应用目录可读)。',
    };
  }

  // —— fs 越出应用目录:命令授权放行,资源范围拦截 ————————————
  return {
    steps: [
      {
        gate: GATE_CSP,
        state: '不适用',
        note: '页面内的正常 invoke,不经过加载策略',
      },
      {
        gate: GATE_ACL,
        state: '放行',
        note: 'main 被 windows 覆盖,fs:default 含 read_text_file',
      },
      {
        gate: GATE_SCOPE,
        state: '拦截',
        note: 'fs:default 只放应用专属目录($APPDATA 等),$DOCUMENT 在外 → path not allowed',
      },
    ],
    result: '已拦截',
    layer: 'scope',
    summary: '命令授权不等于资源可达——scope 是资源那一层的门;写宽了这层就形同虚设。',
  };
}

// ── 画布配色与字体(与权限与能力课同一套视觉语言) ──────────────
const DIM = '#64748b';
const TEXT = '#172033';
const PUNC = '#94a3b8';
const KEY = '#475569';
const ALERT = '#b45309';
const RED = '#dc2626';
const GOOD = '#15803d';
const GOOD_BG = '#dcfce7';
const BAD = '#b91c1c';
const BAD_BG = '#fee2e2';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

/** 一行 = 若干 [文本, 颜色] 片段。 */
type Tok = [string, string];

const P = (t: string): Tok => [t, PUNC];
const K = (t: string): Tok => [t, KEY];
const S = (t: string): Tok => [t, TEXT];
const D = (t: string): Tok => [t, DIM];

/** tauri.conf.json 关键片段(csp 三档 + withGlobalTauri)。 */
function confLines(csp: CspMode, withGlobalTauri: boolean): Tok[][] {
  const lines: Tok[][] = [];
  lines.push([D('// tauri.conf.json')]);
  lines.push([P('"app": {')]);
  lines.push([
    P('  '),
    K('"withGlobalTauri"'),
    P(': '),
    [String(withGlobalTauri), withGlobalTauri ? ALERT : TEXT] as Tok,
    P(','),
  ]);
  lines.push([P('  '), K('"security"'), P(': {')]);
  if (csp === '未配置') {
    lines.push([P('    '), D('// csp 未设置 —— 页面没有加载策略')]);
  } else if (csp === '宽松(带 CDN)') {
    lines.push([P('    '), K('"csp"'), P(': {')]);
    lines.push([P('      '), K('"default-src"'), P(': '), S(`"'self'"`), P(',')]);
    lines.push([
      P('      '),
      K('"script-src"'),
      P(': '),
      S(`"'self' https://cdn.example.com"`),
      P(','),
    ]);
    lines.push([P('      '), K('"connect-src"'), P(': '), S(`"ipc: http://ipc.localhost"`)]);
    lines.push([P('    }')]);
  } else {
    lines.push([P('    '), K('"csp"'), P(': {')]);
    lines.push([P('      '), K('"default-src"'), P(': '), S(`"'self'"`), P(',')]);
    lines.push([P('      '), K('"connect-src"'), P(': '), S(`"ipc: http://ipc.localhost"`)]);
    lines.push([P('      '), D('// 构建时自动注入 nonce/hash,')]);
    lines.push([P('      '), D('// 只放行自家脚本与样式')]);
    lines.push([P('    }')]);
  }
  lines.push([P('  }')]);
  lines.push([P('}')]);
  return lines;
}

/** capabilities/default.json 关键片段(remote 授权随开关变化)。 */
function capLines(remoteGrant: boolean): Tok[][] {
  const lines: Tok[][] = [];
  lines.push([D('// capabilities/default.json')]);
  lines.push([P('{')]);
  lines.push([P('  '), K('"windows"'), P(': '), S('["main"]'), P(',')]);
  lines.push([
    P('  '),
    K('"permissions"'),
    P(': '),
    S('["core:default", "fs:default"]'),
    P(','),
  ]);
  if (remoteGrant) {
    lines.push([P('  '), K('"remote"'), P(': {')]);
    lines.push([
      P('    '),
      K('"urls"'),
      P(': '),
      ['["https://partner.example"]', ALERT] as Tok,
    ]);
    lines.push([P('  }')]);
  } else {
    lines.push([P('  '), D('// remote 未授权(默认 local:true)')]);
  }
  lines.push([P('}')]);
  return lines;
}

/** 每类攻击的载荷文本(手动折行,适配右栏宽度)。 */
function payloadLines(attack: AttackKind): string[] {
  switch (attack) {
    case '内联脚本注入':
      return ['<script>steal(data)</script>', '<!-- 页面里被注入的内联脚本 -->'];
    case 'CDN 脚本注入':
      return ['<script src="https://cdn.example.com/x.js">', '<!-- 白名单域上的脚本 -->'];
    case '远程页面调 IPC':
      return ['partner.example 页面调用:', `invoke('plugin:fs|read_text_file')`];
    case 'fs 越出应用目录':
      return [`invoke('plugin:fs|read_text_file', {`, `  path: '$DOCUMENT/密码.txt' })`];
  }
}

const STATE_COLOR: Record<GateState, string> = {
  拦截: GOOD,
  放行: RED,
  未到达: DIM,
  不适用: DIM,
};

/** 按像素宽度折行(中英文混排,逐字符累计即可)。 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (ctx.measureText(text).width <= maxWidth) {
    return [text];
  }
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
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

/** 画一个多行 token 块,返回块底部 y。 */
function drawTokBlock(
  ctx: CanvasRenderingContext2D,
  lines: Tok[][],
  x: number,
  y: number,
  w: number,
): number {
  const boxH = lines.length * 17 + 14;
  ctx.fillStyle = BOX_BG;
  roundRect(ctx, x, y, w, boxH, 6);
  ctx.fill();
  ctx.strokeStyle = BOX_BORDER;
  ctx.stroke();
  let ly = y + 20;
  for (const toks of lines) {
    let lx = x + 10;
    for (const [text, color] of toks) {
      ctx.fillStyle = color;
      ctx.font = `11px ${MONO}`;
      ctx.fillText(text, lx, ly);
      lx += ctx.measureText(text).width;
    }
    ly += 17;
  }
  return y + boxH;
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
    csp: '收紧(仅 self)',
    withGlobalTauri: false,
    remoteGrant: false,
    attack: '内联脚本注入',
  };

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(760, size.width);
    const height = Math.max(450, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const decision = decide(current);

    // ── 左栏:当前安全配置 ──────────────────────────────────
    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('当前安全配置', 24, 24);

    const lw = 372;
    const confBottom = drawTokBlock(
      ctx,
      confLines(current.csp, current.withGlobalTauri),
      24,
      34,
      lw,
    );
    const capBottom = drawTokBlock(
      ctx,
      capLines(current.remoteGrant),
      24,
      confBottom + 14,
      lw,
    );

    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('演示应用固定:main 窗口 + core:default + fs:default。', 24, capBottom + 24);

    // ── 右栏:攻击链重放 ────────────────────────────────────
    const rx = 424;
    const rw = width - rx - 24;
    const noteWidth = rw - 14;

    ctx.fillStyle = DIM;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText('攻击链重放', rx, 24);

    ctx.fillStyle = DIM;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('防线:① CSP → ② ACL → ③ scope', rx, 40);

    // 攻击载荷。
    const payload = payloadLines(current.attack);
    const payloadH = payload.length * 17 + 14;
    ctx.fillStyle = BOX_BG;
    roundRect(ctx, rx, 52, rw, payloadH, 6);
    ctx.fill();
    ctx.strokeStyle = BOX_BORDER;
    ctx.stroke();
    let py = 52 + 20;
    for (const line of payload) {
      ctx.fillStyle = TEXT;
      ctx.font = `11px ${MONO}`;
      ctx.fillText(line, rx + 10, py);
      py += 17;
    }

    // 防线判定:每道门一行状态 + 折行的依据。
    let gy = 52 + payloadH + 20;
    for (const step of decision.steps) {
      ctx.fillStyle = TEXT;
      ctx.font = `600 12px ${SANS}`;
      ctx.fillText(step.gate, rx, gy);
      const gateW = ctx.measureText(step.gate).width;
      ctx.fillStyle = STATE_COLOR[step.state];
      ctx.fillText(`· ${step.state}`, rx + 8 + gateW, gy);
      gy += 18;
      if (step.note) {
        ctx.font = `11px ${SANS}`;
        for (const line of wrapText(ctx, step.note, noteWidth)) {
          ctx.fillStyle = DIM;
          ctx.fillText(line, rx + 14, gy);
          gy += 15;
        }
      }
      gy += 10;
    }

    // 攻击结果徽标。
    const blocked = decision.result === '已拦截';
    const badge = blocked
      ? `攻击结果:已拦截 · 拦截在 ${decision.layer}`
      : `攻击结果:得手(${decision.layer})`;
    ctx.fillStyle = blocked ? GOOD_BG : BAD_BG;
    roundRect(ctx, rx, gy, rw, 26, 6);
    ctx.fill();
    ctx.strokeStyle = blocked ? GOOD : BAD;
    ctx.stroke();
    ctx.fillStyle = blocked ? GOOD : BAD;
    ctx.font = `600 12px ${SANS}`;
    ctx.fillText(`● ${badge}`, rx + 12, gy + 17);

    // 结论(最多两行)。
    ctx.font = `11px ${SANS}`;
    let sy = gy + 46;
    for (const line of wrapText(ctx, decision.summary, rw).slice(0, 2)) {
      ctx.fillStyle = DIM;
      ctx.fillText(line, rx, sy);
      sy += 15;
    }

    emit({
      attack: current.attack,
      result: blocked ? `已拦截(在 ${decision.layer})` : `得手(${decision.layer})`,
      summary: decision.summary,
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
