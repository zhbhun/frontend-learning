/**
 * 范例介绍：两个用户在同一位置并发插入文字，观察 Yjs CRDT 的确定性合并。
 * 前置状态：与双人协作台相同的直连结构（relay 有 30ms 模拟延迟）；文档是一段共同文本。
 * 操作：点「同时插入」——阿绿在段首插入「绿」，阿橙在同一位置插入「橙」，
 *   两次插入在各自本地同时生效、互相不知晓，30ms 后经 relay 交换更新；
 *   再点「仅阿绿插入」作为非并发的对照。
 * 预期结果：并发插入后两个词都保留、两端文本完全一致（不互相覆盖）；
 *   先后顺序由 CRDT 规则确定，本次会话内固定，但未必符合「先点的排前面」的直觉。
 * 阅读主线：内容冲突不需要人工合并，协作 UX 的职责是提示而不是拦截。
 */
import { Editor } from '@tiptap/core';
import { Collaboration } from '@tiptap/extension-collaboration';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import {
  connectPeers,
  createPeer,
  destroyPeer,
  type RelayPeer,
} from './local-relay';

export interface ConcurrentMergeSnapshot {
  greenText: string;
  orangeText: string;
  consistent: string;
}

export interface ConcurrentMergeInstance {
  update(): void;
  dispose(): void;
}

const INITIAL_CONTENT = '<p>并发插入目标：本段开头。</p>';

function firstParagraphText(editor: Editor): string {
  const first = editor.state.doc.firstChild;
  return first ? first.textContent : '';
}

export function createConcurrentMerge(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ConcurrentMergeSnapshot) => void,
): ConcurrentMergeInstance {
  const frame = document.createElement('div');
  frame.className = 'collab-frame';
  canvas.replaceWith(frame);

  const hint = document.createElement('p');
  hint.className = 'collab-hint';
  hint.textContent =
    '并发不丢字：两端同时插入的词都会留下，顺序由 CRDT 规则决定，两端必然一致';
  const toolbar = document.createElement('div');
  toolbar.className = 'collab-toolbar';
  const columns = document.createElement('div');
  columns.className = 'collab-columns';

  const greenPane = document.createElement('div');
  greenPane.className = 'collab-pane';
  const greenLabel = document.createElement('p');
  greenLabel.className = 'collab-pane-label';
  greenLabel.textContent = '阿绿';
  const greenHost = document.createElement('div');
  greenHost.className = 'collab-editor';
  greenPane.append(greenLabel, greenHost);

  const orangePane = document.createElement('div');
  orangePane.className = 'collab-pane';
  const orangeLabel = document.createElement('p');
  orangeLabel.className = 'collab-pane-label';
  orangeLabel.textContent = '阿橙';
  const orangeHost = document.createElement('div');
  orangeHost.className = 'collab-editor';
  orangePane.append(orangeLabel, orangeHost);

  columns.append(greenPane, orangePane);
  frame.append(hint, toolbar, columns);

  // —— 双用户基建：两份 Y.Doc + relay 直连（本范例只关心内容通道）——
  const green = createPeer();
  const orange = createPeer();
  connectPeers(green, orange);

  const editorGreen = new Editor({
    element: greenHost,
    extensions: [
      Document,
      Paragraph,
      Text,
      Collaboration.configure({ document: green.doc }),
    ],
    content: INITIAL_CONTENT,
  });
  const editorOrange = new Editor({
    element: orangeHost,
    extensions: [
      Document,
      Paragraph,
      Text,
      Collaboration.configure({ document: orange.doc }),
    ],
  });

  // 「同时插入」：两条命令在同一次事件循环里各自落到本地 Y.Doc，
  // 此刻对方还看不到这份修改——更新经 relay 交换后才算真正的并发冲突
  const bothButton = document.createElement('button');
  bothButton.type = 'button';
  bothButton.className = 'collab-btn';
  bothButton.textContent = '两端同时在段首插入';
  bothButton.title = '绿端插「绿」，橙端在同一位置插「橙」，互不知晓地并发';
  bothButton.addEventListener('click', () => {
    editorGreen.commands.insertContentAt(1, '绿 ');
    editorOrange.commands.insertContentAt(1, '橙 ');
  });

  // 对照：只有一端插入时，先后顺序就是操作顺序，没有 CRDT 排序问题
  const greenOnlyButton = document.createElement('button');
  greenOnlyButton.type = 'button';
  greenOnlyButton.className = 'collab-btn';
  greenOnlyButton.textContent = '仅阿绿插入';
  greenOnlyButton.title = '单端插入作为对照：顺序就是操作顺序';
  greenOnlyButton.addEventListener('click', () => {
    editorGreen.commands.insertContentAt(1, '绿 ');
  });
  toolbar.append(bothButton, greenOnlyButton);

  function snapshot(): ConcurrentMergeSnapshot {
    const greenText = firstParagraphText(editorGreen);
    const orangeText = firstParagraphText(editorOrange);
    return {
      greenText,
      orangeText,
      consistent: greenText === orangeText ? '一致' : '不一致',
    };
  }

  const refresh = (): void => emit(snapshot());
  editorGreen.on('update', refresh);
  editorOrange.on('update', refresh);
  refresh();

  return {
    update() {
      // 本实例没有 Controls 输入：读者直接点按钮触发并发
    },
    dispose() {
      editorGreen.destroy();
      editorOrange.destroy();
      destroyPeer(green);
      destroyPeer(orange);
      frame.remove();
    },
  };
}
