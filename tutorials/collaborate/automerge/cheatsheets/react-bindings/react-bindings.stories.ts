import type { Meta, StoryObj } from '@storybook/html-vite';

import { storySource } from '../../assets/story-source.js';
import {
  LOAD_ACTIONS,
  LOAD_MODES,
  LOAD_PHASES,
  createLoadLab,
  type LoadLabArgs,
  type LoadLabInstance,
  type LoadLabSnapshot,
} from './load-lab';
import {
  PROVIDER_ACTIONS,
  PROVIDER_MODES,
  createProviderLab,
  type ProviderLabArgs,
  type ProviderLabInstance,
  type ProviderLabSnapshot,
} from './provider-lab';
import {
  RENDER_ACTIONS,
  createRenderLab,
  type RenderLabArgs,
  type RenderLabInstance,
  type RenderLabSnapshot,
} from './render-lab';
import {
  TODO_ACTIONS,
  createTodoLab,
  type TodoLabArgs,
  type TodoLabInstance,
  type TodoLabSnapshot,
} from './todo-lab';
import { reactStory } from './react-story';
import loadSource from './load-lab.ts?raw';
import providerSource from './provider-lab.ts?raw';
import renderSource from './render-lab.ts?raw';
import todoSource from './todo-lab.ts?raw';

/**
 * 每个故事独立的 reactStory 闭包：同一页上多个 Canvas 各自挂一个 React 根，
 * 互不串位。Controls 的选择与文本经 args 驱动实验台实例执行。
 */
const renderProviderLab = reactStory({
  create: createProviderLab,
  apply(instance: ProviderLabInstance, args: ProviderLabArgs) {
    instance.update(args);
  },
  readout(snapshot: ProviderLabSnapshot) {
    return [
      [
        'Provider',
        snapshot.mode === 'with' ? '已提供 RepoContext' : '未提供（hooks 将抛错）',
      ],
      [
        '子组件 useRepo()',
        snapshot.peerId === null ? '—（没拿到仓库）' : `拿到 Repo（peerId ${snapshot.peerId.slice(0, 10)}…）`,
      ],
      [
        '子组件新建的文档',
        snapshot.createdCount > 0 ? `${snapshot.createdCount} 份` : '尚未新建',
      ],
      ['错误边界捕获', snapshot.error ?? '—'],
    ];
  },
});

const renderLoadLab = reactStory({
  create: createLoadLab,
  apply(instance: LoadLabInstance, args: LoadLabArgs) {
    instance.update(args);
  },
  readout(snapshot: LoadLabSnapshot) {
    return [
      [
        '加载模式',
        snapshot.mode === 'sync' ? '同步（suspense:false）' : 'Suspense（suspense:true）',
      ],
      [
        '分享链接',
        snapshot.phase === 'received' ? '已到达' : '等待中（id 为 undefined）',
      ],
      [
        '文档',
        snapshot.title === null
          ? '尚未加载'
          : `“${snapshot.title}” · revision ${snapshot.revision}`,
      ],
      ...snapshot.timeline.map(
        (entry) => [`+${entry.at}ms`, entry.text] as [string, string],
      ),
    ];
  },
});

const renderRenderLab = reactStory({
  create: createRenderLab,
  apply(instance: RenderLabInstance, args: RenderLabArgs) {
    instance.update(args);
  },
  readout(snapshot: RenderLabSnapshot) {
    return [
      ['count', snapshot.count === null ? '—' : String(snapshot.count)],
      ['note（无关字段）', snapshot.note],
      ['订阅组件渲染', `${snapshot.subscribedRenders} 次`],
      ['memo 组件渲染', `${snapshot.memoRenders} 次`],
      ['最近操作', snapshot.lastAction],
    ];
  },
});

const renderTodoLab = reactStory({
  create: createTodoLab,
  apply(instance: TodoLabInstance, args: TodoLabArgs) {
    instance.update(args);
  },
  readout(snapshot: TodoLabSnapshot) {
    return [
      ['待办（已完成 / 总数）', `${snapshot.done} / ${snapshot.total}`],
      ['组件渲染', `${snapshot.renders} 次`],
      ['最近操作', snapshot.lastAction],
    ];
  },
});

