import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';

import { animationPathHelperExample } from './animation-path-helper.js';
import animationPathSource from './animation-path-helper.js?raw';
import { arrowHelperExample } from './arrow-helper.js';
import arrowSource from './arrow-helper.js?raw';
import { axesHelperExample } from './axes-helper.js';
import axesSource from './axes-helper.js?raw';
import { box3HelperExample } from './box3-helper.js';
import box3Source from './box3-helper.js?raw';
import { boxHelperExample } from './box-helper.js';
import boxSource from './box-helper.js?raw';
import { cameraHelperExample } from './camera-helper.js';
import cameraSource from './camera-helper.js?raw';
import { directionalLightHelperExample } from './directional-light-helper.js';
import directionalSource from './directional-light-helper.js?raw';
import { gridHelperExample } from './grid-helper.js';
import gridSource from './grid-helper.js?raw';
import { hemisphereLightHelperExample } from './hemisphere-light-helper.js';
import hemisphereSource from './hemisphere-light-helper.js?raw';
import { lightProbeHelperExample } from './light-probe-helper.js';
import lightProbeSource from './light-probe-helper.js?raw';
import { octreeHelperExample } from './octree-helper.js';
import octreeSource from './octree-helper.js?raw';
import { planeHelperExample } from './plane-helper.js';
import planeSource from './plane-helper.js?raw';
import { pointLightHelperExample } from './point-light-helper.js';
import pointSource from './point-light-helper.js?raw';
import { polarGridHelperExample } from './polar-grid-helper.js';
import polarSource from './polar-grid-helper.js?raw';
import { positionalAudioHelperExample } from './positional-audio-helper.js';
import positionalAudioSource from './positional-audio-helper.js?raw';
import { rectAreaLightHelperExample } from './rect-area-light-helper.js';
import rectAreaSource from './rect-area-light-helper.js?raw';
import { skeletonHelperExample } from './skeleton-helper.js';
import skeletonSource from './skeleton-helper.js?raw';
import { spotLightHelperExample } from './spot-light-helper.js';
import spotSource from './spot-light-helper.js?raw';
import { textureHelperExample } from './texture-helper.js';
import textureSource from './texture-helper.js?raw';
import { vertexNormalsHelperExample } from './vertex-normals-helper.js';
import vertexNormalsSource from './vertex-normals-helper.js?raw';
import { vertexTangentsHelperExample } from './vertex-tangents-helper.js';
import vertexTangentsSource from './vertex-tangents-helper.js?raw';
import { viewHelperExample } from './view-helper.js';
import viewHelperSource from './view-helper.js?raw';

export default {
  id: 'helpers-and-debug-objects',
  title: '核心系统/空间与对象/Helper',
  tags: ['!dev']
};

function range(name, min, max, step) {
  return { name, control: { type: 'range', min, max, step } };
}

function boolean(name) {
  return { name, control: 'boolean' };
}

export const Axes = {
  name: 'AxesHelper',
  args: {
    rotationY: 35,
    attachMode: 'mesh',
    showWorldAxes: true
  },
  argTypes: {
    rotationY: range('mesh.rotation.y（度）', -180, 180, 5),
    attachMode: {
      name: '对照轴挂载',
      control: 'inline-radio',
      options: ['mesh', 'scene']
    },
    showWorldAxes: boolean('显示世界 AxesHelper')
  },
  render: sceneStory(axesHelperExample),
  parameters: sceneSource(axesSource)
};

export const Grid = {
  name: 'GridHelper',
  args: { size: 10, divisions: 10 },
  argTypes: {
    size: range('size', 4, 20, 1),
    divisions: range('divisions', 2, 20, 1)
  },
  render: sceneStory(gridHelperExample),
  parameters: sceneSource(gridSource)
};

export const PolarGrid = {
  name: 'PolarGridHelper',
  args: { radius: 8, sectors: 16, rings: 8 },
  argTypes: {
    radius: range('radius', 2, 14, 1),
    sectors: range('sectors', 4, 32, 1),
    rings: range('rings', 2, 16, 1)
  },
  render: sceneStory(polarGridHelperExample),
  parameters: sceneSource(polarSource)
};

export const Box = {
  name: 'BoxHelper',
  args: { scale: 1, autoUpdate: true, spin: true },
  argTypes: {
    scale: range('mesh.scale', 0.4, 2.2, 0.1),
    autoUpdate: boolean('调用 helper.update()'),
    spin: boolean('持续旋转')
  },
  render: sceneStory(boxHelperExample),
  parameters: sceneSource(boxSource)
};

