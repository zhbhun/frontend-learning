import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import {
  createRelayModel,
  type ContentStrategy,
  type RelayModelInstance,
  type RelayModelSnapshot,
  type Scenario,
} from './editor-relay';
import { createRelayStage } from './editor-stage';
import relayModelSource from './editor-relay.ts?raw';

interface DataFlowArgs {
  serverOnline: boolean;
  insertText: string;
}

interface InitialContentArgs {
  strategy: ContentStrategy;
}

type CourseArgs = DataFlowArgs & InitialContentArgs;

/** 读数用的短文本：过长截断，空文档显示占位。 */
function shorten(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const chars = Array.from(flat);
  if (chars.length === 0) {
    return '（空）';
  }
  return chars.length > 16 ? `${chars.slice(0, 16).join('')}…` : flat;
}

function dataFlowReadout(snapshot: RelayModelSnapshot): Array<[string, string]> {
  return [
    ['A 端内容', shorten(snapshot.textA)],
    ['B 端投影', shorten(snapshot.textB)],
    ['服务器', snapshot.online ? '在线' : '离线'],
    ['转发的 update', `${snapshot.updatesRelayed} 条`],
    ['离线积压', `${snapshot.pendingUpdates} 条`],
  ];
}

const STRATEGY_LABELS: Record<ContentStrategy, string> = {
  'server-prefill': '服务器预填（onLoadDocument）',
  'editor-content': 'editor content 选项',
  'after-create': '创建后 insertContent',
};

function initialContentReadout(snapshot: RelayModelSnapshot): Array<[string, string]> {
  return [
    ['初始内容策略', STRATEGY_LABELS[snapshot.strategy]],
    ['A 端内容', shorten(snapshot.textA)],
    ['B 端投影', shorten(snapshot.textB)],
    ['转发的 update', `${snapshot.updatesRelayed} 条`],
  ];
}

/* 命令式实例：舞台与编辑器只创建一次，参数变化只调用 apply；舞台脱离文档时
   dispose，与共享 canvasStory 等价的生命周期，只是渲染目标从 canvas 换成真实的
   Tiptap 编辑器（Collaboration 必须挂真实 Y.Doc 才是本课的真实路径）。 */
function relayStory({
  scenario,
  captions,
  readout,
  apply,
}: {
  scenario: Scenario;
  captions: readonly [string, string];
  readout: (snapshot: RelayModelSnapshot) => Array<[string, string]>;
  apply: (instance: RelayModelInstance, args: CourseArgs, fresh: boolean) => void;
}) {
  const READOUT_INTERVAL = 100;

  let stage: ReturnType<typeof createRelayStage> | undefined;
  let instance: RelayModelInstance | undefined;
  let lastPaint = 0;

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

  return (args: CourseArgs): HTMLDivElement => {
    const fresh = !stage;
    if (!stage) {
      stage = createRelayStage(document, captions);
      instance = createRelayModel({ paneA: stage.paneA, paneB: stage.paneB }, (snapshot) => {
        const now = performance.now();
        if (now - lastPaint < READOUT_INTERVAL) {
          return;
        }
        lastPaint = now;
        paint(stage!.readout, readout(snapshot));
      });

      const observedStage = stage.stage;
      const observedInstance = instance;
      requestAnimationFrame(() => {
        const parent = observedStage.parentElement;
        if (!parent) {
          return;
        }
        const observer = new MutationObserver(() => {
          if (!observedStage.isConnected) {
            observer.disconnect();
            observedInstance.dispose();
            if (stage?.stage === observedStage) {
              stage = undefined;
              instance = undefined;
              lastPaint = 0;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    lastPaint = 0;
    apply(instance!, args, fresh);
    return stage.stage;
  };
}

let dataFlowLastInserted: string | undefined;

const renderDataFlow = relayStory({
  scenario: 'data-flow',
  captions: ['客户端 A（编辑中）', '客户端 B（只读投影）'],
  readout: dataFlowReadout,
  apply(instance, args, fresh) {
    // 数据流动实例固定同名房间，聚焦键入上行、投影下行与断线补传的观察。
    instance.update({
      scenario: 'data-flow',
      serverOnline: args.serverOnline,
      strategy: 'server-prefill',
    });
    // 边缘触发：args 是受控值，只在文本变化时插入一次，避免重复注入。
    if (args.insertText && (fresh || args.insertText !== dataFlowLastInserted)) {
      dataFlowLastInserted = args.insertText;
      instance.insertText(args.insertText);
    }
  },
});

const renderInitialContent = relayStory({
  scenario: 'initial-content',
  captions: ['客户端 A（编辑中）', '客户端 B（只读投影）'],
  readout: initialContentReadout,
  apply(instance, args) {
    // 初始内容在编辑器创建那一刻决定，切换策略时实例整体重建两端。
    instance.update({
      scenario: 'initial-content',
      serverOnline: true,
      strategy: args.strategy,
    });
  },
});

const meta = {
  id: 'tiptap-setup',
  title: 'Tiptap 编辑器协同/Tiptap 协同接入',
  tags: ['!dev'],
  args: {
    serverOnline: true,
    insertText: 'hello 协同',
    strategy: 'server-prefill' as ContentStrategy,
  },
  argTypes: {
    serverOnline: {
      name: '服务器可达',
      description: '切换服务器的可达性，观察 A 端离线继续编辑、恢复后补传追平。',
      control: { type: 'boolean' },
    },
    insertText: {
      name: 'A 端插入文本',
      description: '经 editor.commands.insertContent 插入客户端 A，与手工键入走同一条编辑路径。',
      control: { type: 'text' },
    },
    strategy: {
      name: '初始内容策略',
      description: '切换初始内容的设置方式，对比三种时机的真实结果。',
      control: { type: 'select' },
      options: {
        '服务器预填（推荐）': 'server-prefill',
        'editor content 选项': 'editor-content',
        '创建后 insertContent': 'after-create',
      },
    },
  },
  parameters: storySource(relayModelSource),
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DataFlow: Story = {
  name: '数据流动',
  render: renderDataFlow,
  args: {
    serverOnline: true,
    insertText: 'hello 协同',
  },
  argTypes: {
    strategy: { table: { disable: true } },
  },
};

export const InitialContent: Story = {
  name: '初始内容的时机',
  render: renderInitialContent,
  args: {
    strategy: 'server-prefill',
  },
  argTypes: {
    serverOnline: { table: { disable: true } },
    insertText: { table: { disable: true } },
  },
};
