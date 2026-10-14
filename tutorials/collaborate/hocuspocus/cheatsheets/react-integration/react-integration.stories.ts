import type { Meta, StoryObj } from '@storybook/html-vite';
import type { onStatusParameters } from '@hocuspocus/provider';
import { HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import { createElement as h } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { storySource } from '../../assets/story-source.js';
import { DemoApp, TimelineSink } from './hooks-app';
import { MockHocuspocusServer } from './mock-server';
import hooksAppSource from './hooks-app.ts?raw';

interface DemoArgs {
  serverOnline: boolean;
  docName: string;
  strictMode: boolean;
  editSignal: string;
}

interface DemoRuntime {
  stage: HTMLDivElement;
  root: Root;
  server: MockHocuspocusServer;
  websocketProvider: HocuspocusProviderWebsocket;
  timeline: TimelineSink;
  socketTag: string;
}

/* React 树的生命周期与共享 canvasStory 等价：舞台与实例只创建一次，参数变化只
   重渲染 React 树；舞台脱离文档时 unmount、销毁 provider 链路并停掉 mock 服务器。
   socket 在组件树外创建（真实形态：自带 maxAttempts 等 socket 级选项的写法），
   StrictMode 重挂载与切文档都不会重建它。 */
let runtime: DemoRuntime | undefined;

function ensureRuntime(): DemoRuntime {
  if (runtime) {
    return runtime;
  }

  const stage = document.createElement('div');
  stage.className = 'cs-stage';

  const container = document.createElement('div');
  container.style.height = '100%';
  stage.append(container);

  const server = new MockHocuspocusServer();
  const websocketProvider = new HocuspocusProviderWebsocket({
    // 不会产生真实网络请求：FakeWebSocket 是纯页内对象
    url: 'ws://mock.hocuspocus.local',
    WebSocketPolyfill: server.websocketPolyfill(),
  });

  const timeline = new TimelineSink();
  timeline.push('socket 创建', '组件树外共享，切换文档 / StrictMode 不重建');

  websocketProvider.on('status', (event: onStatusParameters) => {
    timeline.push('status 事件', event.status);
  });

  const root = createRoot(container);

  runtime = {
    stage,
    root,
    server,
    websocketProvider,
    timeline,
    socketTag: 'socket #1（组件树外）',
  };

  // 舞台被移除时收尾：unmount React 树、销毁链路、停掉 mock 服务器
  const observedStage = stage;
  const observedRuntime = runtime;
  requestAnimationFrame(() => {
    const parent = observedStage.parentElement;
    if (!parent) {
      return;
    }
    const observer = new MutationObserver(() => {
      if (!observedStage.isConnected) {
        observer.disconnect();
        observedRuntime.root.unmount();
        observedRuntime.websocketProvider.destroy();
        observedRuntime.server.dispose();
        if (runtime === observedRuntime) {
          runtime = undefined;
        }
      }
    });
    observer.observe(parent, { childList: true });
  });

  return runtime;
}

function renderDemo(args: DemoArgs): HTMLDivElement {
  const current = ensureRuntime();
  current.server.setOnline(args.serverOnline);
  current.root.render(
    h(DemoApp, {
      websocketProvider: current.websocketProvider,
      docName: args.docName,
      strictMode: args.strictMode,
      editSignal: args.editSignal,
      timeline: current.timeline,
      socketTag: current.socketTag,
    }),
  );
  return current.stage;
}

const meta = {
  id: 'react-integration',
  title: 'Tiptap 编辑器协同/React 集成',
  tags: ['!dev'],
  args: {
    serverOnline: true,
    docName: 'intro-doc',
    strictMode: true,
    editSignal: '',
  },
  argTypes: {
    serverOnline: {
      name: '服务器可达',
      description:
        '切换 mock 服务器的可达性：观察链路指示灯与 status 事件、退避重连，恢复后积压更新补传。',
      control: { type: 'boolean' },
    },
    docName: {
      name: '文档名',
      description:
        'HocuspocusRoom 的 name：切换时 provider 重建（clientID 变化）而 socket 不动，回到原文档内容从服务器恢复。',
      control: { type: 'select' },
      options: {
        'intro-doc（课程示例）': 'intro-doc',
        'notes-doc（另一份文档）': 'notes-doc',
      },
    },
    strictMode: {
      name: 'StrictMode',
      description:
        '用 React.StrictMode 包裹组件树。双重挂载只在开发构建下发生（npm run storybook）；静态生产构建中 React 不做双重调用。',
      control: { type: 'boolean' },
    },
    editSignal: {
      name: '本地编辑内容',
      description:
        '每次内容变化向 Y.Doc 的 default 字段写入一次本地编辑，等价于编辑器键入产生的 update。',
      control: { type: 'text' },
    },
  },
  render: renderDemo,
  parameters: storySource(hooksAppSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HooksDashboard: Story = {
  name: 'Context 与 hooks',
};
