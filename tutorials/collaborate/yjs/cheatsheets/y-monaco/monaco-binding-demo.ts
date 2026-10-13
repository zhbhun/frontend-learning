/**
 * 范例介绍:同一页面创建客户端 A「阿宁」(固定)与客户端 B「小柏」(可直接编辑,
 * 也可由 Controls 驱动),各自持有独立的 Y.Doc 与 Monaco 编辑器,用 Y.Doc 的
 * update 事件与 awareness 的 encode / apply 手写双向中继(即真实项目里
 * y-websocket 等 Provider 承担的通道),再用 MonacoBinding 把 Y.Text 绑定到
 * 各自的 monaco model 上。
 * 输入:读者直接在两个编辑器里打字、拖选文本;Controls 让 B 程序化写入 Y.Text
 * 或改变选区。
 * 预期:任一侧编辑即时出现在另一侧;一侧移动光标或选区,另一侧出现对应颜色的
 * 远程选区装饰;读数展示共享文本与两端看到的远程选区。
 * 阅读主线:MonacoEnvironment worker 配置 → relay 中继 → createClient
 * (MonacoBinding 绑定)→ apply → dispose。
 */
import * as Y from 'yjs';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import tsWorker from 'monaco-editor/languages/features/typescript/ts.worker.js?worker';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';

// y-monaco 0.1.6 的内部导入指向 monaco-editor ≥0.56 已移除的深层路径,
// 本工作区改用一行修复的等价副本(构造签名与 npm 包完全一致),见 y-monaco-compat.js。
import { MonacoBinding } from './y-monaco-compat.js';

// Monaco 在 Vite 下必须自备 worker。按 label 分发:语言服务(TS/JS)有各自的
// worker,其余请求走基础 worker;全部回给基础 worker 会让 TS 语法服务报
// “Missing requestHandler”。未定义 getWorker 时,任何 worker 请求直接抛
// “You must define a function MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker”。
// 注意 monaco-editor ≥0.56 的深层入口要去掉 esm/vs 前缀,旧写法
// monaco-editor/esm/vs/editor/editor.worker.js 已无法解析。
self.MonacoEnvironment = {
  getWorker: (_workerId, label) =>
    label === 'javascript' || label === 'typescript'
      ? new tsWorker()
      : new editorWorker(),
};

export interface BindingDemoOptions {
  bAction: 'none' | 'insert' | 'clear';
  bSelection: 'none' | 'all' | 'first-line' | 'clear';
}

export interface BindingDemoSnapshot {
  /** A 端 Y.Text 的内容。 */
  ytext: string;
  /** A 端读到的 B 远程选区。 */
  selectionInA: string;
  /** B 端读到的 A 远程选区。 */
  selectionInB: string;
}

export interface BindingDemoInstance {
  apply(options: BindingDemoOptions): void;
  dispose(): void;
}

/** awareness 事件载荷:本次发生变化的 clientID 列表。 */
interface AwarenessDelta {
  added: number[];
  updated: number[];
  removed: number[];
}

/** y-monaco 写入 awareness 的选区字段:两端都是相对位置。 */
interface RemoteSelection {
  anchor: Y.RelativePosition;
  head: Y.RelativePosition;
}

// 中继 origin 标记:对端 apply 回来的消息带此标记,遇到就跳过防回声,
// 与 awareness 课的做法一致。
const RELAY_ORIGIN = 'manual-relay';

const INITIAL_TEXT = [
  '// 两端正在协同编辑同一个 Y.Text',
  'const ydoc = new Y.Doc();',
  'ydoc.getText("monaco");',
  '',
].join('\n');

interface Client {
  doc: Y.Doc;
  awareness: Awareness;
  ytext: Y.Text;
  editor: monaco.editor.IStandaloneCodeEditor;
  model: monaco.editor.ITextModel;
  binding: MonacoBinding;
}

