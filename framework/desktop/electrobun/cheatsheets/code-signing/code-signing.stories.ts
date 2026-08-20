import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import signVerdictSource from './sign-verdict.ts?raw';
import entitlementsSource from './entitlements-plist.ts?raw';
import {
  createSignVerdict,
  type NotaryCredential,
  type SignChannel,
  type SignVerdictInstance,
  type SignVerdictSnapshot,
} from './sign-verdict';
import {
  createEntitlementsPlist,
  type EntitlementsInstance,
  type EntitlementsSnapshot,
} from './entitlements-plist';

interface SignVerdictArgs {
  channel: SignChannel;
  codesign: boolean;
  notarize: boolean;
  hasDeveloperId: boolean;
  credentials: NotaryCredential;
}

const renderSignVerdict = canvasStory({
  create: createSignVerdict,
  apply(instance: SignVerdictInstance, args: SignVerdictArgs) {
    instance.update(args);
  },
  readout(snapshot: SignVerdictSnapshot) {
    return [
      ['构建通道', snapshot.channel],
      ['shouldCodesign', snapshot.shouldCodesign],
      ['shouldNotarize', snapshot.shouldNotarize],
      ['结论', snapshot.verdict],
      ['依据', snapshot.reason],
    ];
  },
});

interface EntitlementsArgs {
  addCamera: boolean;
  cameraText: string;
  addMic: boolean;
  overrideJitOff: boolean;
}

const renderEntitlements = canvasStory({
  create: createEntitlementsPlist,
  apply(instance: EntitlementsInstance, args: EntitlementsArgs) {
    instance.update(args);
  },
  readout(snapshot: EntitlementsSnapshot) {
    return [
      ['合并后键数', snapshot.mergedCount],
      ['Info.plist 用途键', snapshot.usageKeys],
      ['allow-jit 取值', snapshot.allowJit],
      ['警告', snapshot.warning],
    ];
  },
});

type CourseArgs = SignVerdictArgs & EntitlementsArgs;

const meta = {
  id: 'code-signing',
  title: '构建与分发/分发/代码签名',
  tags: ['!dev'],
  args: {
    channel: 'canary',
    codesign: true,
    notarize: true,
    hasDeveloperId: true,
    credentials: 'apple-id',
    addCamera: true,
    cameraText: '扫描文档并拍摄照片',
    addMic: false,
    overrideJitOff: false,
  },
  argTypes: {
    channel: {
      name: '构建通道',
      description:
        'electrobun build 的 --env 取值。dev 通道强制跳过签名；canary / stable 允许签名。',
      options: ['dev', 'canary', 'stable'],
      control: {
        type: 'inline-radio',
        labels: { dev: 'dev', canary: 'canary', stable: 'stable' },
      },
    },
    codesign: {
      name: 'build.mac.codesign',
      description: '签名总开关，对应 electrobun.config.ts 的 build.mac.codesign。',
      control: { type: 'boolean' },
    },
    notarize: {
      name: 'build.mac.notarize',
      description:
        '公证开关。仅在 codesign 同为 true 时生效，单独开启会被忽略。',
      control: { type: 'boolean' },
    },
    hasDeveloperId: {
      name: 'ELECTROBUN_DEVELOPER_ID',
      description: '签名身份环境变量是否已设置。缺失时构建在签名步骤退出。',
      control: { type: 'boolean' },
    },
    credentials: {
      name: '公证凭据',
      description:
        '已凑齐哪组公证凭据：Apple ID 三元组（APPLEID / APPLEIDPASS / TEAMID）、App Store Connect API key 三元组（APPLEAPIKEYPATH / APPLEAPIKEY / APPLEAPIISSUER），或都没有。两组同时设置时 CLI 优先 API key。',
      options: ['none', 'apple-id', 'api-key'],
      control: {
        type: 'inline-radio',
        labels: {
          none: '未设置',
          'apple-id': 'Apple ID 三元组',
          'api-key': 'API key 三元组',
        },
      },
    },
    addCamera: {
      name: '新增 camera 键',
      description:
        '在 build.mac.entitlements 里加 com.apple.security.device.camera。隐私类键会同时生成 Info.plist 用途说明。',
      control: { type: 'boolean' },
    },
    cameraText: {
      name: 'camera 用途文案',
      description:
        'camera 键的字符串值：既写入 entitlements.plist，也成为 NSCameraUsageDescription 的文案。留空则回落到 CLI 的通用默认描述。',
      control: { type: 'text' },
    },
    addMic: {
      name: '新增 microphone 键',
      description:
        '加 com.apple.security.device.microphone（布尔 true）：演示布尔值键生成通用默认文案的路径。',
      control: { type: 'boolean' },
    },
    overrideJitOff: {
      name: 'allow-jit 覆盖为 false',
      description:
        '把默认的 com.apple.security.cs.allow-jit 显式改为 false：演示逐键覆盖语义，以及它对 Bun JIT 运行时的破坏。',
      control: { type: 'boolean' },
    },
  },
  // meta 级 render 不会被用到：两个 story 各自带 render 与源码绑定。
  render: renderSignVerdict,
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignVerdict: Story = {
  render: renderSignVerdict,
  parameters: storySource(signVerdictSource),
  argTypes: {
    addCamera: { table: { disable: true } },
    cameraText: { table: { disable: true } },
    addMic: { table: { disable: true } },
    overrideJitOff: { table: { disable: true } },
  },
};

export const EntitlementsPlist: Story = {
  render: renderEntitlements,
  parameters: storySource(entitlementsSource),
  argTypes: {
    channel: { table: { disable: true } },
    codesign: { table: { disable: true } },
    notarize: { table: { disable: true } },
    hasDeveloperId: { table: { disable: true } },
    credentials: { table: { disable: true } },
  },
};
