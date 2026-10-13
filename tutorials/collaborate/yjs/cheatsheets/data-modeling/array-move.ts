/**
 * 范例:Y.Array 移动方案的并发行为(yjs 13.x 没有原生 move)。
 * 演示:顺序直接存在数组结构里时,移动一张卡 = delete + insert 两次操作、
 *       产生一个新 item;两端并发移动时,删除各自命中、插入都保留。
 * 输入:并发场景(两端移动同一张卡 / 两端把不同卡移到同一位置)。
 * 操作:两副本从同一基线克隆,各自离线执行移动,再互换 update 模拟同步。
 * 预期:两副本收敛一致;但「同一张卡被两端同时移动」会让该卡在每个副本
 *       出现两份——顺序存结构的方案在并发拖拽下的核心代价。
 * 阅读主线:replay() 按场景执行两端的 delete/insert 并同步 → draw() 对照
 *       两副本序列,红色标出重复卡片。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type MoveScenario = 'same-card' | 'different-card';

export interface ArrayMoveOptions {
  scenario: MoveScenario;
}

export interface SequenceBox {
  title: string;
  /** 该卡片在序列中出现了不止一次 */
  duplicate: boolean;
}

export interface ArrayMoveSnapshot {
  boxesA: SequenceBox[];
  boxesB: SequenceBox[];
  /** A 副本顺序(顿号连接) */
  sequenceA: string;
  /** B 副本顺序(顿号连接) */
  sequenceB: string;
  /** 「收敛」或「不一致」 */
  converged: string;
  /** 重复卡片描述;无重复时为「无」 */
  duplicates: string;
  /** A 端执行的操作 */
  opsA: string;
  /** B 端执行的操作 */
  opsB: string;
}

export interface ArrayMoveInstance {
  update(options: ArrayMoveOptions): void;
  dispose(): void;
}

const BASE_ORDER = ['设计', '开发', '测试', '上线'];

function findDuplicates(list: string[]): Array<{ title: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of list) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([title, count]) => ({ title, count }));
}

function replay(options: ArrayMoveOptions): ArrayMoveSnapshot {
  // 基线数组只存卡片标识(这里直接用标题演示);实体本体在别处的表里
  const origin = new Y.Doc();
  origin.getArray<string>('order').insert(0, [...BASE_ORDER]);

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  Y.applyUpdate(docA, Y.encodeStateAsUpdate(origin));
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(origin));
  const arrA = docA.getArray<string>('order');
  const arrB = docB.getArray<string>('order');

  let opsA = '不操作';
  let opsB = '不操作';

  if (options.scenario === 'same-card') {
    // 两端都移动「开发」:A 放到末尾,B 放到最前
    arrA.delete(1, 1);
    arrA.insert(arrA.length, ['开发']);
    opsA = 'delete(1) + insert(末尾)「开发」';
    arrB.delete(1, 1);
    arrB.insert(0, ['开发']);
    opsB = 'delete(1) + insert(最前)「开发」';
  } else {
    // A:「开发」放到测试与上线之间;B:「设计」也放到测试与上线之间
    arrA.delete(1, 1);
    arrA.insert(2, ['开发']);
    opsA = 'delete(1) + insert(2)「开发」';
    arrB.delete(0, 1);
    arrB.insert(2, ['设计']);
    opsB = 'delete(0) + insert(2)「设计」';
  }

  // 双向互换 update,模拟实时同步完成后的状态
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
  Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));

  const listA = arrA.toArray();
  const listB = arrB.toArray();
  const dupA = findDuplicates(listA);
  const mark = (list: string[]): SequenceBox[] => {
    const dupTitles = new Set(findDuplicates(list).map((item) => item.title));
    return list.map((title) => ({ title, duplicate: dupTitles.has(title) }));
  };

  return {
    boxesA: mark(listA),
    boxesB: mark(listB),
    sequenceA: listA.join('、'),
    sequenceB: listB.join('、'),
    converged: JSON.stringify(listA) === JSON.stringify(listB) ? '收敛' : '不一致',
    duplicates:
      dupA.length > 0
        ? dupA.map((item) => `「${item.title}」出现 ${item.count} 份`).join(',')
        : '无',
    opsA,
    opsB,
  };
}

export function createArrayMove(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ArrayMoveSnapshot) => void,
): ArrayMoveInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  let current: ArrayMoveOptions = { scenario: 'same-card' };
  let snapshot: ArrayMoveSnapshot = replay(current);

  function drawRow(label: string, ops: string, boxes: SequenceBox[], y: number): void {
    g.fillStyle = '#334155';
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillText(label, 24, y);

    g.fillStyle = '#64748b';
    g.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText(ops, 90, y);

    let x = 24;
    boxes.forEach((box, index) => {
      const boxWidth = Math.max(56, box.title.length * 14 + 26);
      g.fillStyle = box.duplicate ? '#fef2f2' : '#ffffff';
      g.strokeStyle = box.duplicate ? '#ef4444' : '#cbd5e1';
      g.lineWidth = box.duplicate ? 1.8 : 1.2;
      g.beginPath();
      g.roundRect(x, y + 10, boxWidth, 38, 6);
      g.fill();
      g.stroke();

      g.fillStyle = box.duplicate ? '#b91c1c' : '#172033';
      g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      g.fillText(box.title, x + (boxWidth - box.title.length * 13) / 2, y + 34);

      g.fillStyle = '#94a3b8';
      g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(String(index), x + boxWidth / 2 - 3, y + 62);

      x += boxWidth + 8;
      if (index < boxes.length - 1) {
        g.fillStyle = '#94a3b8';
        g.fillText('→', x, y + 34);
        x += 18;
      }
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = 300;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    g.fillStyle = '#172033';
    g.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    g.fillText('Y.Array 移动 = delete + insert:并发时两端的插入都保留', 24, 32);

    g.fillStyle = '#475569';
    g.font = '12px ui-sans-serif, system-ui, sans-serif';
    g.fillText('基线:设计、开发、测试、上线 · 红框 = 重复出现的同一张卡 · 灰色数字为位置下标', 24, 56);

    drawRow('副本 A', snapshot.opsA, snapshot.boxesA, 84);
    drawRow('副本 B', snapshot.opsB, snapshot.boxesB, 176);

    g.fillStyle = snapshot.duplicates === '无' ? '#475569' : '#b91c1c';
    g.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    g.fillText(
      snapshot.duplicates === '无'
        ? `两副本${snapshot.converged}、无重复:不同卡的并发移动通常只打乱顺序,不复制卡片`
        : `同一张卡被两端同时移动 —— ${snapshot.duplicates},渲染层会渲染出两张一样的卡`,
      24,
      height - 16,
    );

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      snapshot = replay(options);
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
