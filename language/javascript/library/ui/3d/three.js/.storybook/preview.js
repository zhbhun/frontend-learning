import '../assets/docs-layout.css';
import '../assets/story-canvas.css';

import { MermaidDocsContainer } from './mermaid-docs-container.js';

/** @type {import('@storybook/html-vite').Preview} */
const preview = {
  parameters: {
    // expanded 让 Controls 面板显示说明和默认值，这样它同时充当参数表。
    controls: { expanded: true },
    docs: {
      container: MermaidDocsContainer,
      // headingSelector 默认只抓 h3，而条目小节用的是 h2，不指定的话目录会是空的。
      toc: { title: '本页目录', headingSelector: 'h2, h3' },
      // 所有 Canvas 默认提供源码入口；各 story 显式映射真实范例文件，避免显示渲染后的 DOM。
      canvas: { sourceState: 'hidden' },
      codePanel: false
    }
  }
};

export default preview;
