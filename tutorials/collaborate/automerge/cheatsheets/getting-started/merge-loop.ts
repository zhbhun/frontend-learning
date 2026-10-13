/**
 * 核心范例：跑通「创建 → 分叉 → 并发修改 → 合并」的最小闭环。
 *
 * - 前置状态：from() 把普通对象复制成两个副本的共同起点文档。
 * - 操作：clone() 分出两个副本（各带全新 actorId），副本 A 写入 field 字段；
 *   副本 B 在 concurrent 模式写同一字段（并发写），在 independent 模式写另一
 *   字段（互不冲突）。随后 merge() 互相合并并做双向一致性检查。
 * - 预期结果：两副本收敛为完全相同的文档；并发写同一字段时 Automerge 从
 *   候选值中确定唯一胜出值，getConflicts() 可检视全部候选；写不同字段则
 *   两个写入都完整保留。
 * - 阅读主线：runMergeLoop() 每一行都是 @automerge/automerge 的公开 API，
 *   不依赖 DOM，在 Node 与浏览器中原样可用。
 */
import * as A from "@automerge/automerge";

/** 示例文档：两张可供副本写入的文本字段 */
// 用 type 而不是 interface：A.from 的泛型约束是 Record<string, unknown>，
// 接口没有隐式索引签名，无法满足该约束。
export type NoteDoc = {
  title: string;
  note: string;
};

/** Controls 可选择的写入字段 */
export type NoteField = keyof NoteDoc;

/** concurrent：两副本写同一字段；independent：副本 B 写另一字段 */
export type WriteMode = "concurrent" | "independent";

export interface MergeLoopInput {
  mode: WriteMode;
  field: NoteField;
  valueA: string;
  valueB: string;
}

export interface MergeLoopResult {
  actorA: string;
  actorB: string;
  /** 副本 A 实际写入的字段与值 */
  fieldA: NoteField;
  replicaAValue: string;
  /** 副本 B 实际写入的字段与值 */
  fieldB: NoteField;
  replicaBValue: string;
  /** 合并后文档的两个字段值 */
  mergedTitle: string;
  mergedNote: string;
  /** 两个副本并发写同一字段时，getConflicts 能列出全部候选值 */
  hasConflict: boolean;
  /** 双向合并（A 并入 B、B 并入 A）后两份文档完全一致 */
  converged: boolean;
  /** change/merge 都返回新文档引用，旧文档保持原样 */
  immutableSnapshots: boolean;
}

const BASE_DOC: NoteDoc = { title: "新建笔记", note: "（未填写）" };

export function runMergeLoop(input: MergeLoopInput): MergeLoopResult {
  // from：初值被复制进文档，base 与原对象、与之后的副本都互不共享状态
  const base = A.from<NoteDoc>({ ...BASE_DOC });

  // clone：可写副本，带全新 actorId —— 相当于另一台设备拿到了同一份文档
  let replicaA = A.clone(base);
  let replicaB = A.clone(base);
  const actorA = A.getActorId(replicaA);
  const actorB = A.getActorId(replicaB);
  const fieldB: NoteField =
    input.mode === "concurrent" ? input.field : otherField(input.field);

  // change：回调里像改普通对象一样描述变更，返回指向新状态的文档
  replicaA = A.change(replicaA, (d) => {
    d[input.field] = input.valueA;
  });
  replicaB = A.change(replicaB, (d) => {
    d[fieldB] = input.valueB;
  });

  // merge：把 remote 的全部历史并入 local，返回合并后的新文档
  const mergedIntoA = A.merge(replicaA, replicaB);
  const mergedIntoB = A.merge(replicaB, replicaA);

  // 并发写同一字段时，文档层面仍收敛为唯一值；候选值随时可检视
  const conflicts = A.getConflicts(mergedIntoA, input.field);

  return {
    actorA,
    actorB,
    fieldA: input.field,
    replicaAValue: String(replicaA[input.field]),
    fieldB,
    replicaBValue: String(replicaB[fieldB]),
    mergedTitle: String(mergedIntoA.title),
    mergedNote: String(mergedIntoA.note),
    hasConflict: conflicts ? Object.keys(conflicts).length > 0 : false,
    converged: A.equals(mergedIntoA, mergedIntoB),
    immutableSnapshots:
      base !== replicaA && replicaA !== mergedIntoA && replicaB !== mergedIntoA,
  };
}

function otherField(field: NoteField): NoteField {
  return field === "title" ? "note" : "title";
}
