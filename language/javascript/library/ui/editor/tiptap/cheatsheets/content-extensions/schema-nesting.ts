/**
 * 范例介绍：结构之间的嵌套能力由 schema 决定；TaskItem 的 nested 配置会改写 schema。
 * 前置状态：装 BulletList、ListItem、TaskList、TaskItem（nested 由控件开关）、Blockquote；
 *   文档含普通段落、引用块内段落、无序列表项、任务列表项四个可定位位置。
 * 操作：切换「光标位置」和「TaskItem nested」，点 toggleBulletList 或 Tab 缩进。
 * 预期结果：引用块内段落可 toggleBulletList（blockquote 的 content 是 block+）；
 *   任务项 nested 关时 Tab 缩进失败（content 是 paragraph+），开成功（paragraph block*）。
 * 阅读主线：「光标所在链」读数直接展示 doc › 容器 › 容器 › 段落 的层级。
 */
import { Editor } from '@tiptap/core';
import { Blockquote } from '@tiptap/extension-blockquote';
import { Document } from '@tiptap/extension-document';
import {
  BulletList,
  ListItem,
  TaskItem,
  TaskList,
} from '@tiptap/extension-list';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import './demo.css';

export type CursorTarget = 'paragraph' | 'quote' | 'bullet-item' | 'task-item';

export interface SchemaNestingArgs {
  position: CursorTarget;
  nested: boolean;
}

export interface SchemaNestingSnapshot {
  chain: string;
  lastAction: string;
}

export interface SchemaNestingInstance {
  update(args: SchemaNestingArgs): void;
  dispose(): void;
}

const CONTENT =
  '<p>普通段落文字</p>' +
  '<blockquote><p>引用里的段落文字</p></blockquote>' +
  '<ul><li><p>无序列表项文字</p></li></ul>' +
  '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>任务项文字</p></li></ul>';

// 每个位置用一个唯一的文字锚点定位光标（选中该词，toggle 行为最稳定）
const CURSOR_TARGETS: Record<CursorTarget, string> = {
  paragraph: '普通段落',
  quote: '引用里的段落',
  'bullet-item': '无序列表项',
  'task-item': '任务项文字',
};

const POSITION_LABELS: Record<CursorTarget, string> = {
  paragraph: '普通段落',
  quote: '引用块内段落',
  'bullet-item': '无序列表项',
  'task-item': '任务列表项',
};

export function createSchemaNestingDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SchemaNestingSnapshot) => void,
): SchemaNestingInstance {
  const frame = document.createElement('div');
  frame.className = 'ce-frame';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'ce-toolbar';

  const hostLabel = document.createElement('p');
  hostLabel.className = 'ce-box-label';
  const host = document.createElement('div');
  host.className = 'ce-editor';

  frame.append(toolbar, hostLabel, host);

  let editor: Editor | null = null;
  let lastAction = '—';

  function emitSnapshot(): void {
    if (!editor) {
      return;
    }
    // 光标所在链：从 doc 到当前文本块，直观展示嵌套层级
    const { $from } = editor.state.selection;
    const parts = ['doc'];
    for (let d = 1; d <= $from.depth; d += 1) {
      parts.push($from.node(d).type.name);
    }
    emit({ chain: parts.join(' › '), lastAction });
  }

  function selectAnchorText(needle: string): void {
    if (!editor) {
      return;
    }
    let from = -1;
    editor.state.doc.descendants((node, pos) => {
      if (from >= 0) {
        return false;
      }
      if (node.isText && node.text?.includes(needle)) {
        from = pos + node.text.indexOf(needle);
        return false;
      }
      return true;
    });
    if (from >= 0 && editor) {
      editor.commands.setTextSelection({ from, to: from + needle.length });
    }
  }

  // Tab 缩进 = sinkListItem；按当前所在列表项类型传入项名
  function sinkCurrentItem(): boolean {
    if (!editor) {
      return false;
    }
    const item = editor.isActive('taskItem') ? 'taskItem' : 'listItem';
    return editor.chain().focus().sinkListItem(item).run();
  }

  const BUTTONS: Array<{ label: string; run: () => boolean }> = [
    {
      label: 'toggleBulletList',
      run: () => editor?.chain().focus().toggleBulletList().run() ?? false,
    },
    { label: 'Tab 缩进', run: sinkCurrentItem },
  ];

  for (const button of BUTTONS) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ce-btn';
    el.textContent = button.label;
    el.addEventListener('click', () => {
      const ok = button.run();
      lastAction = `${button.label}：${ok ? '成功' : '失败（schema 不允许）'}`;
      emitSnapshot();
    });
    toolbar.append(el);
  }

  function rebuild(args: SchemaNestingArgs): void {
    editor?.destroy();
    host.replaceChildren();
    lastAction = '—';

    // nested 直接改写 taskItem 的 content 表达式：paragraph+ ↔ paragraph block*
    editor = new Editor({
      element: host,
      extensions: [
        Document,
        Paragraph,
        Text,
        Blockquote,
        BulletList,
        ListItem,
        TaskList,
        TaskItem.configure({ nested: args.nested }),
      ],
      content: CONTENT,
    });
    editor.on('transaction', emitSnapshot);

    hostLabel.textContent = `编辑器：光标在「${POSITION_LABELS[args.position]}」，TaskItem nested ${args.nested ? '开' : '关'}`;
    selectAnchorText(CURSOR_TARGETS[args.position]);
    emitSnapshot();
  }

  rebuild({ position: 'quote', nested: false });

  return {
    update(args) {
      rebuild(args);
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
