import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import wasmFormsSource from './wasm-forms.ts?raw';
import {
  createWasmForms,
  type WasmFormsInstance,
  type WasmFormsSnapshot,
} from './wasm-forms';

const renderForms = canvasStory({
  create: createWasmForms,
  apply(instance: WasmFormsInstance) {
    instance.update();
  },
  readout(snapshot: WasmFormsSnapshot) {
    return [
      ['状态', snapshot.message],
      ['固定宽度 SIMD', snapshot.fixedSimd],
      ['Relaxed SIMD', snapshot.relaxedSimd],
      ['crossOriginIsolated', snapshot.isolated],
      ['SharedArrayBuffer', snapshot.sharedThreads],
      ['硬件线程数', snapshot.cores],
      ['numThreads（create 前）', snapshot.threadsBefore],
      ['numThreads（create 后）', snapshot.threadsAfter],
      ['实际加载工件', snapshot.artifacts],
      ['单次推理耗时', snapshot.inference],
    ];
  },
  captions: ['画布：三种运行形态的命中情况', '读数：每项检测的原始值'],
});

// 用类型标注（而非 satisfies）携带 args 元数据，与既有课程写法一致。
const meta: Meta = {
  id: 'backend-wasm',
  title: '核心概念/执行后端/WebAssembly 后端',
  tags: ['!dev'],
};

export default meta;

type Story = StoryObj;

export const Forms: Story = {
  name: '形态读数',
  render: renderForms,
  parameters: storySource(wasmFormsSource),
};
