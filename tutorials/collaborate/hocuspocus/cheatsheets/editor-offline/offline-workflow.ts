/**
 * 范例介绍：用真实 Tiptap Editor + Collaboration 扩展 + y-indexeddb（真实 IndexedDB
 * 落盘）复现离线工作流：断线期间编辑照常留存本地库，「重开页面」后先从 IndexedDB
 * 恢复，再由 provider 的对账路径与服务器合并收敛。
 * 前置状态：服务器房间由 MiniRelay 扮演（内存 Y.Doc，跨「重开页面」保留，创建时
 * 预填一段底稿，对应 onLoadDocument 语义）；客户端每「打开页面」新建一份 Y.Doc +
 * IndexeddbPersistence（库名固定，跨会话留存）+ Tiptap 编辑器。
 * 操作：在编辑器里直接键入或用「本端插入文本」；「服务器可达」断开 / 恢复链路；
 * 「会话操作」重开页面（本地库保留）或清空本地库并重开；「编辑器创建时机」切换
 * 立即创建 / 等本地恢复完成（whenSynced）。
 * 预期结果：重开页面后内容从 IndexedDB 恢复，「本地库留存」不归零；断线期间的
 * 编辑在重连后经状态向量对账上行合并，「离线积压」归零、两侧内容一致；清空本地
 * 库并重开则只剩服务器内容；「立即创建」时能看到内容在恢复完成后弹入，「等恢复」
 * 则一次到位。
 * 阅读主线：openSession 的接线顺序（persistence → relay 模拟 provider → 编辑器，
 * 时机由 timing 决定）→ MiniRelay 的初始同步与重连对账（3.3 课同款协议）→ 恢复
 * 灌回的更新经 update 通道自动上行（origin 循环抑制）→ clearDocument 清库。
 * 与真实链路的差异：传输层换成内存直连、服务器与 provider 合并为 MiniRelay（按
 * 3.3 课的状态向量对账语义复刻）；IndexeddbPersistence、编辑器接线、update 通道
 * 均为真实代码路径，IndexedDB 数据真实落盘。库名按本课隔离，实例销毁时删除整个
 * 数据库，避免污染同源的其他页面。
 */
import { Editor } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import StarterKit from '@tiptap/starter-kit';
import { IndexeddbPersistence, clearDocument } from 'y-indexeddb';
import * as Y from 'yjs';

export type EditorTiming = 'immediate' | 'wait-local';

export type SessionAction = 'idle' | 'reopen' | 'wipe';

export interface OfflineWorkflowOptions {
  online: boolean;
  timing: EditorTiming;
}

export interface OfflineWorkflowSnapshot {
  localText: string;
  serverText: string;
  online: boolean;
  /** 本地库是否已恢复完成（whenSynced 已 resolve，库为空也算恢复完成）。 */
  restored: boolean;
  editorReady: boolean;
  /** 离线积压：断线期间产生且尚未上行的更新条数，重连对账后归零。 */
  pendingUpdates: number;
  /** 本次会话写入本地库的更新条数（恢复灌回 origin 为 persistence，不重复计数）。 */
  savedWrites: number;
  timing: EditorTiming;
}

export interface OfflineWorkflowInstance {
  /** 关闭当前会话并新开一个：模拟刷新 / 重开页面，本地库保留。 */
  reopen(): void;
  /** 关闭当前会话、删除整个本地库后再新开：清除站点数据后重开。 */
  wipeAndReopen(): void;
  setOnline(online: boolean): void;
  /** 切换编辑器创建时机，重建会话后生效。 */
  setTiming(timing: EditorTiming): void;
  insertText(text: string): void;
  dispose(): void;
}

/** IndexedDB 数据库名：按本课隔离，约定与 provider 的房间名一致。 */
const DB_NAME = 'editor-offline-demo';

/** 服务器预填的底稿（onLoadDocument 在房间首次创建时写入，见 5.1 课）。 */
const PREFILL_TEXT = '服务器预填的会议底稿';

/**
 * 内存房间：扮演 Hocuspocus 服务器上 name 为 DB_NAME 的那份 Y.Doc，同时承担
 * provider 的搬运职责。初始同步与重连对账都按状态向量双向交换（3.3 课的协议）；
 * 跨「重开页面」常驻——刷新丢的是客户端内存，服务器房间一直在。
 */
