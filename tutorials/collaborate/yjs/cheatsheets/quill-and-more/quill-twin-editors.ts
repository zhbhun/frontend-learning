/**
 * 范例介绍:同一页面搭建两个互为副本的 Quill 2 协同编辑器(客户端 A「阿宁」与 B「小柏」),
 * 用 y-quill 的 QuillBinding 完成真实绑定:本地编辑经 text-change 事件把 Delta 原样
 * applyDelta 进 Y.Text(事务 origin 是绑定实例),远端变化经 observe 原样 updateContents
 * 回灌编辑器;远程光标由 quill-cursors 模块渲染,位置以相对位置经 awareness 广播。
 * 前置状态:两个 Y.Doc 各持一份 Y.Text('quill'),内容在绑定构造前写入并互相同步
 * (构造时 setContents(type.toDelta()) 让编辑器与 Y.Text 对齐);文档更新与 awareness
 * 消息由手写中继转发(真实项目里这段由 y-websocket 等 Provider 完成)。
 * 主要操作:直接在编辑器里打字、拖选、用工具栏加粗或设标题、按 Ctrl/Cmd+Z;
 * 用 Controls 切换两条中继与 history 模式。
 * 预期结果:A 输入的内容实时出现在 B(反向同理);B 打字时 A 出现带名字的远程光标,
 * 读数给出解析后的位置;关「文档中继」即断线(重开后按 state vector 补差量),关「光标
 * 中继」后 B 的光标冻结——正是「没接 awareness」的故障形态;A、B 各输入一字后按
 * Ctrl/Cmd+Z,默认 history 撤掉的是对方刚写的字,userOnly 模式只撤自己的。
 * 阅读主线:relayDoc / relayAwareness 两个中继 → buildEditors(QuillBinding 接线) →
 * bCursorInA / snapshot(读数)。
 */
import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import { QuillBinding } from 'y-quill';
// 主题与光标样式各一份:Quill 的 snow 主题 + quill-cursors 的光标样式
import 'quill/dist/quill.snow.css';
import 'quill-cursors/css';

// 远程光标依赖 quill-cursors 模块:必须在创建编辑器之前全局注册(overwrite 防重复注册报错)
Quill.register('modules/cursors', QuillCursors, true);

export type HistoryMode = 'default' | 'userOnly';

export interface TwinEditorsOptions {
  relay: boolean;
  cursorRelay: boolean;
  historyMode: HistoryMode;
}

export interface TwinEditorsSnapshot {
  consistent: boolean;
  bytesAB: number;
  bytesBA: number;
  cursor: string;
  deltaA: string;
  undoStacks: string;
  historyMode: HistoryMode;
}

export interface TwinEditorsInstance {
  update(options: TwinEditorsOptions): void;
  dispose(): void;
}

// 中继 origin 标记:对端 apply 回来的事务/消息带此标记,遇到就跳过防回声
const RELAY_ORIGIN = 'manual-relay';

// 布局:舞台左右两栏;cs-stage 自带中线(captions 触发)与左下角读数位
const LAYOUT_CSS = `
.qll-editors { position: absolute; inset: 0; display: flex; gap: 14px; padding: 34px 12px 96px; }
.qll-pane { flex: 1; display: flex; min-width: 0; }
.qll-mount { flex: 1; display: flex; flex-direction: column; background: #fff; border: 1px solid #dbe3f0; border-radius: 6px; font-size: 13.5px; }
.qll-mount .ql-toolbar { border: none; border-bottom: 1px solid #dbe3f0; border-radius: 6px 6px 0 0; }
.qll-mount .ql-container { flex: 1; border: none; font-size: 13.5px; border-radius: 0 0 6px 6px; }
.qll-mount .ql-editor { min-height: 84px; }
`;

interface AwarenessDelta {
  added: number[];
  updated: number[];
  removed: number[];
}

