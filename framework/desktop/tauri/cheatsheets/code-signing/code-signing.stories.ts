import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  SCENARIOS,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['凭据场景', snapshot.scenarioLabel],
      ['产物信任状态', snapshot.artifactState],
      ['用户侧结果', snapshot.userOutcome],
      ['关键原因', snapshot.keyReason],
    ];
  },
  captions: ['tauri build 签名流水线(模拟)', '✓ 执行 · — 跳过 · ✕ 中断构建'],
});

const meta = {
  id: 'code-signing',
  title: '质量与发布/打包与分发/代码签名',
  tags: ['!dev'],
  args: {
    scenario: 'macOS · 签名身份 + 公证凭据',
  },
  argTypes: {
    scenario: {
      name: '凭据场景',
      description:
        '选择平台与签名凭据状态:流水线显示各环节执行 / 跳过 / 中断与原因,读数给出产物信任状态与用户侧结果。',
      control: {
        type: 'select',
      },
      options: SCENARIOS.map((scenario) => scenario.label),
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
