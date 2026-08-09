import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createActionManagerExample,
  type ActionExampleInstance,
  type ActionExampleSnapshot,
  type InteractionMode,
} from './example';

interface ActionArgs {
  mode: InteractionMode;
}

const renderAction = canvasStory({
  create: createActionManagerExample,
  apply(instance: ActionExampleInstance, args: ActionArgs) {
    instance.update(args);
  },
  readout(snapshot: ActionExampleSnapshot) {
    return [
      ['模式', snapshot.mode],
      ['最近触发器', snapshot.lastTrigger],
      ['目标 mesh', snapshot.lastTarget],
      ['执行动作', snapshot.lastAction],
      ['已注册动作数', snapshot.registeredCount],
    ];
  },
});

export default {
  id: 'action-manager',
  title: '应用扩展/Action Manager',
  tags: ['!dev'],
};

export const Actions = {
  name: 'Action Manager',
  args: {
    mode: 'actionManager',
  },
  argTypes: {
    mode: {
      name: '交互模式',
      control: { type: 'radio' },
      options: ['actionManager', 'observable'],
      labels: {
        actionManager: 'ActionManager（声明式）',
        observable: 'Observable（命令式）',
      },
      description:
        'ActionManager 模式给每个 mesh 挂自己的 ActionManager，注册 OnPickTrigger / OnPointerOverTrigger / OnPointerOutTrigger + ExecuteCodeAction，触发器是面向场景对象的语义事件，引擎自动分发；Observable 模式用单个 scene.onPointerObservable 订阅，从 POINTERMOVE / POINTERPICK 里推断 hover/click。两种模式共用同一条拾取管线，但 API 风格不同——切模式后视觉行为一致，「已注册动作数」从 9（3 mesh × 3 触发器）变为 1（单订阅），「最近触发器」从 OnPickTrigger 等语义名变为 POINTERPICK / POINTERMOVE。',
    },
  },
  render: renderAction,
  parameters: storySource(exampleSource),
};