export function createQuillTwinEditors(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TwinEditorsSnapshot) => void,
): TwinEditorsInstance {
  const stage = canvas.parentElement;
  if (!stage) {
    throw new Error('范例舞台不存在。');
  }
  // 编辑器用真实 DOM 而非 2D 画布:隐藏占位 canvas,把编辑器挂到舞台容器上
  canvas.style.display = 'none';

  const style = document.createElement('style');
  style.textContent = LAYOUT_CSS;
  stage.appendChild(style);

  const editors = document.createElement('div');
  editors.className = 'qll-editors';
  const holderA = document.createElement('div');
  holderA.className = 'qll-pane';
  const holderB = document.createElement('div');
  holderB.className = 'qll-pane';
  editors.append(holderA, holderB);
  stage.appendChild(editors);

  // —— 两个互为副本的 Y.Doc,各持同名 Y.Text(Quill 绑定的映射目标)
  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const ytextA = docA.getText('quill');
  const ytextB = docB.getText('quill');

  // 初始内容只写进 Yjs,以 '\n' 结尾让每行都有自己的真实换行;
  // 再全量同步给 B。绑定在内容就位后构造,构造时 setContents 与 Y.Text 对齐。
  ytextA.insert(0, '协同正文写在共享文本里。\n是区间上的属性。\n');
  ytextA.insert(13, '加粗', { bold: true });
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

  // awareness 实例:真实项目里由 Provider 创建维护(provider.awareness)
  const awA = new Awareness(docA);
  const awB = new Awareness(docB);
  awA.setLocalState({ user: { name: '阿宁', color: '#4f7cff' } });
  awB.setLocalState({ user: { name: '小柏', color: '#e25c5c' } });

  let relayOn = true;
  let cursorRelayOn = true;
  let currentHistoryMode: HistoryMode = 'default';
  let bytesAB = 0;
  let bytesBA = 0;

  // —— 文档中继:监听 update、把二进制 update 原样转发给对端 applyUpdate。
  // 这正是 y-websocket 的消息循环;只有中继开启时才计数,读数反映「送达」字节
  const forwardDoc = (from: Y.Doc, to: Y.Doc, count: (n: number) => void) => {
    from.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === RELAY_ORIGIN) {
        return;
      }
      if (relayOn) {
        count(update.byteLength);
        Y.applyUpdate(to, update, RELAY_ORIGIN);
      }
    });
  };
  forwardDoc(docA, docB, (n) => {
    bytesAB += n;
  });
  forwardDoc(docB, docA, (n) => {
    bytesBA += n;
  });

  // —— awareness 中继:监听 update、全量编码 changed 客户端后 apply 给对端
  const forwardAwareness = (from: Awareness, to: Awareness) => {
    from.on('update', (delta: AwarenessDelta, origin: unknown) => {
      if (origin === RELAY_ORIGIN || !cursorRelayOn) {
        return;
      }
      const changed = delta.added.concat(delta.updated, delta.removed);
      applyAwarenessUpdate(to, encodeAwarenessUpdate(from, changed), RELAY_ORIGIN);
    });
  };
  forwardAwareness(awA, awB);
  forwardAwareness(awB, awA);

  const schedule = { pending: false };
  const scheduleEmit = () => {
    if (schedule.pending) {
      return;
    }
    schedule.pending = true;
    queueMicrotask(() => {
      schedule.pending = false;
      emit(snapshot());
    });
  };

  // —— 绑定一个编辑器:Quill 实例 + QuillBinding。history 模式决定协作撤销行为:
  // default(userOnly: false)把远端变更也记入本端撤销栈;userOnly 只记本端变更。
  let editorA: Quill | undefined;
  let editorB: Quill | undefined;
  let bindingA: QuillBinding | undefined;
  let bindingB: QuillBinding | undefined;

  function buildEditors(mode: HistoryMode): void {
    // 重建前先销毁旧绑定:否则旧的 Y.Text 观察者会一直留在共享类型上(泄漏)
    bindingA?.destroy();
    bindingB?.destroy();
    holderA.replaceChildren();
    holderB.replaceChildren();

    function build(holder: HTMLDivElement, ytext: Y.Text, awareness: Awareness): {
      editor: Quill;
      binding: QuillBinding;
    } {
      const mount = document.createElement('div');
      mount.className = 'qll-mount';
      holder.append(mount);
      const editor = new Quill(mount, {
        modules: {
          cursors: true,
          toolbar: [['bold', 'italic'], [{ header: [2, false] }]],
          history: mode === 'userOnly' ? { userOnly: true } : true,
        },
        placeholder: '开始输入…',
        theme: 'snow',
      });
      // 绑定在内容就位后构造:构造里 setContents(type.toDelta()) 完成初始对齐
      const binding = new QuillBinding(ytext, editor, awareness);
      // setContents 会被 Quill history 记为一条初始栈项,清掉让撤销栈读数从 0 开始
      editor.history.clear();
      // 编辑器任何变化(输入、远端回灌、选区移动)都刷新一次读数
      editor.on('editor-change', scheduleEmit);
      return { editor, binding };
    }

    const sideA = build(holderA, ytextA, awA);
    const sideB = build(holderB, ytextB, awB);
    editorA = sideA.editor;
    editorB = sideB.editor;
    bindingA = sideA.binding;
    bindingB = sideB.binding;
  }

  buildEditors(currentHistoryMode);

  // awareness 状态真变(远端光标/上下线)时也刷新读数;'change' 不含心跳,不会空转
  awA.on('change', scheduleEmit);
  awB.on('change', scheduleEmit);

  // 断线重连:按 state vector 互补差量(模拟 Provider 的初始同步),awareness 也全量对答一次。
  // yjs 对「无差异」编码出的空 update 恰好是 2 字节([0, 0]),跳过它让读数只记真实送达量。
  const catchUp = (from: Y.Doc, to: Y.Doc, count: (n: number) => void) => {
    const update = Y.encodeStateAsUpdate(from, Y.encodeStateVector(to));
    if (update.byteLength > 2) {
      count(update.byteLength);
      Y.applyUpdate(to, update, RELAY_ORIGIN);
    }
  };
  const catchUpAwareness = (from: Awareness, to: Awareness) => {
    const clients = Array.from(from.getStates().keys());
    applyAwarenessUpdate(to, encodeAwarenessUpdate(from, clients), RELAY_ORIGIN);
  };

  // B 的光标落在 A 端的绝对位置:从 A 的 awareness 表读 B 的 cursor 字段,
  // 经 RelativePosition 解析(远端并发编辑下位置不漂移,见相对位置课)。
  function bCursorInA(): string {
    const state = awA.getStates().get(awB.clientID);
    const cursor = state?.cursor as { anchor?: unknown; head?: unknown } | undefined;
    if (!cursor || typeof cursor.anchor !== 'object' || cursor.anchor === null) {
      return '未聚焦';
    }
    const anchor = Y.createAbsolutePositionFromRelativePosition(
      Y.createRelativePositionFromJSON(cursor.anchor),
      docA,
    );
    const head = Y.createAbsolutePositionFromRelativePosition(
      Y.createRelativePositionFromJSON(cursor.head),
      docA,
    );
    if (!anchor || !head || anchor.type !== ytextA) {
      return '不可解析';
    }
    return `${anchor.index}–${head.index}`;
  }

  function truncate(text: string, limit = 104): string {
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  }

  function snapshot(): TwinEditorsSnapshot {
    const textA = ytextA.toString();
    const textB = ytextB.toString();
    return {
      consistent: textA === textB,
      bytesAB,
      bytesBA,
      cursor: bCursorInA(),
      deltaA: truncate(JSON.stringify(ytextA.toDelta())),
      undoStacks: `${editorA?.history.stack.undo.length ?? 0} / ${
        editorB?.history.stack.undo.length ?? 0
      }`,
      historyMode: currentHistoryMode,
    };
  }

  return {
    update(options) {
      relayOn = options.relay;
      cursorRelayOn = options.cursorRelay;
      if (relayOn) {
        catchUp(docA, docB, (n) => {
          bytesAB += n;
        });
        catchUp(docB, docA, (n) => {
          bytesBA += n;
        });
      }
      if (cursorRelayOn) {
        catchUpAwareness(awA, awB);
        catchUpAwareness(awB, awA);
      }
      if (options.historyMode !== currentHistoryMode) {
        // history 模块在 Quill 构造时装配:换模式需要重建两个编辑器(撤销栈随之清零)
        currentHistoryMode = options.historyMode;
        buildEditors(currentHistoryMode);
      }
      scheduleEmit();
    },
    dispose() {
      bindingA?.destroy();
      bindingB?.destroy();
      awA.destroy();
      awB.destroy();
      docA.destroy();
      docB.destroy();
      style.remove();
      editors.remove();
    },
  };
}
