import { sceneStory } from '../../assets/story-canvas.js';
import { createOrbitControlsScene } from './src/scenes/orbit-controls-scene.js';

export default {
  id: 'camera-controls',
  title: '核心系统/空间与对象/相机控制器',
  // 课程正文在 README.mdx，story 只作为正文里的可视化实例，不单独出现在侧边栏。
  tags: ['!dev']
};

const api = (defaultValue) => ({
  category: '控制器参数',
  defaultValue: { summary: defaultValue }
});

const demo = { category: '示例控制' };

export const Orbit = {
  name: 'OrbitControls',
  render: sceneStory({
    create: createOrbitControlsScene,
    apply(scene, { enableDamping, autoRotate, enablePan, minDistance, maxDistance, targetY }) {
      scene.setDamping(enableDamping);
      scene.setAutoRotate(autoRotate);
      scene.setPan(enablePan);
      scene.setMinDistance(minDistance);
      scene.setMaxDistance(maxDistance);
      scene.setTargetY(targetY);
    },
    readout: (snapshot) => [
      ['target', snapshot.targetText],
      ['到 target 距离', snapshot.distance.toFixed(2)]
    ]
  }),
  args: {
    enableDamping: true,
    autoRotate: false,
    enablePan: true,
    minDistance: 3,
    maxDistance: 16,
    targetY: 0.7
  },
  argTypes: {
    enableDamping: {
      description: '惯性阻尼。开启后松开鼠标画面会继续滑一段再停，需要每帧调用 controls.update()。',
      control: 'boolean',
      table: api('false')
    },
    autoRotate: {
      description: '自动绕 target 旋转，同样依赖每帧的 controls.update()。',
      control: 'boolean',
      table: api('false')
    },
    enablePan: {
      description: '是否允许右键或双指平移 target。关掉之后 target 固定，更像一个模型查看器。',
      control: 'boolean',
      table: api('true')
    },
    minDistance: {
      description: '滚轮缩放能靠近到的最小距离，夹住的是相机到 target 的距离。',
      control: { type: 'range', min: 1, max: 10, step: 0.5 },
      table: api('0')
    },
    maxDistance: {
      description: '滚轮缩放能拉远到的最大距离。拖动后滚一下滚轮，读数里的距离会被夹在区间内。',
      control: { type: 'range', min: 4, max: 30, step: 0.5 },
      table: api('Infinity')
    },
    targetY: {
      description:
        '观察中心 controls.target 的高度。红色小球就是 target，环绕、缩放和平移都以它为中心。',
      control: { type: 'range', min: 0, max: 3, step: 0.1 },
      table: api('0')
    }
  }
};
