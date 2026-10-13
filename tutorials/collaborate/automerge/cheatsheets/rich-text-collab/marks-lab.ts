/**
 * 范例介绍：mark 与块标记实验室（纯数据层，不涉及编辑器）。
 * 输入：场景（插入继承 / 块标记 / 并发标记·异名 / 并发标记·同名）+ expand 选择 + 插入位置。
 * 操作：「插入继承」给基础文档加 strong [0,5)，副本 bbbb 并发插入「XY」后 merge；
 *       「块标记」依次执行 splitBlock / updateBlock / joinBlock；
 *       「并发标记」两个副本对同一段区域各自 mark 后 merge。
 * 预期：expand 决定边界插入是否继承格式（both 双向延伸 / none 不延伸 / before 向左 /
 *       after 向右），区域中间的插入永远继承；不同名字的并发标记并存，同名异值收敛为
 *       单值且与 merge 先后无关；块标记占一个索引，updateBlock / joinBlock 的索引是
 *       标记本身的位置，首块没有标记。
 * 阅读主线：四个场景共用同一份 spans 读数；「继承加粗」等结论由合并结果现场计算，
 * 不是写死的文案。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type MarkScene = 'insert' | 'blocks' | 'marks-diff' | 'marks-same';

export const MARK_SCENE_LABELS: Record<MarkScene, string> = {
  insert: '插入继承（expand 矩阵）',
  blocks: '块标记：拆段、改标题、合段',
  'marks-diff': '并发标记：不同名字',
  'marks-same': '并发标记：同名异值',
};

export const MARK_SCENE_OPTIONS: string[] = Object.values(MARK_SCENE_LABELS);

export function markSceneFromLabel(label: string): MarkScene {
  const match = (
    Object.entries(MARK_SCENE_LABELS) as Array<[MarkScene, string]>
  ).find(([, value]) => value === label);
  return match ? match[0] : 'insert';
}

export type ExpandChoice = 'both' | 'none' | 'before' | 'after';

export const EXPAND_LABELS: Record<ExpandChoice, string> = {
  both: 'both 双向延伸（默认）',
  none: 'none 不延伸',
  before: 'before 向左延伸',
  after: 'after 向右延伸',
};

export const EXPAND_OPTIONS: string[] = Object.values(EXPAND_LABELS);

export function expandFromLabel(label: string): ExpandChoice {
  const match = (
    Object.entries(EXPAND_LABELS) as Array<[ExpandChoice, string]>
  ).find(([, value]) => value === label);
  return match ? match[0] : 'both';
}

export type InsertPos = 'inside' | 'left' | 'right';

export const INSERT_POS_LABELS: Record<InsertPos, string> = {
  inside: '区域中间（index 2）',
  left: '左边界（index 0）',
  right: '右边界（index 5）',
};

export const INSERT_POS_OPTIONS: string[] = Object.values(INSERT_POS_LABELS);

export function insertPosFromLabel(label: string): InsertPos {
  const match = (
    Object.entries(INSERT_POS_LABELS) as Array<[InsertPos, string]>
  ).find(([, value]) => value === label);
  return match ? match[0] : 'inside';
}

/** 插入位置对应的字符索引（基础文本 hello world，标记覆盖 [0,5)）。 */
const POS_INDEX: Record<InsertPos, number> = { inside: 2, left: 0, right: 5 };

/** Controls 传入的参数：三个都是 Controls 里选中的中文标签。 */
export interface MarksLabArgsView {
  scene: string;
  expand: string;
  insertPos: string;
}

export interface MarksLabOptions {
  scene: MarkScene;
  expand: ExpandChoice;
  insertPos: InsertPos;
}

export interface MarksLabSnapshot {
  rows: Array<[string, string]>;
}

export interface MarksLabInstance {
  update(options: MarksLabArgsView): void;
  dispose(): void;
}

// 用 type 而不是 interface：A.from 的泛型约束是 Record<string, unknown>。
type RichTextDoc = {
  rich: string;
};

