import type { StorybookConfig } from '@storybook/html-vite';
import remarkGfm from 'remark-gfm';

import rehypeMermaidFences from './rehype-mermaid-fences.js';
import { roadmapStories } from './roadmap-stories.js';

const config: StorybookConfig = {
  stories: roadmapStories({
    fallback: [
      '../cheatsheets/sample-course/sample-course.stories.ts',
      '../cheatsheets/sample-course/README.mdx',
    ],
  }),
  addons: [
    {
      name: '@storybook/addon-docs',
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeMermaidFences],
          },
        },
      },
    },
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  features: {
    backgrounds: false,
    measure: false,
    outline: false,
    viewport: false,
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false,
  },
};

export default config;
