/**
 * 范例介绍：用两个真实 Tiptap 编辑器（我 + 模拟同事）演示 CollaborationCaret
 * 的光标与选区渲染、user 身份配置与动态更新，以及光标消失的立即路径。
 * 前置状态：两端各持一份 Y.Doc 与 Awareness 实例，经内存 relay 按真实编码互转
 * （文档更新走 Y.applyUpdate，awareness 走 encodeAwarenessUpdate /
 * applyAwarenessUpdate）；provider 以最小对象 { awareness } 传入——
 * CollaborationCaret 只读 provider.awareness，这是扩展全部的网络依赖。
 * 操作：「光标与选区」场景点按钮移动/选中同事光标、在 Controls 改昵称与颜色；
 * 「消失时机」场景依次点击聚焦、失焦、离开房间与回归。
 * 预期结果：同事光标移动后，我的编辑器立即出现带名牌的光标 widget 与选区高亮；
 * 失焦后光标立即消失但人还在 storage.users 里；离开房间则名单同步移除；
 * 回归要先重建 awareness 状态再 updateUser（置空后 setLocalStateField 静默 no-op）。
 * 阅读主线：relayDoc / relayAwareness 的内存转发 → 编辑器接线（StarterKit 关
 * undoRedo + Collaboration + CollaborationCaret）→ badgeRender 自定义渲染 →
 * takeSnapshot 读数。
 * 与真实链路的差异：没有网络与 Hocuspocus 服务器，模拟的只是传输层；扩展与
 * y-protocols 的代码路径全部真实。真实项目传 HocuspocusProvider，并把
 * provider.document 作为 Collaboration 的 document；双浏览器互看的路径见正文代码清单。
 */
import { Editor } from '@tiptap/core';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { StarterKit } from '@tiptap/starter-kit';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import * as Y from 'yjs';

/** 演示场景：board 聚焦光标呈现与身份配置；lifecycle 聚焦消失时机。 */
export type CaretScenario = 'board' | 'lifecycle';

export interface CaretModelOptions {
  myName: string;
  myColor: string;
  peerName: string;
  peerColor: string;
}

export interface CaretModelSnapshot {
  myClientId: number;
  peerClientId: number;
  /** 我的编辑器 storage.collaborationCaret.users 里的用户名列表。 */
  userNames: string[];
  /** 我的编辑器此刻 cursor 字段非空的远端，与扩展画光标的条件一致。 */
  visibleCaretNames: string[];
  /** 同事 awareness 的 cursor 字段状态：已发布 / 已清空 / 无状态（已离开）。 */
  peerCursor: 'published' | 'cleared' | 'no-state';
  /** 同事的 user 字段是否还在我的 storage.users 里。 */
  peerInRoom: boolean;
}

export interface CaretModelInstance {
  update(options: CaretModelOptions): void;
  dispose(): void;
}

/** y-protocols 的 awareness update 事件形状。 */
interface AwarenessDelta {
  added: number[];
  updated: number[];
  removed: number[];
}

/** relay 事务来源：两端据此跳过对方转发来的更新，避免回环。 */
const RELAY_ORIGIN = 'caret-demo-relay';

const DEFAULTS: CaretModelOptions = {
  myName: '小明',
  myColor: '#4f7cff',
  peerName: '小红',
  peerColor: '#e8590c',
};

/** 文档更新经内存直连转发：非 relay 来源才转发，转发时以 relay 来源落地。 */
function relayDoc(from: Y.Doc, to: Y.Doc): void {
  from.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== RELAY_ORIGIN) {
      Y.applyUpdate(to, update, RELAY_ORIGIN);
    }
  });
}

/** awareness 更新经内存直连转发：编码、应用都是 y-protocols 的真实路径。 */
function relayAwareness(from: Awareness, to: Awareness): void {
  from.on('update', ({ added, updated, removed }: AwarenessDelta, origin: unknown) => {
    if (origin === RELAY_ORIGIN) {
      return;
    }
    const changed = [...added, ...updated, ...removed];
    applyAwarenessUpdate(to, encodeAwarenessUpdate(from, changed), RELAY_ORIGIN);
  });
}

