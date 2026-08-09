import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createGuiExample,
  type GuiAnchor,
  type GuiInstance,
  type GuiSnapshot,
} from './example';

interface GuiArgs {
  panelAnchor: GuiAnchor;
}

const renderStory = canvasStory({
  create: createGuiExample,
  apply(instance: GuiInstance, args: GuiArgs) {
    instance.update(args);
  },
  readout(snapshot: GuiSnapshot) {
    return [
      ['点击次数', snapshot.clicks],
      ['滑块值', snapshot.sliderValue.toFixed(2)],
      ['盒子角速度', `${snapshot.angularSpeed.toFixed(2)} rad/s`],
      ['盒子状态', snapshot.boxVisible ? '可见' : '隐藏'],
      ['面板锚点', snapshot.anchor],
    ];
  },
});

export default {
  id: 'gui-system',
  title: '应用扩展/GUI',
  tags: ['!dev'],
};

export const Gui = {
  name: '控件与事件',
  args: {
    panelAnchor: 'left',
  },
  argTypes: {
    panelAnchor: {
      name: '面板水平锚点',
      control: { type: 'radio', options: ['left', 'center', 'right'] },
      description:
        '切换 StackPanel 的 horizontalAlignment（左 / 中 / 右），演示 GUI 锚定。canvas 内的按钮和滑块继续驱动 3D 场景——点击按钮切换盒子显隐，拖动滑块改变盒子角速度。',
    },
  },
  render: renderStory,
  parameters: storySource(exampleSource),
};
