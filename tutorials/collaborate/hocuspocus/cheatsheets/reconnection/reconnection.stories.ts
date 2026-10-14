import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createOfflineCatchup,
  type CatchupInstance,
  type CatchupSnapshot,
  type LinkChoice,
} from './offline-catchup';
import offlineCatchupSource from './offline-catchup.ts?raw';

interface CourseArgs {
  link: LinkChoice;
  localEdit: string;
  peerEdit: string;
}

function shorten(text: string): string {
  const chars = Array.from(text);
  return chars.length > 18 ? `${chars.slice(0, 18).join('')}…` : text;
}

function readout(snapshot: CatchupSnapshot): Array<[string, string]> {
  return [
    ['链路', snapshot.link],
    ['待上行（本地离线编辑）', `${snapshot.localPending} 条`],
    ['待下行（断线期远端新增）', `${snapshot.remotePending} 条`],
    [
      '最近补传',
      snapshot.lastCatchUp
        ? `上行 ${snapshot.lastCatchUp.up} / 下行 ${snapshot.lastCatchUp.down}`
        : '—',
    ],
    ['本地内容', shorten(snapshot.localText)],
    ['服务器内容', shorten(snapshot.serverText)],
    ['收敛', snapshot.converged ? '一致' : '分叉'],
  ];
}

const renderOfflineCatchup = canvasStory({
  create: createOfflineCatchup,
  apply(instance: CatchupInstance, args: CourseArgs) {
    instance.update(args);
  },
  readout,
});

const meta = {
  id: 'reconnection',
  title: '客户端 Provider/断线与重连',
  tags: ['!dev'],
  args: {
    link: 'online',
    localEdit: '',
    peerEdit: '',
  } satisfies CourseArgs,
  argTypes: {
    link: {
      name: '链路状态',
      description:
        '在线：链路正常；断网：链路断开、客户端自动重连；disconnect()：主动断开且不自动重连，切回在线即手动 connect()。',
      control: { type: 'select' },
      options: {
        '在线': 'online',
        '断网（自动重连）': 'offline',
        'disconnect()（主动断开）': 'detached',
      },
    },
    localEdit: {
      name: '本地编辑',
      description:
        '每次修改作为一条本地编辑追加进本地 Y.Doc；断线期间照常生效，恢复连接后上行补传。',
      control: { type: 'text' },
    },
    peerEdit: {
      name: '远端同事编辑',
      description:
        '远端同事始终对服务器在线；断线期间他的编辑只汇入服务器，重连后下行补传到本地。',
      control: { type: 'text' },
    },
  },
  parameters: storySource(offlineCatchupSource),
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OfflineCatchup: Story = {
  name: '离线补传',
  render: renderOfflineCatchup,
};
