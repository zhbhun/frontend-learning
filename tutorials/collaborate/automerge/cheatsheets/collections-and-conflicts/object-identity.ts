/**
 * 范例介绍：对象进入文档后的身份规则。
 * 输入：身份操作——「同一裸对象赋给两个键」或「文档内对象赋给另一个键」。
 * 预期：裸对象场景得到两次独立深拷贝（两个不同 ObjID，值分别是赋值时刻的快照）；
 *       文档内对象场景抛出 RangeError，画布显示捕获到的错误文本。
 * 阅读主线：runIdentityAction 的两个分支；读数对比两个键的 ObjID 是否相同。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type IdentityAction = 'shared-pojo' | 'internal-move';

export const IDENTITY_ACTION_LABELS: Record<IdentityAction, string> = {
  'shared-pojo': '同一裸对象赋给两个键',
  'internal-move': '文档内对象赋给另一个键',
};

/** Controls 面板里身份操作选择器的候选标签（中文）。 */
export const IDENTITY_ACTION_OPTIONS: string[] = Object.values(
  IDENTITY_ACTION_LABELS,
);

export function actionFromLabel(label: string): IdentityAction {
  return label === IDENTITY_ACTION_LABELS['internal-move']
    ? 'internal-move'
    : 'shared-pojo';
}

/** stories 传入的参数：action 是 Controls 里选中的中文标签。 */
export interface IdentityArgsView {
  action: string;
}

export interface IdentityOptions {
  action: IdentityAction;
}

// 用 type 而不是 interface：A.from 的泛型约束是 Record<string, unknown>。
type IdDoc = {
  first: { n: number } | null;
  second: { n: number } | null;
};

export interface IdentitySnapshot {
  action: IdentityAction;
  firstId: string;
  firstValue: string;
  secondId: string;
  secondValue: string;
  /** null 表示赋值被拒绝，没有产生第二个对象 */
  sameObject: boolean | null;
  error: string | null;
}

export interface IdentityInstance {
  update(options: IdentityArgsView): void;
  dispose(): void;
}

function sharedPojoDoc(): A.Doc<IdDoc> {
  return A.change(A.init<IdDoc>({ actor: 'aaaa' }), (d) => {
    const shared = { n: 1 };
    d.first = shared; // 拷贝此刻的 { n: 1 }，shared 从此与文档无关
    shared.n = 42; // 只改裸对象，不影响已进入文档的副本
    d.second = shared; // 再次拷贝，这次是 { n: 42 }
  });
}

function internalMoveDoc(): { doc: A.Doc<IdDoc>; error: string | null } {
  const doc = A.from<IdDoc>({ first: { n: 1 }, second: null });
  try {
    // 把文档内已有对象赋给另一个键：Automerge 3 直接拒绝文档内引用
    return {
      doc: A.change(doc, (d) => {
        d.second = d.first;
      }),
      error: null,
    };
  } catch (cause) {
    return {
      doc,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

function shortObjectId(id: string): string {
  return id.length > 20 ? `${id.slice(0, 19)}…` : id;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function buildIdentitySnapshot(
  options: IdentityOptions,
): IdentitySnapshot {
  if (options.action === 'shared-pojo') {
    const doc = sharedPojoDoc();
    const firstId = A.getObjectId(doc.first) ?? '—';
    const secondId = A.getObjectId(doc.second) ?? '—';
    return {
      action: options.action,
      firstId,
      firstValue: JSON.stringify(doc.first),
      secondId,
      secondValue: JSON.stringify(doc.second),
      sameObject: firstId === secondId,
      error: null,
    };
  }

  const { doc, error } = internalMoveDoc();
  return {
    action: options.action,
    firstId: A.getObjectId(doc.first) ?? '—',
    firstValue: JSON.stringify(doc.first),
    secondId: '—',
    secondValue: '未写入（赋值被拒绝）',
    sameObject: null,
    error,
  };
}

interface DrawLine {
  text: string;
  color: string;
  bold?: boolean;
}

export function createIdentityDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: IdentitySnapshot) => void,
): IdentityInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: IdentityOptions = { action: 'shared-pojo' };

  function draw() {
    const snapshot = buildIdentitySnapshot(current);
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const lines: DrawLine[] = [
      {
        text: `身份操作：${IDENTITY_ACTION_LABELS[snapshot.action]}`,
        color: '#172033',
        bold: true,
      },
      {
        text: `doc.first  = ${snapshot.firstValue}   ObjID: ${shortObjectId(snapshot.firstId)}`,
        color: '#334155',
      },
      {
        text: `doc.second = ${snapshot.secondValue}   ObjID: ${shortObjectId(snapshot.secondId)}`,
        color: '#334155',
      },
    ];

    if (snapshot.error) {
      lines.push({
        text: `捕获 RangeError：${truncate(snapshot.error, 64)}`,
        color: '#dc2626',
        bold: true,
      });
    } else {
      lines.push({
        text: `是同一个对象吗：${snapshot.sameObject ? '是' : '否——两次独立拷贝'}`,
        color: '#166534',
        bold: true,
      });
    }

    let y = 48;
    for (const line of lines) {
      drawingContext.fillStyle = line.color;
      drawingContext.font = `${line.bold ? '600 ' : ''}14px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillText(truncate(line.text, 70), 24, y);
      y += 30;
    }

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = { action: actionFromLabel(options.action) };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
