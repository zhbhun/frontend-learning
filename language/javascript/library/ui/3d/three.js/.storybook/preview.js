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
    },
    options: {
      storySort: {
        order: [
          '快速启动',
          ['安装', '第一幅画面', '*'],
          '核心系统',
          [
            '坐标与尺寸',
            '空间与对象',
            [
              'Object3D',
              'Scene',
              '相机',
              '相机控制器',
              'Mesh',
              'Group',
              'Helper',
              'Line',
              'Points',
              'Sprite',
              'Light',
              'InstancedMesh',
              'LOD',
              'SkinnedMesh',
              '特殊对象',
              '*'
            ],
            '时间与动画',
            ['循环与时间', '动画', '*'],
            '交互与事件',
            ['事件', '拾取', 'TransformControls', '*'],
            '形状与表面',
            ['几何', '材质', '明暗与阴影', '*'],
            '*'
          ],
          '纹理与模型',
          ['纹理', '模型', '查看器', '资产', '*'],
          '质量与交付',
          [
            '视觉质量',
            ['PBR', '后处理', '*'],
            '交付质量',
            ['调试', '性能', '页面', '*'],
            '*'
          ],
          '进阶分支',
          [
            '渲染技术',
            ['Shader', 'WebGPU', '粒子', 'Splatting', '*'],
            '应用生态',
            ['框架', 'WebXR', '物理', '*'],
            '*'
          ]
        ]
      }
    }
  }
};

export default preview;
