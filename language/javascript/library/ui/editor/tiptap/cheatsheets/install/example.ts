/**
 * 范例介绍：实际安装依赖后，把 Tiptap 编辑器挂载到 DOM，并对比两种扩展集合装出的编辑器。
 * 运行前提：需要先安装依赖（本课主题本身，安装命令见课程正文）——
 *   npm install @tiptap/core @tiptap/pm @tiptap/starter-kit
 *   npm install @tiptap/extension-document @tiptap/extension-paragraph @tiptap/extension-text
 *   未安装时本页会报模块解析错误，安装后刷新即可。
 * 输入：Controls 中的「扩展集合」（StarterKit 预打包 / 最小三件套）。
 * 操作：切换扩展集合；在编辑器里打字，试试输入 `# ` 加空格（仅 StarterKit 会变成标题）。
 * 预期结果：页面出现真实可输入的编辑器；读数显示当前 schema 的节点与标记类型，
 *   StarterKit 一次带入 22 个扩展，最小三件套只有文档骨架（无任何标记类型）。
 * 阅读主线：new Editor 挂载 → 扩展集合决定 schema → 切换集合时按新 schema 重建。
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';

export type ExtensionSet = 'starter-kit' | 'minimal';

export interface InstallSnapshot {
  setName: string;
  extensionCount: number;
  nodeCount: number;
  markCount: number;
}

export interface InstallInstance {
  update(set: ExtensionSet): void;
  dispose(): void;
}

const SET_NAMES: Record<ExtensionSet, string> = {
  'starter-kit': 'StarterKit（预打包）',
  minimal: '最小三件套',
};

function extensionsOf(set: ExtensionSet) {
  // 最小三件套：starter-kit 打包清单中的前三个基础节点扩展，也是能运行的最小骨架。
  return set === 'starter-kit'
    ? [StarterKit]
    : [Document, Paragraph, Text];
}

export function createInstallExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: InstallSnapshot) => void,
): InstallInstance {
  // 编辑器是普通 DOM 组件：用 div 作为挂载目标（element），替换 canvasStory 提供的画布。
  const host = document.createElement('div');
  canvas.replaceWith(host);

  // Tiptap 是 headless 编辑器，默认没有视觉样式；这里补最小可见样式，仅为让编辑器可辨认。
  host.style.border = '1px solid #cbd5e1';
  host.style.borderRadius = '8px';
  host.style.background = '#ffffff';
  host.style.padding = '12px 16px';
  host.style.margin = '16px 16px 0';
  host.style.minHeight = '110px';
  host.style.lineHeight = '1.7';
  host.style.caretColor = '#4f7cff';

  // 舞台内的自绘摘要区：展示当前 schema 的节点 / 标记类型清单（证据主体）。
  const summary = document.createElement('div');
  summary.style.margin = '10px 16px';
  summary.style.fontSize = '12px';
  summary.style.lineHeight = '2';
  host.after(summary);

  let editor: Editor | null = null;
  let currentSet: ExtensionSet = 'starter-kit';

  function renderSummary(label: string, names: string[]) {
    const row = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = `${label}（${names.length}）：`;
    row.append(title);
    if (names.length === 0) {
      const none = document.createElement('span');
      none.textContent = '（无）';
      none.style.color = '#94a3b8';
      row.append(none);
    }
    for (const name of names) {
      const chip = document.createElement('span');
      chip.textContent = name;
      chip.style.display = 'inline-block';
      chip.style.margin = '0 4px 2px 0';
      chip.style.padding = '0 7px';
      chip.style.border = '1px solid #dbe3f0';
      chip.style.borderRadius = '9px';
      chip.style.background = '#f8fafc';
      chip.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
      row.append(chip);
    }
    return row;
  }

  function snapshotOf(set: ExtensionSet, editor: Editor): InstallSnapshot {
    // schema.spec 的 nodes / marks 是 OrderedMap（不可直接 for-of），先转普通对象再取键名
    const nodes = Object.keys(editor.state.schema.spec.nodes.toObject());
    const marks = Object.keys(editor.state.schema.spec.marks.toObject());

    summary.replaceChildren(
      renderSummary('节点类型', nodes),
      renderSummary('标记类型', marks),
    );

    return {
      setName: SET_NAMES[set],
      extensionCount: editor.extensionManager.extensions.length,
      nodeCount: nodes.length,
      markCount: marks.length,
    };
  }

  function mount(set: ExtensionSet, content: string) {
    // 切换扩展集合会改变 schema，无法在运行中的编辑器上直接替换，先销毁再重建。
    editor?.destroy();
    host.replaceChildren();

    // 最小表达：new Editor 挂载到 element；extensions 决定 schema，即编辑器能装下什么内容。
    editor = new Editor({
      element: host,
      extensions: extensionsOf(set),
      content,
    });
    currentSet = set;
    emit(snapshotOf(set, editor));
  }

  mount('starter-kit', '<p>在编辑器里打字，试试输入 <code># </code>（井号加空格）。</p>');

  return {
    update(set) {
      if (!editor || set === currentSet) {
        return;
      }
      // 先取出当前 HTML 再重建：内容按新 schema 重新解析，装不下的结构会被丢弃或降级。
      mount(set, editor.getHTML());
    },
    dispose() {
      editor?.destroy();
      editor = null;
    },
  };
}
