/**
 * 范例介绍:同一页面搭建两个互为副本的协同编辑器(客户端 A「阿宁」与客户端 B「小柏」),
 * 用 y-prosemirror 的 ySyncPlugin / yCursorPlugin / yUndoPlugin 三个插件完成真实绑定。
 * 前置状态:两个 Y.Doc 各持一份 Y.XmlFragment,先在 A 侧写入初始两段(带加粗),全量同步给 B;
 * 文档更新与 awareness 消息都由手写中继转发(真实项目里这段由 y-websocket 等 Provider 完成)。
 * 主要操作:直接在任一编辑器里点进去打字、选中、按 Ctrl/Cmd+Z 撤销;用 Controls 切换两条中继。
 * 预期结果:A 输入的内容实时出现在 B(反向同理);B 打字时 A 里出现带名字的远程光标;
 * 各端 Ctrl/Cmd+Z 只回滚自己的输入;关「文档中继」即断线(重开后按 state vector 补差量),
 * 关「光标中继」后 B 的光标位置在 A 端冻结——正是「没接 awareness」时看到的现象。
 * 阅读主线:relayDoc / relayAwareness 两个中继 → buildEditor(三插件 + undo/redo 快捷键) →
 * snapshot(读数)。
 */
import * as Y from 'yjs'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { schema } from 'prosemirror-schema-basic'
import {
  initProseMirrorDoc,
  relativePositionToAbsolutePosition,
  yCursorPlugin,
  ySyncPlugin,
  ySyncPluginKey,
  yUndoPlugin,
  yUndoPluginKey,
  undo,
  redo,
} from 'y-prosemirror'

export interface TwinEditorsOptions {
  relay: boolean;
  cursorRelay: boolean;
}

export interface TwinEditorsSnapshot {
  consistent: boolean;
  bytesAB: number;
  bytesBA: number;
  bCursorInA: number | null;
  undoStacks: string;
  xmlA: string;
}

export interface TwinEditorsInstance {
  update(options: TwinEditorsOptions): void;
  dispose(): void;
}

interface AwarenessDelta {
  added: number[];
  updated: number[];
  removed: number[];
}

// 中继 origin 标记:对端 apply 回来的事务/消息带此标记,遇到就跳过防回声,
// 同时它让远端事务天然不进 yUndoPlugin 的撤销栈(trackedOrigins 只有 ySyncPluginKey)。
const RELAY_ORIGIN = 'manual-relay';

// y-prosemirror README 提供的远程光标 CSS 模板(节选精简)。
const CURSOR_CSS = `
.pt-editors { position: absolute; inset: 0; display: flex; gap: 14px; padding: 34px 12px 86px; }
.pt-pane { flex: 1; display: flex; min-width: 0; }
.pt-editor { flex: 1; overflow: auto; padding: 8px 12px; background: #fff; border: 1px solid #dbe3f0; border-radius: 6px; font-size: 13.5px; line-height: 1.55; }
.pt-editor .ProseMirror { outline: none; min-height: 96px; }
.pt-editor .ProseMirror p { margin: 0 0 6px; }
.ProseMirror-yjs-cursor { position: relative; margin-left: -1px; margin-right: -1px; border-left: 1px solid; border-right: 1px solid; border-color: orange; word-break: normal; pointer-events: none; }
.ProseMirror-yjs-cursor > div { position: absolute; top: -1.05em; left: -1px; padding: 0 2px; background-color: rgb(250 129 0); color: #fff; font-size: 11px; font-style: normal; font-weight: normal; line-height: normal; white-space: nowrap; user-select: none; }
.ProseMirror > .ProseMirror-yjs-cursor:first-child { margin-top: 6px; }
`;

