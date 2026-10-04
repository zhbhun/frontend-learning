/**
 * 范例介绍：同一份固定 manifest 规则下，URL 怎样被判定为注入或不注入。
 * 前置状态：matches 固定为 ['https://example.com/*', 'https://*.example.com/*']，
 * exclude_matches 与 match_about_blank 由读者开关控制；页面里还可能有一个
 * 父页面为 https://example.com/article/42 的 about:blank 子框架。
 * 主要操作：切换目标 URL，开关「排除私信路径」与「match_about_blank」。
 * 预期结果：matches 命中且排除规则未命中才注入；about:blank 子框架本身不在
 * matches 语法内，只有 match_about_blank 开启且父页面匹配时才注入。
 * 阅读主线：先读 URL 拆解，再看两条模式的命中明细，然后判定步骤，最后结论徽章。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface MatchOptions {
  url: string;
  excludePrivate: boolean;
  matchAboutBlank: boolean;
}

export interface MatchSnapshot {
  matches: string;
  exclude: string;
  frameRule: string;
  decision: string;
}

export interface MatchInstance {
  update(options: MatchOptions): void;
  dispose(): void;
}

// 正文最小 manifest 示例里的同两条模式：example.com 本体与全部子域
const MATCH_PATTERNS = [
  { pattern: 'https://example.com/*', host: 'example.com', subdomain: false },
  { pattern: 'https://*.example.com/*', host: 'example.com', subdomain: true },
];

const URL_CASES: Record<
  string,
  { scheme: string; host: string; path: string; blank: boolean }
> = {
  'https://example.com/article/42': {
    scheme: 'https',
    host: 'example.com',
    path: '/article/42',
    blank: false,
  },
  'https://blog.example.com/post/7': {
    scheme: 'https',
    host: 'blog.example.com',
    path: '/post/7',
    blank: false,
  },
  'https://example.com/private/note': {
    scheme: 'https',
    host: 'example.com',
    path: '/private/note',
    blank: false,
  },
  'https://other.com/': {
    scheme: 'https',
    host: 'other.com',
    path: '/',
    blank: false,
  },
  'about:blank（iframe）': {
    scheme: 'about',
    host: 'blank',
    path: '',
    blank: true,
  },
};

// 父页面 https://example.com/article/42 命中第一条模式（演示固定前置）
const PARENT_URL_MATCHES = true;

interface Verdict {
  directHits: string[];
  parentInjected: boolean;
  excluded: boolean;
  injected: boolean;
}

function evaluate(options: MatchOptions): Verdict {
  const urlCase = URL_CASES[options.url];
  const directHits: string[] = [];

  if (!urlCase.blank) {
    // scheme 必须是 https：两条模式都没写 *://，http 站点不匹配
    const schemeOk = urlCase.scheme === 'https';
    for (const rule of MATCH_PATTERNS) {
      if (!schemeOk) continue;
      const hostOk = rule.subdomain
        ? urlCase.host.endsWith(`.${rule.host}`)
        : urlCase.host === rule.host;
      if (hostOk) directHits.push(rule.pattern);
    }
  }

  const excluded =
    !urlCase.blank &&
    options.excludePrivate &&
    urlCase.host === 'example.com' &&
    urlCase.path.startsWith('/private/');

  // about:blank 自身不参与 matches 判定，只看 match_about_blank 与父页面
  const parentInjected = urlCase.blank && options.matchAboutBlank && PARENT_URL_MATCHES;

  return {
    directHits,
    parentInjected,
    excluded,
    injected: (directHits.length > 0 || parentInjected) && !excluded,
  };
}

function snapshotFor(options: MatchOptions): MatchSnapshot {
  const verdict = evaluate(options);
  const urlCase = URL_CASES[options.url];

  return {
    matches:
      verdict.directHits.length > 0
        ? `命中 ${verdict.directHits[0]}`
        : urlCase.blank
          ? '未命中（about:blank 不在 matches 语法内）'
          : '未命中任何模式',
    exclude: verdict.excluded
      ? '命中 → 本页排除'
      : urlCase.blank
        ? '不适用'
        : options.excludePrivate
          ? '未命中'
          : '未启用',
    frameRule: urlCase.blank
      ? options.matchAboutBlank
        ? 'match_about_blank 开启，父页面匹配 → 注入'
        : '未开启 match_about_blank → 不注入'
      : '非框架页，不涉及',
    decision: verdict.injected ? '注入' : '不注入',
  };
}

export function createMatchExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MatchSnapshot) => void,
): MatchInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: MatchOptions = {
    url: 'https://example.com/article/42',
    excludePrivate: false,
    matchAboutBlank: false,
  };

  function text(
    content: string,
    x: number,
    y: number,
    options: { color?: string; font?: string } = {},
  ) {
    drawingContext.fillStyle = options.color ?? '#172033';
    drawingContext.font = options.font ?? '14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(content, x, y);
  }

  function drawBox(content: string, x: number, y: number) {
    const width = drawingContext.measureText(content).width + 20;
    drawingContext.fillStyle = '#eef2ff';
    drawingContext.strokeStyle = '#4f7cff';
    drawingContext.lineWidth = 1;
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, 30, 6);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(content, x + 10, y + 20);
    return width;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = 320;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const options = current;
    const urlCase = URL_CASES[options.url];
    const verdict = evaluate(options);

    drawingContext.fillStyle = '#172033';
    drawingContext.font =
      '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('URL 与注入判定（模拟）', 40, 28);

    // URL 拆解：scheme / host / path 三段，命中关注的段落高亮
    let x = 40;
    if (urlCase.blank) {
      x += drawBox('about:blank', x, 44) + 10;
      text(
        'iframe · 父页面 https://example.com/article/42',
        x,
        64,
        { color: '#475569', font: '13px ui-sans-serif, system-ui, sans-serif' },
      );
    } else {
      x += drawBox(urlCase.scheme, x, 44) + 6;
      x += drawBox(urlCase.host, x, 44) + 6;
      x += drawBox(urlCase.path, x, 44);
    }

    // matches 模式命中明细
    text('matches 模式（固定）', 40, 108, {
      color: '#475569',
      font: '13px ui-sans-serif, system-ui, sans-serif',
    });
    let y = 132;
    for (const rule of MATCH_PATTERNS) {
      const hit = verdict.directHits.includes(rule.pattern);
      text(hit ? '✓' : '✗', 44, y, {
        color: hit ? '#2f9e6e' : '#b91c1c',
        font: '600 14px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
      text(rule.pattern, 68, y, {
        font: '13px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
      text(hit ? '命中' : '未命中', 300, y, { color: '#475569' });
      y += 24;
    }

    // 判定步骤：matches → exclude_matches → 框架规则
    text('判定步骤', 40, y + 10, {
      color: '#475569',
      font: '13px ui-sans-serif, system-ui, sans-serif',
    });
    y += 34;
    const steps: Array<[string, string, string]> = urlCase.blank
      ? [
          [
            '① matches',
            'about:blank 自身无法用模式表示：不算命中',
            '#475569',
          ],
          [
            '② exclude_matches',
            options.excludePrivate ? '已启用，但无 URL 可排除' : '未启用',
            '#475569',
          ],
          [
            '③ 框架规则',
            options.matchAboutBlank
              ? 'match_about_blank 开启，父页面匹配 → 注入'
              : '未开启 match_about_blank → 不注入',
            options.matchAboutBlank ? '#2f9e6e' : '#b91c1c',
          ],
        ]
      : [
          [
            '① matches',
            verdict.directHits.length > 0
              ? `命中 ${verdict.directHits[0]}`
              : '未命中任何模式',
            verdict.directHits.length > 0 ? '#2f9e6e' : '#b91c1c',
          ],
          [
            '② exclude_matches',
            options.excludePrivate
              ? verdict.excluded
                ? '命中 /private/* → 排除'
                : '未命中'
              : '未启用',
            verdict.excluded ? '#b91c1c' : '#475569',
          ],
          [
            '③ 框架规则',
            '目标不是子框架，不涉及',
            '#475569',
          ],
        ];
    for (const [label, detail, color] of steps) {
      text(label, 44, y, {
        font: '600 13px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
      text(detail, 180, y, { color });
      y += 24;
    }

    // 结论徽章
    const badgeWidth = 240;
    const badgeX = (width - badgeWidth) / 2;
    drawingContext.fillStyle = verdict.injected ? '#e7f6ef' : '#f1f5f9';
    drawingContext.strokeStyle = verdict.injected ? '#2f9e6e' : '#94a3b8';
    drawingContext.beginPath();
    drawingContext.roundRect(badgeX, y + 8, badgeWidth, 36, 18);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.fillStyle = verdict.injected ? '#166534' : '#475569';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    const badgeText = verdict.injected
      ? '注入 content script'
      : '不注入';
    drawingContext.fillText(
      badgeText,
      badgeX + (badgeWidth - drawingContext.measureText(badgeText).width) / 2,
      y + 32,
    );

    emit(snapshotFor(options));
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
