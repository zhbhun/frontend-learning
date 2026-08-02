import './camera-controls.css';

import { sceneSource } from '../../assets/story-source.js';

import { createArcballControlsExample } from './arcball-controls.js';
import arcballSource from './arcball-controls.js?raw';
import { createControlsLifecycleExample } from './controls-lifecycle.js';
import lifecycleSource from './controls-lifecycle.js?raw';
import controllerStageSource from './controller-stage.js?raw';
import { createFirstPersonControlsExample } from './first-person-controls.js';
import firstPersonSource from './first-person-controls.js?raw';
import { createFlyControlsExample } from './fly-controls.js';
import flySource from './fly-controls.js?raw';
import { createMapControlsExample } from './map-controls.js';
import mapSource from './map-controls.js?raw';
import { createOrbitControlsExample } from './orbit-controls.js';
import orbitSource from './orbit-controls.js?raw';
import { createPointerLockControlsExample } from './pointer-lock-controls.js';
import pointerLockSource from './pointer-lock-controls.js?raw';
import { createTrackballControlsExample } from './trackball-controls.js';
import trackballSource from './trackball-controls.js?raw';

export default {
  id: 'camera-controls',
  title: '核心系统/空间与对象/相机控制器',
  tags: ['!dev']
};

export const Orbit = {
  name: 'OrbitControls',
  args: {
    enableDamping: true,
    dampingFactor: 0.08,
    autoRotate: false,
    zoomToCursor: false,
    runUpdate: true
  },
  argTypes: {
    enableDamping: booleanControl('enableDamping', '启用旋转和平移阻尼。'),
    dampingFactor: rangeControl('dampingFactor', '阻尼收敛速度。', 0.01, 0.3, 0.01),
    autoRotate: booleanControl('autoRotate', '无输入时围绕 target 自动旋转。'),
    zoomToCursor: booleanControl('zoomToCursor', '让缩放中心跟随指针位置。'),
    runUpdate: booleanControl('逐帧 update()', '故意暂停后可观察阻尼无法继续收敛。')
  },
  render: persistentStory(createOrbitControlsExample),
  parameters: sourceParameters(orbitSource)
};

export const Map = {
  name: 'MapControls',
  args: {
    screenSpacePanning: false,
    enableRotate: true,
    zoomToCursor: true
  },
  argTypes: {
    screenSpacePanning: booleanControl(
      'screenSpacePanning',
      'false 沿地图平面平移；true 按屏幕上下方向平移。'
    ),
    enableRotate: booleanControl('enableRotate', '允许右键或双指旋转。'),
    zoomToCursor: booleanControl('zoomToCursor', '缩放时尽量保持光标下的地图位置。')
  },
  render: persistentStory(createMapControlsExample),
  parameters: sourceParameters(mapSource)
};

export const Arcball = {
  name: 'ArcballControls',
  args: {
    enableAnimations: true,
    enableGizmos: true,
    enableGrid: false,
    enableFocus: true,
    cursorZoom: false,
    rotateSpeed: 1
  },
  argTypes: {
    enableAnimations: booleanControl('enableAnimations', '启用旋转惯性和聚焦动画。'),
    enableGizmos: booleanControl('enableGizmos', '允许显示虚拟轨迹球 gizmo。'),
    enableGrid: booleanControl('enableGrid', '桌面平移期间显示辅助网格。'),
    enableFocus: booleanControl('enableFocus', '允许双击或双击触摸聚焦。'),
    cursorZoom: booleanControl('cursorZoom', '让缩放围绕光标位置进行。'),
    rotateSpeed: rangeControl('rotateSpeed', '轨迹球旋转速度。', 0.25, 2.5, 0.05)
  },
  render: persistentStory(createArcballControlsExample),
  parameters: sourceParameters(arcballSource)
};

