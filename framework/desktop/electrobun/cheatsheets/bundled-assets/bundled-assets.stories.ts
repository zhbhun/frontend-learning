import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import mapSource from './asset-destination-map.ts?raw';
import {
	createAssetDestinationMap,
	type AssetDestinationArgs,
	type AssetDestinationInstance,
	type AssetDestinationSnapshot,
} from './asset-destination-map';

const renderMap = canvasStory({
	create: createAssetDestinationMap,
	apply(instance: AssetDestinationInstance, args: AssetDestinationArgs) {
		instance.update(args);
	},
	readout(snapshot: AssetDestinationSnapshot) {
		return [
			['copy 映射', snapshot.copyEntry],
			['包内落点', snapshot.bundlePath],
			['views:// 地址', snapshot.viewsUrl],
			['--watch 监听目录', snapshot.watchDir],
		];
	},
});

const meta = {
	id: 'bundled-assets',
	title: '构建与分发/构建/打包资源与图标',
	tags: ['!dev'],
	args: {
		source: 'src/assets',
		destination: 'views/mainview/assets',
		sourceIsDir: true,
	},
	argTypes: {
		source: {
			name: '映射源',
			description:
			'build.copy 的键：工程内相对路径。源可以是目录（整目录原样复制，一行映射装下所有资源），也可以是单文件。',
			control: { type: 'text' },
		},
		destination: {
			name: '映射目标',
			description:
			'build.copy 的值：包内 Resources/app 之后的相对路径。以 views/ 开头才有 views:// 地址——试着去掉或恢复这个前缀，观察地址与可达性的变化。',
			control: { type: 'text' },
		},
		sourceIsDir: {
			name: '源是目录',
			description:
			'源为目录时 cpSync 递归复制整棵子树；dev --watch 的监听目录也随形态变化：目录取自身，文件取所在目录。',
			control: { type: 'boolean' },
		},
	},
	render: renderMap,
	parameters: storySource(mapSource),
} satisfies Meta<AssetDestinationArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AssetDestinationMap: Story = {};
