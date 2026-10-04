/**
 * 范例介绍：多条 modifyHeaders 规则作用同一个请求头时，改动怎样累积或被拒绝。
 * 前置状态：同一扩展两条 modifyHeaders 规则——规则 A priority 2、规则 B priority 1，
 * 都改选中请求头；初始请求头为模拟值。append 只对固定请求头白名单生效（cookie、
 * user-agent 在白名单内，x-custom-token 不在）。
 * 主要操作：切换请求头、切换两条规则的操作（none / append / set / remove）。
 * 预期结果：先应用高优先级规则 A，再按官方交互规则应用 B——A append 后 B 只能 append；
 * A set 后只有同扩展的低优先级规则可以 append；A remove 后 B 不能再改动该头；
 * 非白名单请求头的 append 会被拒绝。
 * 阅读主线：先读初始请求头，再看规则 A、B 各自的执行结果，最后读最终请求头与交互结论。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface HeaderModifyOptions {
  header: string;
  operationA: string;
  operationB: string;
}

export interface HeaderModifySnapshot {
  header: string;
  ruleA: string;
  ruleB: string;
  finalHeader: string;
  note: string;
}

export interface HeaderModifyInstance {
  update(options: HeaderModifyOptions): void;
  dispose(): void;
}

type Operation = 'none' | 'append' | 'set' | 'remove';

// append 操作仅支持这些请求头，列表大小写敏感（官方文档原表）
const APPEND_ALLOWLIST = [
  'accept',
  'accept-encoding',
  'accept-language',
  'access-control-request-headers',
  'cache-control',
  'connection',
  'content-language',
  'cookie',
  'forwarded',
  'if-match',
  'if-none-match',
  'keep-alive',
  'range',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'user-agent',
  'via',
  'want-digest',
  'x-forwarded-for',
];

interface HeaderDef {
  name: string;
  initial: string | null;
  values: Record<Exclude<Operation, 'none'>, string>;
}

const HEADERS: Record<string, HeaderDef> = {
  cookie: {
    name: 'cookie',
    initial: 'session=abc',
    values: {
      append: 'uid=42',
      set: 'session=xyz',
      remove: '',
    },
  },
  'user-agent': {
    name: 'user-agent',
    initial: 'Mozilla/5.0 (demo)',
    values: {
      append: 'DemoAgent/1.0',
      set: 'DemoAgent/1.0',
      remove: '',
    },
  },
  'x-custom-token': {
    name: 'x-custom-token',
    initial: null,
    values: {
      append: 'demo-token',
      set: 'demo-token',
      remove: '',
    },
  },
};

interface HeaderState {
  present: boolean;
  value: string;
}

interface ApplyResult {
  state: HeaderState;
  label: string;
  rejected: boolean;
}

function applyOperation(
  state: HeaderState,
  operation: Operation,
  header: HeaderDef,
): ApplyResult {
  if (operation === 'none') {
    return { state, label: 'none，不改动', rejected: false };
  }

  if (operation === 'append' && !APPEND_ALLOWLIST.includes(header.name)) {
    return {
      state,
      label: '已拒绝：append 只支持固定请求头白名单',
      rejected: true,
    };
  }

  if (operation === 'remove') {
    return {
      state: { present: false, value: '' },
      label: `移除 ${header.name}`,
      rejected: false,
    };
  }

  const nextValue =
    operation === 'append' && state.present
      ? `${state.value}; ${header.values.append}`
      : header.values[operation];

  return {
    state: { present: true, value: nextValue },
    label: `${operation} ${header.name}: ${nextValue}`,
    rejected: false,
  };
}

// 官方交互规则：B 相对 A 为低优先级，且与本扩展同源
function isAllowedAfter(a: Operation, b: Operation): boolean {
  if (a === 'none' || b === 'none') {
    return true;
  }
  if (a === 'append') {
    return b === 'append';
  }
  if (a === 'set') {
    return b === 'append';
  }
  return false; // a === 'remove'
}

function rejectReason(a: Operation): string {
  if (a === 'append') {
    return '已拒绝：append 之后低优先级规则只能 append';
  }
  if (a === 'set') {
    return '已拒绝：set 之后只有同扩展低优先级规则可以 append';
  }
  return '已拒绝：remove 之后低优先级规则不能再改动该头';
}

interface Verdict {
  header: HeaderDef;
  operationA: Operation;
  operationB: Operation;
  initial: HeaderState;
  afterA: ApplyResult;
  afterB: ApplyResult;
  finalState: HeaderState;
  note: string;
}

function evaluate(options: HeaderModifyOptions): Verdict {
  const header = HEADERS[options.header];
  const operationA = options.operationA as Operation;
  const operationB = options.operationB as Operation;

  const initial: HeaderState = {
    present: header.initial !== null,
    value: header.initial ?? '',
  };

  const afterA = applyOperation(initial, operationA, header);
  const allowed = isAllowedAfter(operationA, operationB);
  const afterB = allowed
    ? applyOperation(afterA.state, operationB, header)
    : {
        state: afterA.state,
        label: rejectReason(operationA),
        rejected: true,
      };

  let note = '两条规则依次生效，改动按优先级顺序累积';
  if (afterA.rejected) {
    note = '规则 A 被拒绝：append 只支持固定请求头白名单';
  } else if (afterB.rejected) {
    note = '规则 B 被拒绝：低优先级规则可做的操作受高优先级规则限制';
  } else if (operationA === 'none' && operationB === 'none') {
    note = '两条规则都不改动，请求头保持初始值';
  }

  return {
    header,
    operationA,
    operationB,
    initial,
    afterA,
    afterB,
    finalState: afterB.state,
    note,
  };
}

function headerText(state: HeaderState): string {
  return state.present ? state.value : '（头已移除）';
}

function snapshotFor(options: HeaderModifyOptions): HeaderModifySnapshot {
  const verdict = evaluate(options);
  const finalPresent = verdict.finalState.present;

  return {
    header: verdict.header.name,
    ruleA: `priority 2 · ${verdict.operationA} → ${verdict.afterA.label}`,
    ruleB: `priority 1 · ${verdict.operationB} → ${verdict.afterB.label}`,
    finalHeader: finalPresent
      ? `${verdict.header.name}: ${verdict.finalState.value}`
      : `${verdict.header.name}: （不存在）`,
    note: verdict.note,
  };
}

export function createHeaderModifyExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: HeaderModifySnapshot) => void,
): HeaderModifyInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: HeaderModifyOptions = {
    header: 'cookie',
    operationA: 'append',
    operationB: 'set',
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

  function drawStage(
    label: string,
    x: number,
    y: number,
    assign: (stage: { value: string; rejected: boolean }) => void,
  ) {
    const stage: { value: string; rejected: boolean } = {
      value: '',
      rejected: false,
    };
    assign(stage);

    drawingContext.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    const width = Math.max(200, drawingContext.measureText(stage.value).width + 28);
    drawingContext.fillStyle = stage.rejected ? '#fdeaea' : '#eef2ff';
    drawingContext.strokeStyle = stage.rejected ? '#b91c1c' : '#4f7cff';
    drawingContext.lineWidth = 1;
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, 34, 6);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = stage.rejected ? '#7f1d1d' : '#172033';
    drawingContext.fillText(stage.value, x + 14, y + 22);
    if (!verdictPresent(stage.value)) {
      drawingContext.strokeStyle = '#b91c1c';
      const textWidth = drawingContext.measureText(stage.value).width;
      drawingContext.beginPath();
      drawingContext.moveTo(x + 14, y + 17);
      drawingContext.lineTo(x + 14 + textWidth, y + 17);
      drawingContext.stroke();
    }

    text(label, x, y - 8, {
      color: '#475569',
      font: '12px ui-sans-serif, system-ui, sans-serif',
    });
  }

  // 头不存在的历史阶段才画删除线；普通取值不画
  function verdictPresent(value: string) {
    return !value.endsWith('（头已移除）');
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = 330;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const verdict = evaluate(current);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('请求头改写演算（modifyHeaders）', 40, 28);

    // 纵向三段：初始请求头 → 规则 A 结果 → 规则 B 结果
    drawStage('初始请求头', 40, 58, (stage) => {
      stage.value = verdict.initial.present
        ? `${verdict.header.name}: ${verdict.initial.value}`
        : `${verdict.header.name}: （不存在）`;
      stage.rejected = false;
    });
    drawStage('规则 A（priority 2）', 40, 130, (stage) => {
      stage.value = verdict.afterA.rejected
        ? verdict.afterA.label
        : headerText(verdict.afterA.state);
      stage.rejected = verdict.afterA.rejected;
    });
    drawStage('规则 B（priority 1）', 40, 202, (stage) => {
      stage.value = verdict.afterB.rejected
        ? verdict.afterB.label
        : headerText(verdict.afterB.state);
      stage.rejected = verdict.afterB.rejected;
    });

    // 结论行
    let y = 274;
    if (!verdict.finalState.present) {
      text('最终请求头：头被移除，浏览器发送时不再携带', 40, y, {
        color: '#b91c1c',
        font: '600 14px ui-sans-serif, system-ui, sans-serif',
      });
      y += 26;
    }
    if (!verdict.afterA.rejected && !verdict.afterB.rejected) {
      text('两条规则都按优先级顺序累积生效', 40, y, {
        color: '#2f9e6e',
        font: '600 14px ui-sans-serif, system-ui, sans-serif',
      });
      y += 26;
    }
    text(verdict.note, 40, y + 4, {
      color: '#475569',
      font: '13px ui-sans-serif, system-ui, sans-serif',
    });

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
