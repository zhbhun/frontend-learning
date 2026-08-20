import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import resolutionSource from './renderer-resolution.ts?raw';
import {
  createRendererResolution,
  type RendererResolutionInstance,
  type RendererResolutionOptions,
  type RendererResolutionSnapshot,
} from './renderer-resolution';

interface RendererArgs {
  platform: RendererResolutionOptions['platform'];
  bundleCEFMac: boolean;
  bundleCEFWin: boolean;
  bundleCEFLinux: boolean;
  defaultRenderer: RendererResolutionOptions['defaultRenderer'];
  windowRenderer: RendererResolutionOptions['windowRenderer'];
}

const renderResolution = canvasStory({
  create: createRendererResolution,
  apply(instance: RendererResolutionInstance, args: RendererArgs) {
    instance.update(args);
  },
  readout(snapshot: RendererResolutionSnapshot) {
    return [
      ['平台', snapshot.platform],
      ['该平台 bundleCEF', snapshot.bundleCEF],
      ['窗口 renderer', snapshot.windowRenderer],
      ['availableRenderers', snapshot.availableRenderers],
      ['实际后端', snapshot.backend],
      ['初始 bundle（估）', snapshot.bundleSize],
      ['提示', snapshot.note],
    ];
  },
});

const meta = {
  id: 'cross-platform',
  title: '构建与分发/分发/跨平台与兼容性',
  tags: ['!dev'],
  args: {
    platform: 'mac',
    bundleCEFMac: false,
    bundleCEFWin: true,
    bundleCEFLinux: true,
    defaultRenderer: 'native',
    windowRenderer: 'default',
  },
  argTypes: {
    platform: {
      name: '目标平台',
      description:
        '当前考察的平台：决定系统引擎、混用限制与体积判断。对应在三台机器上分别构建的真实场景。',
      options: ['mac', 'win', 'linux'],
      control: {
        type: 'inline-radio',
        labels: { mac: 'mac', win: 'win', linux: 'linux' },
      },
    },
    bundleCEFMac: {
      name: 'mac.bundleCEF',
      description: 'macOS 是否捆绑 CEF；对应 electrobun.config.ts 的 build.mac.bundleCEF。',
      control: { type: 'boolean' },
    },
    bundleCEFWin: {
      name: 'win.bundleCEF',
      description: 'Windows 是否捆绑 CEF；对应 build.win.bundleCEF。',
      control: { type: 'boolean' },
    },
    bundleCEFLinux: {
      name: 'linux.bundleCEF',
      description: 'Linux 是否捆绑 CEF；对应 build.linux.bundleCEF（官方建议开启）。',
      control: { type: 'boolean' },
    },
    defaultRenderer: {
      name: '平台段 defaultRenderer',
      description:
        '所选平台的 defaultRenderer：窗口未显式指定 renderer 时使用的默认后端。默认 native。',
      options: ['native', 'cef'],
      control: {
        type: 'inline-radio',
        labels: { native: 'native', cef: 'cef' },
      },
    },
    windowRenderer: {
      name: '窗口 renderer',
      description:
        'new BrowserWindow({ renderer }) 的取值：未指定时落到平台段 defaultRenderer。',
      options: ['default', 'native', 'cef'],
      control: {
        type: 'inline-radio',
        labels: { default: '未指定（用默认）', native: 'native', cef: 'cef' },
      },
    },
  },
  render: renderResolution,
  parameters: storySource(resolutionSource),
} satisfies Meta<RendererArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RendererResolution: Story = {};
