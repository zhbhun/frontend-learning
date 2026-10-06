import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './json-constraint.ts?raw';
import {
  createJsonConstraint,
  describeValidation,
  PRESETS,
  type JsonArgs,
  type JsonInstance,
  type JsonSnapshot,
  type JsonStatus,
} from './json-constraint';

const STATUS_LABELS: Record<JsonStatus, string> = {
  loading: '加载中（首次需下载模型）',
  generating: '生成中',
  ready: '就绪',
  error: '出错',
};

/* 状态读数：生成完成后补上用时，便于与 2.2.1 的参数试验场对比 */
function statusText(snapshot: JsonSnapshot): string {
  const label = STATUS_LABELS[snapshot.status];
  return snapshot.status === 'ready' && snapshot.seconds
    ? `${label}（生成用时 ${snapshot.seconds} 秒）`
    : label;
}

const renderInteractive = canvasStory({
  create: createJsonConstraint,
  apply(instance: JsonInstance, args: JsonArgs) {
    instance.update(args);
  },
  readout(snapshot: JsonSnapshot) {
    const preset = PRESETS[snapshot.preset] ?? PRESETS.feedback;
    return [
      ['状态', statusText(snapshot)],
      ['约束', preset.label],
      ...describeValidation(snapshot),
    ];
  },
});

const meta = {
  id: 'structured-output',
  title: '核心 API/文本生成/结构化输出与工具调用',
  tags: ['!dev'],
  args: {
    preset: 'feedback',
    prompt: 'Classify this feedback: The product is way too expensive.',
  },
  argTypes: {
    preset: {
      name: '约束预设',
      description:
        'StructuredOutputProcessor 的 ResponseFormat 预设：两种 json_schema 结构与一种 json_object；切换后自动重新生成，观察输出结构与「Schema 校验」读数随之变化。',
      control: {
        type: 'select',
        labels: Object.fromEntries(
          Object.values(PRESETS).map((preset) => [preset.key, preset.label]),
        ),
      },
      options: Object.keys(PRESETS),
    },
    prompt: {
      name: '提示词',
      description:
        '生成指令。约束保证输出语法合法：把它换成与预设语义无关的句子，「JSON 可解析」仍为 是——格式对不等于内容对。',
      control: {
        type: 'text',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<JsonArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
