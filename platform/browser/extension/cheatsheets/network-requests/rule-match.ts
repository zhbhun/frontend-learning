/**
 * 范例介绍：同一批请求目标下，哪条 declarativeNetRequest 规则会生效。
 * 前置状态：四条规则——R1 用 block 拦 ads 脚本、R2 用 redirect 改写 analytics 请求、
 * R3 用 allow 放行 cdn.example.com、R4 用 upgradeScheme 升级 http 请求；每条规则的
 * 优先级与开关由「场景」预设控制，请求目标由「请求」选择。
 * 主要操作：切换请求与场景预设。
 * 预期结果：先按 condition 筛出命中规则，再按 priority 降序排列、同优先级按
 * allow > block > upgradeScheme > redirect 决胜，排在最前的规则生效；allow 生效时
 * 请求放行，且本扩展不再对该请求做任何干预。
 * 阅读主线：先读请求拆解，再看每条规则的命中明细，然后看排序结果，最后看结论徽章。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface RuleMatchOptions {
  request: string;
  scenario: string;
}

export interface RuleMatchSnapshot {
  request: string;
  resource: string;
  matched: string;
  ordering: string;
  outcome: string;
}

export interface RuleMatchInstance {
  update(options: RuleMatchOptions): void;
  dispose(): void;
}

type Operation = 'block' | 'redirect' | 'upgradeScheme' | 'allow';

interface RequestCase {
  url: string;
  scheme: string;
  host: string;
  path: string;
  resourceType: string;
  initiator: string;
}

interface RuleDef {
  id: number;
  action: Operation;
  condition: string;
  matches(request: RequestCase): boolean;
}

interface ScenarioDef {
  label: string;
  rules: Record<number, { enabled: boolean; priority: number }>;
}

const REDIRECT_URL = 'https://example.com/blank.gif';

const REQUEST_CASES: Record<string, RequestCase> = {
  'https://cdn.example.com/ads/banner.js': {
    url: 'https://cdn.example.com/ads/banner.js',
    scheme: 'https',
    host: 'cdn.example.com',
    path: '/ads/banner.js',
    resourceType: 'script',
    initiator: 'example.com',
  },
  'https://analytics.other.net/collect': {
    url: 'https://analytics.other.net/collect',
    scheme: 'https',
    host: 'analytics.other.net',
    path: '/collect',
    resourceType: 'xmlhttprequest',
    initiator: 'example.com',
  },
  'http://blog.example.com/post/1': {
    url: 'http://blog.example.com/post/1',
    scheme: 'http',
    host: 'blog.example.com',
    path: '/post/1',
    resourceType: 'main_frame',
    initiator: '（无，导航发起）',
  },
  'https://static.example.com/logo.png': {
    url: 'https://static.example.com/logo.png',
    scheme: 'https',
    host: 'static.example.com',
    path: '/logo.png',
    resourceType: 'image',
    initiator: 'example.com',
  },
};

// condition 用正文最小示例的同款写法：urlFilter 为 URL 子串匹配，
// regexFilter 为 RE2 正则；这里按仿真请求字段手工求值。
const RULES: RuleDef[] = [
  {
    id: 1,
    action: 'block',
    condition: 'urlFilter "ads" · script',
    matches: (request) =>
      request.url.includes('ads') && request.resourceType === 'script',
  },
  {
    id: 2,
    action: 'redirect',
    condition: 'urlFilter "analytics"',
    matches: (request) => request.url.includes('analytics'),
  },
  {
    id: 3,
    action: 'allow',
    condition: 'urlFilter "cdn.example.com"',
    matches: (request) => request.url.includes('cdn.example.com'),
  },
  {
    id: 4,
    action: 'upgradeScheme',
    condition: 'regexFilter "^http://"',
    matches: (request) => request.url.startsWith('http://'),
  },
];

// 同优先级决胜顺序：allow > block > upgradeScheme > redirect
const ACTION_RANK: Record<Operation, number> = {
  allow: 0,
  block: 1,
  upgradeScheme: 2,
  redirect: 3,
};

const SCENARIOS: Record<string, ScenarioDef> = {
  'block 优先（默认）': {
    label: 'block 优先（默认）',
    rules: {
      1: { enabled: true, priority: 10 },
      2: { enabled: true, priority: 5 },
      3: { enabled: true, priority: 1 },
      4: { enabled: true, priority: 5 },
    },
  },
  'allow 更高优先级': {
    label: 'allow 更高优先级',
    rules: {
      1: { enabled: true, priority: 1 },
      2: { enabled: true, priority: 5 },
      3: { enabled: true, priority: 10 },
      4: { enabled: true, priority: 5 },
    },
  },
  '同优先级 allow 对 block': {
    label: '同优先级 allow 对 block',
    rules: {
      1: { enabled: true, priority: 5 },
      2: { enabled: true, priority: 5 },
      3: { enabled: true, priority: 5 },
      4: { enabled: true, priority: 5 },
    },
  },
  '只留 redirect / upgradeScheme': {
    label: '只留 redirect / upgradeScheme',
    rules: {
      1: { enabled: false, priority: 10 },
      2: { enabled: true, priority: 5 },
      3: { enabled: false, priority: 1 },
      4: { enabled: true, priority: 5 },
    },
  },
};

interface Candidate {
  rule: RuleDef;
  priority: number;
}

interface Verdict {
  request: RequestCase;
  candidates: Candidate[];
  winner?: Candidate;
  orderingLabel: string;
  outcome: string;
  outcomeTone: 'allow' | 'block' | 'rewrite' | 'plain';
}

function evaluate(options: RuleMatchOptions): Verdict {
  const request = REQUEST_CASES[options.request];
  const scenario = SCENARIOS[options.scenario];

  // 请求发起前的评估阶段：block / redirect / upgradeScheme / allow 都在这里决胜
  const candidates: Candidate[] = RULES.filter(
    (rule) => scenario.rules[rule.id].enabled && rule.matches(request),
  ).map((rule) => ({ rule, priority: scenario.rules[rule.id].priority }));

  candidates.sort(
    (a, b) =>
      b.priority - a.priority ||
      ACTION_RANK[a.rule.action] - ACTION_RANK[b.rule.action],
  );

  const winner = candidates[0];
  let outcome = '无规则命中，请求原样发出';
  let outcomeTone: Verdict['outcomeTone'] = 'plain';

  if (winner) {
    if (winner.rule.action === 'block') {
      outcome = '请求被阻止';
      outcomeTone = 'block';
    } else if (winner.rule.action === 'allow') {
      outcome = '请求放行；allow 生效后本扩展不再干预';
      outcomeTone = 'allow';
    } else if (winner.rule.action === 'upgradeScheme') {
      outcome = 'http 升级为 https 后发出';
      outcomeTone = 'rewrite';
    } else {
      outcome = `改写为 ${REDIRECT_URL}`;
      outcomeTone = 'rewrite';
    }
  }

  return {
    request,
    candidates,
    winner,
    orderingLabel: candidates
      .map((item) => `${item.rule.action}(${item.priority})`)
      .join(' → '),
    outcome,
    outcomeTone,
  };
}

function snapshotFor(options: RuleMatchOptions): RuleMatchSnapshot {
  const verdict = evaluate(options);
  const matched = verdict.candidates.length
    ? verdict.candidates
        .map((item) => `R${item.rule.id} ${item.rule.action}`)
        .join('、')
    : '无';

  return {
    request: verdict.request.url,
    resource: `${verdict.request.resourceType} · ${verdict.request.initiator}`,
    matched,
    ordering: verdict.orderingLabel || '—',
    outcome: verdict.outcome,
  };
}

const ACTION_COLOR: Record<Operation, string> = {
  allow: '#2f9e6e',
  block: '#b91c1c',
  upgradeScheme: '#7c3aed',
  redirect: '#b45309',
};

export function createRuleMatchExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RuleMatchSnapshot) => void,
): RuleMatchInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: RuleMatchOptions = {
    request: 'https://cdn.example.com/ads/banner.js',
    scenario: 'block 优先（默认）',
  };

  function text(
    content: string,
    x: number,
    y: number,
    options: { color?: string; font?: string } = {},
  ) {
    drawingContext.fillStyle = options.color ?? '#172033';
    drawingContext.font =
      options.font ?? '14px ui-sans-serif, system-ui, sans-serif';
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
    drawingContext.font =
      '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(content, x + 10, y + 20);
    return width;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = 400;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const verdict = evaluate(current);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('请求与规则匹配（模拟）', 40, 28);

    // 请求拆解：scheme / host / path 三段加资源类型与发起者
    let x = 40;
    x += drawBox(verdict.request.scheme, x, 44) + 6;
    x += drawBox(verdict.request.host, x, 44) + 6;
    x += drawBox(verdict.request.path, x, 44);
    text(
      `${verdict.request.resourceType} · 发起者 ${verdict.request.initiator}`,
      40,
      96,
      { color: '#475569', font: '13px ui-sans-serif, system-ui, sans-serif' },
    );

    // 规则命中明细：四条规则逐条求值
    text('规则（当前场景优先级）', 40, 128, {
      color: '#475569',
      font: '13px ui-sans-serif, system-ui, sans-serif',
    });
    let y = 152;
    for (const rule of RULES) {
      const config = SCENARIOS[current.scenario].rules[rule.id];
      const hit = config.enabled && rule.matches(verdict.request);
      const rank = verdict.candidates.findIndex(
        (item) => item.rule.id === rule.id,
      );

      text(`R${rule.id}`, 44, y, {
        font: '600 13px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
      text(rule.action, 76, y, {
        color: config.enabled ? ACTION_COLOR[rule.action] : '#94a3b8',
        font: '600 13px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
      text(`pri ${config.priority}`, 180, y, {
        color: '#475569',
        font: '13px ui-monospace, SFMono-Regular, Menlo, monospace',
      });
      text(rule.condition, 240, y);
      if (!config.enabled) {
        text('已停用', 520, y, {
          color: '#94a3b8',
          font: '13px ui-sans-serif, system-ui, sans-serif',
        });
      } else if (hit) {
        text('命中', 520, y, {
          color: '#2f9e6e',
          font: '600 13px ui-sans-serif, system-ui, sans-serif',
        });
        if (rank === 0) {
          text('← 生效', 560, y, {
            color: '#2f9e6e',
            font: '600 13px ui-sans-serif, system-ui, sans-serif',
          });
        }
      } else {
        text('未命中', 520, y, {
          color: '#b91c1c',
          font: '13px ui-sans-serif, system-ui, sans-serif',
        });
      }
      y += 24;
    }

    // 排序：先 priority 降序，同优先级按动作次序决胜
    text('排序与生效', 40, y + 10, {
      color: '#475569',
      font: '13px ui-sans-serif, system-ui, sans-serif',
    });
    y += 34;
    text('① 按 priority 降序', 44, y, {
      font: '600 13px ui-monospace, SFMono-Regular, Menlo, monospace',
    });
    text('② 同优先级：allow > block > upgradeScheme > redirect', 44, y + 22, {
      font: '13px ui-monospace, SFMono-Regular, Menlo, monospace',
    });
    y += 52;
    text(verdict.orderingLabel || '（无命中规则）', 44, y, {
      color: '#172033',
      font: '600 13px ui-monospace, SFMono-Regular, Menlo, monospace',
    });

    // 结论徽章
    const badgeWidth = 420;
    const badgeX = 40;
    const toneColor =
      verdict.outcomeTone === 'allow'
        ? { fill: '#e7f6ef', stroke: '#2f9e6e', label: '#166534' }
        : verdict.outcomeTone === 'block'
          ? { fill: '#fdeaea', stroke: '#b91c1c', label: '#7f1d1d' }
          : verdict.outcomeTone === 'rewrite'
            ? { fill: '#fdf3e3', stroke: '#b45309', label: '#7c4a03' }
            : { fill: '#f1f5f9', stroke: '#94a3b8', label: '#475569' };
    drawingContext.fillStyle = toneColor.fill;
    drawingContext.strokeStyle = toneColor.stroke;
    drawingContext.beginPath();
    drawingContext.roundRect(badgeX, y + 14, badgeWidth, 36, 18);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.fillStyle = toneColor.label;
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(verdict.outcome, badgeX + 16, y + 38);

    emit(snapshotFor(current));
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
