import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCameraExample,
  createBehaviorExample,
  type CameraExampleInstance,
  type CameraExampleSnapshot,
  type BehaviorExampleInstance,
  type BehaviorExampleSnapshot,
} from './example';

interface CameraArgs {
  cameraType: 'arcRotate' | 'free';
  projectionMode: 'perspective' | 'orthographic';
}

interface BehaviorArgs {
  enableAutoRotation: boolean;
}

const renderCamera = canvasStory({
  create: createCameraExample,
  apply(instance: CameraExampleInstance, args: CameraArgs) {
    instance.update(args);
  },
  readout(snapshot: CameraExampleSnapshot) {
    const rows: Array<[string, string | number]> = [
      ['相机', snapshot.cameraType],
      ['投影', snapshot.mode],
      ['FOV', `${snapshot.fovDeg}°`],
    ];
    // readout 长度可变：ArcRotate 显示 alpha/beta/radius，Universal 显示位置。
    if (snapshot.cameraType === 'ArcRotateCamera') {
      rows.push(['alpha', `${snapshot.alphaDeg}°`]);
      rows.push(['beta', `${snapshot.betaDeg}°`]);
      rows.push(['radius', snapshot.radius]);
    } else {
      rows.push(['位置', snapshot.freePos]);
    }
    return rows;
  },
});

const renderBehavior = canvasStory({
  create: createBehaviorExample,
  apply(instance: BehaviorExampleInstance, args: BehaviorArgs) {
    instance.update(args);
  },
  readout(snapshot: BehaviorExampleSnapshot) {
    return [
      ['行为', snapshot.attached],
      ['alpha', `${snapshot.alphaDeg}°`],
      ['闲置转速', snapshot.idleSpeed],
      ['等待时间', `${snapshot.waitTime} ms`],
      ['正在自转', snapshot.rotating ? '是' : '否'],
    ];
  },
});

export default {
  id: 'cameras-and-controls',
  title: '场景与对象/相机与控制',
  tags: ['!dev'],
};

export const Cameras = {
  name: '相机与投影',
  args: {
    cameraType: 'arcRotate',
    projectionMode: 'perspective',
  },
  argTypes: {
    cameraType: {
      name: '相机类型',
      control: { type: 'radio', options: ['arcRotate', 'free'] },
      description:
        '切换 scene.activeCamera。arcRotate=ArcRotateCamera（绕 target 的 alpha/beta/radius，鼠标拖拽旋转、滚轮缩放、右键/Ctrl+左键平移）；free=UniversalCamera（第一人称，WASD 移动、鼠标转视角）。切换时范例会先 detachControl 旧相机再 attachControl 新相机。',
    },
    projectionMode: {
      name: '投影模式',
      control: { type: 'radio', options: ['perspective', 'orthographic'] },
      description:
        '写入 camera.mode（Camera.PERSPECTIVE_CAMERA / Camera.ORTHOGRAPHIC_CAMERA）。正交模式下范例按 aspect 手动设置 orthoLeft/Right/Top/Bottom（默认 null 等价于 1 像素 = 1 单位，不适合正常场景）。',
    },
  },
  render: renderCamera,
  parameters: storySource(exampleSource),
};

export const Behaviors = {
  name: '闲置自转行为',
  args: {
    enableAutoRotation: true,
  },
  argTypes: {
    enableAutoRotation: {
      name: 'AutoRotationBehavior',
      control: 'boolean',
      description:
        '写入 camera.useAutoRotationBehavior。开启后，闲置 idleRotationWaitTime（默认 2000 ms）无指针/滚轮输入，相机以 idleRotationSpeed（默认 0.05）缓慢绕 target 自转；任何输入都会重置等待计时。',
    },
  },
  render: renderBehavior,
  parameters: storySource(exampleSource),
};
