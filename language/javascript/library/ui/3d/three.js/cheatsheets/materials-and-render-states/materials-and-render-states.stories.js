import meshBasicSource from './mesh-basic-material.js?raw';
import meshLambertSource from './mesh-lambert-material.js?raw';
import meshPhongSource from './mesh-phong-material.js?raw';
import meshStandardSource from './mesh-standard-material.js?raw';
import meshToonSource from './mesh-toon-material.js?raw';
import meshMatcapSource from './mesh-matcap-material.js?raw';
import transparencyDepthSource from './transparency-depth.js?raw';
import wireframeSource from './wireframe-material.js?raw';
import materialSideSource from './material-side.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { meshBasicMaterialExample } from './mesh-basic-material.js';
import { meshLambertMaterialExample } from './mesh-lambert-material.js';
import { meshPhongMaterialExample } from './mesh-phong-material.js';
import { meshStandardMaterialExample } from './mesh-standard-material.js';
import { meshToonMaterialExample } from './mesh-toon-material.js';
import { meshMatcapMaterialExample } from './mesh-matcap-material.js';
import { transparencyDepthExample } from './transparency-depth.js';
import { wireframeMaterialExample } from './wireframe-material.js';
import { materialSideExample } from './material-side.js';

export default {
  id: 'materials-and-render-states',
  title: '核心系统/形状与表面/材质',
  tags: ['!dev']
};

export const MeshBasic = {
  name: 'MeshBasicMaterial 不受光',
  args: {
    intensity: 2.5
  },
  argTypes: {
    intensity: {
      name: 'DirectionalLight.intensity',
      control: { type: 'range', min: 0, max: 6, step: 0.1 },
      description: '调光强度：左侧 Basic 不变，右侧 Standard 会变亮或变暗。'
    }
  },
  render: sceneStory(meshBasicMaterialExample),
  parameters: sceneSource(meshBasicSource)
};

export const MeshLambert = {
  name: 'MeshLambertMaterial 漫反射',
  args: {
    intensity: 2.8
  },
  argTypes: {
    intensity: {
      name: 'DirectionalLight.intensity',
      control: { type: 'range', min: 0, max: 6, step: 0.1 },
      description: 'Lambert 只做漫反射，没有镜面高光。'
    }
  },
  render: sceneStory(meshLambertMaterialExample),
  parameters: sceneSource(meshLambertSource)
};

export const MeshPhong = {
  name: 'MeshPhongMaterial 高光',
  args: {
    shininess: 40,
    specular: 1
  },
  argTypes: {
    shininess: {
      name: 'shininess',
      control: { type: 'range', min: 1, max: 150, step: 1 },
      description: '高光锐度：值越高，高光越小越锐。'
    },
    specular: {
      name: 'specular 亮度',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '镜面反射颜色的灰度强度；调暗后高光减弱。'
    }
  },
  render: sceneStory(meshPhongMaterialExample),
  parameters: sceneSource(meshPhongSource)
};

export const MeshStandard = {
  name: 'MeshStandardMaterial 入口',
  args: {
    color: '#3d73d9',
    roughness: 0.4,
    metalness: 0.1
  },
  argTypes: {
    color: {
      name: 'color',
      control: 'color'
    },
    roughness: {
      name: 'roughness',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '0 = 更镜面，1 = 更哑光。'
    },
    metalness: {
      name: 'metalness',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
      description: '本课无环境贴图；高金属度偏暗时见 PBR 课。'
    }
  },
  render: sceneStory(meshStandardMaterialExample),
  parameters: sceneSource(meshStandardSource)
};

export const MeshToon = {
  name: 'MeshToonMaterial 分档',
  args: {
    steps: 3
  },
  argTypes: {
    steps: {
      name: 'gradientMap 分档',
      control: { type: 'range', min: 2, max: 8, step: 1 },
      description: '分档越少，卡通块面越硬。'
    }
  },
  render: sceneStory(meshToonMaterialExample),
  parameters: sceneSource(meshToonSource)
};

export const MeshMatcap = {
  name: 'MeshMatcapMaterial',
  args: {
    preset: 'steel'
  },
  argTypes: {
    preset: {
      name: 'matcap 预设',
      control: 'inline-radio',
      options: ['steel', 'clay', 'jade'],
      labels: {
        steel: '冷钢',
        clay: '暖陶',
        jade: '翠玉'
      },
      description: '场景无 Direct Light，明暗来自 MatCap 贴图。'
    }
  },
  render: sceneStory(meshMatcapMaterialExample),
  parameters: sceneSource(meshMatcapSource)
};

export const TransparencyDepth = {
  name: '透明与深度',
  args: {
    transparent: true,
    opacity: 0.45,
    depthWrite: true
  },
  argTypes: {
    transparent: {
      name: 'transparent',
      control: 'boolean'
    },
    opacity: {
      name: 'opacity',
      control: { type: 'range', min: 0, max: 1, step: 0.05 }
    },
    depthWrite: {
      name: 'depthWrite',
      control: 'boolean',
      description: '半透明仍写深度时，后方物体容易被挖空或排序怪异。'
    }
  },
  render: sceneStory(transparencyDepthExample),
  parameters: sceneSource(transparencyDepthSource)
};

export const Wireframe = {
  name: '线框',
  args: {
    wireframe: true
  },
  argTypes: {
    wireframe: {
      name: 'wireframe',
      control: 'boolean',
      description: '同一 Mesh 的线框模式，不是 Line 对象。'
    }
  },
  render: sceneStory(wireframeMaterialExample),
  parameters: sceneSource(wireframeSource)
};

export const MaterialSide = {
  name: '朝向 side',
  args: {
    side: 'front',
    rotationY: 35
  },
  argTypes: {
    side: {
      name: 'side',
      control: 'inline-radio',
      options: ['front', 'back', 'double'],
      labels: {
        front: 'FrontSide',
        back: 'BackSide',
        double: 'DoubleSide'
      }
    },
    rotationY: {
      name: 'rotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 5 },
      description: '转到背面时，FrontSide 会消失；DoubleSide 仍可见。'
    }
  },
  render: sceneStory(materialSideExample),
  parameters: sceneSource(materialSideSource)
};
