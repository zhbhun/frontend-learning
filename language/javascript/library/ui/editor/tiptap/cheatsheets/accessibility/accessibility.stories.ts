import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import './demo.css';
import {
  createAriaAttributesDemo,
  type AriaAttributesArgs,
  type AriaAttributesInstance,
  type AriaAttributesSnapshot,
} from './aria-attributes';
import ariaAttributesSource from './aria-attributes.ts?raw';
import {
  createImeCompositionDemo,
  type ImeCompositionInstance,
  type ImeCompositionSnapshot,
} from './ime-composition';
import imeCompositionSource from './ime-composition.ts?raw';
import {
  createSpellcheckDemo,
  type SpellcheckArgs,
  type SpellcheckInstance,
  type SpellcheckSnapshot,
} from './spellcheck-demo';
import spellcheckSource from './spellcheck-demo.ts?raw';

const ariaAttributesRender = canvasStory({
  create: createAriaAttributesDemo,
  apply(instance: AriaAttributesInstance, args: AriaAttributesArgs) {
    instance.update(args);
  },
  readout(snapshot: AriaAttributesSnapshot) {
    return [
      ['role', snapshot.role],
      ['tabindex', snapshot.tabindex],
      ['contenteditable', snapshot.contenteditable],
      ['aria-label', snapshot.ariaLabel],
    ];
  },
});

const spellcheckRender = canvasStory({
  create: createSpellcheckDemo,
  apply(instance: SpellcheckInstance, args: SpellcheckArgs) {
    instance.update(args);
  },
  readout(snapshot: SpellcheckSnapshot) {
    return [
      ['spellcheck', snapshot.spellcheck],
      ['lang', snapshot.lang],
    ];
  },
});

const imeCompositionRender = canvasStory({
  create: createImeCompositionDemo,
  apply(instance: ImeCompositionInstance) {
    instance.update();
  },
  readout(snapshot: ImeCompositionSnapshot) {
    return [
      ['组词中', snapshot.composing ? '是' : '否'],
      ['composition 事务', `${snapshot.compositionTransactions} 次`],
      ['最近事务标记', snapshot.lastMeta],
    ];
  },
});

const meta = {
  id: 'accessibility',
  title: '生产化/无障碍与输入细节',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const AriaAttributes = {
  name: 'ARIA 属性',
  args: {
    ariaLabel: '课程正文编辑器',
  },
  argTypes: {
    ariaLabel: {
      name: 'aria-label',
      description: '经 editorProps.attributes 写入编辑区；清空即移除属性',
      control: {
        type: 'text',
      },
    },
  },
  render: ariaAttributesRender,
  parameters: storySource(ariaAttributesSource),
} satisfies StoryObj<AriaAttributesArgs>;

export const Spellcheck = {
  name: '拼写检查',
  args: {
    spellcheck: true,
    lang: 'en-US',
  },
  argTypes: {
    spellcheck: {
      name: 'spellcheck',
      description: "标准 HTML 属性，值为字符串 'true' / 'false'",
      control: {
        type: 'boolean',
      },
    },
    lang: {
      name: 'lang',
      description: '声明内容语言；选「无」移除属性',
      control: {
        type: 'select',
        labels: {
          'en-US': "'en-US'",
          'zh-CN': "'zh-CN'",
          'de-DE': "'de-DE'",
          none: '无（移除属性）',
        },
      },
      options: ['en-US', 'zh-CN', 'de-DE', 'none'],
    },
  },
  render: spellcheckRender,
  parameters: storySource(spellcheckSource),
} satisfies StoryObj<SpellcheckArgs>;

export const ImeComposition = {
  name: '输入法组词',
  render: imeCompositionRender,
  parameters: storySource(imeCompositionSource),
} satisfies StoryObj;
