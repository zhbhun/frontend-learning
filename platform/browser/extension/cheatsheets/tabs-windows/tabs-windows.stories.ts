import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import querySource from './query.ts?raw';
import operationsSource from './operations.ts?raw';
import eventsSource from './events.ts?raw';
import groupsSource from './groups.ts?raw';
import {
  createQueryExample,
  type QueryInstance,
  type QueryOptions,
  type QuerySnapshot,
} from './query';
import {
  createOperationsExample,
  type OperationsInstance,
  type OperationsOptions,
  type OperationsSnapshot,
} from './operations';
import {
  createEventsExample,
  type EventsInstance,
  type EventsOptions,
  type EventsSnapshot,
} from './events';
import {
  createGroupsExample,
  type GroupsInstance,
  type GroupsOptions,
  type GroupsSnapshot,
} from './groups';

interface QueryArgs {
  window: string;
  activeOnly: boolean;
  lastFocused: boolean;
  url: string;
  tabsPermission: boolean;
}

interface OperationsArgs {
  action: string;
  target: string;
}

interface EventsArgs {
  action: string;
  times: number;
}

interface GroupsArgs {
  action: string;
  color: string;
  title: string;
  collapsed: boolean;
}

const renderQuery = canvasStory({
  create: createQueryExample,
  apply(instance: QueryInstance, args: QueryArgs) {
    instance.update({
      window: args.window as QueryOptions['window'],
      activeOnly: args.activeOnly,
      lastFocused: args.lastFocused,
      url: args.url as QueryOptions['url'],
      tabsPermission: args.tabsPermission,
    });
  },
  readout(snapshot: QuerySnapshot) {
    return [
      ['命中标签页', `${snapshot.matched} / ${snapshot.total}`],
      ['url 过滤', snapshot.urlFilter],
      ['敏感字段', snapshot.sensitiveFields],
    ];
  },
  captions: ['tabs.query 的过滤与结果（模拟）', '下半部分为字段可见性'],
});

const renderOperations = canvasStory({
  create: createOperationsExample,
  apply(instance: OperationsInstance, args: OperationsArgs) {
    instance.update({
      action: args.action as OperationsOptions['action'],
      target: args.target,
    });
  },
  readout(snapshot: OperationsSnapshot) {
    return [
      ['操作', snapshot.action],
      ['标签页数', snapshot.tabCount],
      ['激活项', snapshot.activeTab],
    ];
  },
  captions: ['一个窗口的 5 个标签页（模拟）', '上排操作前、下排操作后'],
});

const renderEvents = canvasStory({
  create: createEventsExample,
  apply(instance: EventsInstance, args: EventsArgs) {
    instance.update({
      action: args.action as EventsOptions['action'],
      times: args.times,
    });
  },
  readout(snapshot: EventsSnapshot) {
    return [
      ['监听位置', snapshot.listening],
      ['当前动作', snapshot.action],
      ['事件条数', snapshot.eventCount],
    ];
  },
  captions: ['浏览器状态与事件日志（模拟）', '事件按触发顺序追加'],
});

const renderGroups = canvasStory({
  create: createGroupsExample,
  apply(instance: GroupsInstance, args: GroupsArgs) {
    instance.update({
      action: args.action as GroupsOptions['action'],
      color: args.color as GroupsOptions['color'],
      title: args.title,
      collapsed: args.collapsed,
    });
  },
  readout(snapshot: GroupsSnapshot) {
    return [
      ['标签页数', snapshot.tabCount],
      ['分组数', snapshot.groupCount],
      ['分组 7', snapshot.group7],
    ];
  },
  captions: ['窗口条与 tabGroups.query 结果（模拟）', '彩色外框为分组'],
});

const meta = {
  id: 'tabs-windows',
  title: '网页与数据/标签页与窗口',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const Query: StoryObj<QueryArgs> = {
  args: {
    window: 'all',
    activeOnly: false,
    lastFocused: false,
    url: 'all',
    tabsPermission: true,
  },
  argTypes: {
    window: {
      name: 'windowId',
      description: '限定查询的窗口；WINDOW_ID_CURRENT（-2）可指代调用方所在窗口。',
      control: { type: 'select' },
      options: ['all', '1', '2'],
    },
    activeOnly: {
      name: 'active',
      description: '只保留各窗口里激活的标签页。',
      control: { type: 'boolean' },
    },
    lastFocused: {
      name: 'lastFocusedWindow',
      description: '只保留最近聚焦的窗口（此处为窗口 2）里的标签页。',
      control: { type: 'boolean' },
    },
    url: {
      name: 'url',
      description:
        '按 match pattern 过滤；没有 "tabs" 或主机权限时该过滤被整体忽略。',
      control: { type: 'select' },
      options: ['all', 'developer.chrome.com', 'github.com'],
    },
    tabsPermission: {
      name: '"tabs" 权限',
      description:
        '是否已声明 tabs 权限（或持有等价的主机权限 / activeTab 临时授权）。',
      control: { type: 'boolean' },
    },
  },
  render: renderQuery,
  parameters: storySource(querySource),
};

export const Operations: StoryObj<OperationsArgs> = {
  args: {
    action: 'duplicate',
    target: '202',
  },
  argTypes: {
    action: {
      name: '操作',
      description: '对目标标签页执行的 tabs 操作。',
      control: { type: 'select' },
      options: [
        'create',
        'focus',
        'navigate',
        'pin',
        'move-front',
        'move-end',
        'duplicate',
        'remove',
      ],
    },
    target: {
      name: '目标标签页',
      description: 'create 之外的操作都作用于此标签页。',
      control: { type: 'select' },
      options: [
        'T201 扩展文档',
        'T202 GitHub',
        'T203 TypeScript',
        'T204 MDN',
        'T205 示例页',
      ],
    },
  },
  render: renderOperations,
  parameters: storySource(operationsSource),
};

export const Events: StoryObj<EventsArgs> = {
  args: {
    action: 'switch',
    times: 1,
  },
  argTypes: {
    action: {
      name: '浏览器里的动作',
      description: '模拟一次用户操作，按顺序追加它触发的事件。',
      control: { type: 'select' },
      options: [
        'switch',
        'close-tab',
        'close-window-last-tab',
        'navigate',
        'drag',
        'focus-window',
        'resize',
      ],
    },
    times: {
      name: '重复次数',
      description: '同一动作重复执行的次数；切换动作会重置到初始状态。',
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
  },
  render: renderEvents,
  parameters: storySource(eventsSource),
};

export const Groups: StoryObj<GroupsArgs> = {
  args: {
    action: 'set-appearance',
    color: 'blue',
    title: 'API 文档',
    collapsed: false,
  },
  argTypes: {
    action: {
      name: '分组操作',
      description: 'tabs.group / tabs.ungroup / tabGroups.update 的组合。',
      control: { type: 'select' },
      options: ['group-new', 'set-appearance', 'toggle-collapsed', 'ungroup'],
    },
    color: {
      name: 'color',
      description: 'tabGroups.update 的分组颜色，共 9 种。',
      control: { type: 'select' },
      options: [
        'grey',
        'blue',
        'red',
        'yellow',
        'green',
        'pink',
        'purple',
        'cyan',
        'orange',
      ],
    },
    title: {
      name: 'title',
      description: 'tabGroups.update 的分组标题，显示在分组条上。',
      control: { type: 'text' },
    },
    collapsed: {
      name: 'collapsed',
      description: '折叠后标签页在窗口条上隐藏，query 仍能查到。',
      control: { type: 'boolean' },
    },
  },
  render: renderGroups,
  parameters: storySource(groupsSource),
};
