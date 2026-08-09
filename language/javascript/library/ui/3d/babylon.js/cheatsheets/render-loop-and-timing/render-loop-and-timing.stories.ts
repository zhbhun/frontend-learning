import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createLoopExample,
  type LoopInstance,
  type LoopSnapshot,
} from './example';

interface LoopArgs {
  mode: 'delta' | 'fixed';
  angularSpeed: number;
}

const renderLoop = canvasStory({
  create: createLoopExample,
  apply(instance: LoopInstance, args: LoopArgs) {
    instance.update(args);
  },
  readout(snapshot: LoopSnapshot) {
    const deg = (((snapshot.angle * 180) / Math.PI) % 360 + 360) % 360;
    return [
      ['推进方式', snapshot.mode === 'delta' ? 'delta（秒制）' : 'fixed（每帧）'],
      ['状态', snapshot.status],
      ['FPS', snapshot.fps],
      ['deltaTime', `${snapshot.deltaTime.toFixed(1)} ms`],
      ['累计时间', `${snapshot.elapsed.toFixed(2)} s`],
      ['Y 轴角度', `${deg.toFixed(1)}°`],
      ['有效角速度', `${snapshot.effectiveDegPerSec.toFixed(1)} °/s`],
    ];
  },
});

export default {
  id: 'render-loop-and-timing',
  title: '动画与时间/渲染循环与时间',
  tags: ['!dev'],
};

export const Loop = {
  name: 'delta 与固定步长',
  args: {
    mode: 'delta',
    angularSpeed: 1,
  },
  argTypes: {
    mode: {
      name: '推进方式',
      control: { type: 'select' },
      options: ['delta', 'fixed'],
      description:
        "delta：box.rotation.y += angularSpeed * (engine.getDeltaTime()/1000)，速度按弧度/秒解释，与刷新率无关（正确）。fixed：每帧 += angularSpeed，速度随帧率漂移——60Hz 与 144Hz 屏上差 2.4 倍（错误示范）。",
    },
    angularSpeed: {
      name: '角速度',
      control: { type: 'range', min: 0, max: 3, step: 0.1 },
      description:
        'delta 模式下单位为弧度/秒（1 ≈ 每秒 57°）；fixed 模式下单位为弧度/帧，切到 fixed 时建议降到 0.1 以下才能看清旋转。',
    },
  },
  render: renderLoop,
  parameters: storySource(exampleSource),
};
