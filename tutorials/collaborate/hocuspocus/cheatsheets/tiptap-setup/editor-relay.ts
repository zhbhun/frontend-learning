/**
 * 范例介绍：用两个真实 Tiptap Editor + Collaboration 扩展复现「编辑器 → Y.Doc →
 * 服务器 → 第二端投影」的数据链路，并对照三种初始内容设置时机的真实结果。
 * 前置状态：客户端 A（可编辑）与客户端 B（只读投影）各持一份 Y.Doc，两端编辑器
 * 都按本课接线绑定：StarterKit（undoRedo: false）+ Collaboration.configure({
 * document })；MiniRelay 扮演服务器上 name 为 demo-doc 的房间文档，同时承担
 * provider 的搬运职责。
 * 操作：「数据流动」场景在 A 端编辑器里直接键入，或用 Controls 的「A 端插入文本」
 * 与「服务器可达」开关；「初始内容」场景切换内容策略，两端整体重建。
 * 预期结果：A 端键入产生的 update 经 relay 转发后 B 端投影出相同内容；断开服务器
 * 时 A 仍可编辑（update 积压在本地），恢复后一次补传让 B 追平；「服务器预填」
 * 两端都拿到初始内容，「editor content 选项」被 Yjs 投影覆盖成空且 update 为 0，
 * 「创建后 insertContent」两端都有内容但性质是一次编辑（update 为 1）。
 * 阅读主线：bindEditor 的最小接线（undoRedo: false + Collaboration）→ A 端 update
 * 监听（真实 provider 的搬运职责，origin 为远端时不再上行）→ MiniRelay 的转发、
 * 积压与重连补传 → B 端只读投影。
 * 与真实链路的差异：传输层换成内存直连、服务器与 provider 合并为 MiniRelay；
 * Collaboration 绑定 Y.Doc、update 编码应用、投影与转发均为真实代码路径。
 */
import { Editor } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import StarterKit from '@tiptap/starter-kit';
import { TiptapTransformer } from '@hocuspocus/transformer';
import * as Y from 'yjs';

export type Scenario = 'data-flow' | 'initial-content';

/** 初始内容策略：服务器预填 / editor content 选项 / 创建后插入。 */
export type ContentStrategy = 'server-prefill' | 'editor-content' | 'after-create';

export interface RelayModelOptions {
  scenario: Scenario;
  /** 服务器可达性（真实链路里由 provider 的连接状态决定）。 */
  serverOnline: boolean;
  strategy: ContentStrategy;
}

export interface RelayModelSnapshot {
  textA: string;
  textB: string;
  /** 房间累计转发的 update 条数（重连补传按一条合并 update 计）。 */
  updatesRelayed: number;
  /** 断线期间积压在客户端 A 本地的 update 条数。 */
  pendingUpdates: number;
  online: boolean;
  strategy: ContentStrategy;
}

export interface RelayModelInstance {
  update(options: RelayModelOptions): void;
  /** 让客户端 A 用 insertContent 命令插入文字（与手工键入走同一条编辑路径）。 */
  insertText(text: string): void;
  dispose(): void;
}

/** 房间文档名，对应 provider 的 name 参数。 */
const DOCUMENT_NAME = 'demo-doc';

/** 服务器预填的内容：onLoadDocument 从存储读到的 Tiptap JSON。 */
const PREFILL_JSON = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '会议纪要（由服务器在 onLoadDocument 预填）' }],
    },
    { type: 'paragraph' },
  ],
};

/** 「editor content 选项」策略里传给编辑器的初始内容。 */
const CONTENT_OPTION_TEXT = '这段内容写在了 content 选项里';

/** 「创建后插入」策略里 insertContent 的内容。 */
const AFTER_CREATE_TEXT = '创建后再插入的初始内容';

/**
 * 内存房间：扮演 Hocuspocus 服务器上 name 为 demo-doc 的那份 Y.Doc，同时承担
 * provider 的搬运职责。关键对应：attach / 重连补传用状态向量换缺失更新（sync
 * step 1 / 2）；房间下行的更新以 REMOTE origin 应用到 A，A 端监听据此抑制上行
 * （真实 provider 的 origin 循环抑制）。
 */
class MiniRelay {
  /** 房间文档：所有端的更新在这里汇聚（服务器缓存的那份 Y.Doc）。 */
  readonly doc = new Y.Doc();

  online = true;

  updatesRelayed = 0;

  pendingUpdates = 0;

  /** 远端更新的 origin 标记，等价于真实 provider 把收到的更新以 provider 为 origin 应用。 */
  static readonly remoteOrigin: Record<string, string> = { source: DOCUMENT_NAME };

  private aDoc: Y.Doc | null = null;

  private bDoc: Y.Doc | null = null;

  /**
   * 服务器预填：对应 onLoadDocument 里把存储内容写进房间文档。
   * 服务端没有编辑器，用 TiptapTransformer 把 Tiptap JSON 转成 Y.Doc 再并入；
   * 转换用的扩展清单必须与客户端 schema 一致，这里同用 StarterKit。
   */
  prefill(): void {
    const converted = TiptapTransformer.toYdoc(PREFILL_JSON, 'default', [StarterKit]);
    Y.applyUpdate(this.doc, Y.encodeStateAsUpdate(converted));
    converted.destroy();
  }