export const Box3 = {
  name: 'Box3Helper',
  args: {
    centerX: 0,
    centerY: 1,
    centerZ: 0,
    sizeX: 2,
    sizeY: 2,
    sizeZ: 2
  },
  argTypes: {
    centerX: range('Box3 中心 x', -3, 3, 0.1),
    centerY: range('Box3 中心 y', 0, 3, 0.1),
    centerZ: range('Box3 中心 z', -3, 3, 0.1),
    sizeX: range('Box3 尺寸 x', 0.4, 4, 0.1),
    sizeY: range('Box3 尺寸 y', 0.4, 4, 0.1),
    sizeZ: range('Box3 尺寸 z', 0.4, 4, 0.1)
  },
  render: sceneStory(box3HelperExample),
  parameters: sceneSource(box3Source)
};

export const Camera = {
  name: 'CameraHelper',
  args: {
    camX: 3.5,
    camY: 2.5,
    camZ: 4.5,
    fov: 50,
    near: 0.8,
    far: 8,
    autoUpdate: true
  },
  argTypes: {
    camX: range('辅助相机 x', -6, 6, 0.1),
    camY: range('辅助相机 y', 0.5, 6, 0.1),
    camZ: range('辅助相机 z', -6, 8, 0.1),
    fov: range('fov', 20, 100, 1),
    near: range('near', 0.2, 4, 0.1),
    far: range('far', 4, 16, 0.5),
    autoUpdate: boolean('调用 helper.update()')
  },
  render: sceneStory(cameraHelperExample),
  parameters: sceneSource(cameraSource)
};

export const DirectionalLight = {
  name: 'DirectionalLightHelper',
  args: {
    lightX: 3,
    lightY: 4,
    lightZ: 2,
    autoUpdate: true
  },
  argTypes: {
    lightX: range('light.position.x', -6, 6, 0.1),
    lightY: range('light.position.y', 1, 8, 0.1),
    lightZ: range('light.position.z', -6, 6, 0.1),
    autoUpdate: boolean('调用 helper.update()')
  },
  render: sceneStory(directionalLightHelperExample),
  parameters: sceneSource(directionalSource)
};

export const PointLight = {
  name: 'PointLightHelper',
  args: {
    lightX: 2,
    lightY: 2.5,
    lightZ: 2,
    sphereSize: 0.35,
    color: '#ff6b4a',
    autoUpdate: true
  },
  argTypes: {
    lightX: range('light.position.x', -4, 4, 0.1),
    lightY: range('light.position.y', 0.5, 5, 0.1),
    lightZ: range('light.position.z', -4, 4, 0.1),
    sphereSize: range('sphereSize', 0.1, 1.2, 0.05),
    color: { name: 'light.color', control: 'color' },
    autoUpdate: boolean('调用 helper.update()')
  },
  render: sceneStory(pointLightHelperExample),
  parameters: sceneSource(pointSource)
};

export const SpotLight = {
  name: 'SpotLightHelper',
  args: {
    lightX: 3,
    lightY: 5,
    lightZ: 3,
    targetX: 0,
    targetY: 0.6,
    targetZ: 0,
    angleDeg: 30,
    autoUpdate: true
  },
  argTypes: {
    lightX: range('light.position.x', -6, 6, 0.1),
    lightY: range('light.position.y', 1, 8, 0.1),
    lightZ: range('light.position.z', -6, 6, 0.1),
    targetX: range('target.position.x', -3, 3, 0.1),
    targetY: range('target.position.y', 0, 3, 0.1),
    targetZ: range('target.position.z', -3, 3, 0.1),
    angleDeg: range('light.angle（度）', 8, 60, 1),
    autoUpdate: boolean('调用 helper.update()')
  },
  render: sceneStory(spotLightHelperExample),
  parameters: sceneSource(spotSource)
};

export const HemisphereLight = {
  name: 'HemisphereLightHelper',
  args: {
    lightX: 0,
    lightY: 3.5,
    lightZ: 0,
    sky: '#cce6ff',
    ground: '#3a4a3f',
    autoUpdate: true
  },
  argTypes: {
    lightX: range('light.position.x', -4, 4, 0.1),
    lightY: range('light.position.y', 1, 6, 0.1),
    lightZ: range('light.position.z', -4, 4, 0.1),
    sky: { name: 'light.color（天空）', control: 'color' },
    ground: { name: 'light.groundColor', control: 'color' },
    autoUpdate: boolean('调用 helper.update()')
  },
  render: sceneStory(hemisphereLightHelperExample),
  parameters: sceneSource(hemisphereSource)
};

export const Skeleton = {
  name: 'SkeletonHelper',
  args: { spineY: 20, leftArmZ: 35, rightArmZ: -35 },
  argTypes: {
    spineY: range('spine.rotation.y（度）', -60, 60, 1),
    leftArmZ: range('leftArm.rotation.z（度）', -80, 80, 1),
    rightArmZ: range('rightArm.rotation.z（度）', -80, 80, 1)
  },
  render: sceneStory(skeletonHelperExample),
  parameters: sceneSource(skeletonSource)
};

