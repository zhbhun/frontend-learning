import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import {
  createUndoDemo,
  type UndoDemoInstance,
  type UndoDemoOptions,
  type UndoDemoSnapshot,
} from './undo-demo';
import undoDemoSource from './undo-demo.ts?raw';

function clip(text: string): string {
  const chars = Array.from(text);
  return chars.length > 24 ? `${chars.slice(0, 24).join('')}…` : chars.join('');
}

function readout(snapshot: UndoDemoSnapshot): Array<[string, string]> {
  return [
    ['本地内容', clip(snapshot.localText)],
    ['同事内容', clip(snapshot.peerText)],
    ['撤销栈 / 重做栈', `${snapshot.undoDepth} 步 / ${snapshot.redoDepth} 步`],
    ['本地上行 update', `${snapshot.localUpdates} 条`],
    ['两端内容', snapshot.converged ? '一致' : '分叉'],
  ];
}

/*
 * 命令式 DOM 实例的装载外壳（与 assets/story-canvas.js 同一生命周期策略）：
 * 实例只创建一次，参数变化只调用 update，离开当前 Docs 页时 dispose——
 * 复用同一实例是为了保住撤销栈，参数变化不会把演示状态清零。
 */
interface MountedDemo {
  container: HTMLElement;
  instance: UndoDemoInstance;
}

let mounted: MountedDemo | undefined;

function renderDemo(args: UndoDemoOptions): HTMLElement {
  if (!mounted) {
    const container = document.createElement('div');
    const stageHolder = document.createElement('div');
    const readoutEl = document.createElement('dl');
    readoutEl.className = 'cs-readout ud-readout';
    container.append(stageHolder, readoutEl);

    const instance = createUndoDemo(stageHolder, snapshot => {
      paint(readoutEl, readout(snapshot));
    });

    mounted = { container, instance };

    // 参照共享外壳：离开当前 Docs 页（节点被移除）时销毁实例
    requestAnimationFrame(() => {
      const parent = container.parentElement;
      if (!parent) {
        return;
      }
      const observer = new MutationObserver(() => {
        if (!container.isConnected) {
          observer.disconnect();
          mounted?.instance.dispose();
          if (mounted?.container === container) {
            mounted = undefined;
          }
        }
      });
      observer.observe(parent, { childList: true });
    });
  }

  mounted.instance.update(args);
  return mounted.container;
}

function paint(rootEl: HTMLDlElement, entries: Array<[string, string]>): void {
  if (rootEl.childElementCount !== entries.length * 2) {
    rootEl.replaceChildren();
    for (const [label] of entries) {
      rootEl.append(document.createElement('dt'), document.createElement('dd'));
    }
  }

  const terms = rootEl.querySelectorAll('dt');
  const values = rootEl.querySelectorAll('dd');

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
  id: 'editor-undo',
  title: 'Tiptap 编辑器协同/编辑器撤销与历史',
  tags: ['!dev'],
  args: {
    peerInsert: '',
    action: 'idle',
  } satisfies UndoDemoOptions,
  argTypes: {
    peerInsert: {
      name: '同事插入文字',
      description:
        '每次修改作为同事编辑器的一次本地插入：进入同事的撤销栈，经服务器下行到本端（不进本地撤销栈）。输入以空格结尾便于区分多次插入。',
      control: { type: 'text' },
    },
    action: {
      name: '本地操作',
      description:
        '与舞台上的「撤销 / 重做」按钮等效，调用 editor.commands.undo() / redo()；栈空时命令返回 false。',
      control: { type: 'select' },
      options: {
        '（未执行）': 'idle',
        '撤销 undo': 'undo',
        '重做 redo': 'redo',
      },
    },
  },
  render: renderDemo,
  parameters: storySource(undoDemoSource),
} satisfies Meta<UndoDemoOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const UndoScope: Story = {
  name: '撤销作用域',
};
