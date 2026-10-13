import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import anchorDriftSource from './anchor-drift.ts?raw';
import {
  createAnchorDemo,
  type AnchorDemoInstance,
  type AnchorDemoSnapshot,
  type AnchorScenarioOptions,
} from './anchor-drift';

type AnchorArgs = Partial<AnchorScenarioOptions>;

function makeAnchorRender() {
  return canvasStory({
    create: createAnchorDemo,
    apply(instance: AnchorDemoInstance, args: AnchorArgs) {
      instance.update(args);
    },
    readout(snapshot: AnchorDemoSnapshot) {
      return [
        ['锚点字符', snapshot.anchorChar],
        ['绝对索引落点', snapshot.absoluteLanding],
        ['相对位置解析', snapshot.relativeLanding],
        ['结论', snapshot.verdict],
      ];
    },
  });
}

// 两个 story 各自持有独立的舞台与实例，互不共享。
const renderDrift = makeAnchorRender();
const renderAssoc = makeAnchorRender();

const meta = {
  id: 'relative-positions',
  title: '核心机制/相对位置',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const ConcurrentInsert: StoryObj<AnchorArgs> = {
  args: {
    insertCount: 6,
    insertMode: 'before',
  },
  argTypes: {
    insertCount: {
      name: '并发插入字符数',
      description: '客户端 B 在本地并发插入的字符数。',
      control: {
        type: 'range',
        min: 0,
        max: 12,
        step: 1,
      },
    },
    insertMode: {
      name: '插入位置',
      description:
        '并发插入相对锚点的位置；「锚点后方」作为对照，两种位置记号都不漂移。',
      control: { type: 'radio' },
      options: ['before', 'at', 'after'],
      labels: {
        before: '锚点前方',
        at: '恰好锚点处',
        after: '锚点后方',
      },
    },
  },
  render: renderDrift,
  parameters: storySource(anchorDriftSource),
};

export const AssocChoice: StoryObj<AnchorArgs> = {
  args: {
    insertCount: 3,
    insertMode: 'at',
    assoc: 0,
  },
  argTypes: {
    assoc: {
      name: '吸附方向 assoc',
      description:
        'createRelativePositionFromTypeIndex 的第三参：>= 0 锚定位置之后的字符，< 0 锚定位置之前的字符；只看符号，0 与 1 等价。',
      control: { type: 'radio' },
      options: [0, -1],
      labels: {
        '0': '0（默认，锚定后一个字符）',
        '-1': '-1（锚定前一个字符）',
      },
    },
    insertCount: {
      name: '并发插入字符数',
      description: '客户端 B 恰好插在锚点处的字符数。',
      control: {
        type: 'range',
        min: 0,
        max: 12,
        step: 1,
      },
    },
  },
  render: renderAssoc,
  parameters: storySource(anchorDriftSource),
};
