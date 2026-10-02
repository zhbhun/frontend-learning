/**
 * 范例介绍：单页面模拟两个用户，演示远程光标、选区高亮、在线名单与失焦行为。
 * 前置状态：两份 Y.Doc 各挂一个 Awareness，由 local-relay 直连（provider 空实现）；
 *   创建完成后阿绿编辑器自动聚焦——光标只在编辑器持有焦点时发布。
 * 操作：点进任一编辑器输入或拖选；点「阿绿在开头插入一句」（不抢焦点）观察对方
 *   光标随内容平移；点「改名换色」观察身份更新；把焦点切到另一侧观察失焦行为。
 * 预期结果：聚焦一方的光标（名字＋颜色）与选区高亮实时出现在对方编辑器；
 *   插入文字后对方光标跟着内容平移；改名后名单与标签即时变化；
 *   失焦一方的光标立刻从对方视图消失（左下角聚焦读数同步）。
 * 阅读主线：awareness 的 user / cursor 字段如何变成对方屏幕上的 decorations。
 */
import { Editor } from '@tiptap/core';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import type { DecorationAttrs } from '@tiptap/pm/view';
import {
  connectPeers,
  createPeer,
  destroyPeer,
  type RelayPeer,
} from './local-relay';

export interface CollabStageSnapshot {
  orangeSeesUsers: string;
  greenStorageUsers: string;
  greenFocused: string;
  orangeFocused: string;
}

export interface CollabStageInstance {
  update(): void;
  dispose(): void;
}

const GREEN_USER = { name: '阿绿', color: '#16a34a' };
const ORANGE_USER = { name: '阿橙', color: '#ea580c' };

const INITIAL_CONTENT =
  '<p>阿绿和阿橙正在共同编辑这份文档。</p>' +
  '<p>点进任意一侧输入文字、拖选内容，去另一侧看效果。</p>';

// 自定义光标：render 返回的 DOM 就是对方看到的竖线与名字标签
function renderCaret(user: Record<string, any>): HTMLElement {
  const caret = document.createElement('span');
  caret.className = 'collab-ux-caret';
  caret.style.borderColor = String(user.color);
  const label = document.createElement('div');
  label.className = 'collab-ux-label';
  label.style.backgroundColor = String(user.color);
  label.textContent = String(user.name);
  caret.append(label);
  return caret;
}

// 自定义选区：返回 DecorationAttrs，ProseMirror 用它包住对方的选区
function renderSelection(user: Record<string, any>): DecorationAttrs {
  return {
    nodeName: 'span',
    class: 'collab-ux-selection',
    style: `background-color: ${String(user.color)}33`,
    'data-user': String(user.name),
  };
}

function buildEditor(
  host: HTMLElement,
  peer: RelayPeer,
  user: Record<string, any>,
  content?: string,
): Editor {
  return new Editor({
    element: host,
    extensions: [
      Document,
      Paragraph,
      Text,
      // 协作内容层：编辑器与该用户的 Y.Doc 双向同步
      Collaboration.configure({ document: peer.doc }),
      // 协作光标层：身份与光标经 peer.awareness 广播（provider 只需暴露 .awareness）
      CollaborationCaret.configure({
        provider: peer,
        user,
        render: renderCaret,
        selectionRender: renderSelection,
      }),
    ],
    ...(content ? { content } : {}),
  });
}

// 从 awareness 读在线名单：对方眼中应该看到谁
function namesOf(peer: RelayPeer): string {
  const names = [...peer.awareness.getStates().values()]
    .map((state) => (state as { user?: { name?: string | null } }).user?.name)
    .filter((name): name is string => typeof name === 'string');
  return names.length > 0 ? names.join(' · ') : '（无人在线）';
}

// storage.users 是扩展维护的全员缓存（含自己），与 awareness 名单对照
function storageNames(editor: Editor): string {
  const users = editor.storage.collaborationCaret.users;
  const names = users
    .map((entry) => entry.name)
    .filter((name): name is string => typeof name === 'string');
  return names.length > 0 ? names.join(' · ') : '（空）';
}

