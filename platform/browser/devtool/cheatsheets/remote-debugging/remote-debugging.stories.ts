import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import pickerSource from './scenario-picker.ts?raw';
import {
  createScenarioPicker,
  type ScenarioId,
  type ScenarioPickerInstance,
  type ScenarioPickerSnapshot,
} from './scenario-picker';

type PickerArgs = {
  scenario: ScenarioId;
};

/*
  与其他课程的命令式 Canvas 相同的生命周期：舞台只创建一次，参数变化只调用
  update。画布重绘的全部输入来自 Controls 选择的场景，是纯静态的决策树——
  chrome://inspect 的真实连接过程无法在 Storybook 内复现，这里不伪造任何
  连接状态；各场景的完整工作流见正文小节。
*/
const renderPicker = canvasStory({
  create: createScenarioPicker,
  apply(instance: ScenarioPickerInstance, args: PickerArgs) {
    instance.update(args);
  },
  readout(snapshot: ScenarioPickerSnapshot) {
    return [
      ['推荐方案', snapshot.solution],
      ['接入方式', snapshot.setup],
      ['关键局限', snapshot.limit],
    ];
  },
});

const meta = {
  id: 'remote-debugging',
  title: '生态与进阶/远程与移动端调试',
  tags: ['!dev'],
  args: {
    scenario: 'android-chrome',
  },
  argTypes: {
    scenario: {
      name: '调试场景',
      description:
        '选择你当前面对的调试场景：画布在决策树上高亮该场景的路线与推荐叶子，readout 给出推荐方案、接入方式与关键局限。',
      control: {
        type: 'radio',
        labels: {
          'android-chrome': 'Android Chrome 页面',
          'android-webview': 'App 内嵌 WebView',
          'app-page': '微信等 App 内网页',
          'no-cable': '现场无连线',
          'remote-assist': '远程协助他人',
        },
      },
      options: [
        'android-chrome',
        'android-webview',
        'app-page',
        'no-cable',
        'remote-assist',
      ],
    },
  },
  render: renderPicker,
  parameters: storySource(pickerSource),
} satisfies Meta<PickerArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Picker: Story = {};
