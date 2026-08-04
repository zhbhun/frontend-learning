/*
演示 TextGeometry：用 Font + ExtrudeGeometry 生成可挤出的文字网格。

输入：size、depth、curveSegments、bevelEnabled。
预期：size / depth 改变字号与厚度；bevel 增加边缘倒角与顶点。
字体数据来自同目录 helvetiker_regular.typeface.json（three.js examples 字体）。
读文件先看 Font 解析与 TextGeometry 构造。
*/

import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Font } from 'three/addons/loaders/FontLoader.js';

import fontData from './helvetiker_regular.typeface.json';
import {
  createGeometryExampleFrame,
  geometryStats,
  replaceMeshGeometry
} from './geometry-example-frame.js';

const font = new Font(fontData);

function createText(args) {
  const geometry = new TextGeometry('Geo', {
    font,
    size: args.size,
    depth: args.depth,
    curveSegments: args.curveSegments,
    bevelEnabled: args.bevelEnabled,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelOffset: 0,
    bevelSegments: 2
  });
  geometry.center();
  return geometry;
}

export const textGeometryExample = {
  create(canvas, emitSnapshot) {
    const frame = createGeometryExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [3.2, 2.2, 5.4],
      lookAt: [0, 0.5, 0],
      build({ scene }) {
        const material = new THREE.MeshStandardMaterial({
          color: '#d17832',
          roughness: 0.4
        });
        const mesh = new THREE.Mesh(
          createText({
            size: 0.9,
            depth: 0.22,
            curveSegments: 6,
            bevelEnabled: true
          }),
          material
        );
        mesh.position.y = 0.9;
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
    replaceMeshGeometry(frame.mesh, createText(args));
    frame.render();
  },

  readout({ stats, renderer }) {
    return [
      ['文字', 'Geo'],
      ['position 顶点', stats.positionCount],
      ['index', stats.indexCount ?? 'null'],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
