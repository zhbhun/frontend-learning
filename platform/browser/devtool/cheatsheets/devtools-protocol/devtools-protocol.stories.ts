import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import mapSource from './protocol-map.ts?raw';
import {
  createProtocolMap,
  type ProtocolMapInstance,
  type ProtocolMapSnapshot,
  type TaskId,
} from './protocol-map';

interface MapArgs {
  task: TaskId;
}

/*
  与模板课程相同的 canvasStory 生命周期：舞台只创建一次，参数变化只重画映射卡；
  舞台被 Storybook 移出文档时释放实例并重置闭包，返回 Docs 页可完整重建。
  演示的是「协议地图」查询器：六个自动化任务 × 四层入口（CDP / Puppeteer /
  Playwright / chrome-devtools-mcp）的静态映射，数据核对自协议查看器与各工具
  官方文档——不建立任何真实连接；手工跑真实 CDP 会话见正文「最小 CDP 会话」。
*/
const renderMap = canvasStory({
  create: createProtocolMap,
  apply(instance: ProtocolMapInstance, args: MapArgs) {
    instance.update(args);
  },
  readout(snapshot: ProtocolMapSnapshot) {
    return [
      ['任务', snapshot.taskLabel],
      ['MCP 覆盖', snapshot.mcpStatus],
      ['判断', snapshot.verdict],
    ];
  },
});

const meta = {
  id: 'devtools-protocol',
  title: '生态与进阶/协议与自动化',
  tags: ['!dev'],
  args: {
    task: 'screenshot',
  },
  argTypes: {
    task: {
      name: '自动化任务',
      description:
        '切换任务，读出该任务在四层的入口：CDP 域与方法、Puppeteer API、Playwright API、chrome-devtools-mcp 工具（含覆盖判断）。数据来自 CDP 协议查看器与各工具官方文档。',
      control: {
        type: 'select',
        labels: {
          screenshot: '截图',
          pdf: 'PDF',
          trace: '性能追踪',
          intercept: '网络拦截',
          emulate: '设备模拟',
          input: '输入自动化',
        },
      },
      options: ['screenshot', 'pdf', 'trace', 'intercept', 'emulate', 'input'],
    },
  },
  render: renderMap,
  parameters: storySource(mapSource),
} satisfies Meta<MapArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProtocolMap: Story = {};
