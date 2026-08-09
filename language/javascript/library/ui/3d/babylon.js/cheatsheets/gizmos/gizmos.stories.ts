import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createGizmoExample,
  type GizmoExampleInstance,
  type GizmoExampleSnapshot,
  type GizmoType,
  type GizmoTarget,
} from './example';

interface GizmoArgs {
  gizmoType: GizmoType;
  target: GizmoTarget;
}

const renderGizmo = canvasStory({
  create: createGizmoExample,
  apply(instance: GizmoExampleInstance, args: GizmoArgs) {
    instance.update(args);
  },
  readout(snapshot: GizmoExampleSnapshot) {
    return [
      ['gizmo 类型', snapshot.gizmoLabel],
      ['目标 mesh', snapshot.targetName],
      ['正在拖拽', snapshot.dragging],
      ['悬停 gizmo', snapshot.hovered],
      ['position', snapshot.position],
      ['rotation', snapshot.rotation],
      ['scaling', snapshot.scaling],
    ];
  },
});

export default {
  id: 'gizmos',
  title: '事件与交互/Gizmo',
  tags: ['!dev'],
};

export const Gizmo = {
  name: 'Gizmo',
  args: {
    gizmoType: 'position',
    target: 'box',
  },
  argTypes: {
    gizmoType: {
      name: 'gizmo 类型',
      control: { type: 'radio' },
      options: ['position', 'rotation', 'scale', 'boundingBox', 'none'],
      labels: {
        position: 'PositionGizmo',
        rotation: 'RotationGizmo',
        scale: 'ScaleGizmo',
        boundingBox: 'BoundingBoxGizmo',
        none: '不启用',
      },
      description:
        '互斥切换 manager.positionGizmoEnabled / rotationGizmoEnabled / scaleGizmoEnabled / boundingBoxGizmoEnabled。开新的前先把其余置 false，一次只开一种——对应 three.js TransformControls 的 translate/rotate/scale 三种模式，再加 Babylon 特有的 BoundingBoxGizmo（带 8 个缩放手柄的整体包围盒，渲染在保留深度的 utility layer，可被前景遮挡）。切类型时 manager 内部的 _attachedMesh 保留，新启用的 gizmo 会自动绑到同一目标。',
    },
    target: {
      name: '挂载目标',
      control: { type: 'radio' },
      options: ['auto', 'box', 'sphere', 'cylinder', 'torus', 'detach'],
      labels: {
        auto: 'auto（点击挂载）',
        box: '盒子',
        sphere: '球体',
        cylinder: '圆柱',
        torus: '圆环',
        detach: '取消挂载',
      },
      description:
        'auto 依赖 manager.usePointerToAttachGizmos（默认 true）：POINTERDOWN 命中 mesh 时 manager 内置 observer 自动 attachToMesh，命中空地（ground.isPickable=false → pickedMesh 为 null）时因 clearGizmoOnEmptyPointerEvent=true 自动 attachToMesh(null) 取消。指定具体 mesh 则直接 attachToMesh(mesh) 并把 usePointerToAttachGizmos 关掉，让控件状态与读数一致；detach 调 attachToMesh(null)。',
    },
  },
  render: renderGizmo,
  parameters: storySource(exampleSource),
};