class MiniRelay {
  /** 房间文档：服务器缓存的那份 Y.Doc，服务器没有编辑器（见 5.1 课）。 */
  readonly doc = new Y.Doc();

  online = true;

  pendingUpdates = 0;

  /** 远端下行更新的 origin 标记，等价于真实 provider 以自身为 origin 应用下行。 */
  static readonly remoteOrigin: Record<string, string> = { source: DB_NAME };

  private clientDoc: Y.Doc | null = null;

  constructor() {
    this.prefill();
  }

  /** 服务器预填：直接在 fragment 上构造与 Tiptap schema 兼容的段落结构。 */
  private prefill(): void {
    const template = new Y.Doc();
    const paragraph = new Y.XmlElement('paragraph');
    const text = new Y.XmlText();
    text.insert(0, PREFILL_TEXT);
    paragraph.insert(0, [text]);
    template.getXmlFragment('default').insert(0, [paragraph]);
    Y.applyUpdate(this.doc, Y.encodeStateAsUpdate(template));
    template.destroy();
  }

  /** 客户端接入：注册上行通道；在线时立即执行双向初始同步。 */
  attach(clientDoc: Y.Doc): void {
    this.clientDoc = clientDoc;

    // 本地编辑与恢复灌回的更新都经这条通道上行（provider 的 documentUpdateHandler
    // 转发一切 origin 不是自己的更新）；origin 为远端时不再上行（循环抑制），
    // 离线时积压在本地文档并计数。
    clientDoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === MiniRelay.remoteOrigin) {
        return;
      }
      if (!this.online) {
        this.pendingUpdates += 1;
        return;
      }
      this.receive(update);
    });

    if (this.online) {
      this.handshake();
    }
  }

  /** 双向状态向量对账：provider 建连与每次重连的第一步（协议见 3.3 课）。 */
  private handshake(): void {
    if (!this.clientDoc) {
      return;
    }
    // 客户端缺的内容由房间下行补齐；房间缺的（本地编辑 / 恢复灌回）合成一条上行
    Y.applyUpdate(this.doc, Y.encodeStateAsUpdate(this.clientDoc, Y.encodeStateVector(this.doc)));
    Y.applyUpdate(
      this.clientDoc,
      Y.encodeStateAsUpdate(this.doc, Y.encodeStateVector(this.clientDoc)),
      MiniRelay.remoteOrigin,
    );
  }

  setOnline(online: boolean): void {
    if (online === this.online) {
      return;
    }
    this.online = online;
    if (!online) {
      return;
    }
    // 重连补传：一次对账双向补齐后，积压计数归零
    this.handshake();
    this.pendingUpdates = 0;
  }

  /** 房间收到一份更新：并入服务器文档（本课没有第二端，无需再转发）。 */
  private receive(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update);
  }
}

/** 读 Y.XmlFragment 的纯文本（服务器没有编辑器，剥掉段落标签后展示）。 */
function fragmentText(fragment: Y.XmlFragment): string {
  return fragment
    .toString()
    .replace(/<paragraph[^>]*>/g, '')
    .replace(/<\/paragraph>/g, '\n')
    .trim();
}

interface Session {
  ydoc: Y.Doc;
  persistence: IndexeddbPersistence;
  editor: Editor | null;
}

