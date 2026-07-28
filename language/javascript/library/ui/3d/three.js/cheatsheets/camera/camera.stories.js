import { sceneStory } from '../../assets/story-canvas.js';
import { createPlacementScene } from './src/scenes/placement-scene.js';
import { createFrustumScene } from './src/scenes/frustum-scene.js';
import { createPerspectiveScene } from './src/scenes/perspective-scene.js';
import { createOrthographicScene } from './src/scenes/orthographic-scene.js';
import { createUpdateProjectionScene } from './src/scenes/update-projection-scene.js';

export default {
  id: 'camera',
  title: '核心系统/空间与对象/相机',
  // 课程正文在 README.mdx，story 只作为正文里的可视化实例，不单独出现在侧边栏。
  tags: ['!dev']
};

// Default 列写的是 three.js 的 API 默认值，不是这个示例的初始值，
// 这样参数表同时能当默认值速查用。示例自己的调试旋钮归到“示例控制”里区分开。
const api = (defaultValue) => ({
  category: '相机参数',
  defaultValue: { summary: defaultValue }
});

const demo = { category: '示例控制' };

export const Placement = {
  name: '位置和朝向',
  render: sceneStory({
    create: createPlacementScene,
    apply(scene, { posX, posY, posZ, lookAtY, up }) {
      scene.setPosition(posX, posY, posZ);
      scene.setLookAtY(lookAtY);
      scene.setUp(up);
    },
    readout: (snapshot) => [
      ['position', snapshot.positionText],
      ['lookAt', snapshot.lookAtText],
      ['朝向', snapshot.directionText],
      ['up', snapshot.upText]
    ]
  }),
  args: {
    posX: 8,
    posY: 4.7,
    posZ: 8,
    lookAtY: 0.7,
    up: 'y'
  },
  argTypes: {
    posX: {
      description: 'camera.position.x。左右换站位，画面中心始终停在 lookAt 的目标上。',
      control: { type: 'range', min: -14, max: 14, step: 0.5 },
      table: api('0')
    },
    posY: {
      description: 'camera.position.y。抬高相机会得到俯视，压到 0 附近变成平视，负值则从地面下方往上看。',
      control: { type: 'range', min: -4, max: 16, step: 0.5 },
      table: api('0')
    },
    posZ: {
      description: 'camera.position.z。三个分量一起决定站位，朝向由 lookAt 单独负责。',
      control: { type: 'range', min: -14, max: 14, step: 0.5 },
      table: api('0')
    },
    lookAtY: {
      description:
        'lookAt 目标点的高度，红色小球标出的就是它。它永远落在画面正中，抬高它相当于把镜头往上抬。',
      control: { type: 'range', min: -2, max: 6, step: 0.1 },
      table: demo
    },
    up: {
      description:
        'camera.up，相机认为哪个方向是上。默认 (0,1,0)；切成 (0,0,1) 后画面会绕视线滚转，因为“上”的定义变了。',
      control: { type: 'inline-radio' },
      options: ['y', 'z'],
      table: api('(0, 1, 0)')
    }
  }
};

export const Frustum = {
  name: '视锥体',
  render: sceneStory({
    create: createFrustumScene,
    apply(scene, { type, fov, viewHeight, near, far }) {
      scene.setType(type);
      scene.setFov(fov);
      scene.setViewHeight(viewHeight);
      scene.setNear(near);
      scene.setFar(far);
    },
    captions: ['左：相机自己看到的画面', '右：从外部看这台相机的视锥体'],
    readout: (snapshot) => [
      ['视锥体形状', snapshot.type],
      ['深度范围', snapshot.depthRange]
    ]
  }),
  args: {
    type: 'perspective',
    fov: 45,
    viewHeight: 5.5,
    near: 4,
    far: 20
  },
  argTypes: {
    type: {
      description:
        '切换投影方式，右视图里的线框会跟着换形状：透视是从相机向外张开的截头四棱锥，正交是四面平行的长方体盒子。',
      control: { type: 'inline-radio' },
      options: ['perspective', 'orthographic'],
      table: demo
    },
    fov: {
      description: '只在透视模式下生效。加大它，右视图里的锥体张得更开，左视图看到的范围也更广。',
      control: { type: 'range', min: 15, max: 100, step: 1 },
      table: api('50')
    },
    viewHeight: {
      description: '只在正交模式下生效，决定长方体盒子的高度，宽度按视图宽高比推出来。',
      control: { type: 'range', min: 2, max: 14, step: 0.5 },
      table: demo
    },
    near: {
      description: '锥体被削掉的头。加大它，右视图里靠近相机那一端整块后移，左视图里近处物体随之消失。',
      control: { type: 'range', min: 0.5, max: 16, step: 0.5 },
      table: api('0.1')
    },
    far: {
      description: '锥体被削掉的尾。收小它，右视图里远端往回缩，左视图里远处物体一个个掉出画面。',
      control: { type: 'range', min: 6, max: 40, step: 1 },
      table: api('2000')
    }
  }
};

