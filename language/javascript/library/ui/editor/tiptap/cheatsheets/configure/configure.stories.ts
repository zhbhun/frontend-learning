import type { Meta, StoryObj } from '@storybook/html-vite';

import './demo.css';
import {
  createAutofocusDemo,
  type AutofocusArgs,
  type AutofocusInstance,
  type AutofocusSnapshot,
} from './autofocus-position';
import autofocusSource from './autofocus-position.ts?raw';
import {
  createEditorPropsDemo,
  type EditorPropsArgs,
  type EditorPropsInstance,
  type EditorPropsSnapshot,
} from './editor-props-demo';
import editorPropsSource from './editor-props-demo.ts?raw';
import {
  createExtensionPresetDemo,
  type ExtensionPresetArgs,
  type ExtensionPresetInstance,
  type ExtensionPresetSnapshot,
} from './extension-presets';
import extensionPresetsSource from './extension-presets.ts?raw';
import {
  createInputRulesDemo,
  type InputRulesArgs,
  type InputRulesInstance,
  type InputRulesSnapshot,
} from './input-rules-toggle';
import inputRulesSource from './input-rules-toggle.ts?raw';
import { storySource } from '../../assets/story-source.js';

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
  id: 'configure',
  title: '上手/编辑器配置',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

const extensionsRender = domStory<
  ExtensionPresetArgs,
  ExtensionPresetSnapshot,
  ExtensionPresetInstance
>({
  create: createExtensionPresetDemo,
  apply: (instance, args) => instance.update(args),
  readout: (snapshot) => [
    ['注册扩展', `${snapshot.extensionCount} 个`],
    ['undo 命令', snapshot.undoCommand],
    ['heading 等级', snapshot.headingLevels],
  ],
});

export const Extensions = {
  name: '扩展组合',
  args: {
    preset: 'default',
  },
  argTypes: {
    preset: {
      name: 'extensions 预设',
      description:
        '默认 StarterKit / 禁用 undoRedo / heading 限定 1-3 级，切换会重建编辑器',
      control: {
        type: 'select',
        labels: {
          default: 'StarterKit（默认）',
          'no-undo-redo': 'StarterKit.configure({ undoRedo: false })',
          'heading-123': 'StarterKit.configure({ heading: { levels: [1,2,3] } })',
        },
      },
      options: ['default', 'no-undo-redo', 'heading-123'],
    },
  },
  render: extensionsRender,
  parameters: storySource(extensionPresetsSource),
} satisfies StoryObj<ExtensionPresetArgs>;

const autofocusRender = domStory<
  AutofocusArgs,
  AutofocusSnapshot,
  AutofocusInstance
>({
  create: createAutofocusDemo,
  apply: (instance, args) => instance.update(args),
  readout: (snapshot) => [
    ['聚焦元素', snapshot.focused],
    ['选区范围', snapshot.selection],
  ],
});

export const Autofocus = {
  name: 'autofocus',
  args: {
    mode: 'start',
  },
  argTypes: {
    mode: {
      name: 'autofocus 取值',
      description:
        "false / 'start' / 'end' / 'all'，切换会以新取值重建编辑器",
      control: {
        type: 'select',
        labels: {
          false: 'false（默认，不聚焦）',
          start: "'start' — 开头",
          end: "'end' — 末尾",
          all: "'all' — 全选",
        },
      },
      options: ['false', 'start', 'end', 'all'],
    },
  },
  render: autofocusRender,
  parameters: storySource(autofocusSource),
} satisfies StoryObj<AutofocusArgs>;

const editorPropsRender = domStory<
  EditorPropsArgs,
  EditorPropsSnapshot,
  EditorPropsInstance
>({
  create: createEditorPropsDemo,
  apply: (instance, args) => instance.update(args),
  readout: (snapshot) => [
    ['编辑区 class', snapshot.viewClass],
    ['大写转换', snapshot.uppercasePaste],
  ],
});

export const EditorProps = {
  name: 'editorProps',
  args: {
    addClass: false,
    uppercasePaste: false,
  },
  argTypes: {
    addClass: {
      name: 'attributes 加 class',
      description: '通过 editorProps.attributes 给编辑区元素追加自定义 class',
      control: {
        type: 'boolean',
      },
    },
    uppercasePaste: {
      name: '粘贴文本转大写',
      description: '通过 editorProps.transformPastedText 改写粘贴的纯文本',
      control: {
        type: 'boolean',
      },
    },
  },
  render: editorPropsRender,
  parameters: storySource(editorPropsSource),
} satisfies StoryObj<EditorPropsArgs>;

const inputRulesRender = domStory<
  InputRulesArgs,
  InputRulesSnapshot,
  InputRulesInstance
>({
  create: createInputRulesDemo,
  apply: (instance, args) => instance.update(args),
  readout: (snapshot) => [
    ['enableInputRules', snapshot.enabledLabel],
    ['光标所在块', snapshot.blockType],
  ],
});

export const InputRules = {
  name: '输入规则开关',
  args: {
    enabled: true,
  },
  argTypes: {
    enabled: {
      name: 'enableInputRules',
      description: '关闭后 Markdown 式输入不再自动转换，切换会重建编辑器',
      control: {
        type: 'boolean',
      },
    },
  },
  render: inputRulesRender,
  parameters: storySource(inputRulesSource),
} satisfies StoryObj<InputRulesArgs>;