export function createTwinEditors(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TwinEditorsSnapshot) => void,
): TwinEditorsInstance {
  const stage = canvas.parentElement;
  if (!stage) {
    throw new Error('范例舞台不存在。');
  }
  // 编辑器用真实 DOM 而非 2D 画布:隐藏占位 canvas,把编辑器挂到舞台容器上。
  canvas.style.display = 'none';

  const style = document.createElement('style');
  style.textContent = CURSOR_CSS;
  stage.appendChild(style);

  const editors = document.createElement('div');
  editors.className = 'pt-editors';
  const paneA = document.createElement('div');
  paneA.className = 'pt-pane';
  const paneB = document.createElement('div');
  paneB.className = 'pt-pane';
  const mountA = document.createElement('div');
  mountA.className = 'pt-editor';
  const mountB = document.createElement('div');
  mountB.className = 'pt-editor';
  paneA.append(mountA);
  paneB.append(mountB);
  editors.append(paneA, paneB);
  stage.appendChild(editors);

  // —— 两个互为副本的 Y.Doc,各持同名 Y.XmlFragment(编辑器绑定的映射目标)。
  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const fragA = docA.getXmlFragment('prosemirror');
  const fragB = docB.getXmlFragment('prosemirror');

  // 初始内容只写进 Yjs(编辑器内容永远来自 Yjs,而不是 EditorState)。
  // 用 'seed' origin 回填:yUndoPlugin 只追踪 ySyncPluginKey 的事务,种子内容不进撤销栈。
  docA.transact(() => {
    const p1 = new Y.XmlElement('paragraph');
    const t1 = new Y.XmlText();
    t1.insert(0, '协同正文写在 Y.XmlFragment 里');
    p1.insert(0, [t1]);
    const p2 = new Y.XmlElement('paragraph');
    // 一段 XmlText 承载两种格式:加粗区间只是它的一个格式属性段。
    // 注意下标用常量:未集成的共享类型「可写不可读」,length 不能作为插入位置。
    const t2 = new Y.XmlText();
    t2.insert(0, '映射规则:');
    t2.insert(5, '加粗是 XmlText 的格式属性', { strong: {} });
    p2.insert(0, [t2]);
    fragA.insert(0, [p1, p2]);
  }, 'seed');
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

  const awA = new Awareness(docA);
  const awB = new Awareness(docB);
  awA.setLocalState({ user: { name: '阿宁', color: '#4f7cff' } });
  awB.setLocalState({ user: { name: '小柏', color: '#e25c5c' } });

  let relayOn = true;
  let cursorRelayOn = true;
  let bytesAB = 0;
  let bytesBA = 0;

  // —— 文档中继:监听 update、把二进制 update 原样转发给对端 applyUpdate。
  // 这正是 y-websocket 的消息循环;只有中继开启时才计数,读数反映「送达」字节。
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

  // —— awareness 中继:awareness 光标通道,同样的「监听 update → 全量编码 → apply」。
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

  // —— 绑定一个编辑器:三个插件 + undo/redo 快捷键(来自 y-prosemirror,不是 prosemirror-history)。
  function buildEditor(
    mount: HTMLElement,
    frag: Y.XmlFragment,
    awareness: Awareness,
  ): EditorView {
    // 初始文档与映射从 Yjs 构建:内容来自 Yjs,mapping 交给 ySyncPlugin 复用。
    const { doc, mapping } = initProseMirrorDoc(frag, schema);
    const view = new EditorView(mount, {
      state: EditorState.create({
        doc,
        schema,
        plugins: [
          ySyncPlugin(frag, { mapping }),
          yCursorPlugin(awareness),
          yUndoPlugin(),
          keymap({
            'Mod-z': undo,
            'Mod-y': redo,
            'Shift-Mod-z': redo,
          }),
        ],
      }),
      dispatchTransaction: (tr) => {
        view.updateState(view.state.apply(tr));
        scheduleEmit();
      },
    });
    return view;
  }

  const viewA = buildEditor(mountA, fragA, awA);
  const viewB = buildEditor(mountB, fragB, awB);

  // 断线重连:按 state vector 互补差量(模拟 Provider 的初始同步), awareness 也全量对答一次。
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
  function bCursorInA(): number | null {
    const state = awA.getStates().get(awB.clientID);
    const cursor = state?.cursor as { head?: unknown } | undefined;
    if (!cursor || typeof cursor.head !== 'object' || cursor.head === null) {
      return null;
    }
    const binding = ySyncPluginKey.getState(viewA.state)?.binding;
    const mapping = binding?.mapping;
    if (!mapping) {
      return null;
    }
    const relPos = Y.createRelativePositionFromJSON(cursor.head);
    return relativePositionToAbsolutePosition(docA, fragA, relPos, mapping);
  }

  function snapshot(): TwinEditorsSnapshot {
    const xmlA = fragA.toString();
    const xmlB = fragB.toString();
    const stackA = yUndoPluginKey.getState(viewA.state)?.undoManager;
    const stackB = yUndoPluginKey.getState(viewB.state)?.undoManager;
    return {
      consistent: xmlA === xmlB,
      bytesAB,
      bytesBA,
      bCursorInA: bCursorInA(),
      undoStacks: `${stackA ? stackA.undoStack.length : 0} / ${
        stackB ? stackB.undoStack.length : 0
      }`,
      xmlA: xmlA.length > 72 ? `${xmlA.slice(0, 72)}…` : xmlA,
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
      scheduleEmit();
    },
    dispose() {
      viewA.destroy();
      viewB.destroy();
      awA.destroy();
      awB.destroy();
      docA.destroy();
      docB.destroy();
      style.remove();
      editors.remove();
    },
  };
}
