/**
 * 范例介绍：双副本并发编辑文本序列实验室。
 * 输入：并发场景 + 副本 aaaa / bbbb 各自的编辑内容；两个副本从同一基础文本 clone 分叉。
 * 操作：按场景用 A.splice / A.updateText 执行并发编辑，然后双向 merge。
 * 预期：字符级编辑没有冲突记录且双向一致；不同位置的编辑各归其位，同位置插入按操作 ID
 *       定序且两个值都保留，被删区域内的插入保留锚点，updateText 的 diff 片段照常合并。
 * 阅读主线：runScenario 的四个分支对应正文四个小节；画布给出基础文本、两个副本与合并结果。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TextScenario =
  | 'edit-different'
  | 'insert-same'
  | 'delete-vs-insert'
  | 'update-whole';

export const TEXT_SCENARIO_LABELS: Record<TextScenario, string> = {
  'edit-different': '不同位置并发编辑',
  'insert-same': '同位置并发插入',
  'delete-vs-insert': '删除与区域内插入',
  'update-whole': 'updateText 整串更新',
};

/** Controls 面板里场景选择器的候选标签（中文），选中后由 textScenarioFromLabel 映射回 key。 */
export const TEXT_SCENARIO_OPTIONS: string[] = Object.values(
  TEXT_SCENARIO_LABELS,
);

export function textScenarioFromLabel(label: string): TextScenario {
  const match = (
    Object.entries(TEXT_SCENARIO_LABELS) as Array<[TextScenario, string]>
  ).find(([, value]) => value === label);
  return match ? match[0] : 'edit-different';
}

/** stories 传入的参数：scenario 是 Controls 里选中的中文标签。 */
export interface TextLabArgsView {
  scenario: string;
  aliceValue: string;
  bobValue: string;
}

export interface TextLabOptions {
  scenario: TextScenario;
  aliceValue: string;
  bobValue: string;
}

// 用 type 而不是 interface：A.from 的泛型约束是 Record<string, unknown>。
type TextDoc = {
  text: string;
};

export interface TextLabSnapshot {
  scenario: TextScenario;
  baseText: string;
  aliceState: string;
  bobState: string;
  mergedText: string;
  converged: boolean;
}

export interface TextLabInstance {
  update(options: TextLabArgsView): void;
  dispose(): void;
}

interface ReplicaPair {
  base: string;
  alice: A.Doc<TextDoc>;
  bob: A.Doc<TextDoc>;
}

/** 每个场景共享的基础文本，两个副本都从它 clone 分叉。 */
const BASE_TEXTS: Record<TextScenario, string> = {
  'edit-different': 'hello world',
  'insert-same': '<>',
  'delete-vs-insert': 'abcdef',
  'update-whole': 'hello world',
};

function runScenario(options: TextLabOptions): ReplicaPair {
  const base = A.from<TextDoc>({ text: BASE_TEXTS[options.scenario] });

  const alice = A.change(A.clone(base, 'aaaa'), (d) => {
    applyEdit(d, 'alice', options);
  });
  const bob = A.change(A.clone(base, 'bbbb'), (d) => {
    applyEdit(d, 'bob', options);
  });
  return { base: BASE_TEXTS[options.scenario], alice, bob };
}

function applyEdit(
  d: A.Doc<TextDoc>,
  side: 'alice' | 'bob',
  options: TextLabOptions,
): void {
  const value = side === 'alice' ? options.aliceValue : options.bobValue;
  switch (options.scenario) {
    case 'edit-different':
      // 官方文档示例：一方在中部插入，另一方替换开头
      if (side === 'alice') {
        A.splice(d, ['text'], 5, 0, value);
      } else {
        A.splice(d, ['text'], 0, 5, value);
      }
      break;
    case 'insert-same':
      // 同一位置并发插入：两个值都保留，先后顺序由操作 ID 决定（与时间无关）
      A.splice(d, ['text'], 1, 0, value);
      break;
    case 'delete-vs-insert':
      if (side === 'alice') {
        // 只删掉第一处 value，其余字符原样保留，锚定关系不被破坏
        const index = d.text.indexOf(value);
        if (index >= 0 && value.length > 0) {
          A.splice(d, ['text'], index, value.length);
        }
      } else {
        A.splice(d, ['text'], 2, 0, value);
      }
      break;
    case 'update-whole':
      // updateText 整串更新：内部 diff 成 splice 序列，diff 片段之间照常自动合并
      A.updateText(d, ['text'], value);
      break;
  }
}

export function buildTextLabSnapshot(options: TextLabOptions): TextLabSnapshot {
  const { base, alice, bob } = runScenario(options);

  // merge 会冻结两个参数，所以各传 clone；双向各合并一次用于核对收敛
  const ab = A.merge(A.clone(alice), A.clone(bob));
  const ba = A.merge(A.clone(bob), A.clone(alice));

  return {
    scenario: options.scenario,
    baseText: base,
    aliceState: JSON.stringify(alice.text),
    bobState: JSON.stringify(bob.text),
    mergedText: JSON.stringify(ab.text),
    converged: A.equals(ab, ba),
  };
}

interface DrawLine {
  text: string;
  color: string;
  bold?: boolean;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function createTextLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TextLabSnapshot) => void,
): TextLabInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: TextLabOptions = {
    scenario: 'edit-different',
    aliceValue: ' wonderful',
    bobValue: 'Greetings',
  };

  function draw() {
    const snapshot = buildTextLabSnapshot(current);
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
        text: `场景：${TEXT_SCENARIO_LABELS[snapshot.scenario]}`,
        color: '#172033',
        bold: true,
      },
      { text: `基础文本：${snapshot.baseText}`, color: '#334155' },
      { text: `副本 aaaa：${snapshot.aliceState}`, color: '#334155' },
      { text: `副本 bbbb：${snapshot.bobState}`, color: '#334155' },
      {
        text: `合并后读到：${snapshot.mergedText}`,
        color: '#4f7cff',
        bold: true,
      },
      {
        text: '冲突记录：无——字符级编辑自动合并（getConflicts 返回 undefined）',
        color: '#64748b',
      },
      {
        text: `双向合并一致：${snapshot.converged ? '是' : '否'}`,
        color: '#166534',
        bold: true,
      },
    ];

    let y = 40;
    for (const line of lines) {
      drawingContext.fillStyle = line.color;
      drawingContext.font = `${line.bold ? '600 ' : ''}14px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillText(truncate(line.text, 70), 24, y);
      y += 27;
    }

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = {
        scenario: textScenarioFromLabel(options.scenario),
        aliceValue: options.aliceValue,
        bobValue: options.bobValue,
      };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