export const Arrow = {
  name: 'ArrowHelper',
  args: {
    yaw: 45,
    pitch: 20,
    originX: 0,
    originY: 0.5,
    originZ: 0,
    length: 2.5,
    color: '#e6b800'
  },
  argTypes: {
    yaw: range('方向偏航（度）', -180, 180, 5),
    pitch: range('方向俯仰（度）', -80, 80, 5),
    originX: range('origin.x', -3, 3, 0.1),
    originY: range('origin.y', 0, 3, 0.1),
    originZ: range('origin.z', -3, 3, 0.1),
    length: range('length', 0.5, 5, 0.1),
    color: { name: 'color', control: 'color' }
  },
  render: sceneStory(arrowHelperExample),
  parameters: sceneSource(arrowSource)
};

export const Plane = {
  name: 'PlaneHelper',
  args: { nx: 1, ny: 1, nz: 0.2, constant: 0, size: 4 },
  argTypes: {
    nx: range('plane.normal.x', -1, 1, 0.05),
    ny: range('plane.normal.y', -1, 1, 0.05),
    nz: range('plane.normal.z', -1, 1, 0.05),
    constant: range('plane.constant', -2, 2, 0.05),
    size: range('size', 1, 8, 0.5)
  },
  render: sceneStory(planeHelperExample),
  parameters: sceneSource(planeSource)
};

export const RectAreaLight = {
  name: 'RectAreaLightHelper',
  args: { width: 3, height: 2, intensity: 8 },
  argTypes: {
    width: range('light.width', 0.5, 6, 0.1),
    height: range('light.height', 0.5, 6, 0.1),
    intensity: range('light.intensity', 1, 20, 0.5)
  },
  render: sceneStory(rectAreaLightHelperExample),
  parameters: sceneSource(rectAreaSource)
};

export const VertexNormals = {
  name: 'VertexNormalsHelper',
  args: { size: 0.35, rotationY: 25 },
  argTypes: {
    size: range('size', 0.1, 1.2, 0.05),
    rotationY: range('mesh.rotation.y（度）', -180, 180, 5)
  },
  render: sceneStory(vertexNormalsHelperExample),
  parameters: sceneSource(vertexNormalsSource)
};

export const VertexTangents = {
  name: 'VertexTangentsHelper',
  args: { size: 0.35, rotationY: 20 },
  argTypes: {
    size: range('size', 0.1, 1.2, 0.05),
    rotationY: range('mesh.rotation.y（度）', -180, 180, 5)
  },
  render: sceneStory(vertexTangentsHelperExample),
  parameters: sceneSource(vertexTangentsSource)
};

export const View = {
  name: 'ViewHelper',
  args: { azimuth: 40, polar: 55, distance: 8 },
  argTypes: {
    azimuth: range('方位角（度）', -180, 180, 5),
    polar: range('极角（度）', 15, 160, 5),
    distance: range('距离', 4, 14, 0.5)
  },
  render: sceneStory(viewHelperExample),
  parameters: sceneSource(viewHelperSource)
};

export const LightProbe = {
  name: 'LightProbeHelper',
  args: { size: 1.2, intensity: 1 },
  argTypes: {
    size: range('size', 0.4, 2.5, 0.1),
    intensity: range('intensity', 0.2, 2.5, 0.1)
  },
  render: sceneStory(lightProbeHelperExample),
  parameters: sceneSource(lightProbeSource)
};

export const Texture = {
  name: 'TextureHelper',
  args: { width: 2, height: 2, depth: 0.2 },
  argTypes: {
    width: range('width', 0.5, 4, 0.1),
    height: range('height', 0.5, 4, 0.1),
    depth: range('depth', 0.05, 1.5, 0.05)
  },
  render: sceneStory(textureHelperExample),
  parameters: sceneSource(textureSource)
};

export const PositionalAudio = {
  name: 'PositionalAudioHelper',
  args: { innerAngle: 120, outerAngle: 180, range: 2.5, yaw: 0 },
  argTypes: {
    innerAngle: range('内锥角（度）', 20, 180, 5),
    outerAngle: range('外锥角（度）', 40, 360, 5),
    range: range('range', 0.5, 5, 0.1),
    yaw: range('yaw（度）', -180, 180, 5)
  },
  render: sceneStory(positionalAudioHelperExample),
  parameters: sceneSource(positionalAudioSource)
};

export const Octree = {
  name: 'OctreeHelper',
  args: {},
  argTypes: {},
  render: sceneStory(octreeHelperExample),
  parameters: sceneSource(octreeSource)
};

export const AnimationPath = {
  name: 'AnimationPathHelper',
  args: { showMarkers: true },
  argTypes: {
    showMarkers: boolean('showMarkers')
  },
  render: sceneStory(animationPathHelperExample),
  parameters: sceneSource(animationPathSource)
};
