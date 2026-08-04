/*
演示 ShapeGeometry：把 2D Shape 变成平面网格。

输入：curveSegments。
预期：分段升高，轮廓更圆滑，顶点与三角形增多。
读文件先看 createShape()，再看 ShapeGeometry 构造。
*/

import * as THREE from 'three';

import {
  createGeometryExampleFrame,
  geometryStats,
  replaceMeshGeometry
} from './geometry-example-frame.js';

function createHeartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.55);
  shape.bezierCurveTo(0, 0.55, -0.1, 0.25, -0.7, 0.25);
  shape.bezierCurveTo(-1.5, 0.25, -1.5, 1.05, -1.5, 1.05);
  shape.bezierCurveTo(-1.5, 1.55, -1.0, 2.15, 0, 2.65);
  shape.bezierCurveTo(1.0, 2.15, 1.5, 1.55, 1.5, 1.05);
  shape.bezierCurveTo(1.5, 1.05, 1.5, 0.25, 0.7, 0.25);
  shape.bezierCurveTo(0.15, 0.25, 0, 0.55, 0, 0.55);
  return shape;
}

export const shapeGeometryExample = {
  create(canvas, emitSnapshot) {
    const frame = createGeometryExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [0, 0, 7],
      lookAt: [0, 1.2, 0],
      build({ scene }) {
        const material = new THREE.MeshStandardMaterial({
          color: '#c45c6a',
          roughness: 0.5,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(
          new THREE.ShapeGeometry(createHeartShape(), 12),
          material
        );
        mesh.position.set(0, -0.2, 0);
        scene.add(mesh);
        return { mesh, curveSegments: 12 };
      },
      animate({ mesh }, delta) {
        mesh.rotation.y += delta * 0.45;
      },
      readSnapshot({ mesh, curveSegments }) {
        return {
          curveSegments,
          stats: geometryStats(mesh.geometry)
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
    replaceMeshGeometry(
      frame.mesh,
      new THREE.ShapeGeometry(createHeartShape(), args.curveSegments)
    );
    frame.curveSegments = args.curveSegments;
    frame.render();
  },

  readout({ curveSegments, stats, renderer }) {
    return [
      ['curveSegments', curveSegments ?? '-'],
      ['position 顶点', stats.positionCount],
      ['index', stats.indexCount ?? 'null'],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