/** spans JSON 太长时按宽度折行，供画布逐行绘制。 */
function wrapText(text: string, width = 62): string[] {
  const lines: string[] = [];
  let rest = text;
  while (rest.length > width) {
    lines.push(rest.slice(0, width));
    rest = rest.slice(width);
  }
  lines.push(rest);
  return lines;
}

function spansText(doc: A.Doc<RichTextDoc>): string {
  return JSON.stringify(A.spans(doc, ['rich']));
}

/** 「插入继承」场景：XY 落在哪个 span、是否带 strong，由合并结果现场计算。 */
function insertedIsBold(doc: A.Doc<RichTextDoc>): boolean | null {
  const text = A.spans(doc, ['rich'])
    .map((span) => (span.type === 'text' ? span.value : ''))
    .join('');
  const index = text.indexOf('XY');
  if (index < 0) {
    return null;
  }
  let offset = 0;
  for (const span of A.spans(doc, ['rich'])) {
    if (span.type !== 'text') {
      offset += 1; // 块标记占一个索引
      continue;
    }
    if (index >= offset && index < offset + span.value.length) {
      return span.marks?.strong === true;
    }
    offset += span.value.length;
  }
  return null;
}

/** 各 expand 选择的语义提示（结论行的「实测」部分由合并结果计算）。 */
const EXPAND_HINTS: Record<ExpandChoice, string> = {
  both: 'both 向两侧延伸，左右边界都继承',
  none: 'none 不延伸，边界插入落在标记外',
  before: 'before 只向区间起点一侧延伸',
  after: 'after 只向区间终点一侧延伸',
};

function buildInsertRows(options: MarksLabOptions): Array<[string, string]> {
  const base = A.change(A.from<RichTextDoc>({ rich: 'hello world' }), (d) => {
    A.mark(d, ['rich'], { start: 0, end: 5, expand: options.expand }, 'strong', true);
  });
  const pos = POS_INDEX[options.insertPos];
  const b = A.change(A.clone(base, 'bbbb'), (d) => {
    A.splice(d, ['rich'], pos, 0, 'XY');
  });
  // merge 会冻结参数，传 clone；本场景只有 b 有编辑，合并后即收敛结果
  const merged = A.merge(b, A.clone(base, 'aaaa'));
  const bold = insertedIsBold(merged);

  const rows: Array<[string, string]> = [
    ['基础标记', `strong 覆盖 [0,5)，expand=${options.expand}`],
    ['并发操作', `副本 bbbb 在 index ${pos} 插入「XY」后 merge`],
    ['合并后 spans', spansText(merged)],
    [
      '插入的 XY 继承加粗',
      bold === null ? '—（没找到 XY）' : bold ? '是' : '否',
    ],
  ];
  if (options.insertPos === 'inside') {
    rows.push(['结论', '区域中间的插入永远继承，与 expand 无关']);
  } else {
    rows.push([
      '结论',
      `实测：边界插入${bold ? '继承' : '不继承'}加粗——${EXPAND_HINTS[options.expand]}`,
    ]);
  }
  return rows;
}

function buildBlockRows(): Array<[string, string]> {
  const doc0 = A.from<RichTextDoc>({ rich: 'hello world' });
  const doc1 = A.change(doc0, (d) => {
    A.splitBlock(d, ['rich'], 5, { type: 'paragraph' });
  });
  const doc2 = A.change(doc1, (d) => {
    A.updateBlock(d, ['rich'], 5, { type: 'heading', attrs: { level: 2 } });
  });
  const doc3 = A.change(doc2, (d) => {
    A.joinBlock(d, ['rich'], 5);
  });
  return [
    ['splitBlock(5) 后', spansText(doc1)],
    ['updateBlock(5, heading) 后', spansText(doc2)],
    ['joinBlock(5) 后', spansText(doc3)],
    ['索引说明', '块标记占一个索引；updateBlock / joinBlock 的索引是标记本身的位置；首块没有标记'],
  ];
}

