import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import flowSource from './context-menu-flow.ts?raw';
import {
	createContextMenuFlow,
	type ContextMenuFlowInstance,
	type ContextMenuFlowSnapshot,
} from './context-menu-flow';

// 联动示意的输入全部来自画布内的指针操作（右键目标、点击菜单项），
// 不需要 Controls 提供参数入口。
const renderFlow = canvasStory({
	create: createContextMenuFlow,
	apply(_instance: ContextMenuFlowInstance) {},
	readout(snapshot: ContextMenuFlowSnapshot) {
		return [
			['右键目标', snapshot.target],
			['视图 → 主进程', snapshot.viewToBun],
			['主进程', snapshot.bunSide],
			['最近点击', snapshot.clicked],
			['事件回传', snapshot.eventBack],
			['生效', snapshot.effect],
		];
	},
});

const meta = {
	id: 'context-menu',
	title: '系统集成/菜单与托盘/上下文菜单',
	tags: ['!dev'],
	render: renderFlow,
	parameters: storySource(flowSource),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContextMenuFlow: Story = {};
