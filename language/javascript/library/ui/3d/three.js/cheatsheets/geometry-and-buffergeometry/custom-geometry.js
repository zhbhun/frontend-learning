/*
演示自定义 BufferGeometry：手写 position + index，以及缺 normal / 重算法线的对比。

输入：是否使用 index、是否 computeVertexNormals。
预期：无 index 时顶点数更多；无 normal 时受光发黑或平坦；重算后明暗恢复。
读文件先看 buildGeometry()，再看 apply() 的开关。
*/

import * as THREE from 'three';

import {
  createGeometryExampleFrame,
  geometryStats,
  replaceMeshGeometry
} from './geometry-example-frame.js';

function buildGeometry({ useIndex, computeNormals }) {
  const geometry = new THREE.BufferGeometry();

  // 一个朝上的四边形：4 个角点，两个三角形。
  const positions = new Float32Array([
    -1.2, 0, -1.0,
    1.2, 0, -1.0,
    1.2, 0, 1.0,
    -1.2, 0, 1.0
  ]);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  if (useIndex) {
    geometry.setIndex([0, 2, 1, 0, 3, 2]);
  } else {
    // non-indexed：每个三角形复制一份顶点，6 个 position。
    const expanded = new Float32Array([
      -1.2, 0, -1.0, 1.2, 0, 1.0, 1.2, 0, -1.0,
      -1.2, 0, -1.0, -1.2, 0, 1.0, 1.2, 0, 1.0
    ]);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(expanded, 3));
  }

  if (computeNormals) {
    geometry.computeVertexNormals();
  }

  geometry.computeBoundingSphere();
  return geometry;
}

export const customGeometryExample = {
  create(canvas, emitSnapshot) {
    const frame = createGeometryExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [3.2, 3.6, 4.2],
      lookAt: [0, 0.2, 0],
      build({ scene }) {
        const material = new THREE.MeshStandardMaterial({
          color: '#3d73d9',
          roughness: 0.4,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(
          buildGeometry({ useIndex: true, computeNormals: true }),
          material
        );
        mesh.position.y = 0.05;
        scene.add(mesh);
        return { mesh };
      },
      animate({ mesh }, delta) {
        mesh.rotation.y += delta * 0.4;
      },
      readSnapshot({ mesh }) {
        return { stats: geometryStats(mesh.geometry) };
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
    replaceMeshGeometry(
      frame.mesh,
      buildGeometry({
        useIndex: args.useIndex,
        computeNormals: args.computeNormals
      })
    );
    frame.render();
  },

  readout({ stats, renderer }) {
    return [
      ['position 顶点', stats.positionCount],
      ['index', stats.indexCount ?? 'null（non-indexed）'],
      ['has normal', String(stats.hasNormal)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
