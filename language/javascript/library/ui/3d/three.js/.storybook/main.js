import remarkGfm from 'remark-gfm';

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
            remarkPlugins: [remarkGfm]
          }
        }
      }
    }
  ]
};

export default config;