export function createOfflineWorkflow(
  hosts: { editorPane: HTMLElement; serverPane: HTMLElement },
  emit: (snapshot: OfflineWorkflowSnapshot) => void,
): OfflineWorkflowInstance {
  const relay = new MiniRelay();
  let session: Session | null = null;
  let sessionSeq = 0;
  let wipeToken = 0;
  let savedWrites = 0;
  let restored = false;
  let disposed = false;
  let currentTiming: EditorTiming = 'immediate';

  function notify(): void {
    hosts.serverPane.textContent = session
      ? fragmentText(relay.doc.getXmlFragment('default'))
      : '';
    emit({
      localText: session
        ? session.editor
          ? session.editor.getText()
          : fragmentText(session.ydoc.getXmlFragment('default'))
        : '',
      serverText: session ? fragmentText(relay.doc.getXmlFragment('default')) : '',
      online: relay.online,
      restored,
      editorReady: !!session?.editor,
      pendingUpdates: relay.pendingUpdates,
      savedWrites,
      timing: currentTiming,
    });
  }

  /** 编辑器挂载：接线与 5.1 课一致——关 UndoRedo，Collaboration 绑这份 Y.Doc。 */
  function mountEditor(ydoc: Y.Doc): Editor {
    hosts.editorPane.replaceChildren();
    return new Editor({
      element: hosts.editorPane,
      extensions: [
        StarterKit.configure({
          // Collaboration 自带撤销历史，StarterKit 的 UndoRedo 必须关闭（见 5.3 课）
          undoRedo: false,
        }),
        Collaboration.configure({ document: ydoc }),
      ],
    });
  }

  function closeSession(): void {
    if (session) {
      session.editor?.destroy();
      // ydoc.destroy() 会级联触发 persistence.destroy()（源码注册在 doc 的
      // destroy 事件上）：停止写入并关闭数据库连接，库里的数据保留
      session.ydoc.destroy();
      session = null;
    }
    hosts.editorPane.replaceChildren();
  }

  function openSession(): void {
    closeSession();
    restored = false;
    savedWrites = 0;
    relay.pendingUpdates = 0;
    const token = ++sessionSeq;

    const ydoc = new Y.Doc();

    // 本地持久层：构造即注册 update 监听（无需手写 ydoc.on('update')），并异步
    // 打开 IndexedDB、把上次会话的更新灌回这份 Y.Doc
    const persistence = new IndexeddbPersistence(DB_NAME, ydoc);

    // 与 persistence 内部写库同条件计数：origin 不是 persistence 的每条更新都会
    // 落库——本地编辑与远端下行都是留存，恢复灌回则不重复计数
    ydoc.on('update', (_update: Uint8Array, origin: unknown) => {
      if (origin !== persistence) {
        savedWrites += 1;
      }
    });

    // 状态变化统一刷新读数（本地编辑、恢复灌回、服务器下行都产生 ydoc 事务）
    ydoc.on('update', () => notify());

    session = { ydoc, persistence, editor: null };

    // 本地恢复完成的信号：IndexedDB 里的更新已灌回 Y.Doc（库为空也会 resolve）
    persistence.whenSynced.then(() => {
      if (disposed || token !== sessionSeq) {
        return;
      }
      restored = true;
      // 「等本地恢复完成」的时机：恢复好后才创建编辑器，首帧即完整内容
      if (currentTiming === 'wait-local' && session && !session.editor) {
        session.editor = mountEditor(ydoc);
      }
      notify();
    });

    // 远端层：provider 的连接与搬运由 MiniRelay 扮演（在线时立即初始同步）
    relay.attach(ydoc);

    if (currentTiming === 'immediate') {
      // 「立即创建」：编辑器不等本地恢复，恢复灌回到达前先显示初始同步到的内容
      session.editor = mountEditor(ydoc);
    } else {
      // loading 占位：这正是消除空文档闪烁的推荐做法
      const waiting = document.createElement('p');
      waiting.className = 'eo-waiting';
      waiting.textContent = '等待本地库恢复…';
      hosts.editorPane.replaceChildren(waiting);
    }

    notify();
  }

  openSession();

  return {
    reopen() {
      // 取消在途的清库：删除请求被新会话取代
      wipeToken += 1;
      openSession();
    },
    wipeAndReopen() {
      closeSession();
      const token = ++wipeToken;
      // deleteDB 删除整个数据库（IndexedDB 请求按库名排队，自动等旧连接关闭）
      clearDocument(DB_NAME).then(() => {
        if (!disposed && token === wipeToken && session === null) {
          openSession();
        }
      });
      notify();
    },
    setOnline(online) {
      relay.setOnline(online);
      notify();
    },
    setTiming(timing) {
      currentTiming = timing;
      // 时机在会话开始那一刻决定，切换必须重建会话
      this.reopen();
    },
    insertText(text) {
      // 与手工键入同一条编辑路径：本地事务 → 投影进 fragment → update → 落库 / 上行
      session?.editor?.commands.insertContent(text);
    },
    dispose() {
      disposed = true;
      wipeToken += 1;
      closeSession();
      relay.doc.destroy();
      // 实例销毁时删除整个数据库，避免演示数据污染同源的其他页面
      void clearDocument(DB_NAME);
    },
  };
}
