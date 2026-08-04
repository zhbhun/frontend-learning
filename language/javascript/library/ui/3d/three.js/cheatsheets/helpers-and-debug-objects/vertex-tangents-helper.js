/*
演示 VertexTangentsHelper：顶点切线线段。

输入：切线长度。
预期：几何需先 computeTangents()；线段沿 tangent 方向。
*/

import * as THREE from 'three';
import { VertexTangentsHelper } from 'three/addons/helpers/VertexTangentsHelper.js';

import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const vertexTangentsHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withGroundGrid: true,
      build({ scene }) {
        const geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        geometry.computeTangents();

        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({ color: '#2f8b72', roughness: 0.45 })
        );
        mesh.position.y = 1;
        scene.add(mesh);

        const helper = new VertexTangentsHelper(mesh, 0.35, 0x33ccff);
        scene.add(helper);

        return { mesh, helper, size: 0.35 };
      },
      readSnapshot({ size }) {
        return { size };
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
    frame.mesh.rotation.y = THREE.MathUtils.degToRad(args.rotationY);
    if (args.size !== frame.size) {
      frame.scene.remove(frame.helper);
      frame.helper.dispose?.();
      frame.helper = new VertexTangentsHelper(frame.mesh, args.size, 0x33ccff);
      frame.scene.add(frame.helper);
      frame.size = args.size;
    } else {
      frame.helper.update();
    }
    frame.render();
  },

  readout({ size, renderer }) {
    return [
      ['size', Number(size).toFixed(2)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