const meta = {
  id: 'react-bindings',
  title: '应用集成/React 绑定',
  tags: ['!dev'],
} satisfies Meta<Record<string, unknown>>;

export default meta;

export const ProviderLab: StoryObj<ProviderLabArgs> = {
  name: 'Provider 与 useRepo',
  args: {
    mode: PROVIDER_MODES[0],
    action: PROVIDER_ACTIONS[0],
  } satisfies ProviderLabArgs,
  argTypes: {
    mode: {
      name: '是否提供 Provider',
      description:
        'with：组件树外包 RepoContext.Provider；without：不包，看深层子组件的 useRepo() 报什么错。',
      control: { type: 'radio' },
      options: PROVIDER_MODES,
      labels: {
        with: '已提供',
        without: '未提供',
      },
    },
    action: {
      name: '子组件操作',
      description: '在深层子组件里用 useRepo() 拿到的仓库实例新建一份文档。',
      control: { type: 'select' },
      options: PROVIDER_ACTIONS,
      labels: {
        none: '无',
        'create-doc': '子组件新建文档',
      },
    },
  },
  render: renderProviderLab,
  parameters: storySource(providerSource),
};

export const LoadLab: StoryObj<LoadLabArgs> = {
  name: '按 URL 加载：同步与 Suspense',
  args: {
    mode: LOAD_MODES[0],
    phase: LOAD_PHASES[0],
    action: LOAD_ACTIONS[0],
  } satisfies LoadLabArgs,
  argTypes: {
    mode: {
      name: '加载模式',
      description:
        'sync：useDocument 未就绪返回 undefined；suspense：把 Promise 抛给最近的 Suspense 边界。切换会换一份新文档并重挂载。',
      control: { type: 'radio' },
      options: LOAD_MODES,
      labels: {
        sync: '同步（默认）',
        suspense: 'Suspense',
      },
    },
    phase: {
      name: '分享链接',
      description:
        '文档在同事的 Repo B 上；链接到达（切到「已到达」）后，你的组件才开始 find 并跨仓库同步。',
      control: { type: 'radio' },
      options: LOAD_PHASES,
      labels: {
        awaiting: '等待中',
        received: '已到达',
      },
    },
    action: {
      name: '同事操作',
      description: '同事在自己的仓库里改一笔，经 BroadcastChannel 同步到你的组件。',
      control: { type: 'select' },
      options: LOAD_ACTIONS,
      labels: {
        none: '无',
        'peer-edit': '同事再改一笔',
      },
    },
  },
  render: renderLoadLab,
  parameters: storySource(loadSource),
};

export const RenderLab: StoryObj<RenderLabArgs> = {
  name: '订阅与重渲染',
  args: {
    action: RENDER_ACTIONS[0],
  } satisfies RenderLabArgs,
  argTypes: {
    action: {
      name: '写入方式',
      description:
        '本组件 +1 走 changeDoc；外部 +1 与写无关字段绕过 React 直接 handle.change——观察左栏订阅组件是否照样重渲染。',
      control: { type: 'select' },
      options: RENDER_ACTIONS,
      labels: {
        none: '无',
        'local-inc': '本组件 +1（changeDoc）',
        'remote-inc': '外部 +1（handle.change）',
        unrelated: '外部写无关字段 note',
      },
    },
  },
  render: renderRenderLab,
  parameters: storySource(renderSource),
};

export const TodoLab: StoryObj<TodoLabArgs> = {
  name: '组件里变更文档',
  args: {
    action: TODO_ACTIONS[0],
    text: '从 Controls 追加的一条',
  } satisfies TodoLabArgs,
  argTypes: {
    action: {
      name: '外部写入',
      description:
        '不经过画布里的组件，直接 handle.change 改文档——清单会照常更新，因为组件订阅的是文档本身。',
      control: { type: 'select' },
      options: TODO_ACTIONS,
      labels: {
        none: '无',
        add: '外部追加一条',
        'toggle-first': '外部勾选第一条',
        'clear-done': '外部清掉已完成',
      },
    },
    text: {
      name: '追加文本',
      description: '「外部追加一条」与画布里输入框共用：留空时画布内添加会用默认标题。',
      control: { type: 'text' },
    },
  },
  render: renderTodoLab,
  parameters: storySource(todoSource),
};
