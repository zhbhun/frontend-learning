import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { EditorState, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import {
  ySyncPlugin,
  yCursorPlugin,
  yUndoPlugin,
  undo,
  redo,
  yUndoPluginKey,
  ySyncPluginKey,
} from 'y-prosemirror';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';

const schema = new Schema({
  nodes: basicSchema.spec.nodes,
  marks: basicSchema.spec.marks,
});

const RELAY = 'manual-relay';

function makeSide(mount: HTMLElement, name: string, color: string) {
  const ydoc = new Y.Doc();
  const type = ydoc.getXmlFragment('prosemirror');
  const awareness = new Awareness(ydoc);
  awareness.setLocalStateField('user', { name, color });

  const state = EditorState.create({
    schema,
    plugins: [
      ySyncPlugin(type),
      yCursorPlugin(awareness),
      yUndoPlugin(),
      keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
    ],
  });
  const view = new EditorView(mount, { state });
  return { ydoc, type, awareness, view, name };
}

const a = makeSide(document.getElementById('editor-a')!, '甲', '#4f7cff');
const b = makeSide(document.getElementById('editor-b')!, '乙', '#f59e0b');

// 文档更新中继
a.ydoc.on('update', (update: Uint8Array, origin: unknown) => {
  if (origin !== RELAY) Y.applyUpdate(b.ydoc, update, RELAY);
});
b.ydoc.on('update', (update: Uint8Array, origin: unknown) => {
  if (origin !== RELAY) Y.applyUpdate(a.ydoc, update, RELAY);
});
// awareness 中继
a.awareness.on('update', ({ added, updated, removed }: any, origin: unknown) => {
  if (origin === RELAY) return;
  const changed = added.concat(updated, removed);
  applyAwarenessUpdate(b.awareness, encodeAwarenessUpdate(a.awareness, changed), RELAY);
});
b.awareness.on('update', ({ added, updated, removed }: any, origin: unknown) => {
  if (origin === RELAY) return;
  const changed = added.concat(updated, removed);
  applyAwarenessUpdate(a.awareness, encodeAwarenessUpdate(b.awareness, changed), RELAY);
});

// Tiptap 实例:第三个文档
const ydocC = new Y.Doc();
const awarenessC = new Awareness(ydocC);
const fakeProvider = { awareness: awarenessC };
let tiptapError: string | null = null;
let tiptapEditor: Editor | null = null;
try {
  tiptapEditor = new Editor({
    element: document.getElementById('tiptap-c')!,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydocC }),
      CollaborationCaret.configure({
        provider: fakeProvider,
        user: { name: '丙', color: '#22aa66' },
      }),
    ],
  });
} catch (err) {
  tiptapError = String(err);
}

const logEl = document.getElementById('log')!;
function log(...args: unknown[]) {
  logEl.textContent += args.map(String).join(' ') + '\n';
}

(window as any).__test = {
  insertA(text: string) {
    const { state } = a.view;
    const tr = state.tr.insertText(text, state.selection.from);
    a.view.dispatch(tr);
  },
  insertB(text: string) {
    const { state } = b.view;
    const tr = state.tr.insertText(text, state.selection.from);
    b.view.dispatch(tr);
  },
  boldA() {
    const { state } = a.view;
    const { from, to } = state.selection;
    if (from === to) return false;
    const tr = state.tr.addMark(from, to, schema.marks.strong.create());
    a.view.dispatch(tr);
    return true;
  },
  selectAllB() {
    const { state } = b.view;
    b.view.focus();
    const tr = state.tr.setSelection(
      // @ts-expect-error TextSelection import path
      new (Object.getPrototypeOf(state.selection).constructor)(state.doc)
    );
    b.view.dispatch(tr);
  },
  focusB() {
    b.view.focus();
  },
  undoA() {
    return undo(a.view.state);
  },
  undoB() {
    return undo(b.view.state);
  },
  undoStackDepthA() {
    return (yUndoPluginKey.getState(a.view.state) as any).undoManager.undoStack.length;
  },
  undoStackDepthB() {
    return (yUndoPluginKey.getState(b.view.state) as any).undoManager.undoStack.length;
  },
  textA() {
    return a.view.state.doc.textContent;
  },
  textB() {
    return b.view.state.doc.textContent;
  },
  xmlA() {
    return a.type.toJSON();
  },
  xmlB() {
    return b.type.toJSON();
  },
  cursorWidgetsInA() {
    return document.querySelectorAll('#editor-a .ProseMirror-yjs-cursor').length;
  },
  cursorLabelInA() {
    const el = document.querySelector('#editor-a .ProseMirror-yjs-cursor > div');
    return el ? el.textContent : null;
  },
  remoteSelectionHighlightInA() {
    return document.querySelectorAll('#editor-a .ProseMirror-yjs-selection').length;
  },
  bindingOriginCheck() {
    // 本地编辑的事务 origin 应是 ySyncPluginKey
    let seen: unknown = null;
    const h = (u: Uint8Array, o: unknown) => { seen = o; };
    a.ydoc.once('update', h);
    (window as any).__test.insertA('x');
    a.ydoc.off('update', h);
    return seen === ySyncPluginKey ? 'ySyncPluginKey' : String(seen);
  },
  tiptap: {
    error: tiptapError,
    isReady: !!tiptapEditor,
    setText(text: string) {
      tiptapEditor?.commands.insertContent(text);
    },
    getText() {
      return tiptapEditor?.getText() ?? null;
    },
    xmlC() {
      return ydocC.getXmlFragment('default').toJSON();
    },
    caretUsers() {
      return (tiptapEditor?.storage as any)?.collaborationCaret?.users ?? null;
    },
    undo() {
      return tiptapEditor?.commands.undo() ?? null;
    },
  },
  log,
};
log('ready');
