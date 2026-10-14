import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import { createOfflineStage } from './offline-stage';
import {
  createOfflineWorkflow,
  type EditorTiming,
  type OfflineWorkflowInstance,
  type OfflineWorkflowSnapshot,
  type SessionAction,
} from './offline-workflow';
import workflowSource from './offline-workflow.ts?raw';

interface WorkflowArgs {
  online: boolean;
  timing: EditorTiming;
  action: SessionAction;
  insertText: string;
}

function clip(text: string): string {
  const chars = Array.from(text.replace(/\s+/g, ' ').trim());
  if (chars.length === 0) {
    return '（空）';
  }
  return chars.length > 18 ? `${chars.slice(0, 18).join('')}…` : chars.join('');
}

function readout(snapshot: OfflineWorkflowSnapshot): Array<[string, string]> {
  return [
    ['本地内容', clip(snapshot.localText)],
    ['服务器内容', clip(snapshot.serverText)],
    ['服务器', snapshot.online ? '在线' : '离线'],
    ['本地库恢复', snapshot.restored ? '已恢复' : '恢复中…'],
    [
      '编辑器',
      snapshot.editorReady
        ? '已创建'
        : snapshot.timing === 'wait-local'
          ? '等待本地恢复'
          : '已创建（先空）',
    ],
    ['本会话落库', `${snapshot.savedWrites} 条`],
    ['离线积压', `${snapshot.pendingUpdates} 条`],
  ];
}

/*
 * 命令式 DOM 实例的装载外壳（与 assets/story-canvas.js 同一生命周期策略）：
 * 实例只创建一次，参数变化只调用实例方法；离开当前 Docs 页时 dispose，
 * dispose 会删除本课隔离的 IndexedDB 数据库，避免污染同源页面。
 */
interface MountedDemo {
  container: HTMLElement;
  instance: OfflineWorkflowInstance;
}

let mounted: MountedDemo | undefined;
let appliedTiming: EditorTiming = 'immediate';
let lastAction: SessionAction = 'idle';
let lastInsert: string | undefined;

function renderDemo(args: WorkflowArgs): HTMLElement {
  if (!mounted) {
    const container = document.createElement('div');
    const stage = createOfflineStage(document, ['本端浏览器（编辑器 + IndexedDB）', '服务器房间文档']);
    const readoutEl = stage.readout;
    container.append(stage.stage);

    const instance = createOfflineWorkflow(
      { editorPane: stage.editorPane, serverPane: stage.serverPane },
      snapshot => {
        paint(readoutEl, readout(snapshot));
      },
    );

    mounted = { container, instance };
    // 实例以默认时机「立即创建」起步；args 被读者改过时由下方 diff 重建对齐
    appliedTiming = 'immediate';
    lastAction = 'idle';
    lastInsert = undefined;
  }

  const { instance } = mounted;

  // 编辑器创建时机在会话开始那一刻决定：切换必须重建会话
  if (args.timing !== appliedTiming) {
    appliedTiming = args.timing;
    instance.setTiming(args.timing);
  }

  // 会话操作是边缘触发：每次从其他选项变到目标值时执行一次
  if (args.action !== lastAction) {
    lastAction = args.action;
    if (args.action === 'reopen') {
      instance.reopen();
    } else if (args.action === 'wipe') {
      instance.wipeAndReopen();
    }
  }

  instance.setOnline(args.online);

  // 插入文本边缘触发：args 是受控值，只在文本变化时插入一次
  if (args.insertText && args.insertText !== lastInsert) {
    lastInsert = args.insertText;
    instance.insertText(args.insertText);
  }

  return mounted.container;
}

function paint(root: HTMLDListElement, entries: Array<[string, string]>): void {
  if (root.childElementCount !== entries.length * 2) {
    root.replaceChildren();
    for (const [label] of entries) {
      const term = document.createElement('dt');
      term.textContent = label;
      root.append(term, document.createElement('dd'));
    }
  }

  const terms = root.querySelectorAll('dt');
  const values = root.querySelectorAll('dd');
  entries.forEach(([label, value], index) => {
    if (terms[index].textContent !== label) {
      terms[index].textContent = label;
    }
    if (values[index].textContent !== value) {
      values[index].textContent = value;
    }
  });
}

const meta = {
  id: 'editor-offline',
  title: 'Tiptap 编辑器协同/离线编辑与恢复',
  tags: ['!dev'],
  args: {
    online: true,
    timing: 'immediate' as EditorTiming,
    action: 'idle' as SessionAction,
    insertText: '',
  },
  argTypes: {
    online: {
      name: '服务器可达',
      description:
        '断开时本端照常可编辑，更新积压在本地；恢复时一次状态向量对账补传（协议见断线与重连课）。',
      control: { type: 'boolean' },
    },
    timing: {
      name: '编辑器创建时机',
      description:
        '重开页面时编辑器挂载与本地库恢复的先后：立即创建会先显示空文档或服务器内容、恢复完成后内容弹入；等本地恢复完成（whenSynced）则首帧即完整内容。',
      control: { type: 'select' },
      options: {
        '立即创建（不等本地恢复）': 'immediate',
        '等本地恢复完成（whenSynced）': 'wait-local',
      },
    },
    action: {
      name: '会话操作',
      description:
        '重开页面：销毁编辑器与 Y.Doc 后重新打开，模拟刷新——IndexedDB 里的内容恢复回来。清空本地库并重开：相当于清除站点数据，恢复后只剩服务器内容。',
      control: { type: 'select' },
      options: {
        '（未执行）': 'idle',
        '重开页面（本地库保留）': 'reopen',
        '清空本地库并重开': 'wipe',
      },
    },
    insertText: {
      name: '本端插入文本',
      description: '经 editor.commands.insertContent 插入本端编辑器，与手工键入走同一条编辑路径（编辑器创建后生效）。',
      control: { type: 'text' },
    },
  },
  render: renderDemo,
  parameters: storySource(workflowSource),
} satisfies Meta<WorkflowArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OfflineWorkflow: Story = {
  name: '离线工作流',
};
