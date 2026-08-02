import remarkGfm from 'remark-gfm';

import rehypeMermaidFences from './rehype-mermaid-fences.js';

/** @type {import('@storybook/html-vite').StorybookConfig} */
const config = {
  framework: '@storybook/html-vite',
  stories: [
    '../cheatsheets/**/*.mdx',
    '../cheatsheets/**/*.stories.js'
  ],
  addons: [
    {
      name: '@storybook/addon-docs',
      options: {
        // MDX 默认只支持 CommonMark，课程里的表格需要 GFM 才会渲染。
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypeMermaidFences]
          }
        }
      }
    }
  ],
  features: {
    backgrounds: false,
    measure: false,
    outline: false,
    toolbars: false,
    viewport: false,
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false
  }
};

export default config;
