import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCustomGeometryExample,
  type CustomGeometryInstance,
  type CustomGeometrySnapshot,
} from './example';

interface CustomGeometryArgs {
  amplitude: number;
  subdivisions: number;
  computeNormals: boolean;
}

const renderCustomGeometry = canvasStory({
  create: createCustomGeometryExample,
  apply(instance: CustomGeometryInstance, args: CustomGeometryArgs) {
    instance.update(args);
  },
  readout(snapshot: CustomGeometrySnapshot) {
    return [
      ['顶点数', snapshot.vertexCount],
      ['三角形数', snapshot.triangleCount],
      ['法线', snapshot.normalsStatus],
      ['FPS', snapshot.fps],
    ];
  },
});

export default {
  id: 'geometry-and-vertex-data',
  title: '场景与对象/几何与顶点',
  tags: ['!dev'],
};

// 导出名用 CustomGeometry，避免与本课讲的 VertexData 类名冲突。
export const CustomGeometry = {
  name: '自定义几何',
  args: {
    amplitude: 0.8,
    subdivisions: 12,
    computeNormals: true,
  },
  argTypes: {
    amplitude: {
      name: '波浪幅度',
      description:
        '缩放波浪 y 位移。每帧通过 mesh.updateVerticesData 重传 positions，体现 updatable buffer；不重建几何。',
      control: { type: 'range', min: 0, max: 1.5, step: 0.05 },
    },
    subdivisions: {
      name: '细分',
      description:
        '每条边的分段数。改变会重建 VertexData 并 applyToMesh：顶点数为 (sub+1)²，三角形数为 sub²×2。',
      control: { type: 'range', min: 1, max: 24, step: 1 },
    },
    computeNormals: {
      name: '计算法线',
      description:
        '是否用 VertexData.ComputeNormals 生成法线。关闭后顶点数据不含 normals，受光材质明显变暗、平面化——验证法线缺失这一常见坑。',
      control: 'boolean',
    },
  },
  render: renderCustomGeometry,
  parameters: storySource(exampleSource),
};
