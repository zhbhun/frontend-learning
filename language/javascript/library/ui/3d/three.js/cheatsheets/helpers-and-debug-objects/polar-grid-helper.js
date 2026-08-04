/*
演示 PolarGridHelper：极坐标径向网格。

输入：radius、sectors、rings。
预期：扇区与圆环数量随参数变化，适合圆周对称场景。
*/

import * as THREE from 'three';

import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const polarGridHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [8, 7, 8],
      build({ scene }) {
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.4, 1.2, 24),
          new THREE.MeshStandardMaterial({ color: '#d17832', roughness: 0.45 })
        );
        mesh.position.y = 0.6;
        scene.add(mesh);
        scene.add(new THREE.AxesHelper(2));

        let grid = new THREE.PolarGridHelper(8, 16, 8, 64, '#8ba096', '#cdd8d1');
        scene.add(grid);

        return {
          radius: 8,
          sectors: 16,
          rings: 8,
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
    frame.radius = args.radius;
    frame.sectors = args.sectors;
    frame.rings = args.rings;
    frame.replaceGrid(
      new THREE.PolarGridHelper(
        args.radius,
        args.sectors,
        args.rings,
        64,
        '#8ba096',
        '#cdd8d1'
      )
    );
    frame.render();
  },

  readout({ renderer, radius, sectors, rings }) {
    return [
      ['radius', radius ?? '—'],
      ['sectors', sectors ?? '—'],
      ['rings', rings ?? '—'],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