function buildMarksDiffRows(): Array<[string, string]> {
  const base = A.from<RichTextDoc>({ rich: 'hello world' });
  const a = A.change(A.clone(base, 'aaaa'), (d) => {
    A.mark(d, ['rich'], { start: 6, end: 11, expand: 'both' }, 'em', true);
  });
  const b = A.change(A.clone(base, 'bbbb'), (d) => {
    A.mark(d, ['rich'], { start: 6, end: 11, expand: 'both' }, 'strong', true);
  });
  const merged = A.merge(A.clone(a), A.clone(b));
  return [
    ['副本 aaaa 加的标记', 'em 覆盖 [6,11)'],
    ['副本 bbbb 加的标记', 'strong 覆盖 [6,11)'],
    ['合并后 spans', spansText(merged)],
    ['结论', '不同名字互不覆盖：world 同时带 em 与 strong'],
  ];
}

function buildMarksSameRows(): Array<[string, string]> {
  const base = A.from<RichTextDoc>({ rich: 'hello world' });
  const a = A.change(A.clone(base, 'aaaa'), (d) => {
    A.mark(d, ['rich'], { start: 0, end: 5, expand: 'both' }, 'color', 'red');
  });
  const b = A.change(A.clone(base, 'bbbb'), (d) => {
    A.mark(d, ['rich'], { start: 0, end: 5, expand: 'both' }, 'color', 'blue');
  });
  const ab = A.merge(A.clone(a), A.clone(b));
  const ba = A.merge(A.clone(b), A.clone(a));
  return [
    ['副本 aaaa 的写入', "color = 'red' 覆盖 [0,5)"],
    ['副本 bbbb 的写入', "color = 'blue' 覆盖 [0,5)"],
    ['合并后 spans', spansText(ab)],
    ['结论', `同名收敛为单值，双向 merge 一致：${A.equals(ab, ba) ? '是' : '否'}（按操作定序，与谁先谁后无关）`],
  ];
}

export function buildMarksLabSnapshot(
  options: MarksLabOptions,
): MarksLabSnapshot {
  let rows: Array<[string, string]>;
  switch (options.scene) {
    case 'blocks':
      rows = buildBlockRows();
      break;
    case 'marks-diff':
      rows = buildMarksDiffRows();
      break;
    case 'marks-same':
      rows = buildMarksSameRows();
      break;
    default:
      rows = buildInsertRows(options);
  }
  return { rows };
}

interface DrawLine {
  text: string;
  color: string;
  bold?: boolean;
}

const LINE_COLORS = {
  title: '#172033',
  body: '#334155',
  note: '#64748b',
  accent: '#4f7cff',
};

export function createMarksLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MarksLabSnapshot) => void,
): MarksLabInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: MarksLabOptions = {
    scene: 'insert',
    expand: 'both',
    insertPos: 'inside',
  };

  function draw() {
    const snapshot = buildMarksLabSnapshot(current);
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
        text: `场景：${MARK_SCENE_LABELS[current.scene]}`,
        color: LINE_COLORS.title,
        bold: true,
      },
    ];
    snapshot.rows.forEach(([label, value], index) => {
      const isLast = index === snapshot.rows.length - 1;
      const color = isLast
        ? LINE_COLORS.accent
        : index === 0
          ? LINE_COLORS.body
          : LINE_COLORS.note;
      for (const [lineIndex, part] of wrapText(`${label}：${value}`).entries()) {
        lines.push({
          text: lineIndex === 0 ? part : `  ${part}`,
          color: lineIndex === 0 ? color : LINE_COLORS.note,
          bold: isLast && lineIndex === 0,
        });
      }
    });

    let y = 36;
    const maxLines = Math.floor((height - 24) / 24);
    for (const line of lines.slice(0, maxLines)) {
      drawingContext.fillStyle = line.color;
      drawingContext.font = `${line.bold ? '600 ' : ''}14px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillText(line.text.slice(0, 68), 24, y);
      y += 24;
    }

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = {
        scene: markSceneFromLabel(options.scene),
        expand: expandFromLabel(options.expand),
        insertPos: insertPosFromLabel(options.insertPos),
      };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
