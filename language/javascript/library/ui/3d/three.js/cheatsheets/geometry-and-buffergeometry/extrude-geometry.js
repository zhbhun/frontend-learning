/*
演示 ExtrudeGeometry：沿深度挤出 Shape，并观察 bevel 选项。

输入：depth、bevelEnabled、bevelThickness、bevelSegments、steps。
预期：depth 拉长厚度；开启 bevel 后边缘倒角，顶点数上升。
读文件先看 createShape()，再看 ExtrudeGeometry options。
*/

import * as THREE from 'three';

import {
  createGeometryExampleFrame,
  geometryStats,
  replaceMeshGeometry
} from './geometry-example-frame.js';

function createBadgeShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.8, -0.5);
  shape.lineTo(0.8, -0.5);
  shape.lineTo(0.8, 0.3);
  shape.lineTo(0, 0.9);
  shape.lineTo(-0.8, 0.3);
  shape.lineTo(-0.8, -0.5);

  const hole = new THREE.Path();
  hole.absarc(0, 0.05, 0.22, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

function createExtrude(args) {
  return new THREE.ExtrudeGeometry(createBadgeShape(), {
    depth: args.depth,
    steps: args.steps,
    bevelEnabled: args.bevelEnabled,
    bevelThickness: args.bevelThickness,
    bevelSize: args.bevelThickness * 0.8,
    bevelOffset: 0,
    bevelSegments: args.bevelSegments,
    curveSegments: 8
  });
}

export const extrudeGeometryExample = {
  create(canvas, emitSnapshot) {
    const frame = createGeometryExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [3.8, 2.6, 4.6],
      lookAt: [0, 0.4, 0.2],
      build({ scene }) {
        const material = new THREE.MeshStandardMaterial({
          color: '#3d73d9',
          roughness: 0.4,
          metalness: 0.08
        });
        const mesh = new THREE.Mesh(
          createExtrude({
            depth: 0.45,
            steps: 1,
            bevelEnabled: true,
            bevelThickness: 0.08,
            bevelSegments: 2
          }),
          material
        );
        mesh.position.set(0, 0.55, 0);
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
    replaceMeshGeometry(frame.mesh, createExtrude(args));
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
