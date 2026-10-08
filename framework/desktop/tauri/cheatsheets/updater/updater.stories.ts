import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import flowSource from './update-flow.ts?raw';
import {
  createUpdateFlow,
  type FlowArgs,
  type FlowInstance,
  type FlowSnapshot,
} from './update-flow';

const renderFlow = canvasStory({
  create: createUpdateFlow,
  apply(instance: FlowInstance, args: FlowArgs) {
    instance.update(args);
  },
  readout(snapshot: FlowSnapshot) {
    return [
      ['check() 结果', snapshot.checkResult],
      ['验签', snapshot.verify],
      ['下载', snapshot.download],
      ['结局', snapshot.outcome],
    ];
  },
});

const meta = {
  id: 'updater',
  title: '质量与发布/打包与分发/自动更新',
  tags: ['!dev'],
} satisfies Meta<FlowArgs>;

export const Flow: StoryObj<FlowArgs> = {
  args: {
    localVersion: '1.0.0',
    manifestVersion: '1.0.2',
    signature: '构建签名(与 pubkey 配对)',
    policy: '询问后更新',
  },
  argTypes: {
    localVersion: {
      name: '本机版本',
      description:
        '客户端当前安装的版本,来自 tauri.conf.json 顶层的 version。check() 用它与清单 version 做比较——清单不比它新就没有更新。',
      control: { type: 'radio' },
      options: ['1.0.0', '1.0.2'],
    },
    manifestVersion: {
      name: '清单 version',
      description:
        'latest.json 里的 version 字段,必须是合法 SemVer(前导 v 可选)。发布忘改版本号,是"检查不到更新"的头号原因。',
      control: { type: 'radio' },
      options: ['1.0.2', '1.0.0'],
    },
    signature: {
      name: '清单 signature',
      description:
        '端点清单里 platforms.<os-arch>.signature 的内容,应等于本次构建产出的 .sig 文件内容;客户端用内置 pubkey(minisign 公钥)验证它,不配对就拒绝安装。',
      control: { type: 'radio' },
      options: ['构建签名(与 pubkey 配对)', '私钥不匹配(演示)'],
    },
    policy: {
      name: '更新策略',
      description:
        '客户端拿到更新后的处理:静默安装(不打扰用户);先询问用户(用 update.body 展示更新说明,确认后再装);用户也可以拒绝,等下次检查。',
      control: { type: 'radio' },
      options: ['静默安装', '询问后更新', '询问后取消'],
    },
  },
  render: renderFlow,
  parameters: storySource(flowSource),
};

export default meta;
