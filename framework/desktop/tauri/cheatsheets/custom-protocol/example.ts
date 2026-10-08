/**
 * 范例介绍:演示 convertFileSrc 怎样把资源路径解析成协议 URL,以及 Rust 侧
 *   handler 收到的请求形态——URL 随平台变形,handler 收到的 path 却是统一的。
 * 输入:协议(asset 内置 / myproto 自定义协议)、目标平台、窗口配置
 *   useHttpsScheme(仅 Windows/Android 生效)、资源路径(相对 / 含空格中文 / 绝对)。
 * 主要操作:切换任一输入即重新解析一次:路径 encodeURIComponent 整体编码 →
 *   按平台拼出 URL(macOS/Linux 为 {scheme}://localhost/,Windows/Android 为
 *   http(s)://{scheme}.localhost/)→ 模拟 handler 收到的 request.uri().path()。
 * 预期结果:同一输入在 macOS/Linux 与 Windows 生成不同形态的 URL,但 handler
 *   收到的原始 path 一致(整体编码、带前导斜杠);useHttpsScheme 只改变 Windows
 *   的 http/https 前缀。asset 由 Tauri 核心处理,myproto 由你自己的 handler 处理。
 * 阅读主线:永远用 convertFileSrc 生成 URL,不要手拼;handler 里拿到的是编码后的
 *   path,解码是处理器自己的事。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ProtocolVariant = 'asset' | 'myproto';
export type PlatformVariant = 'macos' | 'windows' | 'linux';
export type ResourcePathVariant =
  | 'assets/logo.png'
  | 'images/背景 图.png'
  | '/Users/me/photo.png';

export interface ExampleArgs {
  protocol: ProtocolVariant;
  platform: PlatformVariant;
  useHttpsScheme: boolean;
  resourcePath: ResourcePathVariant;
}

export interface ExampleSnapshot {
  /** 读数:convertFileSrc 生成的 URL。 */
  url: string;
  /** 读数:handler 收到的 request.uri().path()(原始,未解码)。 */
  rawPath: string;
  /** 读数:percent-decode 并去掉前导斜杠后的资源路径。 */
  decodedPath: string;
  /** 读数:谁来处理这次请求。 */
  handlerLabel: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

const TEXT = '#172033';
const DIM = '#64748b';
const PALE = '#94a3b8';
const ACCENT = '#4f7cff';
const OK = '#15803d';
const BOX_BG = '#ffffff';
const BOX_BORDER = '#dbe3f0';

const CANVAS_W = 720;
const CANVAS_H = 452;

/* 布局:上排前端调用与生成 URL,中排平台形态与 Rust 收到的请求,下排处理器对照。 */
const TOP_Y = 20;
const TOP_H = 116;
const MID_Y = 152;
const MID_H = 128;
const BOTTOM_Y = 296;
const BOTTOM_H = 132;

const LEFT_X = 24;
const LEFT_W = 340;
const RIGHT_X = 388;
const RIGHT_W = 308;

/* 与官方文档一致的平台 URL 形态。 */
function protocolScheme(
  platform: PlatformVariant,
  useHttpsScheme: boolean,
): string {
  return platform === 'windows' && useHttpsScheme ? 'https' : 'http';
}

