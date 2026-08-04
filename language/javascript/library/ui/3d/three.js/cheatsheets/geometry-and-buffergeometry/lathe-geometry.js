/*
演示 LatheGeometry：把 2D 轮廓绕 Y 轴旋转成旋转体。

输入：segments、phiLength。
预期：segments 升高更圆；phiLength < 2π 时出现缺口。
读文件先看 profile 点列，再看 LatheGeometry 构造。
*/

import * as THREE from 'three';

import {
  createGeometryExampleFrame,
  geometryStats,
  replaceMeshGeometry
} from './geometry-example-frame.js';

const profile = [
  new THREE.Vector2(0, -1.0),
  new THREE.Vector2(0.55, -0.85),
  new THREE.Vector2(0.75, -0.2),
  new THREE.Vector2(0.45, 0.35),
  new THREE.Vector2(0.7, 0.85),
  new THREE.Vector2(0.2, 1.15),
  new THREE.Vector2(0, 1.2)
];

function createLathe(segments, phiLength) {
  return new THREE.LatheGeometry(profile, segments, 0, phiLength);
}

export const latheGeometryExample = {
  create(canvas, emitSnapshot) {
    const frame = createGeometryExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [3.6, 2.4, 4.4],
      lookAt: [0, 0.2, 0],
      build({ scene }) {
        const material = new THREE.MeshStandardMaterial({
          color: '#2f8b72',
          roughness: 0.45,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(createLathe(24, Math.PI * 2), material);
        mesh.position.y = 1.15;
        scene.add(mesh);
        return { mesh };
      },
      animate({ mesh }, delta) {
        mesh.rotation.y += delta * 0.35;
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
      createLathe(args.segments, THREE.MathUtils.degToRad(args.phiLengthDeg))
    );
    frame.render();
  },

  readout({ stats, renderer }) {
    return [
      ['position 顶点', stats.positionCount],
      ['index', stats.indexCount ?? 'null'],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
