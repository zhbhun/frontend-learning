import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createPointerPickExample,
  type PickExampleInstance,
  type PickExampleSnapshot,
  type PickFilter,
  type SelectOn,
} from './example';

interface PickArgs {
  pickFilter: PickFilter;
  selectOn: SelectOn;
}

const renderPick = canvasStory({
  create: createPointerPickExample,
  apply(instance: PickExampleInstance, args: PickArgs) {
    instance.update(args);
  },
  readout(snapshot: PickExampleSnapshot) {
    return [
      ['最近事件', snapshot.lastEvent],
      ['pointerX', snapshot.pointerX],
      ['pointerY', snapshot.pointerY],
      ['命中 mesh', snapshot.hitName],
      ['命中点', snapshot.hitPoint],
      ['距离', snapshot.hitDistance],
      ['当前 hover', snapshot.hoverName],
      ['当前选中', snapshot.selectedName],
    ];
  },
});

export default {
  id: 'pointer-input-and-picking',
  title: '事件与交互/指针与拾取',
  tags: ['!dev'],
};

export const Pick = {
  name: '指针与拾取',
  args: {
    pickFilter: 'all',
    selectOn: 'pick',
  },
  argTypes: {
    pickFilter: {
      name: '拾取过滤（predicate）',
      control: { type: 'radio' },
      options: ['all', 'boxes', 'spheres'],
      labels: {
        all: '全部可拾取',
        boxes: '仅盒子',
        spheres: '仅球体',
      },
      description:
        'MeshPredicate (mesh, thinInstanceIndex) => boolean 在拾取时过滤候选 mesh。切到「仅盒子」后，鼠标悬停或点击球体都不会命中——既不会触发 POINTERPICK，也不会更新 hover。scene.pick 的默认 predicate 还要求 mesh.isEnabled() && isVisible && isPickable，这里在默认之上再加名字过滤。',
    },
    selectOn: {
      name: '选中事件',
      control: { type: 'radio' },
      options: ['pick', 'tap'],
      labels: {
        pick: 'POINTERPICK',
        tap: 'POINTERTAP',
      },
      description:
        '选中分别绑到 PointerEventTypes.POINTERPICK（mesh 上按下并松开，无拖动）或 PointerEventTypes.POINTERTAP（同对象的 tap 事件，与 PICK 同源，触发时机由内部 click 检测决定）。两者默认都会带 pickInfo。注意：在 canvas 上拖拽旋转相机时，pickedDownMesh 与 pickedUpMesh 不一致，两种事件都不会触发——这正是相机控制与点击选中共存的机制。',
    },
  },
  render: renderPick,
  parameters: storySource(exampleSource),
};