/** 复刻 __TAURI_INTERNALS__ 的 convertFileSrc:整体 encodeURIComponent,再按平台拼前缀。 */
function buildUrl(args: ExampleArgs): string {
  const encoded = encodeURIComponent(args.resourcePath);
  if (args.platform === 'windows') {
    return `${protocolScheme(args.platform, args.useHttpsScheme)}://${args.protocol}.localhost/${encoded}`;
  }
  return `${args.protocol}://localhost/${encoded}`;
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
    protocol: 'asset',
    platform: 'macos',
    useHttpsScheme: false,
    resourcePath: 'assets/logo.png',
  };

  function roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
  }

  function panel(x: number, y: number, w: number, h: number, borderColor: string): void {
    drawingContext.fillStyle = BOX_BG;
    roundRect(x, y, w, h, 6);
    drawingContext.fill();
    drawingContext.strokeStyle = borderColor;
    drawingContext.stroke();
  }

  function label(
    x: number,
    y: number,
    text: string,
    options: { color?: string; mono?: boolean; weight?: number; size?: number },
  ): void {
    drawingContext.fillStyle = options.color ?? TEXT;
    const size = options.size ?? 11;
    const family = options.mono
      ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
      : 'ui-sans-serif, system-ui, sans-serif';
    drawingContext.font = `${options.weight ?? 400} ${size}px ${family}`;
    drawingContext.fillText(text, x, y);
  }

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(CANVAS_W, size.width);
    const height = Math.max(CANVAS_H, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.textAlign = 'left';

    const { protocol, platform, resourcePath } = current;
    const url = buildUrl(current);
    /* handler 收到的 uri().path():编码原样、带前导斜杠(http crate 不做解码)。 */
    const rawPath = `/${encodeURIComponent(resourcePath)}`;
    const decodedPath = decodeURIComponent(rawPath.slice(1));
    const isAsset = protocol === 'asset';

    /* 左上:前端调用。 */
    panel(LEFT_X, TOP_Y, LEFT_W, TOP_H, BOX_BORDER);
    label(LEFT_X + 12, TOP_Y + 22, '前端调用(@tauri-apps/api/core)', { color: DIM });
    const call = `convertFileSrc('${resourcePath}'${isAsset ? '' : `, '${protocol}'`})`;
    label(LEFT_X + 12, TOP_Y + 48, call.slice(0, 44), { mono: true, size: 10.5 });
    if (call.length > 44) {
      label(LEFT_X + 12, TOP_Y + 66, call.slice(44, 88), { mono: true, size: 10.5 });
    }
    label(LEFT_X + 12, TOP_Y + 92, '输入通常是 resolveResource() 解析出的绝对路径', {
      size: 10,
      color: PALE,
    });

    /* 右上:生成的 URL——按平台变形,路径整体编码。 */
    panel(RIGHT_X, TOP_Y, RIGHT_W, TOP_H, ACCENT);
    label(RIGHT_X + 12, TOP_Y + 22, '生成的协议 URL(直接给 img / video / CSS)', {
      color: DIM,
      size: 10.5,
    });
    const maxChars = 44;
    for (let start = 0, line = 0; start < url.length; start += maxChars, line += 1) {
      label(
        RIGHT_X + 12,
        TOP_Y + 48 + line * 18,
        url.slice(start, start + maxChars),
        { mono: true, size: 10.5, weight: 600, color: ACCENT },
      );
    }
    label(RIGHT_X + 12, TOP_Y + 98, '路径整体 encodeURIComponent(斜杠也变成 %2F)', {
      size: 10,
      color: PALE,
    });

    /* 左中:平台 URL 形态对照,当前平台一行加亮。 */
    panel(LEFT_X, MID_Y, LEFT_W, MID_H, BOX_BORDER);
    label(LEFT_X + 12, MID_Y + 22, '平台 URL 形态(docs.rs register_uri_scheme_protocol)', {
      color: DIM,
      size: 10,
    });
    const forms: Array<[PlatformVariant[], string]> = [
      [['macos', 'linux'], '{scheme}://localhost/{path}'],
      [['windows'], 'http://{scheme}.localhost/{path}'],
    ];
    forms.forEach(([targets, form], index) => {
      const active = targets.includes(platform);
      label(
        LEFT_X + 12,
        MID_Y + 50 + index * 22,
        (targets.includes('windows') ? 'Windows / Android ' : 'macOS / iOS / Linux ') + form,
        {
          mono: true,
          size: 10,
          weight: active ? 600 : 400,
          color: active ? OK : PALE,
        },
      );
    });
    label(
      LEFT_X + 12,
      MID_Y + 102,
      platform === 'windows'
        ? current.useHttpsScheme
          ? 'useHttpsScheme: true → https://…(默认 http)'
          : 'useHttpsScheme: false → http://…(默认形态)'
        : 'useHttpsScheme 只在 Windows/Android 生效',
      { size: 10, color: platform === 'windows' ? OK : PALE },
    );

    /* 右中:Rust 侧收到的请求。 */
    panel(RIGHT_X, MID_Y, RIGHT_W, MID_H, BOX_BORDER);
    label(RIGHT_X + 12, MID_Y + 22, 'Rust handler 收到的请求', { color: DIM });
    label(RIGHT_X + 12, MID_Y + 48, 'request.uri().path()', { mono: true, size: 10, color: DIM });
    label(RIGHT_X + 12, MID_Y + 68, rawPath, { mono: true, size: 10.5, weight: 600 });
    label(RIGHT_X + 12, MID_Y + 92, `percent-decode 后:${decodedPath}`, {
      mono: true,
      size: 10,
      color: OK,
    });
    label(RIGHT_X + 12, MID_Y + 112, '两平台 path 一致;前导 "/" 与解码由处理器负责', {
      size: 10,
      color: PALE,
    });

    /* 下:处理器对照——谁响应这次请求、关卡在哪。 */
    panel(LEFT_X, BOTTOM_Y, LEFT_W, BOTTOM_H, isAsset ? ACCENT : BOX_BORDER);
    label(
      LEFT_X + 12,
      BOTTOM_Y + 22,
      isAsset ? 'asset 协议(Tauri 核心内置 handler)' : 'asset 协议(未选中)',
      { weight: 600, size: 11.5, color: isAsset ? TEXT : PALE },
    );
    const assetLines = [
      '① percent-decode ② SafePathBuf 校验路径',
      '③ scope.is_allowed → 不在范围回 403',
      '④ 读文件 → 不存在回 404',
      '⑤ 魔数猜 MIME ⑥ Range 请求回 206(可 seek)',
    ];
    assetLines.forEach((line, index) => {
      label(LEFT_X + 12, BOTTOM_Y + 48 + index * 20, line, {
        size: 10.5,
        color: isAsset ? (index === 0 ? TEXT : DIM) : PALE,
      });
    });

    panel(RIGHT_X, BOTTOM_Y, RIGHT_W, BOTTOM_H, isAsset ? BOX_BORDER : ACCENT);
    label(
      RIGHT_X + 12,
      BOTTOM_Y + 22,
      isAsset ? `自定义协议 '${protocol}'(未选中)` : `自定义协议 '${protocol}'(你的 handler)`,
      { weight: 600, size: 11.5, color: isAsset ? PALE : TEXT },
    );
    const customLines = [
      '注册:Builder::register_uri_scheme_protocol',
      '签名:(UriSchemeContext, Request<Vec<u8>>)',
      '  → Response(头自己写,至少 Content-Type)',
      '关卡完全由你的代码决定,不经 ACL',
    ];
    customLines.forEach((line, index) => {
      label(RIGHT_X + 12, BOTTOM_Y + 48 + index * 20, line, {
        size: 10.5,
        color: isAsset ? PALE : index === 0 ? TEXT : DIM,
      });
    });

    emit({
      url,
      rawPath,
      decodedPath,
      handlerLabel: isAsset
        ? 'Tauri 核心 asset handler(scope → 读文件 → MIME → Range)'
        : `register_uri_scheme_protocol 注册的 '${protocol}' handler`,
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
