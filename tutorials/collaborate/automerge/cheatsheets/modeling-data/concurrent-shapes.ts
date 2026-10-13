/**
 * 范例介绍：集合建模方式如何改变并发合并结果。
 * 输入：并发场景 + 副本 bbbb 写入的内容；两个副本从同一份种子字节 load 分叉（共享祖先）。
 * 操作：副本 aaaa 与 bbbb 各做一次并发修改，然后双向 merge。
 * 预期：
 *   - 并发添加（list push vs map 加键）：两种建模都保留双方，map 无冲突、list 顺序由操作 ID 定序；
 *   - 清单+实体移动：移动只写 order 清单，与并发改标题干净合并，双方都保留；
 *   - 移动丢编辑：spread 重建移动 list 元素产生新对象身份，对原位置的并发编辑在合并后丢失。
 * 阅读主线：runScenario 的三个分支对应正文三处结论；读数给出合并结果、编辑是否保留与冲突候选。
 */
import * as A from '@automerge/automerge';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ShapeKey = 'concurrent-add' | 'ordered-manifest' | 'moved-element';

export const SHAPE_LABELS: Record<ShapeKey, string> = {
  'concurrent-add': '并发添加（list push vs map 加键）',
  'ordered-manifest': '清单+实体：移动与改标题',
  'moved-element': 'list 内移动元素',
};

/** Controls 面板里场景选择器的候选标签（中文）。 */
export const SHAPE_OPTIONS: string[] = Object.values(SHAPE_LABELS);

export function shapeFromLabel(label: string): ShapeKey {
  const match = (Object.entries(SHAPE_LABELS) as Array<[ShapeKey, string]>).find(
    ([, value]) => value === label,
  );
  return match ? match[0] : 'concurrent-add';
}

/** stories 传入的参数：shape 是中文标签，bobValue 是副本 bbbb 写入的内容。 */
export interface ShapeArgsView {
  shape: string;
  bobValue: string;
}

export interface ShapeSnapshot {
  shape: ShapeKey;
  /** 每个场景的关键读数行（画布展示） */
  lines: string[];
  /** 合并结果（readout 面板短句） */
  mergedShort: string;
  /** 副本 bbbb 的编辑在合并后是否可见；null 表示该场景不适用 */
  editKept: boolean | null;
  conflicts: number;
  changeBytes: number;
}

export interface ShapeInstance {
  update(options: ShapeArgsView): void;
  dispose(): void;
}

type ListDoc = { items: string[] };
type ManifestDoc = {
  order: string[];
  entities: Record<string, { title: string }>;
};
type ItemsDoc = { items: Array<{ id: string; title: string }> };

