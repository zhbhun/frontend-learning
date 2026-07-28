import '../assets/docs-layout.css';
import '../assets/story-canvas.css';

/** @type {import('@storybook/html-vite').Preview} */
const preview = {
  parameters: {
    // expanded 让 Controls 面板显示说明和默认值，这样它同时充当参数表。
    controls: { expanded: true },
    docs: {
      // headingSelector 默认只抓 h3，而条目小节用的是 h2，不指定的话目录会是空的。
      toc: { title: '本页目录', headingSelector: 'h2, h3' },
      // 关掉 Canvas 的源码展开：html 渲染器只能给出渲染后的 DOM 字符串，对读者没有价值，
      // 需要展示的代码由正文自己的代码块负责。
      canvas: { sourceState: 'none' },
      codePanel: false
    },
    options: {
      storySort: {
        order: ['快速启动', '核心系统', '纹理与模型', '动画与交互', '质量与交付', '进阶分支']
      }
    }
  }
};

export default preview;
