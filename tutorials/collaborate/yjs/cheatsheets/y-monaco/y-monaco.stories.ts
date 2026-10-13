import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import demoSource from './monaco-binding-demo.ts?raw';
import {
  createMonacoBindingDemo,
  type BindingDemoInstance,
  type BindingDemoOptions,
  type BindingDemoSnapshot,
} from './monaco-binding-demo';

/** 控件集合;只承载 B 端的一次性动作。 */
interface MonacoArgs {
  bAction?: BindingDemoOptions['bAction'];
  bSelection?: BindingDemoOptions['bSelection'];
}

const CAPTIONS = [
  '客户端 A · 阿宁(直接打字、拖选)',
  '客户端 B · 小柏(直接操作 + Controls 驱动)',
] as const;

/* 命令式渲染:舞台与实例只创建一次,参数变化只调用 apply;离开当前 Docs 页时
   调用 dispose(editor.dispose() → model 销毁 → 绑定自动解除 → doc 销毁)。 */
function renderBindingDemo(): (args: MonacoArgs) => HTMLDivElement {
  let stage: HTMLDivElement | undefined;
  let instance: BindingDemoInstance | undefined;
  let readoutEl: HTMLDListElement | undefined;

  function paint(snapshot: BindingDemoSnapshot): void {
    if (!readoutEl) {
      return;
    }
    const entries: Array<[string, string]> = [
      ['共享文本 Y.Text', snapshot.ytext === '' ? '(空)' : JSON.stringify(flat(snapshot.ytext))],
      ['A 端看到的 B', snapshot.selectionInA],
      ['B 端看到的 A', snapshot.selectionInB],
    ];
    if (readoutEl.childElementCount !== entries.length * 2) {
      readoutEl.replaceChildren();
      for (const [label] of entries) {
        const term = document.createElement('dt');
        term.textContent = label;
        readoutEl.append(term, document.createElement('dd'));
      }
    }
    const terms = readoutEl.querySelectorAll('dt');
    const values = readoutEl.querySelectorAll('dd');
    entries.forEach(([label, value], index) => {
      if (terms[index].textContent !== label) {
        terms[index].textContent = label;
      }
      if (values[index].textContent !== value) {
        values[index].textContent = value;
      }
    });
  }

  return (args) => {
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'cs-stage';

      CAPTIONS.forEach((text, index) => {
        const caption = document.createElement('p');
        caption.className =
          index === 0
            ? 'cs-caption cs-caption--left'
            : 'cs-caption cs-caption--right';
        caption.textContent = text;
        stage!.append(caption);
      });

      readoutEl = document.createElement('dl');
      readoutEl.className = 'cs-readout';
      stage!.append(readoutEl);

      instance = createMonacoBindingDemo(stage!, paint);

      const observedStage = stage;
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
            if (stage === observedStage) {
              stage = undefined;
              instance = undefined;
              readoutEl = undefined;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    instance!.apply({
      bAction: args.bAction ?? 'none',
      bSelection: args.bSelection ?? 'none',
    });
    return stage;
  };
}

function flat(text: string): string {
  const singleLine = text.replace(/\n/g, '⏎');
  return singleLine.length > 44 ? `${singleLine.slice(0, 44)}…` : singleLine;
}

const renderDemo = renderBindingDemo();

const meta = {
  id: 'y-monaco',
  title: '编辑器绑定/Monaco',
  tags: ['!dev'],
} satisfies Meta<MonacoArgs>;

export default meta;

type Story = StoryObj<MonacoArgs>;

export const Binding: Story = {
  name: '双编辑器协同绑定',
  args: {
    bAction: 'none',
    bSelection: 'none',
  },
  argTypes: {
    bAction: {
      name: 'B 的程序化写入',
      description:
        '让 B 绕过编辑器直接写 Y.Text:model 由 MonacoBinding 同步,视图自动跟随。',
      control: {
        type: 'select',
        labels: {
          none: '不动作',
          insert: '在开头插入一行',
          clear: '清空文本',
        },
      },
      options: ['none', 'insert', 'clear'],
    },
    bSelection: {
      name: 'B 的选区',
      description:
        '改变 B 的光标 / 选区,经 awareness 广播后 A 端出现远程选区装饰。',
      control: {
        type: 'select',
        labels: {
          none: '不动作',
          all: '全选',
          'first-line': '选中第一行',
          clear: '光标移到文首',
        },
      },
      options: ['none', 'all', 'first-line', 'clear'],
    },
  },
  render: (args) => renderDemo(args),
  parameters: storySource(demoSource),
};
