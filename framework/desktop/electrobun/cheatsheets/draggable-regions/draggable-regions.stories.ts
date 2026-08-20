import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import hitTestSource from './drag-hit-test.ts?raw';
import {
	createDragHitTest,
	type DragHitTestArgs,
	type DragHitTestInstance,
	type DragHitTestSnapshot,
} from './drag-hit-test';

const renderHitTest = canvasStory({
	create: createDragHitTest,
	apply(instance: DragHitTestInstance, args: DragHitTestArgs) {
		instance.update(args);
	},
	readout(snapshot: DragHitTestSnapshot) {
		return [
			['最近按下（祖先链）', snapshot.pressed],
			['判定', snapshot.verdict],
			['命中选择器', snapshot.selector],
			['内部 RPC', snapshot.rpc],
		];
	},
});

const meta = {
	id: 'draggable-regions',
	title: 'RPC 与通信/拖拽区域',
	tags: ['!dev'],
	args: {
		marking: 'class',
		exclude: 'class',
	},
	argTypes: {
		marking: {
			name: '标记方式',
			description:
				'标题栏采用哪种拖拽标记。「仅样式表声明」是常见误区：判定只读 class 与 style 属性。',
			options: ['class', 'inline', 'stylesheet'],
			control: {
				type: 'inline-radio',
				labels: {
					class: 'class 标记',
					inline: '内联 app-region',
					stylesheet: '仅样式表声明',
				},
			},
		},
		exclude: {
			name: '控件排除',
			description:
				'窗口控件（三个圆点按钮）如何排除拖拽；「不排除」时按住按钮也会拖动窗口。',
			options: ['none', 'class', 'inline'],
			control: {
				type: 'inline-radio',
				labels: {
					none: '不排除',
					class: 'no-drag class',
					inline: 'no-drag 内联',
				},
			},
		},
	},
	render: renderHitTest,
	parameters: storySource(hitTestSource),
} satisfies Meta<DragHitTestArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DragHitTest: Story = {};
