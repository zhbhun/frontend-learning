/*
演示 GridHelper：XZ 平面参考网格。

输入：size、divisions。
预期：格子边长与中心线密度随参数变化；网格始终贴在 y=0。
*/

import * as THREE from 'three';

import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const gridHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [8, 7, 8],
      build({ scene }) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.45 })
        );
        mesh.position.y = 0.5;
        scene.add(mesh);
        scene.add(new THREE.AxesHelper(2));

        let grid = new THREE.GridHelper(10, 10, '#8ba096', '#cdd8d1');
        scene.add(grid);

        return {
          mesh,
          size: 10,
          divisions: 10,
          get grid() {
            return grid;
          },
          replaceGrid(next) {
            scene.remove(grid);
            grid.geometry.dispose();
            grid.material.dispose();
            grid = next;
            scene.add(grid);
          }
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
    frame.size = args.size;
    frame.divisions = args.divisions;
    frame.replaceGrid(
      new THREE.GridHelper(args.size, args.divisions, '#8ba096', '#cdd8d1')
    );
    frame.render();
  },

  readout({ renderer, size, divisions }) {
    return [
      ['size', size ?? '—'],
      ['divisions', divisions ?? '—'],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
