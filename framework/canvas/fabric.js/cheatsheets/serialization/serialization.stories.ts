import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createSerializationLab,
  type SerializationInstance,
  type SerializationOptions,
  type SerializationSnapshot,
} from './example';

const renderRoundtripLab = canvasStory({
  create: createSerializationLab,
  apply(instance: SerializationInstance, args: SerializationOptions) {
    instance.update(args);
  },
  readout(snapshot: SerializationSnapshot) {
    return [
      ['画布对象', snapshot.sceneObjectsLabel],
      ['导出对象', snapshot.exportedObjectsLabel],
      ['顶层键', snapshot.topKeysLabel],
      ['红块自定义键', snapshot.customKeysLabel],
      ['JSON 体积', snapshot.jsonSizeLabel],
      ['fill（场景）', snapshot.fillSceneLabel],
      ['fill（导出）', snapshot.fillExportLabel],
      ['往返后红块', snapshot.roundtripLabel],
      ['导出 version', snapshot.versionLabel],
    ];
  },
});

const meta = {
  id: 'serialization',
  title: '数据与导出/序列化',
  tags: ['!dev'],
  render: renderRoundtripLab,
  parameters: storySource(exampleSource),
} satisfies Meta<SerializationOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RoundtripLab: Story = {
  args: {
    customProps: true,
    exportVpt: false,
    includeDefaults: true,
    excludeRed: false,
    roundtrip: false,
  },
  argTypes: {
    customProps: {
      name: '自定义属性白名单',
      description:
        '序列化时是否传 propertiesToInclude(["taskId","remark"])：开——红块的 custom 属性进导出并随往返恢复；关——导出与还原后的对象都没有这两个键（读数「红块自定义键」「往返后红块」）。',
      control: { type: 'boolean' },
    },
    exportVpt: {
      name: '导出 viewportTransform',
      description:
        '白名单额外加 "viewportTransform"：viewportTransform 默认不在 toObject 产物里，加了才出现在顶层键（读数「顶层键」）并在 loadFromJSON 后恢复视口。',
      control: { type: 'boolean' },
    },
    includeDefaults: {
      name: '包含默认值 includeDefaultValues',
      description:
        '画布级开关（默认 true）：false 时级联覆盖每个对象，导出只留非默认键——对象键数骤减、JSON 体积大幅下降（读数「JSON 体积」）。',
      control: { type: 'boolean' },
    },
    excludeRed: {
      name: '红块排除导出 excludeFromExport',
      description:
        '给红块设 excludeFromExport: true：只挡导出（读数「导出对象」从 5 变 4、红块照常显示）；往返后红块不还原——画布上真的少了它。',
      control: { type: 'boolean' },
    },
    roundtrip: {
      name: '执行往返',
      description:
        '开：toObject 产物 JSON.stringify 后喂给 loadFromJSON（Promise），完成后 requestRenderAll——读数「fill（场景）」仍是 Gradient/Pattern 实例、「往返后红块」给出还原对照。关：重建初始场景。',
      control: { type: 'boolean' },
    },
  },
};
