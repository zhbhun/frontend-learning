/*
演示 Object3D 父子层级：add / remove、唯一父级，以及 children 读数。

输入：
- mounted：子对象是否挂在 parent 下
- nestUnderPivot：是否再套一层中间 Group（演示嵌套）

预期：
- mounted=false 时 child.parent 为 null，不在 parent.children 里
- 同一对象不能同时有两个父级；add 到新父级会自动脱离旧父级

读代码先看 apply() 里的挂载分支，再看 readout 的 parent / children。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import {
  addGroundGrid,
  addWorldAxes,
  createObject3DExampleFrame
} from './object3d-example-frame.js';

const worldPosition = new THREE.Vector3();

export const hierarchyExample = {
  create(canvas, emitSnapshot) {
    const frame = createObject3DExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [5.8, 4.6, 6.8],
      lookAt: [0.6, 0.6, 0],
      build({ scene }) {
        addGroundGrid(scene);
        addWorldAxes(scene);

        const parent = new THREE.Group();
        parent.name = 'parent';
        parent.position.set(0.8, 0, 0);
        scene.add(parent);
        parent.add(new THREE.AxesHelper(1.4));

        const pivot = new THREE.Group();
        pivot.name = 'pivot';
        pivot.position.set(0, 0.4, 0);

        const child = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.8, 0.8),
          new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.4 })
        );
        child.name = 'child';
        child.position.set(1.6, 0.4, 0);

        return { parent, pivot, child };
      },
      readSnapshot({ parent, pivot, child }) {
        if (child.parent) {
          child.updateWorldMatrix(true, false);
          child.getWorldPosition(worldPosition);
        } else {
          worldPosition.set(0, 0, 0);
        }

        return {
          parent,
          pivot,
          child,
          worldPosition: worldPosition.clone()
        };
      }
    });

    return {
      frame,
      dispose() {
        frame.dispose();
      }
    };
  },

  apply(instance, args) {
    const { frame } = instance;
    const { parent, pivot, child } = frame;

    // 先拆干净，再按控件重建目标层级，避免上一次挂载残留。
    if (child.parent) {
      child.parent.remove(child);
    }
    if (pivot.parent) {
      pivot.parent.remove(pivot);
    }

    if (args.mounted) {
      if (args.nestUnderPivot) {
        parent.add(pivot);
        pivot.add(child);
        child.position.set(1.6, 0, 0);
      } else {
        parent.add(child);
        child.position.set(1.6, 0.4, 0);
      }
    }

    frame.render();
  },

  readout({ parent, pivot, child, worldPosition }) {
    return [
      ['child.parent', child.parent ? child.parent.name : 'null'],
      ['parent.children', parent.children.map((item) => item.name).join(', ') || '（空）'],
      ['pivot.parent', pivot.parent ? pivot.parent.name : 'null'],
      ['child 局部 position', formatVector(child.position)],
      [
        'child 世界 position',
        child.parent ? formatVector(worldPosition) : '（未挂载）'
      ]
    ];
  }
};
