import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createAnimationDemo,
  type AnimationDemoInstance,
  type AnimationDemoSnapshot,
} from './example';

interface AnimArgs {
  loopMode: 'cycle' | 'yoyo';
  easing: 'linear' | 'cubic' | 'bounce' | 'elastic';
  speedRatio: number;
}

const renderAnim = canvasStory({
  create: createAnimationDemo,
  apply(instance: AnimationDemoInstance, args: AnimArgs) {
    instance.update(args);
  },
  readout(snapshot: AnimationDemoSnapshot) {
    return [
      ['循环模式', snapshot.loopLabel],
      ['缓动', snapshot.easingLabel],
      ['速度', snapshot.speedLabel],
      ['当前帧进度', snapshot.progress],
      ['box.position.x', snapshot.positionX],
    ];
  },
});

export default {
  id: 'animation-system',
  title: '动画与时间/动画',
  tags: ['!dev'],
};

export const Anim = {
  name: '动画播放',
  args: {
    loopMode: 'cycle',
    easing: 'linear',
    speedRatio: 1,
  },
  argTypes: {
    loopMode: {
      name: '循环模式',
      options: ['cycle', 'yoyo'],
      control: { type: 'inline-radio' },
      description:
        '写入两段 Animation 的 loopMode。CYCLE 到末帧后跳回首帧（位置会"瞬移"回起点，最直白）；YOYO 在首末帧之间来回反弹。',
    },
    easing: {
      name: '缓动函数',
      options: ['linear', 'cubic', 'bounce', 'elastic'],
      control: { type: 'select' },
      description:
        'setEasingFunction 作用在两段 Animation 上。Linear 匀速；Cubic 三次缓动（首末减速）；Bounce 末段弹跳；Elastic 弹性过冲。',
    },
    speedRatio: {
      name: '速度（speedRatio）',
      control: { type: 'range', min: 0.25, max: 3, step: 0.25 },
      description:
        '写入 Animatable.speedRatio，是运行时属性，无需重建动画。0.5 慢一倍、2 快一倍。',
    },
  },
  render: renderAnim,
  parameters: storySource(exampleSource),
};
