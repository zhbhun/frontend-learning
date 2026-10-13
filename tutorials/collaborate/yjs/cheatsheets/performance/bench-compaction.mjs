/*
基准:update 日志压缩——增量求和 / mergeUpdates / 快照(GC)/ V2 快照。
用法:node bench-compaction.mjs
场景一:在 Y.Text 的文档中段插入 2000 次,收集每次事务的增量 update,对比四档体积,
       以及三种形态灌进全新文档的加载时间(9 次取中位数)。
场景二(墓碑):插入 100k 字符后全部删除——mergeUpdates 只合并不做 GC,快照(GC 后)才瘦身;
       gc=false 时连内容都保留。
每次重建全新文档,保证结果确定。
*/
import * as Y from 'yjs';

const EDITS = 2000;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function timeLoad(payload) {
  const times = [];
  for (let round = 0; round < 9; round += 1) {
    const doc = new Y.Doc();
    const t0 = performance.now();
    if (Array.isArray(payload)) {
      for (const update of payload) Y.applyUpdate(doc, update);
    } else {
      Y.applyUpdate(doc, payload);
    }
    times.push(performance.now() - t0);
  }
  return median(times);
}

// ---- 场景一:2000 次中段编辑的日志压缩 ----
const doc = new Y.Doc();
const text = doc.getText('t');
const updates = [];
doc.on('update', (update) => updates.push(update));
for (let i = 0; i < EDITS; i += 1) {
  text.insert(Math.floor(text.length / 2), `词${i} `);
}
const incrementalSum = updates.reduce((sum, update) => sum + update.byteLength, 0);
const merged = Y.mergeUpdates(updates);
const snapshot = Y.encodeStateAsUpdate(doc);
const snapshotV2 = Y.encodeStateAsUpdateV2(doc);

console.log(`== 场景一:Y.Text 中段插入 ${EDITS} 次 ==`);
console.log('增量求和     :', incrementalSum, 'B');
console.log('mergeUpdates :', merged.byteLength, 'B(逻辑合并,不做 GC)');
console.log('快照         :', snapshot.byteLength, 'B(GC + 物理布局,中段编辑碎片多)');
console.log('快照 V2      :', snapshotV2.byteLength, 'B');
console.log(
  '加载时间(ms) 逐条:',
  timeLoad(updates).toFixed(2),
  ' 合并:',
  timeLoad(merged).toFixed(2),
  ' 快照:',
  timeLoad(snapshot).toFixed(2),
);

// ---- 场景二:墓碑——插入后全删 ----
function runTombstone(gc) {
  const d = new Y.Doc({ gc });
  const t = d.getText('t');
  t.insert(0, 'x'.repeat(100000));
  const afterInsert = Y.encodeStateAsUpdate(d).byteLength;
  t.delete(0, 100000);
  return { afterInsert, afterDelete: Y.encodeStateAsUpdate(d).byteLength };
}
console.log('== 场景二:插入 100k 字符后全部删除 ==');
console.log('gc=true :', JSON.stringify(runTombstone(true)));
console.log('gc=false:', JSON.stringify(runTombstone(false)));

// mergeUpdates 在同一场景下保留墓碑内容
const d1 = new Y.Doc();
const t1 = d1.getText('t');
const log = [];
d1.on('update', (update) => log.push(update));
t1.insert(0, 'y'.repeat(100000));
t1.delete(0, 100000);
console.log('mergeUpdates(插入 + 全删两条):', log.map((u) => u.byteLength), '->', Y.mergeUpdates(log).byteLength, 'B');
