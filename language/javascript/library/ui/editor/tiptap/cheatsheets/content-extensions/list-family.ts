/**
 * 范例介绍：列表家族的三种列表如何切换、如何嵌套。
 * 前置状态：装 BulletList、OrderedList、ListItem、TaskList、TaskItem（本范例显式开 nested: true）；
 *   初始文档是三个普通段落。
 * 操作：光标放进段落，点工具条按钮切换列表；光标在列表项内点「Tab 缩进 / Shift-Tab 提升」。
 * 预期结果：「当前列表」读数随切换变化；Tab 让「嵌套深度」加一，Shift-Tab 减一。
 * 阅读主线：三种列表共用同一组嵌套命令；TaskItem 的 nested 默认为 false，其 schema 级
 *   行为差异由 schema-nesting 范例专门演示。
 */
import { Editor } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import {
  BulletList,
  ListItem,
  OrderedList,
  TaskItem,
  TaskList,
} from '@tiptap/extension-list';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import './demo.css';

export interface ListFamilySnapshot {
  currentList: string;
  depth: number;
}

export interface ListFamilyInstance {
  update(): void;
  dispose(): void;
}

// 任务项同样注册 Enter / Tab / Shift-Tab；这里开 nested 让任务列表也能演示嵌套
const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  BulletList,
  OrderedList,
  ListItem,
  TaskList,
  TaskItem.configure({ nested: true }),
];

const CONTENT =
  '<p>第一段：把光标放进来，点上面的切换按钮。</p>' +
  '<p>第二段：换成另一种列表试试。</p>' +
  '<p>第三段：光标放在列表项里，用 Tab 缩进。</p>';

const LIST_LABELS: Record<string, string> = {
  bulletList: '无序列表 bulletList',
  orderedList: '有序列表 orderedList',
  taskList: '任务列表 taskList',
};

export function createListFamilyDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ListFamilySnapshot) => void,
): ListFamilyInstance {
  // 编辑器是普通 DOM 组件：用 div 替换 canvasStory 提供的画布
  const frame = document.createElement('div');
  frame.className = 'ce-frame';
  canvas.replaceWith(frame);

  const toolbar = document.createElement('div');
  toolbar.className = 'ce-toolbar';

  const hostLabel = document.createElement('p');
  hostLabel.className = 'ce-box-label';
  hostLabel.textContent = '编辑器（可编辑，可直接点进去操作）';
  const host = document.createElement('div');
  host.className = 'ce-editor';

  frame.append(toolbar, hostLabel, host);

  let editor: Editor | null = null;

  function emitSnapshot(): void {
    if (!editor) {
      return;
    }
    // 当前列表：按 isActive 逐个判断；嵌套深度：统计光标祖先链上的列表节点
    const currentList = Object.keys(LIST_LABELS).find((name) =>
      editor?.isActive(name),
    );
    const { $from } = editor.state.selection;
    let depth = 0;
    for (let d = 1; d <= $from.depth; d += 1) {
      const name = $from.node(d).type.name;
      if (name in LIST_LABELS) {
        depth += 1;
      }
    }
    emit({
      currentList: currentList ? LIST_LABELS[currentList] : '不在列表内',
      depth,
    });
  }

  // 三条切换命令由各列表节点注册；两条嵌套命令是 core 命令，按当前项类型传入项名
  const BUTTONS: Array<{ label: string; run: (editor: Editor) => boolean }> = [
    {
      label: 'toggleBulletList',
      run: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'toggleOrderedList',
      run: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'toggleTaskList',
      run: (ed) => ed.chain().focus().toggleTaskList().run(),
    },
    {
      label: 'Tab 缩进',
      run: (ed) => {
        const item = ed.isActive('taskItem') ? 'taskItem' : 'listItem';
        return ed.chain().focus().sinkListItem(item).run();
      },
    },
    {
      label: 'Shift-Tab 提升',
      run: (ed) => {
        const item = ed.isActive('taskItem') ? 'taskItem' : 'listItem';
        return ed.chain().focus().liftListItem(item).run();
      },
    },
  ];

  for (const button of BUTTONS) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'ce-btn';
    el.textContent = button.label;
    el.addEventListener('click', () => {
      if (editor) {
        button.run(editor);
      }
    });
    toolbar.append(el);
  }

  editor = new Editor({
    element: host,
    extensions: EXTENSIONS,
    content: CONTENT,
  });

  // 读数跟随编辑器事务实时刷新（含光标移动）
  editor.on('transaction', emitSnapshot);

  editor.commands.setTextSelection(1);
  emitSnapshot();

  return {
    update() {
      emitSnapshot();
    },
    dispose() {
      editor?.destroy();
      frame.remove();
    },
  };
}
