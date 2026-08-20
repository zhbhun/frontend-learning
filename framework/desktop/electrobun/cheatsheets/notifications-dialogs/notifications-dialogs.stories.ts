import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import flowSource from './notifications-dialogs-flow.ts?raw';
import {
	createNotificationsDialogsFlow,
	type NotificationsDialogsFlowInstance,
	type NotificationsDialogsFlowSnapshot,
} from './notifications-dialogs-flow';

// 联动示意的输入全部来自画布内的点击（删除草稿、对话框按钮 / 遮罩、模拟下载完成），
// 不需要 Controls 提供参数入口。
const renderFlow = canvasStory({
	create: createNotificationsDialogsFlow,
	apply(_instance: NotificationsDialogsFlowInstance) {},
	readout(snapshot: NotificationsDialogsFlowSnapshot) {
		return [
			['视图侧调用', snapshot.viewCall],
			['主进程调用', snapshot.bunCall],
			['模态 / 系统侧', snapshot.systemSide],
			['返回视图', snapshot.viewBack],
			['生效', snapshot.effect],
		];
	},
});

const meta = {
	id: 'notifications-dialogs',
	title: '系统集成/桌面能力/通知与对话框',
	tags: ['!dev'],
	render: renderFlow,
	parameters: storySource(flowSource),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotificationsDialogsFlow: Story = {};
