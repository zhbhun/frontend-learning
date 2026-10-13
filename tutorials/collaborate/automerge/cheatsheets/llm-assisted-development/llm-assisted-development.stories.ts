import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import checkerSource from './hallucination-checker.ts?raw';
import verifierSource from './draft-verifier.ts?raw';
import {
  SNIPPET_LABELS,
  SNIPPET_OPTIONS,
  createHallucinationChecker,
  type CheckerArgs,
  type CheckerInstance,
  type CheckerSnapshot,
} from './hallucination-checker';
import {
  DRAFT_LABELS,
  DRAFT_OPTIONS,
  createDraftVerifier,
  type VerifierArgs,
  type VerifierInstance,
  type VerifierSnapshot,
} from './draft-verifier';

/**
 * 每个故事独立的 canvasStory 闭包：同一页上两个 Canvas 各自持有舞台，
 * 控件切换通过 args 重新驱动实例执行一轮真实运行。
 */
const renderChecker = canvasStory({
  create: createHallucinationChecker,
  apply(instance: CheckerInstance, args: CheckerArgs) {
    instance.update(args);
  },
  readout(snapshot: CheckerSnapshot) {
    return snapshot.rows;
  },
});

const renderVerifier = canvasStory({
  create: createDraftVerifier,
  apply(instance: VerifierInstance, args: VerifierArgs) {
    instance.update(args);
  },
  readout(snapshot: VerifierSnapshot) {
    return snapshot.rows;
  },
});

interface CourseArgs extends CheckerArgs, VerifierArgs {}

const meta = {
  id: 'llm-assisted-development',
  title: '进阶专题/用 LLM 辅助 Automerge 开发',
  tags: ['!dev'],
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<CourseArgs>;

export const HallucinationChecker: Story = {
  name: '幻觉校验器',
  args: {
    snippet: 'old-text',
  } satisfies CheckerArgs,
  argTypes: {
    snippet: {
      name: 'AI 生成片段',
      description:
        '逐段真实运行一段典型的「AI 生成风格」Automerge 代码：多数片段当场抛错（读数给出错误原文），个别片段能跑但藏着静默偏差或过时写法。',
      control: { type: 'radio' },
      options: SNIPPET_OPTIONS,
      labels: SNIPPET_LABELS,
    },
  },
  render: renderChecker,
  parameters: storySource(checkerSource),
};

export const DraftVerifier: Story = {
  name: '草稿验证台',
  args: {
    draft: 'draft-a',
  } satisfies VerifierArgs,
  argTypes: {
    draft: {
      name: '待验证草稿',
      description:
        '同一组五条断言（创建、单副本编辑、并发不丢、save/load 往返、双向一致）分别验证三份草稿：草稿A 死在第 1 条；草稿B 全部能跑，只有并发断言抓到被覆盖丢弃的编辑；修正后全绿。',
      control: { type: 'radio' },
      options: DRAFT_OPTIONS,
      labels: DRAFT_LABELS,
    },
  },
  render: renderVerifier,
  parameters: storySource(verifierSource),
};
