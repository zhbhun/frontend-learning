/**
 * 范例介绍：真机调试的「方案选型器」。
 * 演示内容：五个调试场景各自在决策树上的路线与推荐方案。
 * 输入 / 前置状态：Controls 单选「调试场景」；不依赖任何真实设备或连接状态。
 * 主要操作：切换场景，画布重绘决策树。
 * 预期结果：该场景走过的判断节点与推荐叶子按路线着色（远程=蓝 / 页面内=绿 / 远程平台=紫），
 *   其余节点变灰；叶子「页面内面板」的副标签在 vConsole 与 eruda 之间切换；
 *   readout 给出推荐方案、接入方式与关键局限。
 * 阅读主线：先看决策树的三层判断——能否连上调试通道、页面跑在哪、数据给谁看；
 *   再对照正文小节里各方案的完整工作流。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ScenarioId =
  | 'android-chrome'
  | 'android-webview'
  | 'app-page'
  | 'no-cable'
  | 'remote-assist';

export type RouteId = 'remote' | 'in-page' | 'platform';

export interface ScenarioPlan {
  id: ScenarioId;
  label: string;
  route: RouteId;
  leaf: 0 | 1 | 2 | 3;
  solution: string;
  setup: string;
  limit: string;
}

/** 场景 → 方案映射，数据来自官方文档与各工具 README（见正文参考资料）。 */
export const SCENARIO_PLANS: Record<ScenarioId, ScenarioPlan> = {
  'android-chrome': {
    id: 'android-chrome',
    label: 'Android Chrome 页面',
    route: 'remote',
    leaf: 0,
    solution: 'chrome://inspect',
    setup: 'USB 调试 → Discover USB devices → Inspect',
    limit: '需 USB 连线与手机端授权',
  },
  'android-webview': {
    id: 'android-webview',
    label: 'App 内嵌 WebView',
    route: 'remote',
    leaf: 1,
    solution: 'chrome://inspect + WebView 调试',
    setup: 'WebView.setWebContentsDebuggingEnabled(true)',
    limit: '开关对 App 内所有 WebView 生效',
  },
  'app-page': {
    id: 'app-page',
    label: '微信等 App 内网页',
    route: 'in-page',
    leaf: 2,
    solution: 'vConsole（页面内面板）',
    setup: 'npm install vconsole → new VConsole()',
    limit: 'DevTools 子集，调试代码随页面发布',
  },
  'no-cable': {
    id: 'no-cable',
    label: '现场无连线',
    route: 'in-page',
    leaf: 2,
    solution: 'eruda（页面内面板）',
    setup: 'CDN script → eruda.init()',
    limit: 'DevTools 子集，建议按条件加载',
  },
  'remote-assist': {
    id: 'remote-assist',
    label: '远程协助他人',
    route: 'platform',
    leaf: 3,
    solution: 'PageSpy（远程调试平台）',
    setup: '自托管 page-spy-api → 接入 SDK 入 Room',
    limit: '需部署服务端，只能查看不能操控',
  },
};

const ROUTE_COLORS: Record<RouteId, string> = {
  remote: '#4f7cff',
  'in-page': '#16a34a',
  platform: '#9333ea',
};

/** 决策树的逻辑坐标固定为 720×400，等比缩放后居中绘制。 */
const LAYOUT_W = 720;
const LAYOUT_H = 400;

interface TreeNode {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  main: string;
  sub: string;
}

const NODES: TreeNode[] = [
  { key: 'root', x: 360, y: 64, w: 150, h: 32, main: '真机上的页面', sub: '' },
  { key: 'q1', x: 360, y: 132, w: 190, h: 32, main: '能连上调试通道？', sub: '' },
  { key: 'q2', x: 189, y: 202, w: 170, h: 32, main: '页面跑在哪？', sub: '' },
  { key: 'q3', x: 531, y: 202, w: 170, h: 32, main: '数据给谁看？', sub: '' },
  {
    key: 'leaf0',
    x: 103,
    y: 270,
    w: 158,
    h: 48,
    main: 'Android Chrome',
    sub: 'chrome://inspect',
  },
  {
    key: 'leaf1',
    x: 275,
    y: 270,
    w: 158,
    h: 48,
    main: 'App 内嵌 WebView',
    sub: '先开调试开关',
  },
  {
    key: 'leaf2',
    x: 447,
    y: 270,
    w: 158,
    h: 48,
    main: '页面内面板',
    sub: 'vConsole / eruda',
  },
  {
    key: 'leaf3',
    x: 619,
    y: 270,
    w: 158,
    h: 48,
    main: 'PageSpy',
    sub: '远程调试平台',
  },
];

const EDGES: Array<{
  from: string;
  to: string;
  label?: string;
  labelOffset?: [number, number];
}> = [
  { from: 'root', to: 'q1' },
  { from: 'q1', to: 'q2', label: '能', labelOffset: [-10, 0] },
  { from: 'q1', to: 'q3', label: '不能', labelOffset: [18, 0] },
  { from: 'q2', to: 'leaf0' },
  { from: 'q2', to: 'leaf1' },
  { from: 'q3', to: 'leaf2' },
  { from: 'q3', to: 'leaf3' },
];

/** 每个推荐叶子对应走过的判断节点。 */
const LEAF_ANCESTORS: Record<string, string[]> = {
  leaf0: ['root', 'q1', 'q2'],
  leaf1: ['root', 'q1', 'q2'],
  leaf2: ['root', 'q1', 'q3'],
  leaf3: ['root', 'q1', 'q3'],
};

