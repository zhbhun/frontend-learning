import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import readerSource from './frame-reader.ts?raw';
import {
  createFrameReader,
  type FrameReaderInstance,
  type FrameReaderSnapshot,
  type ScenarioId,
} from './frame-reader';

interface ReaderArgs {
  scenario: ScenarioId;
}

/*
  与模板课程相同的 canvasStory 生命周期：舞台只创建一次，参数变化只重画帧表；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  演示的是「帧读法」：预置帧序列按 Messages 页签的配色与列含义渲染，
  不是真实 WebSocket 连接——真实连接的跑法见课程「最小服务端与客户端」。
*/
const renderReader = canvasStory({
  create: createFrameReader,
  apply(instance: FrameReaderInstance, args: ReaderArgs) {
    instance.update(args);
  },
  readout(snapshot: FrameReaderSnapshot) {
    return [
      ['帧场景', snapshot.label],
      ['帧行数', snapshot.frameCount],
      ['读法结论', snapshot.verdict],
    ];
  },
});

const meta = {
  id: 'websocket',
  title: '网络调试/检查 WebSocket 与 SSE',
  tags: ['!dev'],
  args: {
    scenario: 'text-echo',
  },
  argTypes: {
    scenario: {
      name: '帧场景',
      description:
        '切换预置的模拟帧序列：文本往返（方向配色）、二进制与分片（opcode 显示）、心跳保活（Ping/Pong 自动应答）、关闭握手（close code）。这是练习 Messages 页签读法的帧阅读器，不建立真实连接；跑真实连接见正文「最小服务端与客户端」。',
      control: {
        type: 'select',
        labels: {
          'text-echo': '文本往返',
          'binary-split': '二进制与分片',
          heartbeat: '心跳保活',
          closing: '关闭握手',
        },
      },
      options: ['text-echo', 'binary-split', 'heartbeat', 'closing'],
    },
  },
  render: renderReader,
  parameters: storySource(readerSource),
} satisfies Meta<ReaderArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FrameReader: Story = {};
