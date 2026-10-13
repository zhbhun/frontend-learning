/**
 * 范例介绍：双副本并发操作实验室。
 * 输入：并发场景 + 副本 aaaa / bbbb 各自写入的内容；两个副本从同一基础文档 clone 分叉。
 * 操作：按场景对同一位置执行并发写，然后双向 merge。
 * 预期：四种场景的双向合并结果都一致；并发赋值与整体替换会在 getConflicts 留下两个候选值，
 *       同位置插入两个值都保留且顺序确定，改写与删除并发时改写胜出。
 * 阅读主线：runScenario 的四个分支对应正文四个小节；画布展示各副本状态与合并后的收敛读数。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ScenarioKey =
  | 'map-assign'
  | 'list-insert'
  | 'list-overwrite'
  | 'replace-object';

export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  'map-assign': '并发赋值（map）',
  'list-insert': '同位置插入（list）',
  'list-overwrite': '改写与删除（list）',
  'replace-object': '整体替换（对象）',
};

/** Controls 面板里场景选择器的候选标签（中文），选中后由 scenarioFromLabel 映射回 key。 */
export const SCENARIO_OPTIONS: string[] = Object.values(SCENARIO_LABELS);

export function scenarioFromLabel(label: string): ScenarioKey {
  const match = (Object.entries(SCENARIO_LABELS) as Array<[ScenarioKey, string]>).find(
    ([, value]) => value === label,
  );
  return match ? match[0] : 'map-assign';
}

/** stories 传入的参数：scenario 是 Controls 里选中的中文标签。 */
export interface LabArgsView {
  scenario: string;
  aliceValue: string;
  bobValue: string;
}

export interface LabOptions {
  scenario: ScenarioKey;
  aliceValue: string;
  bobValue: string;
}

// 用 type 而不是 interface：A.from 的泛型约束是 Record<string, unknown>，
// 接口没有隐式索引签名，无法满足该约束。
type LabDoc = {
  key: string | null;
  log: A.List<string>;
  card: { title: string; done: boolean };
};

export interface ConflictLine {
  opId: string;
  value: string;
}

export interface LabSnapshot {
  scenario: ScenarioKey;
  aliceState: string;
  bobState: string;
  /** 带字段前缀的完整读数，用于画布 */
  mergedValue: string;
  /** 只有值本身且更短，用于左下角读数面板 */
  mergedShort: string;
  conflicts: ConflictLine[];
  converged: boolean;
}

export interface LabInstance {
  update(options: LabArgsView): void;
  dispose(): void;
}

function makeBase(): A.Doc<LabDoc> {
  return A.from<LabDoc>({
    key: '共同初值',
    log: ['起点', '目标'] as A.List<string>,
    card: { title: '标题', done: false },
  });
}

function describeValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (value instanceof A.Counter) {
    return String(value.valueOf());
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value === null || value === undefined || typeof value !== 'object') {
    return String(value);
  }
  return JSON.stringify(value);
}

function truncate(text: string, max = 52): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

interface ReplicaPair {
  alice: A.Doc<LabDoc>;
  bob: A.Doc<LabDoc>;
}

function runScenario(options: LabOptions): ReplicaPair {
  const base = makeBase();
  const alice = A.clone(base, { actor: 'aaaa' });
  const bob = A.clone(base, { actor: 'bbbb' });

  switch (options.scenario) {
    case 'map-assign':
      // 并发赋值同一个 key：唯一的冲突来源，读值收敛到操作 ID 决定的胜者
      return {
        alice: A.change(alice, (d) => {
          d.key = options.aliceValue;
        }),
        bob: A.change(bob, (d) => {
          d.key = options.bobValue;
        }),
      };
    case 'list-insert':
      // 同一位置并发插入：插入锚定元素身份，两个值都保留，顺序确定
      return {
        alice: A.change(alice, (d) => {
          d.log.insertAt(1, options.aliceValue);
        }),
        bob: A.change(bob, (d) => {
          d.log.insertAt(1, options.bobValue);
        }),
      };
    case 'list-overwrite':
      // 改写与删除并发作用在同一元素：改写胜出，元素保留
      return {
        alice: A.change(alice, (d) => {
          d.log.deleteAt(1);
        }),
        bob: A.change(bob, (d) => {
          d.log[1] = options.bobValue;
        }),
      };
    case 'replace-object':
      // 整体替换嵌套对象：对象也是"值"，并发替换同样按冲突规则收敛
      return {
        alice: A.change(alice, (d) => {
          d.card = { title: d.card.title, done: true };
        }),
        bob: A.change(bob, (d) => {
          d.card = { title: options.bobValue, done: false };
        }),
      };
  }
}

