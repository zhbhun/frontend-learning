/*
演示 TubeGeometry：沿三维曲线扫出圆管。

输入：tubularSegments、radius、radialSegments、closed。
预期：tubularSegments / radialSegments 升高更圆滑；radius 改变管粗细。
读文件先看曲线 path，再看 TubeGeometry 参数。
*/

import * as THREE from 'three';

import {
  createGeometryExampleFrame,
  geometryStats,
  replaceMeshGeometry
} from './geometry-example-frame.js';

function createPath() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.0, 0.3, 0),
    new THREE.Vector3(-1.0, 1.4, 0.6),
    new THREE.Vector3(0.0, 0.5, -0.4),
    new THREE.Vector3(1.0, 1.5, 0.5),
    new THREE.Vector3(2.0, 0.4, 0)
  ]);
}

function createTube(args) {
  return new THREE.TubeGeometry(
    createPath(),
    args.tubularSegments,
    args.radius,
    args.radialSegments,
    args.closed
  );
}

export const tubeGeometryExample = {
  create(canvas, emitSnapshot) {
    const frame = createGeometryExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [4.8, 3.0, 5.2],
      lookAt: [0, 0.8, 0],
      build({ scene }) {
        const material = new THREE.MeshStandardMaterial({
          color: '#8f5ac7',
          roughness: 0.4
        });
        const mesh = new THREE.Mesh(
          createTube({
            tubularSegments: 64,
            radius: 0.22,
            radialSegments: 10,
            closed: false
          }),
          material
        );
        mesh.position.y = 0.2;
        scene.add(mesh);
        return { mesh };
      },
      animate({ mesh }, delta) {
        mesh.rotation.y += delta * 0.25;
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
    replaceMeshGeometry(frame.mesh, createTube(args));
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