export const Trackball = {
  name: 'TrackballControls',
  args: {
    staticMoving: false,
    dynamicDampingFactor: 0.2,
    rotateSpeed: 1,
    noPan: false,
    noZoom: false
  },
  argTypes: {
    staticMoving: booleanControl('staticMoving', 'true 关闭动态阻尼，输入结束立即停止。'),
    dynamicDampingFactor: rangeControl(
      'dynamicDampingFactor',
      'staticMoving=false 时的阻尼强度。',
      0.05,
      0.8,
      0.05
    ),
    rotateSpeed: rangeControl('rotateSpeed', '轨迹球旋转速度。', 0.25, 2.5, 0.05),
    noPan: booleanControl('noPan', '禁用平移。'),
    noZoom: booleanControl('noZoom', '禁用缩放。')
  },
  render: persistentStory(createTrackballControlsExample),
  parameters: sourceParameters(trackballSource)
};

export const Fly = {
  name: 'FlyControls',
  args: {
    movementSpeed: 4,
    rollSpeed: 0.7,
    dragToLook: true,
    autoForward: false
  },
  argTypes: {
    movementSpeed: rangeControl('movementSpeed', '每秒移动的世界单位。', 0.5, 12, 0.5),
    rollSpeed: rangeControl('rollSpeed', '每秒旋转倍率。', 0.05, 2, 0.05),
    dragToLook: booleanControl('dragToLook', '只有按住指针拖动时才改变观察方向。'),
    autoForward: booleanControl('autoForward', '开始移动后自动保持向前。')
  },
  render: persistentStory(createFlyControlsExample),
  parameters: sourceParameters(flySource)
};

export const FirstPerson = {
  name: 'FirstPersonControls',
  args: {
    movementSpeed: 4,
    lookSpeed: 0.05,
    dampingFactor: 0.12,
    constrainVertical: true,
    heightSpeed: false
  },
  argTypes: {
    movementSpeed: rangeControl('movementSpeed', '每秒移动的世界单位。', 0.5, 12, 0.5),
    lookSpeed: rangeControl('lookSpeed', '指针偏移影响观察角速度的倍率。', 0.005, 0.2, 0.005),
    dampingFactor: rangeControl(
      'dampingFactor',
      '速度追上输入的比例；1 表示没有阻尼。',
      0.05,
      1,
      0.05
    ),
    constrainVertical: booleanControl('constrainVertical', '应用 verticalMin/verticalMax。'),
    heightSpeed: booleanControl('heightSpeed', '让相机高度影响向前速度。')
  },
  render: persistentStory(createFirstPersonControlsExample),
  parameters: sourceParameters(firstPersonSource)
};

export const PointerLock = {
  name: 'PointerLockControls',
  args: {
    pointerSpeed: 1,
    movementSpeed: 5,
    rawInput: false
  },
  argTypes: {
    pointerSpeed: rangeControl('pointerSpeed', '鼠标位移影响相机旋转的倍率。', 0.2, 2.5, 0.1),
    movementSpeed: rangeControl('应用层 movementSpeed', 'WASD 每秒移动的世界单位。', 1, 12, 0.5),
    rawInput: booleanControl('lock(unadjustedMovement)', '下次锁定时请求关闭系统鼠标加速度。')
  },
  render: persistentStory(createPointerLockControlsExample),
  parameters: sourceParameters(pointerLockSource)
};

export const Lifecycle = {
  name: '公共生命周期',
  render: persistentStory(createControlsLifecycleExample),
  parameters: sourceParameters(lifecycleSource)
};

function persistentStory(create) {
  let example;

  return (args) => {
    if (!example || example.disposed) {
      example = create(args);
    } else {
      example.apply(args);
    }

    return example.element;
  };
}

function sourceParameters(coreSource) {
  return sceneSource(
    `${coreSource.trim()}\n\n// 以下是所有控制器范例真实复用的舞台实现。\n${controllerStageSource.trim()}`
  );
}

function booleanControl(name, description) {
  return {
    name,
    description,
    control: 'boolean'
  };
}

function rangeControl(name, description, min, max, step) {
  return {
    name,
    description,
    control: { type: 'range', min, max, step }
  };
}
