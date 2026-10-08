/**
 * 范例介绍:自定义插件的「名字推导 + 命令调用链路」演示。
 * 输入:插件短名(pluginName)、命令名(commandName)、前端包命名风格(jsPackage)。
 * 操作:在 Controls 里改短名与命令名,读数与链路图同步变化;短名含下划线或命令名不是 snake_case 时标红。
 * 预期:crate 名、Rust 标识、npm 包名、权限前缀、自动生成权限、命令通道全部由短名推导;
 *      链路图展示前端调用经 ACL(allow-<命令>)路由到 Rust 命令,权限由 build.rs 自动生成、default.toml 收进 default 集。
 * 阅读主线:先核对读数里的名字推导,再对照链路图看权限来源与新增命令时的三处同步点。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

const PLUGIN_NAME_RE = /^[a-z][a-z0-9-]*$/;
const COMMAND_NAME_RE = /^[a-z][a-z0-9_]*$/;

export interface ExampleOptions {
  pluginName: string;
  commandName: string;
  jsPackage: 'default' | 'scoped';
}

export interface ExampleSnapshot {
  crateName: string;
  rustCrateIdent: string;
  jsPackageName: string;
  channel: string;
  autoPermissions: string;
  statusLabel: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

interface Derived {
  name: string;
  command: string;
  crateName: string;
  rustCrateIdent: string;
  jsPackageName: string;
  channel: string;
  autoPermissions: string;
  nameValid: boolean;
  commandValid: boolean;
  statusLabel: string;
}

function derive(options: ExampleOptions): Derived {
  const name = options.pluginName.trim();
  const command = options.commandName.trim();
  const crateName = `tauri-plugin-${name}`;
  const jsPackageName =
    options.jsPackage === 'scoped'
      ? `@your-scope/plugin-${name}`
      : `tauri-plugin-${name}-api`;
  const nameValid = PLUGIN_NAME_RE.test(name);
  const commandValid = COMMAND_NAME_RE.test(command);

  let statusLabel = '合法';
  if (!nameValid && !commandValid) {
    statusLabel = '短名与命令名都不合法';
  } else if (!nameValid) {
    statusLabel = '短名不合法:小写字母开头,只含小写字母/数字/连字符';
  } else if (!commandValid) {
    statusLabel = '命令名需 snake_case:只含小写字母/数字/下划线';
  }

  return {
    name,
    command,
    crateName,
    rustCrateIdent: `tauri_plugin_${name}`,
    jsPackageName,
    channel: `plugin:${name}|${command}`,
    autoPermissions: `allow-${command} / deny-${command}`,
    nameValid,
    commandValid,
    statusLabel,
  };
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

  const SANS = 'ui-sans-serif, system-ui, sans-serif';
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  const COLOR_TEXT = '#172033';
  const COLOR_MUTED = '#475569';
  const COLOR_DANGER = '#dc2626';
  const COLOR_ARROW = '#94a3b8';

  let current: ExampleOptions = {
    pluginName: 'say',
    commandName: 'ping',
    jsPackage: 'default',
  };

  function fitText(text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let fitted = text;
    while (
      fitted.length > 1 &&
      ctx.measureText(`${fitted}…`).width > maxWidth
    ) {
      fitted = fitted.slice(0, -1);
    }
    return `${fitted}…`;
  }

  type BoxStyle = 'plain' | 'acl' | 'auto';

  function drawBox(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    lines: string[],
    style: BoxStyle,
    invalid: boolean,
  ): void {
    const fill =
      style === 'acl' ? '#e3ebff' : style === 'auto' ? '#f8fafc' : '#f1f5f9';
    const border =
      style === 'acl' ? '#4f7cff' : style === 'auto' ? '#94a3b8' : '#cbd5e1';

    if (style === 'auto') {
      ctx.setLineDash([4, 3]);
    }
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.setLineDash([]);

    ctx.fillStyle = invalid ? COLOR_DANGER : COLOR_TEXT;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText(fitText(label, w - 16), x + 8, y + 18);

    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = invalid ? COLOR_DANGER : COLOR_MUTED;
    lines.forEach((line, index) => {
      ctx.fillText(fitText(line, w - 16), x + 8, y + 36 + index * 16);
    });
  }

  function drawArrow(x1: number, y1: number, x2: number, y2: number): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = 8;

    ctx.strokeStyle = COLOR_ARROW;
    ctx.fillStyle = COLOR_ARROW;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(
      x2 - Math.cos(angle) * headLength,
      y2 - Math.sin(angle) * headLength,
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - Math.cos(angle - Math.PI / 6) * headLength * 1.6,
      y2 - Math.sin(angle - Math.PI / 6) * headLength * 1.6,
    );
    ctx.lineTo(
      x2 - Math.cos(angle + Math.PI / 6) * headLength * 1.6,
      y2 - Math.sin(angle + Math.PI / 6) * headLength * 1.6,
    );
    ctx.closePath();
    ctx.fill();
  }

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(440, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const d = derive(current);

    ctx.fillStyle = d.nameValid && d.commandValid ? COLOR_TEXT : COLOR_DANGER;
    ctx.font = `600 16px ${SANS}`;
    ctx.fillText('一个自定义插件的调用链路与权限来源', 48, 44);

    ctx.font = `12px ${MONO}`;
    if (d.nameValid && d.commandValid) {
      ctx.fillStyle = COLOR_MUTED;
      ctx.fillText(
        fitText(
          `${d.crateName} · ${d.jsPackageName} · 权限前缀 ${d.name}:`,
          width - 96,
        ),
        48,
        66,
      );
    } else {
      ctx.fillStyle = COLOR_DANGER;
      ctx.fillText(fitText(d.statusLabel, width - 96), 48, 66);
    }

    const margin = 48;
    const gap = 14;
    const boxW = (width - margin * 2 - gap * 3) / 4;
    const boxX = (index: number) => margin + index * (boxW + gap);

    // 第一行:一次前端调用的完整路由(左 → 右)
    const rowAY = 96;
    const rowAH = 76;
    const chainMidY = rowAY + rowAH / 2;

    drawBox(
      boxX(0),
      rowAY,
      boxW,
      rowAH,
      '应用前端',
      [`await ${d.command}()`, d.jsPackageName],
      'plain',
      false,
    );
    drawBox(
      boxX(1),
      rowAY,
      boxW,
      rowAH,
      'ACL 校验',
      [`${d.name}:allow-${d.command}`, 'default 集命中则放行'],
      'acl',
      !d.commandValid,
    );
    drawBox(
      boxX(2),
      rowAY,
      boxW,
      rowAH,
      '命令注册 lib.rs',
      [`Builder::new("${d.name}")`, 'invoke_handler![…]'],
      'plain',
      false,
    );
    drawBox(
      boxX(3),
      rowAY,
      boxW,
      rowAH,
      '命令执行 commands.rs',
      [`commands::${d.command}`, '#[tauri::command]'],
      'plain',
      !d.commandValid,
    );

    drawArrow(boxX(0) + boxW, chainMidY, boxX(1), chainMidY);
    drawArrow(boxX(1) + boxW, chainMidY, boxX(2), chainMidY);
    drawArrow(boxX(2) + boxW, chainMidY, boxX(3), chainMidY);

    // 第二行:权限从哪来(虚线框 = 构建时自动生成),末框向上接入 ACL
    const rowBY = 244;
    const rowBH = 68;

    drawBox(
      boxX(0),
      rowBY,
      boxW,
      rowBH,
      'build.rs',
      ['COMMANDS = &[', `  "${d.command}"]`],
      'auto',
      !d.commandValid,
    );
    drawBox(
      boxX(1),
      rowBY,
      boxW,
      rowBH,
      'permissions/default.toml',
      ['[default] →', `["allow-${d.command}"]`],
      'auto',
      !d.commandValid,
    );

    drawArrow(boxX(0) + boxW, rowBY + rowBH / 2, boxX(1), rowBY + rowBH / 2);
    drawArrow(boxX(1) + boxW / 2, rowBY, boxX(1) + boxW / 2, rowAY + rowAH + 6);

    // 底部说明:四个回查点
    ctx.font = `12px ${SANS}`;
    ctx.fillStyle = COLOR_MUTED;
    ctx.fillText(
      '① build.rs 的 COMMANDS 声明命令,构建时自动生成 allow- / deny- 权限(虚线框)。',
      48,
      356,
    );
    ctx.fillText(
      `② default.toml 把自动权限收进 default 集;应用 capabilities 引用 ${d.name}:default 后,ACL 才放行。`,
      48,
      378,
    );
    ctx.fillText(
      '③ guest-js 源码经 rollup 构建为 dist-js,这是 npm 包实际发布的内容。',
      48,
      400,
    );
    ctx.fillText(
      '④ 新增命令要同步三处:build.rs COMMANDS、permissions/default.toml、guest-js 导出。',
      48,
      422,
    );

    emit({
      crateName: d.crateName,
      rustCrateIdent: d.rustCrateIdent,
      jsPackageName: d.jsPackageName,
      channel: d.channel,
      autoPermissions: d.autoPermissions,
      statusLabel: d.statusLabel,
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
