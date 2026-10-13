import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  API_SCENARIO_OPTIONS,
  createApiDiffLab,
  type ApiDiffArgsView,
  type ApiDiffInstance,
  type ApiDiffSnapshot,
} from './api-diff-lab';
import {
  COMPAT_SCENARIO_OPTIONS,
  createDataCompatLab,
  type CompatArgsView,
  type CompatSnapshot,
  type DataCompatInstance,
} from './data-compat-lab';
import apiDiffSource from './api-diff-lab.ts?raw';
import dataCompatSource from './data-compat-lab.ts?raw';

/**
 * 每个故事独立的 canvasStory 闭包：同一页上多个 Canvas 各自持有舞台。
 * 场景切换与文本输入都通过 args 重新驱动实例重算。
 */
function apiDiffRenderer() {
  return canvasStory({
    create: createApiDiffLab,
    apply(instance: ApiDiffInstance, args: CourseArgs) {
      instance.update({
        scenario: args.apiScenario,
        content: args.content,
      });
    },
    readout(snapshot: ApiDiffSnapshot) {
      if (snapshot.scenario === 'text-api') {
        return [
          ['旧写法结局', snapshot.oldError || '（未报错）'],
          ['新写法结果', `"${snapshot.newResult}"`],
          ['新写法 op 数', String(snapshot.spliceOps)],
          ['next 转发同一函数', snapshot.nextSameFn ? '是' : '否'],
        ];
      }
      return [
        ['普通赋值 op 数', String(snapshot.plainOps)],
        ['ImmutableString op 数', String(snapshot.immutableOps)],
        [
          '读回类型',
          `普通 → ${snapshot.plainReadback}；ImmutableString → ${snapshot.immutableReadback}`,
        ],
        [
          '并发冲突候选',
          `普通 ${snapshot.plainConflicts} 个 / ImmutableString ${snapshot.immutableConflicts} 个`,
        ],
      ];
    },
  });
}

function compatRenderer() {
  return canvasStory({
    create: createDataCompatLab,
    apply(instance: DataCompatInstance, args: CourseArgs) {
      instance.update({ scenario: args.compatScenario });
    },
    readout(snapshot: CompatSnapshot) {
      const entries: Array<[string, string]> = [
        ['note 读回', snapshot.noteReadback],
        ['homepage 读回', snapshot.homepageReadback],
        ['views 读回', snapshot.counterValue],
      ];
      if (snapshot.scenario === 'convert') {
        entries.push(
          ['转换后 splice 结果', `"${snapshot.editedValue}"`],
          ['save 往返后仍是序列', snapshot.staysSequence ? '是' : '否'],
        );
      }
      return entries;
    },
  });
}

// Controls 的场景键名（apiScenario / compatScenario）与实验台 ArgsView 读的
// scenario 键名不同，两个 renderer 的 apply 负责换成实验台的 scenario 键。
interface CourseArgs extends ApiDiffArgsView, CompatArgsView {
  apiScenario: string;
  compatScenario: string;
}

const meta = {
  id: 'migrating-from-v2',
  title: '进阶专题/从 Automerge 2 迁移',
  tags: ['!dev'],
  args: {
    apiScenario: API_SCENARIO_OPTIONS[0],
    content: 'Hello world',
    compatScenario: COMPAT_SCENARIO_OPTIONS[0],
  },
  argTypes: {
    apiScenario: {
      name: '旧写法场景',
      description:
        '同一意图的两种旧写法对照：Text 类风格的字符编辑、整段覆盖的字符串赋值。',
      control: { type: 'select' },
      options: API_SCENARIO_OPTIONS,
    },
    content: {
      name: '写入内容',
      description: '旧代码想写进文档的内容，字符数决定普通赋值的 op 数。',
      control: { type: 'text' },
    },
    compatScenario: {
      name: '数据场景',
      description:
        '旧形态字节 load 进 3.x 的两种读法：原样 load 检视字段形态、转换后把标量字符串变成文本序列。',
      control: { type: 'select' },
      options: COMPAT_SCENARIO_OPTIONS,
    },
  },
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const ApiDiffLab: Story = {
  name: '旧文本写法改写对照',
  args: {
    apiScenario: API_SCENARIO_OPTIONS[0],
    content: 'Hello world',
  },
  render: apiDiffRenderer(),
  parameters: storySource(apiDiffSource),
};

export const DataCompatLab: Story = {
  name: '旧数据加载与转换',
  args: { compatScenario: COMPAT_SCENARIO_OPTIONS[0] },
  render: compatRenderer(),
  parameters: storySource(dataCompatSource),
};