function relayDoc(from: Y.Doc, to: Y.Doc): void {
  from.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === RELAY_ORIGIN) {
      return;
    }
    Y.applyUpdate(to, update, RELAY_ORIGIN);
  });
}

function relayAwareness(from: Awareness, to: Awareness): void {
  from.on('update', (delta: AwarenessDelta, origin: unknown) => {
    if (origin === RELAY_ORIGIN) {
      return;
    }
    // 监听 update 而非 change:心跳与下线 null 帧只有 update 会触发。
    const changed = delta.added.concat(delta.updated, delta.removed);
    applyAwarenessUpdate(to, encodeAwarenessUpdate(from, changed), RELAY_ORIGIN);
  });
}

function createClient(container: HTMLElement, name: string, color: string): Client {
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  awareness.setLocalState({ user: { name, color } });
  const ytext = doc.getText('monaco');

  const editor = monaco.editor.create(container, {
    // MonacoBinding 构造时用 Y.Text 内容覆盖 model 初值,这里保持空串即可
    value: '',
    language: 'javascript',
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13,
  });
  const model = editor.getModel();
  if (!model) {
    throw new Error('Monaco 编辑器未创建 model。');
  }

  // 数据面绑定的是 (Y.Text ↔ model);editors 集合只承担选区保存与远程装饰,
  // 传 awareness 才有选区广播与远程光标渲染。
  const binding = new MonacoBinding(ytext, model, new Set([editor]), awareness);

  return { doc, awareness, ytext, editor, model, binding };
}

function describeSelection(
  awareness: Awareness,
  clientID: number,
  doc: Y.Doc,
  model: monaco.editor.ITextModel,
): string {
  const state = awareness.getStates().get(clientID);
  const selection = state?.['selection'] as RemoteSelection | undefined;
  // 与 y-monaco 的装饰渲染条件一致:selection 及其两端都存在才渲染
  if (!selection || !selection.anchor || !selection.head) {
    return '无';
  }
  const anchor = Y.createAbsolutePositionFromRelativePosition(selection.anchor, doc);
  const head = Y.createAbsolutePositionFromRelativePosition(selection.head, doc);
  if (!anchor || !head) {
    return '指向已删除的内容';
  }
  const start = model.getPositionAt(Math.min(anchor.index, head.index));
  const end = model.getPositionAt(Math.max(anchor.index, head.index));
  if (start.lineNumber === end.lineNumber && start.column === end.column) {
    return `光标 L${start.lineNumber}:C${start.column}`;
  }
  return `选区 L${start.lineNumber}:C${start.column} – L${end.lineNumber}:C${end.column}`;
}

