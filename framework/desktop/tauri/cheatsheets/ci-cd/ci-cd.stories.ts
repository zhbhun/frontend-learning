import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import flowSource from './publish-flow.ts?raw';
import {
  createPublishFlow,
  type FlowArgs,
  type FlowInstance,
  type FlowSnapshot,
} from './publish-flow';

const renderFlow = canvasStory({
  create: createPublishFlow,
  apply(instance: FlowInstance, args: FlowArgs) {
    instance.update(args);
  },
  readout(snapshot: FlowSnapshot) {
    return [
      ['矩阵构建', snapshot.jobs],
      ['产物', snapshot.artifacts],
      ['Release', snapshot.release],
      ['latest.json', snapshot.updaterJson],
    ];
  },
});

const meta = {
  id: 'ci-cd',
  title: '质量与发布/打包与分发/CI/CD',
  tags: ['!dev'],
} satisfies Meta<FlowArgs>;

export const Flow: StoryObj<FlowArgs> = {
  args: {
    signingSecret: '已注入 secret',
    tokenPermission: 'contents: write',
    releaseDraft: true,
    rustCache: '命中(非首次)',
  },
  argTypes: {
    signingSecret: {
      name: '更新签名私钥',
      description:
        'TAURI_SIGNING_PRIVATE_KEY 是否作为 secret 注入构建进程。配置了 updater(createUpdaterArtifacts: true)的工程缺失它时,tauri build 在签名更新工件一步失败——矩阵里的每个 job 都会各自失败,fail-fast: false 不会互相取消。',
      control: { type: 'radio' },
      options: ['已注入 secret', '缺失(演示)'],
    },
    tokenPermission: {
      name: 'GITHUB_TOKEN 权限',
      description:
        'workflow 里 permissions.contents 的取值。tauri-action 创建 Release 并上传资产需要 write;默认只读时构建照常成功,但创建 Release 报 Resource not accessible by integration。',
      control: { type: 'radio' },
      options: ['contents: write', '只读(演示)'],
    },
    releaseDraft: {
      name: 'releaseDraft',
      description:
        'tauri-action 的同名输入。true(官方示例值)先建草稿 Release,检查产物后手动 Publish;Publish 前资产不对外公开,updater 客户端拉不到。false 直接公开发布。',
      control: { type: 'boolean' },
    },
    rustCache: {
      name: 'Rust 缓存',
      description:
        'swatinem/rust-cache 是否命中。命中时只做增量编译;首次构建(或缓存失效)要全量重来,rust-cache 与 tauri build 两段明显变长——真实差距远大于本示意。',
      control: { type: 'radio' },
      options: ['命中(非首次)', '冷缓存(首次)'],
    },
  },
  render: renderFlow,
  parameters: storySource(flowSource),
};

export default meta;