/** 给「我的」文档写入两段种子内容，再同步给同事，编辑器创建前完成。 */
function seedContent(doc: Y.Doc): void {
  const fragment = doc.getXmlFragment('default');

  const paragraph1 = new Y.XmlElement('paragraph');
  const text1 = new Y.XmlText();
  text1.insert(0, '第一句：把光标点进这段文字，对面的编辑器马上看到你的名牌光标。');
  paragraph1.insert(0, [text1]);

  const paragraph2 = new Y.XmlElement('paragraph');
  const text2 = new Y.XmlText();
  text2.insert(0, '第二句：光标锚在内容而不是字数上，前面的输入不会把它推走。');
  paragraph2.insert(0, [text2]);

  fragment.insert(0, [paragraph1, paragraph2]);
}

const STYLE_ID = 'caret-demo-styles';

/**
 * 课程本地样式。collaboration-carets 两条是官方文档要求的应用侧样式：
 * 扩展不带默认样式，缺了它光标就是一串裸内联元素。
 */
function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.caret-demo { position: absolute; inset: 12px 12px 104px; display: flex; flex-direction: column; gap: 8px; }
.caret-demo__editors { display: flex; flex: 1; gap: 10px; min-height: 0; }
.caret-demo__pane { display: flex; flex: 1; flex-direction: column; gap: 4px; min-width: 0; }
.caret-demo__pane-title { font: 600 12px/1.4 ui-sans-serif, system-ui, sans-serif; color: #46584f; }
.caret-demo .tiptap { flex: 1; min-height: 88px; overflow-y: auto; padding: 10px 12px; border: 1px solid #dbe3f0; border-radius: 6px; background: #ffffff; color: #172033; font-size: 14px; line-height: 1.9; outline: none; }
.caret-demo .tiptap p { margin: 0 0 4px; }
.caret-demo__actions { display: flex; flex-wrap: wrap; gap: 8px; }
.caret-demo__actions button { padding: 4px 10px; border: 1px solid #c4d0e4; border-radius: 5px; background: #ffffff; color: #2c3a52; font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; cursor: pointer; }
.caret-demo__actions button:hover { background: #eef3fb; }
.tiptap .collaboration-carets__caret { border-left: 1px solid #0d0d0d; border-right: 1px solid #0d0d0d; margin-left: -1px; margin-right: -1px; position: relative; pointer-events: none; }
.tiptap .collaboration-carets__label { position: absolute; top: -1.4em; left: -2px; font-size: 12px; font-weight: 600; line-height: normal; user-select: none; color: #0d0d0d; padding: 0.1rem 0.3rem; border-radius: 3px 3px 3px 0; white-space: nowrap; }
.caret-demo__badge { position: relative; pointer-events: none; }
.caret-demo__badge-dot { display: inline-block; width: 0; height: 1.1em; border-left: 3px solid var(--caret-color, #ffa500); vertical-align: text-bottom; }
.caret-demo__badge-label { position: absolute; top: -1.4em; left: -2px; padding: 0.1rem 0.4rem; border-radius: 999px; background: var(--caret-color, #ffa500); color: #ffffff; font-size: 11px; font-weight: 600; white-space: nowrap; }
`;
  document.head.append(style);
}

/**
 * 自定义 render：竖条加胶囊名牌。「消失时机」实例里同事的光标就是它画的——
 * 同样的 awareness 数据，换一个 render 函数就是另一种画法。
 */
function badgeRender(user: { name?: string; color?: string }): HTMLElement {
  const caret = document.createElement('span');
  caret.className = 'caret-demo__badge';
  caret.style.setProperty('--caret-color', user.color ?? '#ffa500');

  const bar = document.createElement('span');
  bar.className = 'caret-demo__badge-dot';

  const label = document.createElement('div');
  label.className = 'caret-demo__badge-label';
  label.textContent = user.name ?? '同事';

  caret.append(bar, label);
  return caret;
}

export function createCaretModel(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CaretModelSnapshot) => void,
  scenario: CaretScenario,
): CaretModelInstance {
  ensureStyles();

  // 本实例用真实 DOM 编辑器而不是 2D 画布：隐藏共享外壳的 canvas，把编辑器
  // 挂进同一舞台，读数仍由共享外壳的 readout 承担。
  canvas.style.display = 'none';
  const stage = canvas.parentElement as HTMLElement;

  const wrapper = document.createElement('div');
  wrapper.className = 'caret-demo';

  const editorsRow = document.createElement('div');
  editorsRow.className = 'caret-demo__editors';

  const myPane = document.createElement('div');
  myPane.className = 'caret-demo__pane';
  const myTitle = document.createElement('div');
  myTitle.className = 'caret-demo__pane-title';
  myTitle.textContent = '我的编辑器（你）';
  myPane.append(myTitle);

  const peerPane = document.createElement('div');
  peerPane.className = 'caret-demo__pane';
  const peerTitle = document.createElement('div');
  peerTitle.className = 'caret-demo__pane-title';
  peerTitle.textContent = '同事的编辑器（模拟第二个协作者）';
  peerPane.append(peerTitle);

  editorsRow.append(myPane, peerPane);

  const actions = document.createElement('div');
  actions.className = 'caret-demo__actions';
  wrapper.append(editorsRow, actions);
  stage.prepend(wrapper);

  // 两个协作者：各自一份 Y.Doc（clientID 各自随机）与一个 Awareness 实例。
  const myDoc = new Y.Doc();
  const peerDoc = new Y.Doc();
  seedContent(myDoc);
  Y.applyUpdate(peerDoc, Y.encodeStateAsUpdate(myDoc), RELAY_ORIGIN);
  relayDoc(myDoc, peerDoc);
  relayDoc(peerDoc, myDoc);

  const myAwareness = new Awareness(myDoc);
  const peerAwareness = new Awareness(peerDoc);
  relayAwareness(myAwareness, peerAwareness);
  relayAwareness(peerAwareness, myAwareness);

  const buildEditor = (
    doc: Y.Doc,
    awareness: Awareness,
    user: { name: string; color: string },
    render?: (user: { name?: string; color?: string }) => HTMLElement,
  ): Editor =>
    new Editor({
      extensions: [
        // Collaboration 自带撤销历史，与 StarterKit 的 undoRedo 冲突，必须关掉。
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc }),
        CollaborationCaret.configure({
          // 扩展只读 provider.awareness；真实项目传 HocuspocusProvider。
          provider: { awareness },
          user,
          ...(render ? { render } : {}),
        }),
      ],
    });

  const myEditor = buildEditor(myDoc, myAwareness, {
    name: DEFAULTS.myName,
    color: DEFAULTS.myColor,
  });
  // 同事端光标：board 场景用默认渲染（竖线加名牌，配合上方官方 CSS）；
  // lifecycle 场景换 badgeRender，作为「自定义渲染」一节的直接证据。
  const peerEditor = buildEditor(
    peerDoc,
    peerAwareness,
    { name: DEFAULTS.peerName, color: DEFAULTS.peerColor },
    scenario === 'lifecycle' ? badgeRender : undefined,
  );

  myPane.append(myEditor.options.element as HTMLElement);
  peerPane.append(peerEditor.options.element as HTMLElement);

  let current: CaretModelOptions = { ...DEFAULTS };

  const addButton = (label: string, onClick: () => void, keepFocus = false): void => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (keepFocus) {
      // 拦下 mousedown，避免点击按钮抢走同事编辑器的焦点、把光标提前撤下。
      button.addEventListener('mousedown', (event: MouseEvent) => event.preventDefault());
    }
    button.addEventListener('click', onClick);
    actions.append(button);
  };

  const movePeer = (position: 'start' | 'end'): void => {
    // 真实发布路径：focus 设置选区并让同事编辑器持有焦点，yCursorPlugin
    // 的 updateCursorInfo 随事务把 anchor/head 写进 awareness。
    peerEditor.commands.focus(position);
  };

  const selectFirstSentence = (): void => {
    const paragraph = peerEditor.state.doc.firstChild;
    const end = (paragraph?.textContent ?? '').indexOf('。');
    if (end < 0) {
      return;
    }
    peerEditor.commands.setTextSelection({ from: 1, to: 1 + end + 1 });
    peerEditor.commands.focus();
  };

  if (scenario === 'board') {
    addButton('同事光标 → 开头', () => movePeer('start'), true);
    addButton('同事光标 → 结尾', () => movePeer('end'), true);
    addButton('同事选中第一句', selectFirstSentence, true);
  } else {
    addButton('同事光标 → 结尾', () => movePeer('end'), true);
    addButton('同事失焦', () => {
      // 失焦路径：focusout 触发后 yCursorPlugin 把 cursor 字段清空并广播，
      // 对端立即撤下光标；人还在房间里。
      (peerEditor.view.dom as HTMLElement).blur();
    });
    addButton('同事离开房间', () => {
      // 正常离开路径：立即广播移除，不等 30 秒过期（见 3.4 课离开路径表）。
      peerAwareness.setLocalState(null);
    });
    addButton('同事回归', () => {
      // 置空后 setLocalStateField 是静默 no-op：先重建空状态，
      // 再 updateUser 写回身份，最后聚焦让光标重新发布。
      peerAwareness.setLocalState({});
      peerEditor.commands.updateUser({ name: current.peerName, color: current.peerColor });
      peerEditor.commands.focus('start');
    });
  }

  const takeSnapshot = (): CaretModelSnapshot => {
    // 扩展的只读在线名单：clientId 加 user 全部字段，随 awareness 更新刷新。
    const users = myEditor.storage.collaborationCaret.users as Array<{
      clientId: number;
      name?: string;
    }>;
    const peerId = peerDoc.clientID;

    const visibleCaretNames: string[] = [];
    myAwareness.getStates().forEach((state: { user?: { name?: string }; cursor?: unknown }, clientId: number) => {
      if (clientId === myDoc.clientID) {
        return;
      }
      if (state && state.cursor != null) {
        visibleCaretNames.push(String(state.user?.name ?? `User: ${clientId}`));
      }
    });

    const peerState = peerAwareness.getLocalState() as { cursor?: unknown } | null;
    const peerCursor: CaretModelSnapshot['peerCursor'] =
      peerState === null ? 'no-state' : peerState.cursor != null ? 'published' : 'cleared';

    return {
      myClientId: myDoc.clientID,
      peerClientId: peerId,
      userNames: users.map((user) => String(user.name ?? `#${user.clientId}`)),
      visibleCaretNames,
      peerCursor,
      peerInRoom: users.some((user) => user.clientId === peerId),
    };
  };

  const emitSnapshot = (): void => {
    emit(takeSnapshot());
  };

  myAwareness.on('update', emitSnapshot);
  peerAwareness.on('update', emitSnapshot);
  myEditor.on('transaction', emitSnapshot);
  peerEditor.on('transaction', emitSnapshot);
  emitSnapshot();

  return {
    update(options) {
      current = { ...DEFAULTS, ...options };
      // 身份更新的官方路径：updateUser 底层写 awareness 的 user 字段。
      myEditor.commands.updateUser({ name: current.myName, color: current.myColor });
      peerEditor.commands.updateUser({ name: current.peerName, color: current.peerColor });
    },
    dispose() {
      // 先销毁编辑器：内置插件的 destroy 会把 cursor 字段清空并广播。
      peerEditor.destroy();
      myEditor.destroy();
      myAwareness.destroy();
      peerAwareness.destroy();
      myDoc.destroy();
      peerDoc.destroy();
      wrapper.remove();
    },
  };
}
