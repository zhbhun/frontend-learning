/*
 * todo-model：协同待办的数据模型与操作函数（纯函数层）。
 *
 * 演示内容：一份 TodoDoc 文档装下整个清单；四个业务操作的签名都是
 * (doc: TodoDoc) => void，可以原样作为 change / changeDoc 的回调传入。
 * 输入：TodoDoc；操作：addTodo / renameTodo / toggleTodo / removeTodo。
 * 预期结果：操作只依赖 doc 本身，任何副本以任意顺序重放语义一致；
 * 并发执行后的收敛行为由「并发操作实验台」跑给你看。
 * 阅读主线：字段类型就是并发语义——id 用来定位（下标会漂移）、title 是
 * 整段赋值（并发改名一边赢）、done 是布尔赋值（不是增量）。
 */
import { deleteAt } from '@automerge/automerge';

/** 模型用 type 不用 interface：给 A.from 这类要求索引签名的泛型留兼容。 */
export type TodoItem = {
  /** 条目的稳定身份：React key 与操作定位都用它，不用数组下标。 */
  id: string;
  /** 标题按整段文本处理：并发改名收敛到一个值，不逐字符合并。 */
  title: string;
  /** 完成与否是状态赋值：并发勾选同一条时一边赢，两侧收敛一致。 */
  done: boolean;
};

/** 容器选 list：待办是有序集合，插入位置有语义；map 表达不了顺序。 */
export type TodoDoc = {
  items: TodoItem[];
};

/** 标准 id 生成器（浏览器与 Node 20+ 都有）；清单内唯一即可，全局唯一是顺带的结果。 */
export function newId(): string {
  return crypto.randomUUID();
}

/** 追加到列表末尾。两个副本并发各加一条：两条都保留，顺序两侧一致。 */
export function addTodo(doc: TodoDoc, title: string): void {
  doc.items.push({ id: newId(), title, done: false });
}

/** 整段赋值改标题。并发改成不同文案：一边赢，但两侧结果一致。 */
export function renameTodo(doc: TodoDoc, id: string, title: string): void {
  const item = doc.items.find((item) => item.id === id);
  if (item) {
    item.title = title;
  }
}

/** 取反完成状态。按 id 定位——并发插入会让下标漂移，下标不能当身份用。 */
export function toggleTodo(doc: TodoDoc, id: string): void {
  const item = doc.items.find((item) => item.id === id);
  if (item) {
    item.done = !item.done;
  }
}

/**
 * 按 id 找下标后删除。deleteAt 是类型层的独立函数，运行时等价列表代理的
 * 同名方法；两者都只能在 change 回调内使用。
 */
export function removeTodo(doc: TodoDoc, id: string): void {
  const index = doc.items.findIndex((item) => item.id === id);
  if (index !== -1) {
    deleteAt(doc.items, index);
  }
}
