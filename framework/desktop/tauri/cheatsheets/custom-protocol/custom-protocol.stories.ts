import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import scopeCheckSource from './scope-check.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';
import {
  createScopeCheck,
  type ScopeCheckArgs,
  type ScopeCheckInstance,
  type ScopeCheckSnapshot,
} from './scope-check';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['生成 URL', snapshot.url],
      ['request.uri().path()', snapshot.rawPath],
      ['解码后路径', snapshot.decodedPath],
      ['处理器', snapshot.handlerLabel],
    ];
  },
});

const renderScopeCheck = canvasStory({
  create: createScopeCheck,
  apply(instance: ScopeCheckInstance, args: ScopeCheckArgs) {
    instance.update(args);
  },
  readout(snapshot: ScopeCheckSnapshot) {
    return [
      ['解析后的绝对路径', snapshot.resolvedPath],
      ['allow 命中', snapshot.allowLabel],
      ['deny 命中', snapshot.denyLabel],
      ['最终判定', snapshot.verdictLabel],
    ];
  },
});

const meta = {
  id: 'custom-protocol',
  title: '桌面进阶/自定义协议',
  tags: ['!dev'],
} satisfies Meta<ExampleArgs & ScopeCheckArgs>;

export const Interactive: StoryObj<ExampleArgs> = {
  args: {
    protocol: 'asset',
    platform: 'macos',
    useHttpsScheme: false,
    resourcePath: 'assets/logo.png',
  },
  argTypes: {
    protocol: {
      name: '协议',
      description:
        "asset:Tauri 内置协议,核心当 handler(查 scope → 读文件 → 猜 MIME → 支持 Range);myproto:示例自定义协议,由 register_uri_scheme_protocol 注册,请求变成你的 Rust handler 调用。",
      control: { type: 'radio' },
      options: ['asset', 'myproto'],
    },
    platform: {
      name: '平台',
      description:
        '目标平台决定 URL 形态:macOS/iOS/Linux 为 {scheme}://localhost/{path};Windows/Android 默认 http://{scheme}.localhost/{path}。URL 变形,handler 收到的 path 不变。',
      control: { type: 'radio' },
      options: ['macos', 'windows', 'linux'],
    },
    useHttpsScheme: {
      name: 'useHttpsScheme(Windows/Android)',
      description:
        '窗口配置(app.windows[].useHttpsScheme):Windows/Android 上把自定义协议从 http://{scheme}.localhost 换成 https://{scheme}.localhost。macOS/Linux 上无效果。官方警告:发布间改动该值会更换 IndexedDB、cookies 与 localStorage 的位置。',
      control: { type: 'boolean' },
    },
    resourcePath: {
      name: '资源路径',
      description:
        'convertFileSrc 的输入(实际项目里通常是 resolveResource() 解析出的绝对路径)。整条路径会被 encodeURIComponent,斜杠也变成 %2F——含空格、中文的路径照样可用。',
      control: { type: 'select' },
      options: ['assets/logo.png', 'images/背景 图.png', '/Users/me/photo.png'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
};

export const ScopeCheck: StoryObj<ScopeCheckArgs> = {
  args: {
    scopePreset: 'resourceRecursive',
    requestPath: 'assets/logo.png',
    platform: 'unix',
  },
  argTypes: {
    scopePreset: {
      name: 'assetProtocol.scope',
      description:
        'tauri.conf.json 里的 scope 预设。empty:默认值 [](什么都不放行);resourceRecursive:["$RESOURCE/**/*"] 放行资源目录全部文件;resourceNarrow:["$RESOURCE/assets/*"] 只放行 assets 下单层;homeAllowDeny:对象形式,allow $HOME/**/* 并 deny secrets/**。',
      control: { type: 'radio' },
      options: ['empty', 'resourceRecursive', 'resourceNarrow', 'homeAllowDeny'],
    },
    requestPath: {
      name: '请求路径',
      description:
        'convertFileSrc 的输入。前三个在资源目录($RESOURCE)下;后三个在用户主目录($HOME)下,典型来自 dialog 选出的文件——其中 .cache 展示 Unix dotfile 规则,secrets 展示 deny 优先。',
      control: { type: 'select' },
      options: [
        'logo.png',
        'assets/logo.png',
        'fonts/Inter.ttf',
        '/Users/me/Documents/photo.png',
        '/Users/me/.cache/blob.dat',
        '/Users/me/secrets/key.pem',
      ],
    },
    platform: {
      name: '平台(dotfile 规则)',
      description:
        'Unix(macOS/Linux)上 requireLiteralLeadingDot 默认 true:通配符不匹配 . 开头的段;Windows 没有这条规则,同样配置能放行 .cache。',
      control: { type: 'radio' },
      options: ['unix', 'windows'],
    },
  },
  render: renderScopeCheck,
  parameters: storySource(scopeCheckSource),
};

export default meta;
