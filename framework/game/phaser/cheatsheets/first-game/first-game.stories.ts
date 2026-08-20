import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import catchGameSource from './catch-game.ts?raw';
import {
  createCatchGame,
  type CatchGameInstance,
  type CatchGameSnapshot,
} from './catch-game';

interface FirstGameArgs {
  fallSpeed: number;
  spawnDelay: number;
}

const renderCatchGame = canvasStory({
  create: createCatchGame,
  apply(instance: CatchGameInstance, args: FirstGameArgs) {
    instance.setDifficulty({
      fallSpeed: args.fallSpeed,
      spawnDelay: args.spawnDelay,
    });
  },
  readout(snapshot: CatchGameSnapshot) {
    return [
      ['得分', snapshot.score],
      ['剩余生命', snapshot.lives],
      ['游戏状态', snapshot.state === 'playing' ? 'playing' : 'over'],
      ['场上物体', snapshot.itemsOnScreen],
    ];
  },
  captions: ['接住黄色圆形 +10 分,碰到红色方块扣 1 条生命'],
});

const meta = {
  id: 'first-game',
  title: '上手/第一个小游戏',
  tags: ['!dev'],
  args: {
    fallSpeed: 160,
    spawnDelay: 800,
  },
  argTypes: {
    fallSpeed: {
      name: '下落速度',
      description: '下落物的恒定速度(px/s),修改对已在场上的物体立即生效。',
      control: { type: 'range', min: 60, max: 360, step: 20 },
    },
    spawnDelay: {
      name: '生成间隔',
      description: '生成下落物的间隔(ms),越小出现越密;定时器按新间隔重建。',
      control: { type: 'range', min: 300, max: 1500, step: 100 },
    },
  },
  render: renderCatchGame,
  parameters: storySource(catchGameSource),
} satisfies Meta<FirstGameArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CatchGame: Story = {};