export interface ScenarioPickerSnapshot {
  scenario: ScenarioId;
  solution: string;
  setup: string;
  limit: string;
}

export interface ScenarioPickerInstance {
  update(options: { scenario: ScenarioId }): void;
  dispose(): void;
}

export function createScenarioPicker(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ScenarioPickerSnapshot) => void,
): ScenarioPickerInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: { scenario: ScenarioId } = { scenario: 'android-chrome' };

  function roundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const plan = SCENARIO_PLANS[current.scenario];
    const routeColor = ROUTE_COLORS[plan.route];
    const leafKey = `leaf${plan.leaf}`;
    const ancestors = LEAF_ANCESTORS[leafKey];
    const ancestorSet = new Set(ancestors);

    const scale = Math.min(width / LAYOUT_W, height / LAYOUT_H);
    drawingContext.save();
    drawingContext.translate(
      (width - LAYOUT_W * scale) / 2,
      (height - LAYOUT_H * scale) / 2,
    );
    drawingContext.scale(scale, scale);

    // 标题与路线图例
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'left';
    drawingContext.textBaseline = 'alphabetic';
    drawingContext.fillText(`场景：${plan.label}`, 0, 24);

    const legendItems: Array<[RouteId, string]> = [
      ['remote', '远程调试'],
      ['in-page', '页面内面板'],
      ['platform', '远程平台'],
    ];
    let legendX = LAYOUT_W - 240;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    for (const [route, label] of legendItems) {
      drawingContext.beginPath();
      drawingContext.fillStyle = ROUTE_COLORS[route];
      drawingContext.arc(legendX, 18, 4, 0, Math.PI * 2);
      drawingContext.fill();
      drawingContext.fillStyle = '#475569';
      drawingContext.fillText(label, legendX + 9, 23);
      legendX += 9 + drawingContext.measureText(label).width + 18;
    }

    // 连线：活跃路径按路线着色并加粗
    const byKey = new Map(NODES.map((node) => [node.key, node]));
    for (const edge of EDGES) {
      const from = byKey.get(edge.from);
      const to = byKey.get(edge.to);
      if (!from || !to) {
        continue;
      }
      // 连线两端都在「祖先节点 + 推荐叶子」的活跃路径上才高亮
      const active =
        ancestorSet.has(edge.from) &&
        (ancestorSet.has(edge.to) || edge.to === leafKey);

      drawingContext.strokeStyle = active ? routeColor : '#cbd5e1';
      drawingContext.lineWidth = active ? 2 : 1;
      drawingContext.beginPath();
      drawingContext.moveTo(from.x, from.y + from.h / 2);
      drawingContext.lineTo(to.x, to.y - to.h / 2);
      drawingContext.stroke();

      if (edge.label) {
        const onActiveBranch = ancestorSet.has(edge.to);
        drawingContext.fillStyle = onActiveBranch ? routeColor : '#94a3b8';
        drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
        drawingContext.textAlign = 'center';
        drawingContext.fillText(
          edge.label,
          (from.x + to.x) / 2 + (edge.labelOffset?.[0] ?? 0),
          (from.y + from.h / 2 + to.y - to.h / 2) / 2 +
            (edge.labelOffset?.[1] ?? 0) +
            4,
        );
        drawingContext.textAlign = 'left';
      }
    }

    // 节点：判断节点活跃时白底彩字，推荐叶子活跃时路线色实底白字
    for (const node of NODES) {
      const isLeaf = node.key.startsWith('leaf');
      const isActive = node.key === leafKey || ancestorSet.has(node.key);

      drawingContext.beginPath();
      roundRectPath(
        drawingContext,
        node.x - node.w / 2,
        node.y - node.h / 2,
        node.w,
        node.h,
        7,
      );
      drawingContext.fillStyle = isActive
        ? isLeaf
          ? routeColor
          : '#ffffff'
        : '#e2e8f0';
      drawingContext.fill();
      drawingContext.lineWidth = isActive ? 2 : 1;
      drawingContext.strokeStyle = isActive ? routeColor : '#cbd5e1';
      drawingContext.stroke();

      const lines =
        node.key === 'leaf2'
          ? [
              node.main,
              current.scenario === 'app-page'
                ? 'vConsole'
                : current.scenario === 'no-cable'
                  ? 'eruda'
                  : node.sub,
            ]
          : [node.main, node.sub].filter((line) => line.length > 0);

      drawingContext.textAlign = 'center';
      drawingContext.textBaseline = 'middle';
      if (lines.length === 1) {
        drawingContext.fillStyle = isActive ? routeColor : '#64748b';
        drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText(lines[0], node.x, node.y);
      } else {
        drawingContext.fillStyle = isActive
          ? isLeaf
            ? '#ffffff'
            : routeColor
          : '#64748b';
        drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText(lines[0], node.x, node.y - 9);
        drawingContext.fillStyle = isActive
          ? isLeaf
            ? 'rgba(255, 255, 255, 0.86)'
            : routeColor
          : '#94a3b8';
        drawingContext.font =
          '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        drawingContext.fillText(lines[1], node.x, node.y + 11);
      }
    }

    drawingContext.restore();

    emit({
      scenario: plan.id,
      solution: plan.solution,
      setup: plan.setup,
      limit: plan.limit,
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
