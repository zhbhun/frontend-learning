import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import { createCameraControlScene } from './src/scenes/controller-scene.js';
import { createOrbitControlsScene } from './src/scenes/orbit-controls-scene.js';
import controllerSceneSource from './src/scenes/controller-scene.js?raw';
import orbitControlsSource from './src/scenes/orbit-controls-scene.js?raw';

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
  parameters: sceneSource(orbitControlsSource),
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

const controllerReadout = (snapshot) => [
  ['控制器', snapshot.controller],
  ['更新方式', snapshot.updateMode],
  ['焦点 / 位置', snapshot.focus],
  ['距离 / 位置读数', snapshot.value],
  ['指针状态', snapshot.lockState]
];

function controllerStory({ type, name, args, argTypes }) {
  return {
    name,
    render: sceneStory({
      create: (canvas, onSnapshot) =>
        createCameraControlScene(canvas, onSnapshot, type),
      apply(scene, nextArgs) {
        scene.apply(nextArgs);
      },
      readout: controllerReadout
    }),
    args,
    parameters: sceneSource(controllerSceneSource),
    argTypes
  };
}

export const Map = controllerStory({
  type: 'map',
  name: 'MapControls',
  args: {
    enableDamping: true,
    maxPolarAngle: Math.PI / 2.2
  },
  argTypes: {
    enableDamping: {
      description: '开启地图相机的阻尼，需要每帧调用 controls.update()。',
      control: 'boolean',
      table: api('false')
    },
    maxPolarAngle: {
      description: '限制相机向地面方向的最大俯视角。',
      control: { type: 'range', min: 0.8, max: Math.PI, step: 0.05 },
      table: api('Math.PI')
    }
  }
});

export const Trackball = controllerStory({
  type: 'trackball',
  name: 'TrackballControls',
  args: {
    staticMoving: false,
    dynamicDampingFactor: 0.2
  },
  argTypes: {
    staticMoving: {
      description: '开启后松手立即停止；关闭后使用 dynamicDampingFactor 产生惯性。',
      control: 'boolean',
      table: api('false')
    },
    dynamicDampingFactor: {
      description: '非静态移动时的阻尼强度，数值越大越快跟随输入。',
      control: { type: 'range', min: 0.05, max: 0.8, step: 0.05 },
      table: api('0.2')
    }
  }
});

export const Fly = controllerStory({
  type: 'fly',
  name: 'FlyControls',
  args: {
    movementSpeed: 5,
    rollSpeed: Math.PI / 12,
    dragToLook: true
  },
  argTypes: {
    movementSpeed: {
      description: '相机在三维空间中的移动速度，按秒推进。',
      control: { type: 'range', min: 0, max: 20, step: 0.5 },
      table: api('1')
    },
    rollSpeed: {
      description: '相机滚转速度，按秒推进。',
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      table: api('0.005')
    },
    dragToLook: {
      description: '开启后需要拖拽鼠标才会环顾。',
      control: 'boolean',
      table: api('false')
    }
  }
});

export const FirstPerson = controllerStory({
  type: 'firstPerson',
  name: 'FirstPersonControls',
  args: {
    movementSpeed: 3,
    lookSpeed: 0.05,
    lookVertical: true
  },
  argTypes: {
    movementSpeed: {
      description: '第一人称移动速度，按秒推进。',
      control: { type: 'range', min: 0, max: 12, step: 0.5 },
      table: api('1')
    },
    lookSpeed: {
      description: '鼠标环顾速度。',
      control: { type: 'range', min: 0, max: 0.2, step: 0.005 },
      table: api('0.005')
    },
    lookVertical: {
      description: '是否允许垂直环顾。',
      control: 'boolean',
      table: api('true')
    }
  }
});

export const PointerLock = controllerStory({
  type: 'pointerLock',
  name: 'PointerLockControls',
  args: {
    pointerSpeed: 1
  },
  argTypes: {
    pointerSpeed: {
      description: '鼠标移动对相机旋转的倍率；点击画布进入指针锁定。',
      control: { type: 'range', min: 0.1, max: 3, step: 0.1 },
      table: api('1')
    }
  }
});