function stateText(
  doc: A.Doc<LabDoc>,
  scenario: ScenarioKey,
  maxLength = 52,
): string {
  switch (scenario) {
    case 'map-assign':
      return `key = ${describeValue(doc.key)}`;
    case 'list-insert':
    case 'list-overwrite':
      return `log = ${truncate(JSON.stringify(doc.log), maxLength)}`;
    case 'replace-object':
      return `card = ${truncate(JSON.stringify(doc.card), maxLength)}`;
  }
}

function stateValue(
  doc: A.Doc<LabDoc>,
  scenario: ScenarioKey,
  maxLength = 40,
): string {
  const text = stateText(doc, scenario, maxLength);
  return text.slice(text.indexOf('=') + 1).trim();
}

function conflictProp(scenario: ScenarioKey): string | null {
  if (scenario === 'map-assign') {
    return 'key';
  }
  return scenario === 'replace-object' ? 'card' : null;
}

export function buildLabSnapshot(options: LabOptions): LabSnapshot {
  const { alice, bob } = runScenario(options);
  const scenario = options.scenario;

  // merge 会冻结两个参数，所以各传 clone；双向各合并一次用于核对收敛
  const ab = A.merge(A.clone(alice), A.clone(bob));
  const ba = A.merge(A.clone(bob), A.clone(alice));

  const prop = conflictProp(scenario);
  const rawConflicts = prop ? A.getConflicts(ab, prop) : undefined;
  const conflicts = Object.entries(rawConflicts ?? {}).map(([opId, value]) => ({
    opId,
    value: truncate(describeValue(value)),
  }));

  return {
    scenario,
    aliceState: stateText(alice, scenario),
    bobState: stateText(bob, scenario),
    mergedValue: stateText(ab, scenario),
    mergedShort: stateValue(ab, scenario),
    conflicts,
    converged: A.equals(ab, ba),
  };
}

interface DrawLine {
  text: string;
  color: string;
  bold?: boolean;
}

export function createConflictLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LabSnapshot) => void,
): LabInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: LabOptions = {
    scenario: 'map-assign',
    aliceValue: '来自 A 的值',
    bobValue: '来自 B 的值',
  };

  function draw() {
    const snapshot = buildLabSnapshot(current);
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
        text: `场景：${SCENARIO_LABELS[snapshot.scenario]}`,
        color: '#172033',
        bold: true,
      },
      { text: `副本 aaaa：${snapshot.aliceState}`, color: '#334155' },
      { text: `副本 bbbb：${snapshot.bobState}`, color: '#334155' },
      {
        text: `合并后读到：${snapshot.mergedValue}`,
        color: '#4f7cff',
        bold: true,
      },
    ];

    if (snapshot.conflicts.length > 0) {
      lines.push({ text: '冲突值 getConflicts：', color: '#64748b' });
      for (const conflict of snapshot.conflicts) {
        lines.push({
          text: `  ${conflict.opId} → ${conflict.value}`,
          color: '#94a3b8',
        });
      }
    } else {
      lines.push({
        text: '冲突值 getConflicts：无（该操作组合自动合并）',
        color: '#64748b',
      });
    }

    lines.push({
      text: `双向合并一致：${snapshot.converged ? '是' : '否'}`,
      color: '#166534',
      bold: true,
    });

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
        scenario: scenarioFromLabel(options.scenario),
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
