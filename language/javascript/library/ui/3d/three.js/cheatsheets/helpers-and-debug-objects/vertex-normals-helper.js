/*
演示 VertexNormalsHelper：顶点法线线段。

输入：法线长度、物体旋转。
预期：每条线从顶点沿法线伸出；旋转后调用 update()。
*/

import * as THREE from 'three';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

import { createHelpersExampleFrame } from './helpers-example-frame.js';

export const vertexNormalsHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withGroundGrid: true,
      build({ scene }) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1, 12, 8),
          new THREE.MeshStandardMaterial({ color: '#3d73d9', flatShading: true, roughness: 0.5 })
        );
        mesh.position.y = 1.1;
        scene.add(mesh);

        const helper = new VertexNormalsHelper(mesh, 0.35, 0xff5533);
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
      frame.helper = new VertexNormalsHelper(frame.mesh, args.size, 0xff5533);
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