  /** 客户端接入：双向初始同步，与 provider 连上服务器后的第一步一致。 */
  attach(aDoc: Y.Doc, bDoc: Y.Doc): void {
    this.aDoc = aDoc;
    this.bDoc = bDoc;

    // 房间缺失的内容由 A 补齐；A 缺失的内容（如预填）以远端 origin 应用
    Y.applyUpdate(this.doc, Y.encodeStateAsUpdate(aDoc, Y.encodeStateVector(this.doc)));
    Y.applyUpdate(
      aDoc,
      Y.encodeStateAsUpdate(this.doc, Y.encodeStateVector(aDoc)),
      MiniRelay.remoteOrigin,
    );

    // A 的本地编辑上行：转发进房间并推给 B（真实链路中即 provider 发送 sync update）
    aDoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === MiniRelay.remoteOrigin) {
        return; // 远端更新不再上行：真实 provider 的 origin 循环抑制
      }
      if (!this.online) {
        this.pendingUpdates += 1; // 断线期间更新积压在本地 Y.Doc，等重连补传
        return;
      }
      this.receive(update);
    });
  }

  /** 切换服务器可达性；恢复时先做一次双向补传，对应 provider 重连后的初始同步。 */
  setOnline(online: boolean): void {
    if (online === this.online || !this.aDoc) {
      this.online = online;
      return;
    }
    this.online = online;
    if (!online) {
      return;
    }
    // A 在断线期间的修改合成一条更新补传给房间（内部转发给 B）
    this.receive(Y.encodeStateAsUpdate(this.aDoc, Y.encodeStateVector(this.doc)));
    // 房间在断线期间（其他端）的修改补传给 A；B 只读，此向实际为空
    Y.applyUpdate(
      this.aDoc,
      Y.encodeStateAsUpdate(this.doc, Y.encodeStateVector(this.aDoc)),
      MiniRelay.remoteOrigin,
    );
    this.pendingUpdates = 0;
  }

  /** 房间收到一份更新：并入服务器文档并推给房间内其他客户端。 */
  private receive(update: Uint8Array): void {
    this.updatesRelayed += 1;
    Y.applyUpdate(this.doc, update);
    if (this.bDoc) {
      Y.applyUpdate(this.bDoc, update);
    }
  }
}

/** 客户端最小接线：与正文代码清单完全一致的一步。 */
function bindEditor(
  element: HTMLElement,
  ydoc: Y.Doc,
  editable: boolean,
  content?: string,
): Editor {
  return new Editor({
    element,
    editable,
    ...(content === undefined ? {} : { content }),
    extensions: [
      StarterKit.configure({
        // Collaboration 自带撤销历史（yUndoPlugin），StarterKit 的 UndoRedo 必须关闭；
        // Tiptap 2 中这个开关叫 history
        undoRedo: false,
      }),
      // 编辑器文档 = ydoc 中名为 default 的 Y.XmlFragment 的双向投影
      Collaboration.configure({
        document: ydoc,
      }),
    ],
  });
}

export function createRelayModel(
  hosts: { paneA: HTMLElement; paneB: HTMLElement },
  emit: (snapshot: RelayModelSnapshot) => void,
): RelayModelInstance {
  let current: RelayModelOptions = {
    scenario: 'data-flow',
    serverOnline: true,
    strategy: 'server-prefill',
  };

  let relay: MiniRelay | null = null;
  let editorA: Editor | null = null;
  let editorB: Editor | null = null;
  let aDoc: Y.Doc | null = null;
  let bDoc: Y.Doc | null = null;

  function snapshot(): RelayModelSnapshot {
    return {
      textA: editorA?.getText() ?? '',
      textB: editorB?.getText() ?? '',
      updatesRelayed: relay?.updatesRelayed ?? 0,
      pendingUpdates: relay?.pendingUpdates ?? 0,
      online: relay?.online ?? true,
      strategy: current.strategy,
    };
  }

  function notify(): void {
    emit(snapshot());
  }

  /** 两端整体重建：初始内容在编辑器创建那一刻决定，切换策略必须重建。 */
  function rebuild(): void {
    editorA?.destroy();
    editorB?.destroy();
    aDoc?.destroy();
    bDoc?.destroy();
    relay?.doc.destroy();

    relay = new MiniRelay();
    aDoc = new Y.Doc();
    bDoc = new Y.Doc();

    if (current.scenario === 'initial-content' && current.strategy === 'server-prefill') {
      relay.prefill();
    }

    relay.attach(aDoc, bDoc);

    editorA = bindEditor(
      hosts.paneA,
      aDoc,
      true,
      current.scenario === 'initial-content' && current.strategy === 'editor-content'
        ? CONTENT_OPTION_TEXT
        : undefined,
    );
    editorB = bindEditor(hosts.paneB, bDoc, false);

    if (current.scenario === 'initial-content' && current.strategy === 'after-create') {
      // 常见错误写法：等编辑器创建完再注入初始内容——它成为一次普通编辑，
      // 作为 update 同步给所有端，第二个客户端打开同一文档会再次注入。
      editorA.commands.insertContent(AFTER_CREATE_TEXT);
    }

    relay.setOnline(current.serverOnline);

    // 两端文档每次变化（本地编辑、远端投影）都刷新读数
    editorA.on('update', notify);
    editorB.on('update', notify);
    notify();
  }

  rebuild();

  return {
    update(options) {
      const needsRebuild =
        options.scenario !== current.scenario || options.strategy !== current.strategy;
      current = { ...options };
      if (needsRebuild) {
        rebuild();
        return;
      }
      relay?.setOnline(options.serverOnline);
      notify();
    },
    insertText(text) {
      // 与手工键入等价：insertContent 产生本地事务 → 投影进 Y.XmlFragment → update
      editorA?.commands.insertContent(text);
    },
    dispose() {
      editorA?.destroy();
      editorB?.destroy();
      aDoc?.destroy();
      bDoc?.destroy();
      relay?.doc.destroy();
      editorA = null;
      editorB = null;
      aDoc = null;
      bDoc = null;
      relay = null;
    },
  };
}
