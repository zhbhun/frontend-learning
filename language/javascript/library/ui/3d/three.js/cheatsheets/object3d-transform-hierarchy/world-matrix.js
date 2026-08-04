/*
演示关掉 matrixAutoUpdate 后，改 position 不等于矩阵已生效。

输入：
- positionX：写入 child.position.x 的意图值
- autoUpdate：是否保持 matrixAutoUpdate
- applyMatrix：在 autoUpdate=false 时是否手动 updateMatrix + updateWorldMatrix

预期：
- autoUpdate=true：position 与 getWorldPosition 一致
- autoUpdate=false 且未手动更新：读数里的“意图 position”与“世界 position / matrixWorld”脱节

读代码先看 apply() 对 matrixAutoUpdate 与手动更新的分支。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import {
  addGroundGrid,
  addWorldAxes,
  createObject3DExampleFrame
} from './object3d-example-frame.js';

const worldPosition = new THREE.Vector3();
const matrixPosition = new THREE.Vector3();
const intentWorld = new THREE.Vector3();

export const worldMatrixExample = {
  create(canvas, emitSnapshot) {
    const frame = createObject3DExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [6.2, 4.8, 7],
      lookAt: [1, 0.4, 0],
      build({ scene }) {
        addGroundGrid(scene);
        addWorldAxes(scene);

        const parent = new THREE.Group();
        parent.name = 'parent';
        parent.position.set(1, 0, 0);
        scene.add(parent);
        parent.add(new THREE.AxesHelper(1.2));

        const child = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.75, 0.75),
          new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.4 })
        );
        child.name = 'child';
        child.position.set(2, 0.4, 0);
        parent.add(child);

        // 半透明“意图位置”标记：始终跟 position 属性走，方便对比矩阵是否落后。
        const intent = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.75, 0.75),
          new THREE.MeshStandardMaterial({
            color: '#d17832',
            roughness: 0.5,
            transparent: true,
            opacity: 0.35,
            depthWrite: false
          })
        );
        intent.name = 'intent';
        parent.add(intent);

        return { parent, child, intent };
      },
      readSnapshot({ parent, child, intent }) {
        // 有意读当前已生效的 matrixWorld，不在此处强制刷新 child。
        worldPosition.setFromMatrixPosition(child.matrixWorld);
        matrixPosition.copy(worldPosition);
        intentWorld.setFromMatrixPosition(intent.matrixWorld);

        return {
          parent,
          child,
          intent,
          worldPosition: worldPosition.clone(),
          matrixPosition: matrixPosition.clone(),
          intentWorld: intentWorld.clone()
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
    const { scene, parent, child, intent } = frame;

    child.position.x = args.positionX;
    intent.position.copy(child.position);

    child.matrixAutoUpdate = args.autoUpdate;
    parent.matrixAutoUpdate = args.autoUpdate;
    // 关掉后渲染器不会把 child 的 TRS 写进 matrixWorld；intent 保持自动更新作对照。
    scene.matrixWorldAutoUpdate = args.autoUpdate;
    child.matrixWorldAutoUpdate = args.autoUpdate;
    parent.matrixWorldAutoUpdate = args.autoUpdate;

    if (args.autoUpdate) {
      // 恢复自动更新时强制把当前 TRS 写回矩阵，避免沿用上一帧的脱节状态。
      child.matrixWorldAutoUpdate = true;
      parent.matrixWorldAutoUpdate = true;
      scene.matrixWorldAutoUpdate = true;
      child.updateWorldMatrix(true, false);
      intent.updateWorldMatrix(true, false);
    } else if (args.applyMatrix) {
      parent.updateMatrix();
      child.updateMatrix();
      // updateWorldMatrix 在 matrixWorldAutoUpdate=false 时不会写入 matrixWorld，
      // 这里临时打开只为完成一次手动生效。
      child.matrixWorldAutoUpdate = true;
      parent.matrixWorldAutoUpdate = true;
      child.updateWorldMatrix(true, false);
      child.matrixWorldAutoUpdate = false;
      parent.matrixWorldAutoUpdate = false;
      intent.updateWorldMatrix(true, false);
    }

    frame.render();
  },

  readout({ child, worldPosition, matrixPosition, intentWorld }) {
    const stale = intentWorld.distanceTo(worldPosition) > 0.05;

    return [
      ['child.position（意图）', formatVector(child.position)],
      ['意图世界位置', formatVector(intentWorld)],
      ['matrixWorld 平移（生效）', formatVector(matrixPosition)],
      ['matrixAutoUpdate', String(child.matrixAutoUpdate)],
      ['状态', stale ? '意图与矩阵脱节——需要 updateMatrix' : '意图与矩阵一致']
    ];
  }
};
