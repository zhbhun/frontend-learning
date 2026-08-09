import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createDashedLinesExample,
  createLinesExample,
  createTubeExample,
  type DashedInstance,
  type DashedSnapshot,
  type LinesInstance,
  type LinesSnapshot,
  type TubeInstance,
  type TubeSnapshot,
} from './example';

interface LinesArgs {
  pointCount: number;
}

interface DashedArgs {
  dashSize: number;
  gap: number;
}

interface TubeArgs {
  radius: number;
  tessellation: number;
}

const renderLines = canvasStory({
  create: createLinesExample,
  apply(instance: LinesInstance, args: LinesArgs) {
    instance.update(args);
  },
  readout(snapshot: LinesSnapshot) {
    return [
      ['类型', snapshot.kind],
      ['点数', snapshot.pointCount],
    ];
  },
});

const renderDashed = canvasStory({
  create: createDashedLinesExample,
  apply(instance: DashedInstance, args: DashedArgs) {
    instance.update(args);
  },
  readout(snapshot: DashedSnapshot) {
    return [
      ['类型', snapshot.kind],
      ['dashSize', snapshot.dashSize],
      ['gap', snapshot.gap],
    ];
  },
});

const renderTube = canvasStory({
  create: createTubeExample,
  apply(instance: TubeInstance, args: TubeArgs) {
    instance.update(args);
  },
  readout(snapshot: TubeSnapshot) {
    return [
      ['类型', snapshot.kind],
      ['radius', snapshot.radius],
      ['tessellation', snapshot.tessellation],
    ];
  },
});

export default {
  id: 'lines-and-tubes',
  title: '场景与对象/Lines',
  tags: ['!dev'],
};

export const Lines = {
  name: '实线 CreateLines',
  args: {
    pointCount: 80,
  },
  argTypes: {
    pointCount: {
      name: '点数',
      control: { type: 'range', min: 10, max: 200, step: 5 },
      description:
        '螺旋曲线的采样点数。点数越多，折线越贴合曲线；改点数会改变顶点数量，范例用销毁重建实现（instance 更新要求点数不变，见正文）。',
    },
  },
  render: renderLines,
  parameters: storySource(exampleSource),
};

export const Dashed = {
  name: '虚线 CreateDashedLines',
  args: {
    dashSize: 3,
    gap: 1,
  },
  argTypes: {
    dashSize: {
      name: 'dashSize',
      control: { type: 'range', min: 0.5, max: 8, step: 0.5 },
      description:
        '虚线段长（相对 dashNb 的比例值，默认 3）。与 gap 的比值决定虚实比。',
    },
    gap: {
      name: 'gap',
      control: { type: 'range', min: 0.5, max: 8, step: 0.5 },
      description:
        '虚线间隙长（相对 dashNb 的比例值，默认 1）。dashSize 与 gap 都改变时，总分段数仍由 dashNb（默认 200）决定。',
    },
  },
  render: renderDashed,
  parameters: storySource(exampleSource),
};

export const Tube = {
  name: '管道 CreateTube',
  args: {
    radius: 0.3,
    tessellation: 16,
  },
  argTypes: {
    radius: {
      name: 'radius',
      control: { type: 'range', min: 0.05, max: 1, step: 0.05 },
      description:
        '管道半径（世界单位，默认 1）。与 LinesMesh 的屏幕像素 width 不同，这里是真实 3D 尺寸，受透视缩放。',
    },
    tessellation: {
      name: 'tessellation',
      control: { type: 'range', min: 3, max: 48, step: 1 },
      description:
        '环周分段数（默认 64）。低值是棱柱（3 就是三棱柱），高值趋近圆形截面。',
    },
  },
  render: renderTube,
  parameters: storySource(exampleSource),
};
