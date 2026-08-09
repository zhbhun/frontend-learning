import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createMaterialPlayground,
  type MaterialPlaygroundInstance,
  type MaterialPlaygroundSnapshot,
} from './example';

interface MaterialPlaygroundArgs {
  diffusePreset: string;
  alpha: number;
  specularPower: number;
  wireframe: boolean;
  backFaceCulling: boolean;
}

const renderMaterials = canvasStory({
  create: createMaterialPlayground,
  apply(instance: MaterialPlaygroundInstance, args: MaterialPlaygroundArgs) {
    instance.update(args);
  },
  readout(snapshot: MaterialPlaygroundSnapshot) {
    return [
      ['漫反射色', `${snapshot.diffusePreset} ${snapshot.diffuseColor}`],
      ['alpha', snapshot.alpha.toFixed(2)],
      ['alphaMode', snapshot.alphaMode],
      ['specularPower', snapshot.specularPower.toFixed(0)],
      ['wireframe', snapshot.wireframe ? '开' : '关'],
      ['backFaceCulling', snapshot.backFaceCulling ? '开（默认）' : '关'],
      ['fillMode', snapshot.fillMode],
    ];
  },
});

export default {
  id: 'materials',
  title: '材质与光照/材质',
  tags: ['!dev'],
};

export const Materials = {
  name: '材质属性',
  args: {
    diffusePreset: 'orange',
    alpha: 1,
    specularPower: 64,
    wireframe: false,
    backFaceCulling: true,
  },
  argTypes: {
    diffusePreset: {
      name: '漫反射色预设',
      control: { type: 'select' },
      options: ['orange', 'teal', 'gold', 'lavender', 'white'],
      description:
        '写入 material.diffuseColor（默认白）。五种预设映射到不同 Color3，readout 显示真实 RGB。颜色受光——光源强度/色改变，表面明暗会跟着变（详见光源课）。',
    },
    alpha: {
      name: '透明度 alpha',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description:
        '写入 material.alpha（默认 1 不透明）。配合默认 alphaMode = ALPHA_COMBINE；< 1 时球与盒子变半透明，透过它们能看到地面。',
    },
    specularPower: {
      name: '高光锐利度 specularPower',
      control: { type: 'range', min: 4, max: 256, step: 4 },
      description:
        '写入 material.specularPower（默认 64）。数值越小高光越宽越散，越大越锐越集中；高光颜色由 specularColor（默认白）决定。',
    },
    wireframe: {
      name: '线框 wireframe',
      control: 'boolean',
      description:
        '写入 material.wireframe（默认关）。本质是把 fillMode 在 Triangle/WireFrame 间切；开启后看到三角形网格。',
    },
    backFaceCulling: {
      name: '背面剔除 backFaceCulling',
      control: 'boolean',
      description:
        '写入 material.backFaceCulling（默认开）。关掉后用鼠标绕到球/盒子背面或拉近内部，能看到内壁——证明背面不再被剔除。',
    },
  },
  render: renderMaterials,
  parameters: storySource(exampleSource),
};
