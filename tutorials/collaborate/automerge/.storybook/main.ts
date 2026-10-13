import type { StorybookConfig } from '@storybook/html-vite';
import { fileURLToPath } from 'node:url';
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
  async viteFinal(config) {
    // automerge 3 的 browser 入口按 wasm-bindgen bundler 目标裸导入 .wasm，Vite
    // （rolldown）会自行实例化但缺少 wasm-bindgen 的 imports 对象，start 阶段直接
    // panic。把包别名到 exports 里的 base64 内嵌入口（纯 JS，atob + initSync），
    // dev 与 build 两条链路都不再触碰裸 .wasm 导入。
    config.resolve ??= {};
    const automergeBase64Entry = fileURLToPath(
      new URL(
        '../node_modules/@automerge/automerge/dist/mjs/entrypoints/fullfat_base64.js',
        import.meta.url,
      ),
    );
    config.resolve.alias = [
      ...(Array.isArray(config.resolve.alias) ? config.resolve.alias : []),
      { find: /^@automerge\/automerge$/, replacement: automergeBase64Entry },
    ];
    return config;
  },
  // 阅读器外壳只承载每课的 Docs 页：进入 documentation mode，让 Storybook 始终以
  // Docs 视图打开课程，不再因同级隐藏 story 把 docs 条目停留在 story 视图的加载态。
  docs: {
    docsMode: true,
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
