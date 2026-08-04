import hierarchySource from './hierarchy.js?raw';
import localTransformSource from './local-transform.js?raw';
import rotationOrderSource from './rotation-order.js?raw';
import worldMatrixSource from './world-matrix.js?raw';
import reparentSource from './reparent.js?raw';
import lookAtSource from './look-at.js?raw';
import sharedPropertiesSource from './shared-properties.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { hierarchyExample } from './hierarchy.js';
import { localTransformExample } from './local-transform.js';
import { rotationOrderExample } from './rotation-order.js';
import { worldMatrixExample } from './world-matrix.js';
import { reparentExample } from './reparent.js';
import { lookAtExample } from './look-at.js';
import { sharedPropertiesExample } from './shared-properties.js';

export default {
  id: 'object3d-transform-hierarchy',
  title: '核心系统/空间与对象/Object3D',
  tags: ['!dev']
};

export const Hierarchy = {
  name: '父子层级',
  args: {
    mounted: true,
    nestUnderPivot: false
  },
  argTypes: {
    mounted: {
      name: 'parent.add(child)',
      control: 'boolean',
      description: '关闭后 child 脱离场景树，parent 变为 null。'
    },
    nestUnderPivot: {
      name: '经 pivot 嵌套',
      control: 'boolean',
      description: '打开后层级变为 parent → pivot → child。'
    }
  },
  render: sceneStory(hierarchyExample),
  parameters: sceneSource(hierarchySource)
};

export const LocalTransform = {
  name: '局部变换',
  args: {
    parentPositionX: 0,
    parentRotationY: 0,
    parentScale: 1
  },
  argTypes: {
    parentPositionX: {
      name: 'parent.position.x',
      control: { type: 'range', min: -2, max: 2, step: 0.1 }
    },
    parentRotationY: {
      name: 'parent.rotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 5 }
    },
    parentScale: {
      name: 'parent.scale',
      control: { type: 'range', min: 0.5, max: 1.8, step: 0.1 },
      description: '均匀缩放。非均匀缩放会影响后代方向与位置解读。'
    }
  },
  render: sceneStory(localTransformExample),
  parameters: sceneSource(localTransformSource)
};

export const RotationOrder = {
  name: '旋转顺序',
  args: {
    rotationOrder: 'XYZ',
    rotationX: 0,
    rotationY: 35,
    rotationZ: 0
  },
  argTypes: {
    rotationOrder: {
      name: 'rotation.order',
      control: 'inline-radio',
      options: ['XYZ', 'YXZ', 'ZXY', 'ZYX']
    },
    rotationX: {
      name: 'rotation.x（度）',
      control: { type: 'range', min: -180, max: 180, step: 5 },
      description: 'XYZ 下接近 ±90° 时，容易观察到 Y/Z 耦合。'
    },
    rotationY: {
      name: 'rotation.y（度）',
      control: { type: 'range', min: -180, max: 180, step: 5 }
    },
    rotationZ: {
      name: 'rotation.z（度）',
      control: { type: 'range', min: -180, max: 180, step: 5 }
    }
  },
  render: sceneStory(rotationOrderExample),
  parameters: sceneSource(rotationOrderSource)
};

export const WorldMatrix = {
  name: '世界矩阵',
  args: {
    positionX: 2,
    autoUpdate: true,
    applyMatrix: false
  },
  argTypes: {
    positionX: {
      name: 'child.position.x',
      control: { type: 'range', min: 0.5, max: 3.5, step: 0.1 },
      description: '写入 position 属性的意图值；橙色半透明盒始终跟随意图。'
    },
    autoUpdate: {
      name: 'matrixAutoUpdate',
      control: 'boolean',
      description: '关闭后改 position 不会自动重算 matrix / matrixWorld。'
    },
    applyMatrix: {
      name: '手动 updateMatrix',
      control: 'boolean',
      description: '仅在 matrixAutoUpdate=false 时生效：调用 updateMatrix + updateWorldMatrix。'
    }
  },
  render: sceneStory(worldMatrixExample),
  parameters: sceneSource(worldMatrixSource)
};

export const Reparent = {
  name: '换父级',
  args: {
    method: 'add',
    reparent: false
  },
  argTypes: {
    method: {
      name: '换父级方法',
      control: 'inline-radio',
      options: ['add', 'attach'],
      description: 'add 保留局部 TRS；attach 尽量保持世界变换。'
    },
    reparent: {
      name: '换到 right',
      control: 'boolean',
      description: '关闭时 child 在 left；打开后按所选方法挂到 right。'
    }
  },
  render: sceneStory(reparentExample),
  parameters: sceneSource(reparentSource)
};

export const LookAt = {
  name: '朝向',
  args: {
    targetX: 2.2,
    targetZ: 0,
    upMode: '+Y'
  },
  argTypes: {
    targetX: {
      name: 'target.position.x',
      control: { type: 'range', min: -2.5, max: 3, step: 0.1 }
    },
    targetZ: {
      name: 'target.position.z',
      control: { type: 'range', min: -2.5, max: 2.5, step: 0.1 }
    },
    upMode: {
      name: 'object.up',
      control: 'inline-radio',
      options: ['+Y', '+Z'],
      description: 'lookAt 时的上方向；切换后物体绕视线扭转会变。'
    }
  },
  render: sceneStory(lookAtExample),
  parameters: sceneSource(lookAtSource)
};

export const SharedProperties = {
  name: '共享属性',
  args: {
    objectName: 'subject',
    tag: 'demo',
    visible: true,
    useLayer1: false,
    cameraSeesLayer1: false,
    renderOrderA: 0,
    renderOrderB: 0,
    castShadow: false,
    receiveShadow: false
  },
  argTypes: {
    objectName: {
      name: 'name',
      control: 'text'
    },
    tag: {
      name: 'userData.tag',
      control: 'text'
    },
    visible: {
      name: 'visible',
      control: 'boolean'
    },
    useLayer1: {
      name: 'subject.layers.set(1)',
      control: 'boolean',
      description: '打开后立方体只在 layer 1；需相机也启用 layer 1 才看得见。'
    },
    cameraSeesLayer1: {
      name: 'camera.layers.enable(1)',
      control: 'boolean',
      description: '仅在 subject 使用 layer 1 时有意义。'
    },
    renderOrderA: {
      name: 'panelA.renderOrder',
      control: { type: 'range', min: 0, max: 5, step: 1 }
    },
    renderOrderB: {
      name: 'panelB.renderOrder',
      control: { type: 'range', min: 0, max: 5, step: 1 }
    },
    castShadow: {
      name: 'castShadow',
      control: 'boolean',
      description: '对象侧开关；完整出影还需灯光与 renderer.shadowMap。'
    },
    receiveShadow: {
      name: 'receiveShadow',
      control: 'boolean',
      description: '对象侧开关；完整出影见明暗与阴影课。'
    }
  },
  render: sceneStory(sharedPropertiesExample),
  parameters: sceneSource(sharedPropertiesSource)
};
