/*
演示局部 TRS 沿父级链累乘：子局部值不变时，世界位置随父级变化。

输入：parent 的 position.x、rotation.y（度）、scale（均匀）
预期：child.position 恒为 (2, 0, 0)；世界 position 与 matrixWorld 平移随父级变

读代码先看 parent/child 层级，再看 apply() 写入的是父级局部 TRS。
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
const tracePoints = [new THREE.Vector3(0, 0.02, 0), new THREE.Vector3()];

export const localTransformExample = {
  create(canvas, emitSnapshot) {
    const frame = createObject3DExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [6.4, 5.2, 7.2],
      lookAt: [0, 0.5, 0],
      build({ scene }) {
        addGroundGrid(scene);
        addWorldAxes(scene);

        const parent = new THREE.Group();
        parent.name = 'parent';
        scene.add(parent);
        parent.add(new THREE.AxesHelper(1.6));

        const child = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.7, 0.7),
          new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.4 })
        );
        child.name = 'child';
        child.position.set(2, 0, 0);
        parent.add(child);

        const traceGeometry = new THREE.BufferGeometry();
        const trace = new THREE.Line(
          traceGeometry,
          new THREE.LineBasicMaterial({ color: '#7d5321' })
        );
        scene.add(trace);

        return { parent, child, traceGeometry };
      },
      readSnapshot({ parent, child, traceGeometry }) {
        child.updateWorldMatrix(true, false);
        child.getWorldPosition(worldPosition);
        matrixPosition.setFromMatrixPosition(child.matrixWorld);

        tracePoints[1].copy(worldPosition);
        tracePoints[1].y = Math.max(0.02, tracePoints[1].y);
        traceGeometry.setFromPoints(tracePoints);

        return {
          parent,
          child,
          worldPosition: worldPosition.clone(),
          matrixPosition: matrixPosition.clone()
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
    frame.parent.position.x = args.parentPositionX;
    frame.parent.rotation.y = THREE.MathUtils.degToRad(args.parentRotationY);
    frame.parent.scale.setScalar(args.parentScale);
    frame.render();
  },

  readout({ parent, child, worldPosition, matrixPosition }) {
    return [
      ['child 局部 position', formatVector(child.position)],
      ['parent.position', formatVector(parent.position)],
      [
        'parent.rotation.y',
        `${THREE.MathUtils.radToDeg(parent.rotation.y).toFixed(0)}°`
      ],
      ['parent.scale', formatVector(parent.scale)],
      ['child 世界 position', formatVector(worldPosition)],
      ['matrixWorld 平移', formatVector(matrixPosition)]
    ];
  }
};
