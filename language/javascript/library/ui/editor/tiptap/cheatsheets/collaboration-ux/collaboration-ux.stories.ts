import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import './demo.css';
import {
  createCollabStage,
  type CollabStageInstance,
  type CollabStageSnapshot,
} from './collab-stage';
import collabStageSource from './collab-stage.ts?raw';
import {
  createConcurrentMerge,
  type ConcurrentMergeInstance,
  type ConcurrentMergeSnapshot,
} from './concurrent-merge';
import concurrentMergeSource from './concurrent-merge.ts?raw';

const collabStageRender = canvasStory({
  create: createCollabStage,
  apply(instance: CollabStageInstance) {
    instance.update();
  },
  readout(snapshot: CollabStageSnapshot) {
    return [
      ['阿橙眼中的在线名单', snapshot.orangeSeesUsers],
      ['阿绿端 storage.users', snapshot.greenStorageUsers],
      ['阿绿聚焦', snapshot.greenFocused],
      ['阿橙聚焦', snapshot.orangeFocused],
    ];
  },
  captions: ['阿绿', '阿橙'],
});

const concurrentMergeRender = canvasStory({
  create: createConcurrentMerge,
  apply(instance: ConcurrentMergeInstance) {
    instance.update();
  },
  readout(snapshot: ConcurrentMergeSnapshot) {
    return [
      ['阿绿编辑器文本', snapshot.greenText],
      ['阿橙编辑器文本', snapshot.orangeText],
      ['两端一致', snapshot.consistent],
    ];
  },
  captions: ['阿绿', '阿橙'],
});

const meta = {
  id: 'collaboration-ux',
  title: '实时协作/协作体验',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const CollabStage = {
  name: '双人协作台',
  render: collabStageRender,
  parameters: storySource(collabStageSource),
} satisfies StoryObj;

export const ConcurrentMerge = {
  name: '并发合并',
  render: concurrentMergeRender,
  parameters: storySource(concurrentMergeSource),
} satisfies StoryObj;
