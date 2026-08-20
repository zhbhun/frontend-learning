import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import flowSource from './tray-click-flow.ts?raw';
import {
	createTrayClickFlow,
	type TrayClickFlowInstance,
	type TrayClickFlowSnapshot,
	type TraySubscribe,
} from './tray-click-flow';

interface TrayFlowArgs {
	subscribe: TraySubscribe;
	autoUpdate: boolean;
}

const renderFlow = canvasStory({
	create: createTrayClickFlow,
	apply(instance: TrayClickFlowInstance, args: TrayFlowArgs) {
		instance.update(args);
	},
	readout(snapshot: TrayClickFlowSnapshot) {
		return [
			['最近事件', snapshot.lastEvent],
			['命中通道', snapshot.channels],
			['菜单状态', snapshot.menuState],
			['累计动作', snapshot.counters],
		];
	},
});

const meta = {
	id: 'tray',
	title: '系统集成/菜单与托盘/系统托盘',
	tags: ['!dev'],
	args: {
		subscribe: 'tray-on',
		autoUpdate: false,
	},
	argTypes: {
		subscribe: {
			name: '订阅方式',
			description:
				'tray-clicked 事件除了 tray.on() 还有 Electrobun.events.on() 全局订阅；两条通道都会收到同一事件，全局先触发。',
			options: ['tray-on', 'global', 'both'],
			control: {
				type: 'inline-radio',
				labels: {
					'tray-on': 'tray.on（托盘级）',
					global: 'Electrobun.events.on（全局）',
					both: '两者',
				},
			},
		},
		autoUpdate: {
			name: '自动更新初始勾选',
			description:
				'菜单里 checkbox 项的初始状态；开启后灰显项「自动更新开启后可用」变为可点——菜单形态由状态驱动。',
			control: { type: 'boolean' },
		},
	},
	render: renderFlow,
	parameters: storySource(flowSource),
} satisfies Meta<TrayFlowArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TrayClickFlow: Story = {};
