import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import marksSource from './marks-lab.ts?raw';
import prosemirrorSource from './prosemirror-lab.ts?raw';
import twinSource from './twin-lab.ts?raw';
import {
  EXPAND_OPTIONS,
  INSERT_POS_OPTIONS,
  MARK_SCENE_OPTIONS,
  createMarksLab,
  type MarksLabArgsView,
  type MarksLabInstance,
  type MarksLabSnapshot,
} from './marks-lab';
import {
  PM_ACTION_OPTIONS,
  createPmLab,
  type PmLabArgsView,
  type PmLabInstance,
  type PmLabSnapshot,
} from './prosemirror-lab';
import {
  TWIN_ACTION_OPTIONS,
  createTwinLab,
  type TwinLabArgsView,
  type TwinLabInstance,
  type TwinLabSnapshot,
} from './twin-lab';
import { richTextStory } from './rich-text-story';

/**
 * 标记实验室走 canvasStory（纯数据读数）；两台 ProseMirror 实验室走同目录的
 * rich-text-story 胶水（编辑器要挂 DOM）。每个故事独立的闭包，同一页上多个
 * Canvas 各自持有舞台，互不串位。
 */
const marksRenderer = canvasStory({
  create: createMarksLab,
  apply(instance: MarksLabInstance, args: MarksLabArgsView) {
    instance.update(args);
  },
  readout(snapshot: MarksLabSnapshot) {
    return snapshot.rows;
  },
});

const pmRenderer = richTextStory({
  create: createPmLab,
  apply(instance: PmLabInstance, args: PmLabArgsView) {
    instance.update(args);
  },
  readout(snapshot: PmLabSnapshot) {
    return [
      ['文档变更次数', `${snapshot.changeCount} 次`],
      ['最近写入', snapshot.lastAction],
      ['当前 spans', snapshot.spansText],
      ['编辑器字符数', String(snapshot.editorChars)],
    ];
  },
  captions: ['编辑器可打字、可用菜单栏；上方按钮是程序写入'],
});

const twinRenderer = richTextStory({
  create: createTwinLab,
  apply(instance: TwinLabInstance, args: TwinLabArgsView) {
    instance.update(args);
  },
  readout(snapshot: TwinLabSnapshot) {
    return [
      [
        '两侧 spans 一致',
        snapshot.synced === null
          ? '—（右侧尚未接入）'
          : snapshot.synced
            ? '是（已收敛）'
            : '否（同步在途）',
      ],
      ['右侧状态', snapshot.rightStatus],
      ['最近写入', snapshot.lastAction],
      ['左侧 spans', snapshot.leftSpans],
      ['右侧 spans', snapshot.rightSpans],
    ];
  },
  captions: ['左：副本 L（本页创建）', '右：副本 R（find 同一文档）'],
});

interface CourseArgs
  extends MarksLabArgsView,
    PmLabArgsView,
    TwinLabArgsView {}

const meta = {
  id: 'rich-text-collab',
  title: '应用集成/富文本协同编辑',
  tags: ['!dev'],
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const MarksLab: Story = {
  name: '标记与边界',
  args: {
    scene: MARK_SCENE_OPTIONS[0],
    expand: EXPAND_OPTIONS[0],
    insertPos: INSERT_POS_OPTIONS[0],
  } satisfies MarksLabArgsView,
  argTypes: {
    scene: {
      name: '场景',
      description:
        '插入继承：strong 标记 [0,5) 后并发插入「XY」再 merge；块标记：splitBlock / updateBlock / joinBlock 三连；并发标记：两个副本对同一区域各自 mark 后 merge。',
      control: { type: 'select' },
      options: MARK_SCENE_OPTIONS,
    },
    expand: {
      name: 'expand 延伸方向',
      description:
        '只作用于「插入继承」场景：both 双向延伸（默认）、none 不延伸、before 向左、after 向右。区域中间的插入与它无关，永远继承。',
      control: { type: 'radio' },
      options: EXPAND_OPTIONS,
    },
    insertPos: {
      name: '插入位置',
      description:
        '只作用于「插入继承」场景：XY 插在标记区域内、左边界（index 0）还是右边界（index 5）。',
      control: { type: 'radio' },
      options: INSERT_POS_OPTIONS,
    },
  },
  render: marksRenderer,
  parameters: storySource(marksSource),
};

export const EditorLab: Story = {
  name: '编辑器双向同步',
  args: {
    action: PM_ACTION_OPTIONS[0],
  } satisfies PmLabArgsView,
  argTypes: {
    action: {
      name: '程序写入',
      description:
        '不经编辑器，直接 handle.change 改文档（尾部追加一句话 / 开头五个字符加粗）——编辑器会照常更新，因为 syncPlugin 订阅的就是 change 事件。动作是一次性触发，选「无」不会撤销。',
      control: { type: 'select' },
      options: PM_ACTION_OPTIONS,
    },
  },
  render: pmRenderer,
  parameters: storySource(prosemirrorSource),
};

export const TwinLab: Story = {
  name: '双副本实时协同',
  args: {
    action: TWIN_ACTION_OPTIONS[0],
  } satisfies TwinLabArgsView,
  argTypes: {
    action: {
      name: '协同动作',
      description:
        '两侧各是一台编辑器、各自的 Repo 经随机 BroadcastChannel 同步：左侧加粗首句、右侧尾部追加、或双侧同时写入；也可以直接在两台编辑器里打字。',
      control: { type: 'select' },
      options: TWIN_ACTION_OPTIONS,
    },
  },
  render: twinRenderer,
  parameters: storySource(twinSource),
};
