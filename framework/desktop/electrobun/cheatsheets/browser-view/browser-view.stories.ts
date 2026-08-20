import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import layoutSource from './view-frame-layout.ts?raw';
import {
	createViewFrameLayout,
	type ViewFrameLayoutInstance,
	type ViewFrameLayoutSnapshot,
} from './view-frame-layout';

interface LayoutArgs {
	windowWidth: number;
	windowHeight: number;
	childX: number;
	childY: number;
	childWidth: number;
	childHeight: number;
	childAutoResize: boolean;
}

const renderLayout = canvasStory({
	create: createViewFrameLayout,
	apply(instance: ViewFrameLayoutInstance, args: LayoutArgs) {
		instance.update(args);
	},
	readout(snapshot: ViewFrameLayoutSnapshot) {
		return [
			['主视图 frame', snapshot.mainFrame],
			['子视图 frame', snapshot.childFrame],
			['原生 adjustedY', snapshot.adjustedY],
			['子视图层级', snapshot.childLayer],
			['遮挡主视图', snapshot.coverPercent],
		];
	},
});

const meta = {
	id: 'browser-view',
	title: '窗口与视图/视图/BrowserView',
	tags: ['!dev'],
	args: {
		windowWidth: 960,
		windowHeight: 600,
		childX: 0,
		childY: 0,
		childWidth: 280,
		childHeight: 600,
		childAutoResize: false,
	},
	argTypes: {
		windowWidth: {
			name: '窗口宽',
			description: 'BrowserWindow frame.width；内容区随窗口变化，主视图铺满它。',
			control: { type: 'range', min: 480, max: 1280, step: 20 },
		},
		windowHeight: {
			name: '窗口高',
			description: 'BrowserWindow frame.height；内容区高度约为窗口高减标题栏。',
			control: { type: 'range', min: 360, max: 800, step: 20 },
		},
		childX: {
			name: '子视图 x',
			description: '子视图 frame.x，从内容区左上角向右起算。',
			control: { type: 'range', min: 0, max: 1000, step: 10 },
		},
		childY: {
			name: '子视图 y',
			description: '子视图 frame.y，从内容区顶部向下起算；原生会翻转为 macOS 坐标。',
			control: { type: 'range', min: 0, max: 700, step: 10 },
		},
		childWidth: {
			name: '子视图宽',
			description: '子视图 frame.width。',
			control: { type: 'range', min: 80, max: 800, step: 10 },
		},
		childHeight: {
			name: '子视图高',
			description: '子视图 frame.height。',
			control: { type: 'range', min: 80, max: 800, step: 10 },
		},
		childAutoResize: {
			name: '子视图 autoResize',
			description: 'true 时子视图铺满内容区并盖住主视图，frame 输入被忽略；false 时按 frame 固定。',
			control: { type: 'boolean' },
		},
	},
	render: renderLayout,
	parameters: storySource(layoutSource),
} satisfies Meta<LayoutArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ViewFrameLayout: Story = {};
