import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createMirrorReflection,
  createTrailFollow,
  createMultiMaterialSegments,
  type MirrorReflectionInstance,
  type MirrorReflectionSnapshot,
  type TrailFollowInstance,
  type TrailFollowSnapshot,
  type MultiMaterialSegmentsInstance,
  type MultiMaterialSegmentsSnapshot,
} from './example';

interface MirrorReflectionArgs {
  reflectionLevel: number;
  orbitSpeed: number;
  reflectBoxes: boolean;
}

interface TrailFollowArgs {
  trailRunning: boolean;
  orbitSpeed: number;
  diameter: number;
}

interface MultiMaterialSegmentsArgs {
  useMultiMaterial: boolean;
}

const renderMirrorReflection = canvasStory({
  create: createMirrorReflection,
  apply(instance: MirrorReflectionInstance, args: MirrorReflectionArgs) {
    instance.update(args);
  },
  readout(snapshot: MirrorReflectionSnapshot) {
    return [
      ['镜面平面', snapshot.mirrorPlane],
      ['renderList 数量', snapshot.renderListCount],
      ['反射强度 level', snapshot.reflectionLevel],
    ];
  },
});

const renderTrailFollow = canvasStory({
  create: createTrailFollow,
  apply(instance: TrailFollowInstance, args: TrailFollowArgs) {
    instance.update(args);
  },
  readout(snapshot: TrailFollowSnapshot) {
    return [
      ['拖尾状态', snapshot.status],
      ['diameter（粗细）', snapshot.diameter],
      ['length（长度）', snapshot.length],
    ];
  },
});

const renderMultiMaterialSegments = canvasStory({
  create: createMultiMaterialSegments,
  apply(
    instance: MultiMaterialSegmentsInstance,
    args: MultiMaterialSegmentsArgs,
  ) {
    instance.update(args);
  },
  readout(snapshot: MultiMaterialSegmentsSnapshot) {
    return [
      ['材质模式', snapshot.materialMode],
      ['subMaterials 数量', snapshot.subMaterialsCount],
      ['subMeshes 数量', snapshot.subMeshesCount],
    ];
  },
});

export default {
  id: 'special-mesh-types',
  title: '场景与对象/特殊对象',
  tags: ['!dev'],
};

export const MirrorReflection = {
  name: 'MirrorTexture 镜面反射',
  args: {
    reflectionLevel: 1,
    orbitSpeed: 0.5,
    reflectBoxes: true,
  },
  argTypes: {
    reflectionLevel: {
      name: '反射强度（level）',
      control: { type: 'range', min: 0, max: 1.5, step: 0.1 },
      description:
        '写入 MirrorTexture.level（继承自 Texture，默认 1）。0 为完全底色，>1 增亮反射。',
    },
    orbitSpeed: {
      name: '环绕方块公转速度',
      control: { type: 'range', min: 0, max: 2, step: 0.1 },
      description: '方块绕镜面中心公转；反射内容随之实时更新。',
    },
    reflectBoxes: {
      name: '把方块纳入 renderList',
      control: 'boolean',
      description:
        '关闭后 renderList 清空，镜面只显底色，但主场景的方块照常动——证明反射只画 renderList 里的网格。',
    },
  },
  render: renderMirrorReflection,
  parameters: storySource(exampleSource),
};

export const TrailFollow = {
  name: 'TrailMesh 拖尾',
  args: {
    trailRunning: true,
    orbitSpeed: 1,
    diameter: 0.6,
  },
  argTypes: {
    trailRunning: {
      name: '拖尾运行（start/stop）',
      control: 'boolean',
      description:
        'start() 记录新拖尾段；stop() 停止记录，已有段随 length 自然消失，不是立刻清空。',
    },
    orbitSpeed: {
      name: '源网格公转速度',
      control: { type: 'range', min: 0, max: 2, step: 0.1 },
      description: '源网格绕原点公转；源不动时拖尾停在原地。',
    },
    diameter: {
      name: '拖尾粗细（diameter，重建）',
      control: { type: 'range', min: 0.2, max: 1.2, step: 0.1 },
      description:
        'diameter 是构造参数，运行时不可改；改变时范例会 dispose 旧拖尾并按新值重建。',
    },
  },
  render: renderTrailFollow,
  parameters: storySource(exampleSource),
};

export const MultiMaterialSegments = {
  name: 'MultiMaterial 多材质分段',
  args: {
    useMultiMaterial: true,
  },
  argTypes: {
    useMultiMaterial: {
      name: '使用 MultiMaterial（否则单材质）',
      control: 'boolean',
      description:
        '打开：MultiMaterial + 3 段 SubMesh，球体呈三色横带；关闭：切回单材质，球体整体一色。',
    },
  },
  render: renderMultiMaterialSegments,
  parameters: storySource(exampleSource),
};