export const Perspective = {
  name: '透视相机',
  render: sceneStory({
    create: createPerspectiveScene,
    apply(scene, { fov, near, far, distance }) {
      scene.setFov(fov);
      scene.setNear(near);
      scene.setFar(far);
      scene.setDistance(distance);
    },
    readout: (snapshot) => [
      ['aspect', snapshot.aspect.toFixed(3)],
      ['相机位置', snapshot.positionText]
    ]
  }),
  args: {
    fov: 55,
    near: 0.1,
    far: 40,
    distance: 12
  },
  argTypes: {
    fov: {
      description:
        '垂直视野角，单位是度。越大越广角，画面边缘透视感越强。模型查看器常用 45–55，超过 90 会明显畸变。',
      control: { type: 'range', min: 10, max: 120, step: 1 },
      table: api('50')
    },
    near: {
      description:
        '近裁剪面的深度，必须大于 0。调大到超过最近的物体时，那个物体会被整块切掉。',
      control: { type: 'range', min: 0.1, max: 18, step: 0.1 },
      table: api('0.1')
    },
    far: {
      description:
        '远裁剪面的深度，必须大于 near。调小到小于最远物体的深度时，那个物体会消失。',
      control: { type: 'range', min: 2, max: 60, step: 1 },
      table: api('2000')
    },
    distance: {
      description:
        '相机到目标点的距离，改的是 camera.position，不是投影参数。透视下拉远物体会变小。',
      control: { type: 'range', min: 3, max: 24, step: 0.5 },
      table: demo
    }
  }
};

export const Orthographic = {
  name: '正交相机',
  render: sceneStory({
    create: createOrthographicScene,
    apply(scene, { viewHeight, zoom, distance }) {
      scene.setViewHeight(viewHeight);
      scene.setZoom(zoom);
      scene.setDistance(distance);
    },
    readout: (snapshot) => [
      ['可见范围', snapshot.boxText],
      ['相机位置', snapshot.positionText]
    ]
  }),
  args: {
    viewHeight: 5.5,
    zoom: 1,
    distance: 12
  },
  argTypes: {
    zoom: {
      description:
        '在观察盒之外再缩放一次。越大可见范围越小、物体越大，等价于把观察盒按比例收窄。',
      control: { type: 'range', min: 0.4, max: 3, step: 0.1 },
      table: api('1')
    },
    viewHeight: {
      description:
        '观察盒的高度，示例用它推导 top / bottom，再乘画布宽高比推出 left / right。正交相机没有 aspect，比例得自己维持，否则画面会变形。',
      control: { type: 'range', min: 2, max: 14, step: 0.5 },
      table: demo
    },
    distance: {
      description:
        '相机到目标点的距离。拖动它可以验证正交投影的关键性质：物体远近不改变屏幕上的大小，只影响会不会被 near / far 裁掉。',
      control: { type: 'range', min: 5, max: 24, step: 0.5 },
      table: demo
    }
  }
};

export const UpdateProjection = {
  name: '更新投影',
  render: sceneStory({
    create: createUpdateProjectionScene,
    apply(scene, { fov, autoUpdate }) {
      scene.setAutoUpdate(autoUpdate);
      scene.setFov(fov);
    },
    readout: (snapshot) => [
      ['camera.fov', snapshot.fov],
      ['实际生效的 fov', snapshot.appliedFov],
      ['状态', snapshot.stale ? '矩阵已过期' : '一致']
    ]
  }),
  args: {
    fov: 55,
    autoUpdate: true
  },
  argTypes: {
    autoUpdate: {
      description:
        '改完 fov 后是否调用 updateProjectionMatrix()。关掉它再拖 fov，读数里两个值会分叉，画面则一动不动。',
      control: 'boolean',
      table: demo
    },
    fov: {
      description: '垂直视野角。它只是相机对象上的一个字段，渲染用的是矩阵，不是这个字段。',
      control: { type: 'range', min: 20, max: 100, step: 1 },
      table: api('50')
    }
  }
};
