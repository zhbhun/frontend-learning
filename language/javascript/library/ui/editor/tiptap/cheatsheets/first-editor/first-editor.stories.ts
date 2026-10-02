import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import './demo.css';
import {
  createEditableToggleDemo,
  type EditableToggleArgs,
  type EditableToggleInstance,
  type EditableToggleSnapshot,
} from './editable-toggle';
import editableToggleSource from './editable-toggle.ts?raw';
import {
  createInitialContentDemo,
  type InitialContentArgs,
  type InitialContentInstance,
  type InitialContentSnapshot,
} from './initial-content';
import initialContentSource from './initial-content.ts?raw';
import {
  createMountElementDemo,
  type MountElementArgs,
  type MountElementInstance,
  type MountElementSnapshot,
} from './mount-element';
import mountElementSource from './mount-element.ts?raw';
import {
  createTeardownDemo,
  type TeardownArgs,
  type TeardownInstance,
  type TeardownSnapshot,
} from './teardown-editor';
import teardownSource from './teardown-editor.ts?raw';

interface DomStoryOptions<Args, Snapshot, Instance> {
  create: (stage: HTMLElement, emit: (snapshot: Snapshot) => void) => Instance;
  apply: (instance: Instance, args: Args) => void;
  readout: (snapshot: Snapshot) => Array<[string, unknown]>;
}

/**
 * DOM 版命令式 story 适配：与 assets/story-canvas.js 相同的生命周期契约——
 * 舞台与实例只创建一次，参数变化只调用 apply，离开当前 Docs 页时 dispose。
 * Instance 约束带可选 dispose，供卸载观察器安全调用。
 */
function domStory<
  Args,
  Snapshot,
  Instance extends { dispose?: (() => void) | undefined },
>({
  create,
  apply,
  readout,
}: DomStoryOptions<Args, Snapshot, Instance>) {
  const READOUT_INTERVAL = 100;
  let stage: HTMLElement | undefined;
  let instance: Instance | undefined;
  let readoutEl: HTMLDListElement | undefined;
  let lastPaint = 0;

  return (args: Args) => {
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'cs-stage';

      instance = create(stage, (snapshot) => {
        if (!readoutEl) {
          return;
        }
        const now = performance.now();
        if (now - lastPaint < READOUT_INTERVAL) {
          return;
        }
        lastPaint = now;
        paint(readoutEl, readout(snapshot));
      });

      readoutEl = document.createElement('dl');
      readoutEl.className = 'cs-readout';
      stage.append(readoutEl);

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
            observedInstance?.dispose?.();

            if (stage === observedStage) {
              stage = undefined;
              instance = undefined;
              readoutEl = undefined;
              lastPaint = 0;
            }
          }
        });
        observer.observe(parent, { childList: true });
      });
    }

    lastPaint = 0;
    apply(instance as Instance, args);
    return stage as HTMLElement;
  };
}

function paint(
  root: HTMLDListElement,
  entries: Array<[string, unknown]>,
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
    const text = String(value);

    if (terms[index].textContent !== label) {
      terms[index].textContent = label;
    }

    if (values[index].textContent !== text) {
      values[index].textContent = text;
    }
  });
}

const meta = {
  id: 'first-editor',
  title: '上手/第一个编辑器',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

const mountRender = domStory<
  MountElementArgs,
  MountElementSnapshot,
  MountElementInstance
>({
  create: createMountElementDemo,
  apply: (instance, args) => instance.update(args),
  readout: (snapshot) => [
    ['挂载元素子节点', snapshot.hostChildren],
    ['视图位置', snapshot.viewPlace],
    ['视图类名', snapshot.viewClass],
  ],
});

export const Mount = {
  name: '挂载',
  args: {
    elementMode: 'provided',
  },
  argTypes: {
    elementMode: {
      name: 'element 取值',
      description: '传入元素 / 先传 null 再 mount() / 缺省不传',
      control: {
        type: 'select',
        labels: {
          provided: '传入元素',
          'null-mount': 'element: null + mount()',
          default: '缺省（不传）',
        },
      },
      options: ['provided', 'null-mount', 'default'],
    },
  },
  render: mountRender,
  parameters: storySource(mountElementSource),
} satisfies StoryObj<MountElementArgs>;

const contentRender = domStory<
  InitialContentArgs,
  InitialContentSnapshot,
  InitialContentInstance
>({
  create: createInitialContentDemo,
  apply: (instance, args) => instance.update(args),
  readout: (snapshot) => [
    ['渲染段落', `${snapshot.paragraphCount} 个`],
    ['被丢弃', snapshot.dropped],
  ],
});

export const Content = {
  name: '初始内容',
  args: {
    preset: 'html',
  },
  argTypes: {
    preset: {
      name: 'content 预设',
      description: 'HTML 字符串 / JSON 文档 / 含未注册标签的 HTML',
      control: {
        type: 'select',
        labels: {
          html: 'HTML 字符串',
          json: 'JSON 文档',
          unknown: '含未注册标签',
        },
      },
      options: ['html', 'json', 'unknown'],
    },
  },
  render: contentRender,
  parameters: storySource(initialContentSource),
} satisfies StoryObj<InitialContentArgs>;

const editableRender = domStory<
  EditableToggleArgs,
  EditableToggleSnapshot,
  EditableToggleInstance
>({
  create: createEditableToggleDemo,
  apply: (instance, args) => instance.update(args),
  readout: (snapshot) => [
    ['isEditable', snapshot.isEditable],
    ['contenteditable', snapshot.contenteditable],
    ['tabindex', snapshot.tabindex],
  ],
});

export const Editable = {
  name: '可编辑状态',
  args: {
    editable: true,
  },
  argTypes: {
    editable: {
      name: 'editable',
      description: '切换后点击编辑区尝试输入',
      control: {
        type: 'boolean',
      },
    },
  },
  render: editableRender,
  parameters: storySource(editableToggleSource),
} satisfies StoryObj<EditableToggleArgs>;

const teardownRender = domStory<
  TeardownArgs,
  TeardownSnapshot,
  TeardownInstance
>({
  create: createTeardownDemo,
  apply: (instance, args) => instance.update(args),
  readout: (snapshot) => [
    ['挂载元素子节点', snapshot.hostChildren],
    ['isDestroyed', snapshot.isDestroyed],
    ['文档状态', snapshot.docState],
  ],
});

export const Teardown = {
  name: '销毁与清理',
  args: {
    teardown: 'none',
    remount: false,
  },
  argTypes: {
    teardown: {
      name: '拆卸方式',
      description: 'unmount 只摘视图，destroy 连实例一起终结',
      control: {
        type: 'select',
        labels: {
          none: '未拆卸',
          unmount: 'unmount() — 保留状态',
          destroy: 'destroy() — 终态',
        },
      },
      options: ['none', 'unmount', 'destroy'],
    },
    remount: {
      name: 'mount() 重新挂载',
      description: '尝试把编辑器挂回元素',
      control: {
        type: 'boolean',
      },
    },
  },
  render: teardownRender,
  parameters: storySource(teardownSource),
} satisfies StoryObj<TeardownArgs>;