export function createMonacoBindingDemo(
  stage: HTMLDivElement,
  emit: (snapshot: BindingDemoSnapshot) => void,
): BindingDemoInstance {
  const panelA = document.createElement('div');
  panelA.className = 'ym-panel ym-panel--a';
  const panelB = document.createElement('div');
  panelB.className = 'ym-panel ym-panel--b';
  stage.append(panelA, panelB);

  const clientA = createClient(panelA, '阿宁', '#4f7cff');
  const clientB = createClient(panelB, '小柏', '#e25c5c');

  relayDoc(clientA.doc, clientB.doc);
  relayDoc(clientB.doc, clientA.doc);
  relayAwareness(clientA.awareness, clientB.awareness);
  relayAwareness(clientB.awareness, clientA.awareness);

  // 中继就位后再写初始内容:经 update 事件送达 B,与真实 Provider 的首屏同步一致
  clientA.ytext.insert(0, INITIAL_TEXT);

  // 远程装饰的类名由 y-monaco 生成:基类 + -<clientID> 后缀;
  // 按客户端注入颜色即官方 README 说的逐用户配色。
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .ym-panel {
      position: absolute;
      top: 44px;
      bottom: 104px;
      width: calc(50% - 26px);
      overflow: hidden;
      border: 1px solid #dbe3f0;
      border-radius: 6px;
      background: #ffffff;
    }
    .ym-panel--a { left: 18px; }
    .ym-panel--b { right: 18px; }
    .yRemoteSelectionHead {
      position: absolute;
      border-top: 2px solid #808080;
      border-bottom: 2px solid #808080;
      border-left: 2px solid #808080;
      height: 100%;
      box-sizing: border-box;
    }
    .yRemoteSelectionHead::after {
      position: absolute;
      content: ' ';
      border: 3px solid #808080;
      border-radius: 4px;
      left: -4px;
      top: -5px;
    }
    .yRemoteSelection {
      background-color: rgb(128 128 128 / 18%);
    }
    .yRemoteSelection-${clientA.doc.clientID},
    .yRemoteSelectionHead-${clientA.doc.clientID} {
      border-color: #4f7cff;
      background-color: rgb(79 124 255 / 30%);
    }
    .yRemoteSelection-${clientB.doc.clientID},
    .yRemoteSelectionHead-${clientB.doc.clientID} {
      border-color: #e25c5c;
      background-color: rgb(226 92 92 / 30%);
    }
  `;
  stage.append(styleEl);

  // —— 快照:内容与远程选区都从两端真实的协议状态读出 ——
  function snapshot(): BindingDemoSnapshot {
    return {
      ytext: clientA.ytext.toString(),
      selectionInA: describeSelection(
        clientA.awareness,
        clientB.doc.clientID,
        clientA.doc,
        clientA.model,
      ),
      selectionInB: describeSelection(
        clientB.awareness,
        clientA.doc.clientID,
        clientB.doc,
        clientB.model,
      ),
    };
  }

  let readoutTimer = 0;
  function scheduleReadout(): void {
    if (readoutTimer !== 0) {
      return;
    }
    readoutTimer = window.setTimeout(() => {
      readoutTimer = 0;
      emit(snapshot());
    }, 80);
  }

  clientA.doc.on('afterTransaction', scheduleReadout);
  clientB.doc.on('afterTransaction', scheduleReadout);
  clientA.awareness.on('change', scheduleReadout);
  clientB.awareness.on('change', scheduleReadout);
  emit(snapshot());
  function apply(options: BindingDemoOptions): void {
    // 程序化写入:绕过编辑器直接写 Y.Text,model 由绑定同步,monaco 视图自动跟随
    if (options.bAction === 'insert') {
      clientB.ytext.insert(0, '// 客户端 B 经 Y.Text API 写入\n');
    } else if (options.bAction === 'clear') {
      clientB.ytext.delete(0, clientB.ytext.length);
    }

    // 改变 B 的选区:与用户操作一样走 onDidChangeCursorSelection → awareness 广播
    if (options.bSelection === 'all') {
      const range = clientB.model.getFullModelRange();
      clientB.editor.setSelection(
        new monaco.Selection(
          range.startLineNumber,
          range.startColumn,
          range.endLineNumber,
          range.endColumn,
        ),
      );
      clientB.editor.focus();
    } else if (options.bSelection === 'first-line') {
      clientB.editor.setSelection(
        new monaco.Selection(1, 1, 1, clientB.model.getLineMaxColumn(1)),
      );
      clientB.editor.focus();
    } else if (options.bSelection === 'clear') {
      clientB.editor.setSelection(new monaco.Selection(1, 1, 1, 1));
      clientB.editor.focus();
    }
    scheduleReadout();
  }

  return {
    apply,
    dispose() {
      window.clearTimeout(readoutTimer);
      // editor.dispose() 会销毁其内部创建的 model,model.onWillDispose
      // 自动触发 MonacoBinding.destroy():数据与 awareness 监听一起解除。
      clientA.editor.dispose();
      clientB.editor.dispose();
      // doc.destroy() 连带销毁 awareness(y-protocols 在 doc 上注册了 destroy 监听)
      clientA.doc.destroy();
      clientB.doc.destroy();
      styleEl.remove();
      panelA.remove();
      panelB.remove();
    },
  };
}
