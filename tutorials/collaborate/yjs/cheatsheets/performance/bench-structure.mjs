/*
基准:结构形态——编辑落点(碎片化)、嵌套深度、批量导入方式。
用法:node bench-structure.mjs
场景一:同样 2000 次文本编辑,分别从尾部追加 / 文档中段 / 随机位置插入;
       对比快照体积、物理 struct 条数(Y.decodeUpdate)与加载时间(9 次取中位数)。
       随机位置用固定种子的 LCG,保证可复现。
场景二:同样 4000 个叶子,扁平 1 层 / 深套 8 层 / 分桶 40 与 400 组,
       对比 applyUpdate 时间(15 次取中位数)、编码体积、单键编辑的增量字节。
场景三:批量导入 5 万条——Y.Text 逐字符 append(字符串合并 O(n²))vs 整段插入,
       Y.Array 逐条 push(每次从头找位置 O(n²))vs 整段 insert,Y.Map 逐键 set 作对照。
每次重建全新文档,保证结果确定。
*/
import * as Y from 'yjs';

const EDITS = 2000;
const LEAVES = 4000;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function timeApply(update, rounds) {
  const times = [];
  for (let round = 0; round < rounds; round += 1) {
    const doc = new Y.Doc();
    const t0 = performance.now();
    Y.applyUpdate(doc, update);
    times.push(performance.now() - t0);
  }
  return median(times);
}

// 固定种子 LCG:随机落点也完全可复现。
function lcg(seed) {
  let state = seed;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

// ---- 场景一:编辑落点 ----
console.log(`== 场景一:同样 ${EDITS} 次编辑,不同落点(内容总量相同) ==`);
for (const locus of ['append', 'mid', 'random']) {
  const doc = new Y.Doc();
  const text = doc.getText('t');
  const nextRandom = lcg(42);
  for (let i = 0; i < EDITS; i += 1) {
    if (locus === 'append') text.insert(text.length, `词${i} `);
    else if (locus === 'mid') text.insert(Math.floor(text.length / 2), `词${i} `);
    else text.insert(Math.floor(nextRandom() * (text.length + 1)), `词${i} `);
  }
  const snapshot = Y.encodeStateAsUpdate(doc);
  console.log(
    `${locus.padEnd(7)}: 快照 ${snapshot.byteLength} B | 物理 structs ${Y.decodeUpdate(snapshot).structs.length} | 加载 ${timeApply(snapshot, 9).toFixed(2)} ms`,
  );
}

// ---- 场景二:嵌套深度与分桶 ----
console.log(`== 场景二:同样 ${LEAVES} 个叶子,不同组织深度 ==`);
function buildTree(depth, buckets) {
  const doc = new Y.Doc();
  let type = doc.getMap('root');
  if (buckets > 1) {
    const perBucket = LEAVES / buckets;
    for (let b = 0; b < buckets; b += 1) {
      // 先挂到文档再填内容:未集成的 detached 类型上的写入不可靠。
      const bucket = new Y.Map();
      type.set(`b${b}`, bucket);
      let current = bucket;
      for (let level = 1; level < depth; level += 1) {
        const next = new Y.Map();
        current.set(`l${level}`, next);
        current = next;
      }
      for (let i = 0; i < perBucket; i += 1) current.set(`k${i}`, { v: i });
    }
  } else {
    for (let level = 1; level < depth; level += 1) {
      const next = new Y.Map();
      type.set(`l${level}`, next);
      type = next;
    }
    for (let i = 0; i < LEAVES; i += 1) type.set(`k${i}`, { v: i });
  }
  return doc;
}
for (const { depth, buckets } of [
  { depth: 1, buckets: 1 },
  { depth: 8, buckets: 1 },
  { depth: 2, buckets: 40 },
  { depth: 2, buckets: 400 },
]) {
  const doc = buildTree(depth, buckets);
  const snapshot = Y.encodeStateAsUpdate(doc);
  const probe = new Y.Doc();
  Y.applyUpdate(probe, snapshot);
  let editSize = 0;
  probe.on('update', (update) => {
    editSize = update.byteLength;
  });
  const root = probe.getMap('root');
  // 沿嵌套链走到最深层:root → l1 → l2 → …,分桶时先进入 b0。
  let leaf = buckets > 1 ? root.get('b0') : root;
  for (let level = 1; level < depth; level += 1) leaf = leaf.get(`l${level}`);
  leaf.set('k0', '新值');
  console.log(
    `depth=${depth} buckets=${buckets}: applyUpdate ${timeApply(snapshot, 15).toFixed(2)} ms | 编码 ${snapshot.byteLength} B | 单键编辑增量 ${editSize} B`,
  );
}

// ---- 场景三:批量导入方式 ----
console.log('== 场景三:批量导入 50000 条 ==');
function timeIt(fn) {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}
const N = 50000;
console.log(
  'Y.Text 逐字符追加   :',
  timeIt(() => {
    const d = new Y.Doc();
    const t = d.getText('t');
    d.transact(() => {
      for (let i = 0; i < N; i += 1) t.insert(t.length, 'x');
    });
  }).toFixed(0),
  'ms(字符串合并 O(n²))',
);
console.log(
  'Y.Text 整段插入     :',
  timeIt(() => {
    const d = new Y.Doc();
    const t = d.getText('t');
    d.transact(() => {
      t.insert(0, 'x'.repeat(N));
    });
  }).toFixed(1),
  'ms',
);
console.log(
  'Y.Array 逐条 push   :',
  timeIt(() => {
    const d = new Y.Doc();
    const a = d.getArray('a');
    d.transact(() => {
      for (let i = 0; i < 20000; i += 1) a.push(['x']);
    });
  }).toFixed(0),
  'ms(2 万条,每次 push 从头找位置 O(n²))',
);
console.log(
  'Y.Array 整段 insert :',
  timeIt(() => {
    const d = new Y.Doc();
    const a = d.getArray('a');
    d.transact(() => {
      a.insert(0, Array.from({ length: N }, (_, i) => 'x'));
    });
  }).toFixed(1),
  'ms',
);
console.log(
  'Y.Map 逐键 set      :',
  timeIt(() => {
    const d = new Y.Doc();
    const m = d.getMap('m');
    d.transact(() => {
      for (let i = 0; i < N; i += 1) m.set(`k${i}`, 'x');
    });
  }).toFixed(0),
  'ms(键访问,无位置查找)',
);

// ---- 场景四:大文本量级 ----
console.log('== 场景四:20 万字符文本(200 段 × 1000 字符整段插入)==');
{
  const doc = new Y.Doc();
  const text = doc.getText('t');
  for (let i = 0; i < 200; i += 1) text.insert(text.length, 'x'.repeat(1000));
  const snapshot = Y.encodeStateAsUpdate(doc);
  const encodeTimes = [];
  const loadTimes = [];
  for (let round = 0; round < 7; round += 1) {
    let t0 = performance.now();
    Y.encodeStateAsUpdate(doc);
    encodeTimes.push(performance.now() - t0);
    const fresh = new Y.Doc();
    t0 = performance.now();
    Y.applyUpdate(fresh, snapshot);
    loadTimes.push(performance.now() - t0);
  }
  console.log(
    `快照 ${(snapshot.byteLength / 1024).toFixed(0)} KB | 全量编码中位数 ${median(encodeTimes).toFixed(2)} ms | 加载中位数 ${median(loadTimes).toFixed(2)} ms`,
  );
}
