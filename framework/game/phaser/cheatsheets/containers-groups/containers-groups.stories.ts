import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import compareSource from './containers-vs-groups.ts?raw';
import poolSource from './group-pool.ts?raw';
import {
  createContainersVsGroups,
  type ContainersVsGroupsInstance,
  type ContainersVsGroupsParams,
  type ContainersVsGroupsSnapshot,
} from './containers-vs-groups';
import {
  createGroupPool,
  type GroupPoolInstance,
  type GroupPoolParams,
  type GroupPoolSnapshot,
} from './group-pool';

/** 坐标读数统一取一位小数,整数省去小数位,方便与网格对照。 */
function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function point(p: { x: number; y: number }): string {
  return `(${num(p.x)}, ${num(p.y)})`;
}

const renderCompare = canvasStory({
  create: createContainersVsGroups,
  apply(instance: ContainersVsGroupsInstance, args: ContainersVsGroupsParams) {
    instance.apply(args);
  },
  readout(snapshot: ContainersVsGroupsSnapshot) {
    return [
      ['模式', snapshot.mode === 'container' ? 'container(显示对象)' : 'group(非显示对象)'],
      [
        '黄块本地坐标',
        snapshot.mode === 'container'
          ? `${point(snapshot.yellowLocal)}(容器内,不随父级变)`
          : `${point(snapshot.yellowLocal)}(= 世界坐标,无父级)`,
      ],
      ['黄块世界包围盒中心', point(snapshot.yellowWorld)],
      ['嵌套点世界位置', point(snapshot.nestedWorld)],
      [
        'container.getBounds',
        snapshot.containerBounds
          ? `x ${num(snapshot.containerBounds.x)} y ${num(snapshot.containerBounds.y)} w ${num(snapshot.containerBounds.width)} h ${num(snapshot.containerBounds.height)}`
          : '分组模式没有 getBounds',
      ],
      [
        '父级 x / angle / scale / alpha',
        snapshot.parentState
          ? `${num(snapshot.parentState.x)} / ${num(snapshot.parentState.angle)} / ${num(snapshot.parentState.scale)} / ${num(snapshot.parentState.alpha)}`
          : 'Group 没有这些属性,参数无处施加',
      ],
      ['黄块 depth', num(snapshot.yellowDepth)],
      ['画面最上层色块', snapshot.topName],
      ['成员数量', `${snapshot.memberCount}(容器 length / 分组 getLength)`],
    ];
  },
  captions: ['容器:父动子动', '分组:成员各自独立'],
});

const renderPool = canvasStory({
  create: createGroupPool,
  apply(instance: GroupPoolInstance, args: GroupPoolParams) {
    instance.apply(args);
  },
  readout(snapshot: GroupPoolSnapshot) {
    return [
      ['children 总数(getLength)', `${snapshot.total} / 上限 12(只增不减)`],
      ['active / inactive', `${snapshot.active} / ${snapshot.inactive}`],
      ['getTotalFree', `${snapshot.totalFree}(= maxSize - active)`],
      ['isFull', snapshot.isFull ? 'true(成员总数已达 maxSize)' : 'false'],
      ['最近一次发射', snapshot.lastSource],
    ];
  },
  captions: ['开回收:子弹归还池复用', '关回收:池被占满后不再出新弹'],
});

/** 两个 story 的参数并集,为各 story 的 args / argTypes 提供类型锚点。 */
interface ContainersGroupsArgs extends ContainersVsGroupsParams, GroupPoolParams {}

const meta: Meta<ContainersGroupsArgs> = {
  id: 'containers-groups',
  title: '资源与显示/容器与分组',
  tags: ['!dev'],
  render: renderCompare,
};

export default meta;

type Story = StoryObj<ContainersGroupsArgs>;

export const CompareLab: Story = {
  args: {
    mode: 'container',
    x: 0,
    angle: 0,
    scale: 1,
    alpha: 1,
    childDepth: false,
  },
  argTypes: {
    mode: {
      name: '组织方式',
      description:
        'container:同一批对象放进容器,父级变换传播;group:同一批对象只做逻辑分组,成员各自独立。',
      control: { type: 'radio', options: ['container', 'group'] },
    },
    x: {
      name: '父级横移',
      description: '容器模式改 container.x(整个家庭跟着挪);分组模式没有任何对象响应。',
      control: { type: 'range', min: -120, max: 120, step: 20 },
    },
    angle: {
      name: '父级角度(度)',
      description: '容器模式绕容器原点整体旋转;分组模式成员不动。',
      control: { type: 'range', min: -180, max: 180, step: 15 },
    },
    scale: {
      name: '父级缩放',
      description: '容器模式整体缩放,子对象间距离同步拉开;分组模式成员不动。',
      control: { type: 'range', min: 0.5, max: 1.5, step: 0.25 },
    },
    alpha: {
      name: '父级不透明度',
      description: '容器模式渲染时与每个子对象自身 alpha 相乘;分组模式成员不动。',
      control: { type: 'range', min: 0.1, max: 1, step: 0.1 },
    },
    childDepth: {
      name: '子对象设不同 depth',
      description:
        'true 时给三块设 depth 3/2/1:容器模式画面不变(容器按 list 顺序渲染);分组模式成员在显示列表里,叠放立即反转。',
      control: { type: 'boolean' },
    },
  },
  render: renderCompare,
  parameters: storySource(compareSource),
};

export const PoolLab: Story = {
  args: {
    spawning: true,
    recycle: true,
  },
  argTypes: {
    spawning: {
      name: '持续发射',
      description: '每 260ms 调 group.get(x, y) 取一枚子弹:优先复用 inactive 成员,没有才 create 新建。',
      control: { type: 'boolean' },
    },
    recycle: {
      name: '飞出回收',
      description:
        '开:飞出画面即 killAndHide(失活 + 隐藏)归还池;关:子弹保持 active 停在画面外,直到池满(isFull)后不再出新弹。',
      control: { type: 'boolean' },
    },
  },
  render: renderPool,
  parameters: storySource(poolSource),
};