export function createCollabStage(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CollabStageSnapshot) => void,
): CollabStageInstance {
  const frame = document.createElement('div');
  frame.className = 'collab-frame';
  canvas.replaceWith(frame);

  const hint = document.createElement('p');
  hint.className = 'collab-hint';
  hint.textContent =
    '光标只在编辑器持有焦点时发布：点进一侧输入，另一侧就能看到带名字的光标';
  const toolbar = document.createElement('div');
  toolbar.className = 'collab-toolbar';
  const columns = document.createElement('div');
  columns.className = 'collab-columns';

  const greenPane = document.createElement('div');
  greenPane.className = 'collab-pane';
  const greenLabel = document.createElement('p');
  greenLabel.className = 'collab-pane-label';
  greenLabel.textContent = '阿绿 · #16a34a';
  const greenHost = document.createElement('div');
  greenHost.className = 'collab-editor';
  greenPane.append(greenLabel, greenHost);

  const orangePane = document.createElement('div');
  orangePane.className = 'collab-pane';
  const orangeLabel = document.createElement('p');
  orangeLabel.className = 'collab-pane-label';
  orangeLabel.textContent = '阿橙 · #ea580c';
  const orangeHost = document.createElement('div');
  orangeHost.className = 'collab-editor';
  orangePane.append(orangeLabel, orangeHost);

  columns.append(greenPane, orangePane);
  frame.append(hint, toolbar, columns);

  // —— 双用户基建：两份 Y.Doc + 各自 Awareness，直连转发 ——
  const green = createPeer();
  const orange = createPeer();
  connectPeers(green, orange);

  // 阿绿带初始内容：首帧写入自己的 Y.Doc 后经 relay 同步给阿橙
  const editorGreen = buildEditor(greenHost, green, GREEN_USER, INITIAL_CONTENT);
  const editorOrange = buildEditor(orangeHost, orange, ORANGE_USER);

  // 按钮拦截 mousedown，不抢焦点：阿绿的光标不会因为点按钮而从对方视图消失
  const insertButton = document.createElement('button');
  insertButton.type = 'button';
  insertButton.className = 'collab-btn';
  insertButton.textContent = '阿绿在开头插入一句';
  insertButton.title =
    'insertContentAt 不需要焦点；按钮也不抢焦点，阿绿的光标保持发布';
  insertButton.addEventListener('mousedown', (event) => event.preventDefault());
  insertButton.addEventListener('click', () => {
    editorGreen.commands.insertContentAt(1, '阿绿先说：');
  });

  const renameButton = document.createElement('button');
  renameButton.type = 'button';
  renameButton.className = 'collab-btn';
  renameButton.textContent = 'updateUser() 改名换色';
  renameButton.title = 'updateUser 即时广播新的身份，无需重建编辑器';
  renameButton.addEventListener('click', () => {
    editorGreen.commands.updateUser({ name: '绿绿', color: '#0d9488' });
    renameButton.textContent = '已改名为「绿绿」';
    greenLabel.textContent = '绿绿 · #0d9488';
  });
  toolbar.append(insertButton, renameButton);

  // 初始聚焦：阿绿发布光标给阿橙（发布以焦点为前提）
  editorGreen.commands.focus('end');

  function snapshot(): CollabStageSnapshot {
    return {
      orangeSeesUsers: namesOf(orange),
      greenStorageUsers: storageNames(editorGreen),
      greenFocused: editorGreen.isFocused ? '是' : '否',
      orangeFocused: editorOrange.isFocused ? '是' : '否',
    };
  }

  // editor 事件覆盖焦点与内容变化；改名、上下线走 awareness 更新，单独监听
  const refresh = (): void => emit(snapshot());
  for (const editor of [editorGreen, editorOrange]) {
    editor.on('focus', refresh);
    editor.on('blur', refresh);
    editor.on('transaction', refresh);
    editor.on('update', refresh);
  }
  green.awareness.on('update', refresh);
  orange.awareness.on('update', refresh);
  refresh();

  return {
    update() {
      // 本实例没有 Controls 输入：读者直接操作编辑器与按钮
    },
    dispose() {
      green.awareness.off('update', refresh);
      orange.awareness.off('update', refresh);
      editorGreen.destroy();
      editorOrange.destroy();
      destroyPeer(green);
      destroyPeer(orange);
      frame.remove();
    },
  };
}
