import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import './demo.css';
import {
  createCustomClassesDemo,
  type CustomClassesArgs,
  type CustomClassesInstance,
  type CustomClassesSnapshot,
} from './custom-classes';
import customClassesSource from './custom-classes.ts?raw';
import {
  createDarkModeDemo,
  type DarkModeArgs,
  type DarkModeInstance,
  type DarkModeSnapshot,
} from './dark-mode';
import darkModeSource from './dark-mode.ts?raw';
import {
  createPlaceholderDemo,
  type PlaceholderArgs,
  type PlaceholderInstance,
  type PlaceholderSnapshot,
} from './placeholder-demo';
import placeholderSource from './placeholder-demo.ts?raw';
import { createViewDomDemo, type ViewDomInstance, type ViewDomSnapshot } from './view-dom';
import viewDomSource from './view-dom.ts?raw';

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
  id: 'style-editor',
  title: '上手/样式',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

const viewDomRender = domStory<
  Record<string, unknown>,
  ViewDomSnapshot,
  ViewDomInstance
>({
  create: createViewDomDemo,
  apply: () => undefined,
  readout: (snapshot) => [
    ['根元素 class', snapshot.rootClass],
    ['可编辑属性', snapshot.editableAttrs],
    ['white-space', snapshot.whiteSpace],
    ['注入样式标签', snapshot.injectedStyle],
  ],
});

export const ViewDom = {
  name: '视图 DOM',
  render: viewDomRender,
  parameters: storySource(viewDomSource),
} satisfies StoryObj;

const classesRender = domStory<
  CustomClassesArgs,
  CustomClassesSnapshot,
  CustomClassesInstance
>({
  create: createCustomClassesDemo,
  apply: (instance, args) => instance.update(args),
  readout: (snapshot) => [
    ['根元素 class', snapshot.rootClass],
    ['首个段落 class', snapshot.firstParagraphClass],
    ['加粗标记标签', snapshot.boldTag],
  ],
});

export const Classes = {
  name: '自定义类',
  args: {
    classMode: 'root' as CustomClassesArgs['classMode'],
  },
  argTypes: {
    classMode: {
      name: '类入口',
      description: '根元素 editorProps / 段落属性 / renderHTML 换标签',
      control: {
        type: 'select',
        labels: {
          root: '根元素',
          node: '段落属性',
          tag: 'renderHTML 换标签',
        },
      },
      options: ['root', 'node', 'tag'],
    },
  },
  render: classesRender,
  parameters: storySource(customClassesSource),
} satisfies StoryObj<CustomClassesArgs>;

const placeholderRender = domStory<
  PlaceholderArgs,
  PlaceholderSnapshot,
  PlaceholderInstance
>({
  create: createPlaceholderDemo,
  apply: (instance, args) => instance.update(args),
  readout: (snapshot) => [
    ['空段落 class', snapshot.emptyClass],
    ['data-placeholder', snapshot.dataPlaceholder],
    ['editor.isEmpty', snapshot.isEmpty],
  ],
});

export const Placeholder = {
  name: '占位符',
  args: {
    placeholder: '写点什么吧…',
    showOnlyCurrent: true,
  },
  argTypes: {
    placeholder: {
      name: 'placeholder 文案',
      description: '空段落 data-placeholder 属性的取值',
      control: {
        type: 'text',
      },
    },
    showOnlyCurrent: {
      name: 'showOnlyCurrent',
      description: '开启时只显示光标所在的空节点',
      control: {
        type: 'boolean',
      },
    },
  },
  render: placeholderRender,
  parameters: storySource(placeholderSource),
} satisfies StoryObj<PlaceholderArgs>;

const darkModeRender = domStory<
  DarkModeArgs,
  DarkModeSnapshot,
  DarkModeInstance
>({
  create: createDarkModeDemo,
  apply: (instance, args) => instance.update(args),
  readout: (snapshot) => [
    ['根元素 class', snapshot.rootClass],
    ['--se-fg', snapshot.fgVariable],
    ['--se-bg', snapshot.bgVariable],
  ],
});

export const DarkMode = {
  name: '深色模式',
  args: {
    dark: false,
  },
  argTypes: {
    dark: {
      name: '深色模式',
      description: '往根元素挂 dark 主题类，翻转 CSS 变量',
      control: {
        type: 'boolean',
      },
    },
  },
  render: darkModeRender,
  parameters: storySource(darkModeSource),
} satisfies StoryObj<DarkModeArgs>;
