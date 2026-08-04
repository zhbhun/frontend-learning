/*
演示 AxesHelper：世界坐标轴 vs 挂到物体上的局部坐标轴。

输入：父对象旋转、挂载方式（scene / mesh）。
预期：挂在 scene 的轴不随物体转；挂在 mesh 的轴跟局部坐标一起转。
读文件先看两个 AxesHelper 的父级，再看 apply() 写 rotation。
*/

import * as THREE from 'three';

import { formatVector } from '../../assets/shared-scene.js';
import {
  addSubjectMesh,
  createHelpersExampleFrame
} from './helpers-example-frame.js';

const worldPosition = new THREE.Vector3();

export const axesHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withGroundGrid: true,
      build({ scene }) {
        const mesh = addSubjectMesh(scene);
        const worldAxes = new THREE.AxesHelper(2.4);
        scene.add(worldAxes);

        const localAxes = new THREE.AxesHelper(1.6);
        mesh.add(localAxes);

        return { mesh, worldAxes, localAxes, attachMode: 'mesh' };
      },
      readSnapshot({ mesh, attachMode }) {
        mesh.getWorldPosition(worldPosition);
        return {
          attachMode,
          worldPosition: worldPosition.clone(),
          rotationY: mesh.rotation.y
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
    const { mesh, worldAxes, localAxes, scene } = frame;

    mesh.rotation.y = THREE.MathUtils.degToRad(args.rotationY);

    // 切换挂载：对照轴要么跟 mesh（局部），要么挂在 scene（世界位置对齐 mesh）。
    if (args.attachMode === 'mesh') {
      if (localAxes.parent !== mesh) {
        mesh.add(localAxes);
        localAxes.position.set(0, 0, 0);
      }
    } else if (localAxes.parent !== scene) {
      scene.add(localAxes);
      localAxes.position.copy(mesh.position);
    }

    frame.attachMode = args.attachMode;
    worldAxes.visible = args.showWorldAxes;
    frame.render();
  },

  readout({ mesh, attachMode, worldPosition, rotationY, renderer }) {
    return [
      ['局部轴挂载', attachMode === 'mesh' ? 'mesh（局部）' : 'scene（世界）'],
      ['mesh.rotation.y', `${THREE.MathUtils.radToDeg(rotationY).toFixed(0)}°`],
      ['mesh 世界 position', formatVector(worldPosition)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