function truncate(text: string, max = 64): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function runScenario(options: ShapeArgsView): ShapeSnapshot {
  const shape = shapeFromLabel(options.shape);

  if (shape === 'concurrent-add') {
    // 同一份种子字节 load 出两个副本：共享祖先，合并才有意义
    const seed = A.save(A.from<ListDoc>({ items: ['共同起点'] }, 'c0ffee'));
    let a = A.load<ListDoc>(seed, 'aaaa');
    let b = A.load<ListDoc>(seed, 'bbbb');
    let mapA = A.load<Record<string, string>>(A.save(A.from<Record<string, string>>({}, 'c0ffee')), 'aaaa');
    let mapB = A.load<Record<string, string>>(A.save(A.from<Record<string, string>>({}, 'c0ffee')), 'bbbb');

    a = A.change(a, (x) => { x.items.push('来自 aaaa'); });
    // 刚 load 的副本没有本地变更，getLastLocalChange 就是这次 push 产生的变更
    const pushBytes = A.getLastLocalChange(a)!.byteLength;
    b = A.change(b, (x) => { x.items.push(options.bobValue); });
    mapA = A.change(mapA, (x) => { x.keyA = '来自 aaaa'; });
    mapB = A.change(mapB, (x) => { x.keyB = options.bobValue; });

    const listMerged = A.merge(A.clone(a), A.clone(b));
    const mapMerged = A.merge(A.clone(mapA), A.clone(mapB));
    const keys = Object.keys(mapMerged);
    const lines = [
      `list push 合并：${truncate(JSON.stringify(listMerged.items))}`,
      '  两个值都保留，顺序由操作 ID 决定（bbbb 的 actorId 更大所以排前）',
      `map 加键合并：${truncate(JSON.stringify(mapMerged))}`,
      '  不同键各写各的，无冲突记录',
    ];
    return {
      shape,
      lines,
      mergedShort: `list ${listMerged.items.length} 项 / map ${keys.length} 键，双方都保留`,
      editKept: true,
      conflicts: 0,
      changeBytes: pushBytes,
    };
  }

  if (shape === 'ordered-manifest') {
    const init: ManifestDoc = {
      order: ['a', 'b', 'c'],
      entities: { a: { title: 'A' }, b: { title: 'B' }, c: { title: 'C' } },
    };
    const seed = A.save(A.from<ManifestDoc>(init, 'c0ffee'));
    let a = A.load<ManifestDoc>(seed, 'aaaa');
    let b = A.load<ManifestDoc>(seed, 'bbbb');

    a = A.change(a, (x) => {
      // 移动只写 order 清单，实体内容不动
      x.order.splice(x.order.indexOf('c'), 1);
      x.order.unshift('c');
    });
    b = A.change(b, (x) => { x.entities.b.title = options.bobValue; });
    const moveBytes = A.getLastLocalChange(a)!.byteLength;

    const merged = A.merge(A.clone(a), A.clone(b));
    const lines = [
      `order 清单：${JSON.stringify(merged.order)}（只有 aaaa 动过）`,
      `b.title：${JSON.stringify(merged.entities.b.title)}（只有 bbbb 动过）`,
      `移动的变更体积：${moveBytes} 字节（与实体内容无关）`,
      '顺序与内容解耦：并发修改互不干扰，全部保留',
    ];
    return {
      shape,
      lines,
      mergedShort: `order=${JSON.stringify(merged.order)}，b.title=${merged.entities.b.title}`,
      editKept: merged.entities.b.title === options.bobValue,
      conflicts: 0,
      changeBytes: moveBytes,
    };
  }

  // moved-element：list 内移动元素本身，同时对它做并发编辑
  const init: ItemsDoc = {
    items: [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
      { id: 'c', title: 'C' },
    ],
  };
  const seed = A.save(A.from<ItemsDoc>(init, 'c0ffee'));
  let a = A.load<ItemsDoc>(seed, 'aaaa');
  let b = A.load<ItemsDoc>(seed, 'bbbb');

  // bbbb 对将要被移动的元素（末尾的 c）做并发编辑
  b = A.change(b, (x) => { x.items[2].title = options.bobValue; });
  // aaaa 把 c 移动到首位：文档对象不能 delete 后再插回（身份规则），
  // 只能 spread 重建 —— 这会产生一个全新身份的对象
  a = A.change(a, (x) => {
    const moved = { ...x.items[2] };
    x.items.splice(2, 1);
    x.items.unshift(moved);
  });

  const merged = A.merge(A.clone(a), A.clone(b));
  const movedTitle = merged.items[0].title;
  const lines = [
    `合并结果：${truncate(JSON.stringify(merged.items))}`,
    `c 被移到首位，title = ${JSON.stringify(movedTitle)}`,
    options.bobValue === movedTitle
      ? 'bbbb 对 c 的编辑保留了'
      : `bbbb 对 c 的编辑（${JSON.stringify(options.bobValue)}）丢失了：编辑落在旧对象上，移动产生的是新对象`,
    '对照组：不移动时同样的并发编辑会完整保留（见正文实测表）',
  ];
  return {
    shape,
    lines,
    mergedShort: `c.title = ${movedTitle}（bbbb 想改成 ${options.bobValue}）`,
    editKept: movedTitle === options.bobValue,
    conflicts: 0,
    changeBytes: A.getLastLocalChange(a)!.byteLength,
  };
}

export function buildShapeSnapshot(options: ShapeArgsView): ShapeSnapshot {
  return runScenario(options);
}

interface DrawLine {
  text: string;
  color: string;
  bold?: boolean;
}

export function createShapeLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ShapeSnapshot) => void,
): ShapeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ShapeArgsView = {
    shape: SHAPE_LABELS['concurrent-add'],
    bobValue: '来自 B 的值',
  };

  function draw() {
    const snapshot = buildShapeSnapshot(current);
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const lines: DrawLine[] = [
      { text: `场景：${SHAPE_LABELS[snapshot.shape]}`, color: '#172033', bold: true },
    ];
    for (const line of snapshot.lines) {
      const lost = line.includes('丢失');
      const bold = lost || line.includes('全部保留');
      lines.push({
        text: line,
        color: lost ? '#dc2626' : bold ? '#166534' : '#334155',
        bold,
      });
    }
    lines.push({
      text: `本次关键变更体积：${snapshot.changeBytes} 字节`,
      color: '#4f7cff',
      bold: true,
    });

    let y = 40;
    for (const line of lines) {
      drawingContext.fillStyle = line.color;
      drawingContext.font = `${line.bold ? '600 ' : ''}14px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillText(truncate(line.text, 74), 24, y);
      y += 27;
    }

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = { shape: options.shape, bobValue: options.bobValue };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
