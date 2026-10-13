/*
基准:事务粒度——单事务 vs 逐条事务写入。
用法:node bench-transaction.mjs
场景:向同一个 Y.Map 写入 N 个键值对,一种包在一个 doc.transact 里,一种每次写入独立提交。
读数:耗时(5 次取中位数,先预热)、update 事件条数、增量 update 字节合计、mergeUpdates 合并后字节。
每次输入变化都重建全新文档,保证计数干净、结果确定。
*/
import * as Y from 'yjs';

const N = 10000;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function run(batched) {
  const doc = new Y.Doc();
  const map = doc.getMap('m');
  const updates = [];
  doc.on('update', (update) => updates.push(update));
  const t0 = performance.now();
  if (batched) {
    doc.transact(() => {
      for (let i = 0; i < N; i += 1) map.set(`k${i}`, i);
    });
  } else {
    for (let i = 0; i < N; i += 1) map.set(`k${i}`, i);
  }
  const ms = performance.now() - t0;
  const total = updates.reduce((sum, update) => sum + update.byteLength, 0);
  return { ms, events: updates.length, total, merged: Y.mergeUpdates(updates).byteLength };
}

// 预热一次,排除 JIT 与首次分配的干扰。
run(true);
run(false);

const batched = median([run(true), run(true), run(true), run(true), run(true)]);
const perEdit = median([run(false), run(false), run(false), run(false), run(false)]);

console.log(`场景:同一个 Y.Map 写入 ${N} 个键值对`);
console.log('单事务  :', batched);
console.log('逐条事务:', perEdit);
console.log(
  `耗时 ${perEdit.ms / batched.ms}x | 事件 ${perEdit.events / batched.events}x | 增量字节 ${(perEdit.total / batched.total).toFixed(2)}x`,
);
