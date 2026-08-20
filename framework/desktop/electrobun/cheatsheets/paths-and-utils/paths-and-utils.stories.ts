import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import mapSource from './paths-resolution-map.ts?raw';
import {
	createPathsResolutionMap,
	type PathsResolutionArgs,
	type PathsResolutionInstance,
	type PathsResolutionSnapshot,
} from './paths-resolution-map';

const renderMap = canvasStory({
	create: createPathsResolutionMap,
	apply(instance: PathsResolutionInstance, args: PathsResolutionArgs) {
		instance.update(args);
	},
	readout(snapshot: PathsResolutionSnapshot) {
		return [
			['选中 getter', snapshot.getter],
			['解析式', snapshot.formula],
			['应用私有目录', snapshot.scoped],
		];
	},
});

const meta = {
	id: 'paths-and-utils',
	title: '系统集成/应用运行时/路径与工具',
	tags: ['!dev'],
	args: {
		platform: 'macos',
		identifier: 'dev.learn.utils',
		channel: 'dev',
	},
	argTypes: {
		platform: {
			name: '平台',
			description:
			'同一个 getter 名在不同平台落到不同基础目录：macOS 是 ~/Library/...，Windows 是 AppData + 环境变量，Linux 是 XDG 目录。',
			options: ['macos', 'win', 'linux'],
			control: {
				type: 'inline-radio',
				labels: {
					macos: 'macOS',
					win: 'Windows',
					linux: 'Linux',
				},
			},
		},
		identifier: {
			name: 'identifier',
			description:
			'来自 electrobun.config.ts 的 app.identifier，构建时写进 bundle 的 version.json；userData / userCache / userLogs 的中段。',
			control: { type: 'text' },
		},
		channel: {
			name: 'channel',
			description:
			'发布通道，同样来自 version.json；electrobun dev 的构建里是 "dev"。置空 identifier / channel 可以观察私有目录退化为上一层。',
			control: { type: 'text' },
		},
	},
	render: renderMap,
	parameters: storySource(mapSource),
} satisfies Meta<PathsResolutionArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PathsResolutionMap: Story = {};
