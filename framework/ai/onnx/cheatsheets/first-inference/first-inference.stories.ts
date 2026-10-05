import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import inferenceSource from './first-inference.ts?raw';
import programmaticSource from './programmatic-tensor.ts?raw';
import {
  createFirstInference,
  type FirstInferenceInstance,
  type FirstInferenceSnapshot,
} from './first-inference';
import {
  createProgrammaticTensor,
  PATTERN_LABELS,
  type PatternId,
  type ProgrammaticTensorInstance,
  type ProgrammaticSnapshot,
} from './programmatic-tensor';

interface PatternArgs {
  pattern: PatternId;
}

const renderInteractive = canvasStory({
  create: createFirstInference,
  apply(instance: FirstInferenceInstance) {
    instance.update();
  },
  readout(snapshot: FirstInferenceSnapshot) {
    return [
      ['状态', snapshot.message],
      ['模型输入', snapshot.inputDesc],
      ['模型输出', snapshot.outputDesc],
      ['预测', snapshot.prediction],
    ];
  },
  captions: ['左侧画板：按住鼠标画一个数字', '右侧：session.run 的输出层分数'],
});

const renderProgrammatic = canvasStory({
  create: createProgrammaticTensor,
  apply(instance: ProgrammaticTensorInstance, args: PatternArgs) {
    instance.update({ pattern: args.pattern });
  },
  readout(snapshot: ProgrammaticSnapshot) {
    return [
      ['状态', snapshot.message],
      ['输入张量', snapshot.tensorDesc],
      ['预测', snapshot.prediction],
    ];
  },
  captions: ['左侧：代码构造的输入张量', '右侧：session.run 的输出层分数'],
});

// 用类型标注（而非 satisfies）携带 PatternArgs，让默认导出的 meta 携带 args 元数据。
const meta: Meta<PatternArgs> = {
  id: 'first-inference',
  title: '上手/第一次推理',
  tags: ['!dev'],
};

export default meta;

type Story = StoryObj<PatternArgs>;

export const Interactive: Story = {
  name: '画板输入',
  render: renderInteractive,
  parameters: storySource(inferenceSource),
};

export const Programmatic: Story = {
  name: '程序构造张量',
  args: {
    pattern: 'stroke',
  },
  argTypes: {
    pattern: {
      name: '输入图案',
      description: '切换用代码构造的 28×28 输入数据，观察输出分布的变化。',
      control: {
        type: 'radio',
        labels: {
          stroke: PATTERN_LABELS.stroke,
          ring: PATTERN_LABELS.ring,
          horizontal: PATTERN_LABELS.horizontal,
        },
      },
      options: ['stroke', 'ring', 'horizontal'],
    },
  },
  render: renderProgrammatic,
  parameters: storySource(programmaticSource),
};
