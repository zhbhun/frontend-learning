import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import {
  createCollabFieldsDemo,
  type CollabFieldsInstance,
  type CollabFieldsSnapshot,
} from './collab-fields';
import collabFieldsSource from './collab-fields.ts?raw';
import './demo.css';
import {
  createSharedDocDemo,
  type SharedDocArgs,
  type SharedDocInstance,
  type SharedDocSnapshot,
} from './shared-doc';
import sharedDocSource from './shared-doc.ts?raw';

const sharedDocRender = canvasStory({
  create: createSharedDocDemo,
  apply(instance: SharedDocInstance, args: SharedDocArgs) {
    instance.update(args);
  },
  readout(snapshot: SharedDocSnapshot) {
    return [
      ['连接方式', snapshot.modeLabel],
      ['A 与 B 内容一致', snapshot.inSync],
      ['Y.Doc update 次数', snapshot.updateCount],
      ['clientId（A / B）', snapshot.clientId],
    ];
  },
});

const collabFieldsRender = canvasStory({
  create: createCollabFieldsDemo,
  apply(instance: CollabFieldsInstance) {
    instance.update();
  },
  readout(snapshot: CollabFieldsSnapshot) {
    return [
      ['Y.Doc 上的片段', snapshot.fragments],
      ['A 与 B 内容一致', snapshot.inSync],
    ];
  },
});

const meta = {
  id: 'collaboration',
  title: '实时协作/协作入门',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

export const SharedDoc = {
  name: '共享文档',
  args: {
    mode: 'shared' as SharedDocArgs['mode'],
  },
  argTypes: {
    mode: {
      name: '连接方式',
      description:
        '共享：两个编辑器接同一个 Y.Doc；独立：各接各的 Y.Doc，切换后整体重建',
      control: {
        type: 'select',
        labels: {
          shared: '共享一个 Y.Doc',
          separate: '各自独立 Y.Doc',
        },
      },
      options: ['shared', 'separate'],
    },
  },
  render: sharedDocRender,
  parameters: storySource(sharedDocSource),
} satisfies StoryObj<SharedDocArgs>;

export const CollabFields = {
  name: '多字段隔离',
  render: collabFieldsRender,
  parameters: storySource(collabFieldsSource),
} satisfies StoryObj;
