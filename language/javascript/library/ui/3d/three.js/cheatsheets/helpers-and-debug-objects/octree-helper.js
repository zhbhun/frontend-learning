/*
演示 OctreeHelper：八叉树分区线框。

输入：无（固定从场景网格构建）。
预期：线框覆盖物体所在空间划分。
*/

import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';

import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const octreeHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withGroundGrid: true,
      cameraPosition: [8, 6, 9],
      build({ scene }) {
        const group = new THREE.Group();
        const positions = [
          [-1.5, 0.6, -1],
          [1.2, 0.6, 0.5],
          [0, 0.6, 1.8],
          [-0.5, 1.8, 0.2]
        ];
        positions.forEach((pos, index) => {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({
              color: ['#3d73d9', '#d17832', '#2f8b72', '#8f5ac7'][index],
              roughness: 0.45
            })
          );
          mesh.position.fromArray(pos);
          group.add(mesh);
        });
        scene.add(group);

        const octree = new Octree();
        octree.fromGraphNode(group);
        const helper = new OctreeHelper(octree, 0xe6b800);
        scene.add(helper);

        return { helper, octree };
      },
      readSnapshot() {
        return {};
      }
    });

    return {
      frame,
      dispose() {
        frame.dispose();
      }
    };
  },

  apply(instance) {
    instance.frame.render();
  },

  readout({ renderer }) {
    return [['本帧三角形', renderer.info.render.triangles]];
  }
};
