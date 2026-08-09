import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createObservablesExample,
  type ObsInstance,
  type ObsSnapshot,
} from './example';

interface ObsArgs {
  renderObs: boolean;
  pointerObs: boolean;
  keyboardObs: boolean;
}

const renderStory = canvasStory({
  create: createObservablesExample,
  apply(instance: ObsInstance, args: ObsArgs) {
    instance.update(args);
  },
  readout(snapshot: ObsSnapshot) {
    return [
      ['订阅 渲染', snapshot.renderSubscribed ? '✓ 已订阅' : '✗ 已取消'],
      ['订阅 指针', snapshot.pointerSubscribed ? '✓ 已订阅' : '✗ 已取消'],
      ['订阅 键盘', snapshot.keyboardSubscribed ? '✓ 已订阅' : '✗ 已取消'],
      ['帧计数', snapshot.frameCount],
      ['最近指针', snapshot.pointer],
      ['最近按键', snapshot.lastKey],
      [
        '键盘焦点',
        snapshot.hasFocus ? '是（canvas 已聚焦）' : '否（点击 canvas 聚焦）',
      ],
    ];
  },
});

export default {
  id: 'observables-and-events',
  title: '事件与交互/Observables 与事件',
  tags: ['!dev'],
};

export const Obs = {
  name: '订阅与清理',
  args: {
    renderObs: true,
    pointerObs: true,
    keyboardObs: true,
  },
  argTypes: {
    renderObs: {
      name: '订阅 onBeforeRenderObservable',
      control: 'boolean',
      description:
        '勾选时订阅 scene.onBeforeRenderObservable，每帧让帧计数 +1；取消勾选时用 add 返回的 Observer 引用 remove，计数停住。注意：盒子旋转由另一个常驻 observer 驱动、不受此开关影响——证明取消单个订阅不影响同一 observable 上的其它 observer。',
    },
    pointerObs: {
      name: '订阅 onPointerObservable',
      control: 'boolean',
      description:
        '勾选时订阅 scene.onPointerObservable，用第二参 mask 只接 PointerEventTypes.POINTERMOVE，把 scene.pointerX/pointerY 写进读数；取消勾选时读数冻结在最后值。',
    },
    keyboardObs: {
      name: '订阅 onKeyboardObservable',
      control: 'boolean',
      description:
        '勾选时订阅 scene.onKeyboardObservable，按 KeyboardEventTypes.KEYDOWN 更新最近按键。onKeyboardObservable 需要 canvas 键盘焦点：点击 canvas（蓝色边框）让其聚焦后再按键，否则 keydown 不进入 Engine 监听。',
    },
  },
  render: renderStory,
  parameters: storySource(exampleSource),
};
