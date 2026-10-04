import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import versionCheckSource from './version-check.ts?raw';
import {
  createVersionCheck,
  type VersionInstance,
} from './version-check';

interface VersionArgs {
  currentVersion: string;
  candidateVersion: string;
}

// 把 DOM 范例实例接到 Storybook args 上：实例只创建一次，后续参数变化只调用
// apply；实例自带的 snapshot 由左下角读数显示；离开当前 Docs 页（节点被移除）
// 时调用实例的 dispose。
function domStory<
  Args,
  T extends {
    element: HTMLElement;
    snapshot(): Array<[string, string]>;
    dispose(): void;
  },
>(options: {
  create: () => T;
  captions: string[];
  apply: (instance: T, args: Args) => void;
}): (args: Args) => HTMLElement {
  let instance: T | undefined;
  let readoutEl: HTMLDListElement | undefined;

  return (args: Args): HTMLElement => {
    let current = instance;
    if (!current) {
      current = options.create();
      instance = current;
      const created = current;
      const stage = created.element;

      const captions = document.createDocumentFragment();
      options.captions.forEach((text, index) => {
        const caption = document.createElement('p');
        caption.className =
          index === 0
            ? 'cs-caption cs-caption--left'
            : 'cs-caption cs-caption--right';
        caption.textContent = text;
        captions.append(caption);
      });
      stage.insertBefore(captions, stage.firstChild);

      readoutEl = document.createElement('dl');
      readoutEl.className = 'cs-readout';
      stage.append(readoutEl);

      requestAnimationFrame(() => {
        const parent = created.element.parentElement;
        if (!parent) {
          return;
        }
        const observer = new MutationObserver(() => {
          if (!created.element.isConnected) {
            observer.disconnect();
            created.dispose();
            if (instance === created) {
              instance = undefined;
              readoutEl = undefined;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    options.apply(current, args);
    paintReadout(readoutEl!, current.snapshot());
    return current.element;
  };
}

// 读数重绘：dt/dd 数量固定，只更新标签与取值
function paintReadout(
  root: HTMLDListElement,
  entries: Array<[string, string]>,
): void {
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
    const term = terms[index];
    const cell = values[index];
    if (term && term.textContent !== label) {
      term.textContent = label;
    }
    if (cell && cell.textContent !== value) {
      cell.textContent = value;
    }
  });
}

const renderVersionCheck = domStory<VersionArgs, VersionInstance>({
  create: createVersionCheck,
  captions: [
    'manifest version 的校验与逐位比较（规则与官方字段参考一致）',
    '缺位按 0；第一个分出大小的位置定胜负，右侧不参与',
  ],
  apply(instance: VersionInstance, args: VersionArgs) {
    instance.update({
      currentVersion: args.currentVersion,
      candidateVersion: args.candidateVersion,
    });
  },
});

const meta = {
  id: 'publishing',
  title: '发布/打包与上架',
  tags: ['!dev'],
  args: {
    currentVersion: '1.2.0',
    candidateVersion: '1.1.9.9999',
  },
  argTypes: {
    currentVersion: {
      name: '线上版本（已发布）',
      description:
        '商店当前在线的 manifest version；候选版本必须严格大于它才能提交。',
      control: { type: 'text' },
    },
    candidateVersion: {
      name: '候选版本（准备提交）',
      description:
        '新版 manifest 的 version：1-4 段点分整数，每段 0-65535，非零段无前导零，不得全零。',
      control: { type: 'text' },
    },
  },
  render: renderVersionCheck,
  parameters: storySource(versionCheckSource),
} satisfies Meta<VersionArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const VersionCheck: Story = {};
