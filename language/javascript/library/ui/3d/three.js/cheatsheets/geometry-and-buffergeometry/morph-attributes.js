/*
演示 morphAttributes：基座 position 不变，用权重混合到 morph 目标。

输入：morphTargetInfluences[0]。
预期：权重从 0→1 时形状从方块过渡到外扩目标；基座 attribute 数组不被改写。
读文件先看 morphAttributes.position 的写入，再看 influences 赋值。
*/

import * as THREE from 'three';

import {
  createGeometryExampleFrame,
  geometryStats
} from './geometry-example-frame.js';

function createMorphBox() {
  const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4, 4, 4, 4);
  const position = geometry.attributes.position;
  const morph = new Float32Array(position.array.length);

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    // 目标：沿法向外扩并略微拉高，形成圆角鼓起感。
    const length = Math.sqrt(x * x + y * y + z * z) || 1;
    morph[i * 3] = (x / length) * 1.35;
    morph[i * 3 + 1] = (y / length) * 1.55;
    morph[i * 3 + 2] = (z / length) * 1.35;
  }

  geometry.morphAttributes.position = [
    new THREE.Float32BufferAttribute(morph, 3)
  ];
  return geometry;
}

export const morphAttributesExample = {
  create(canvas, emitSnapshot) {
    const frame = createGeometryExampleFrame({
      canvas,
      emitSnapshot,
      build({ scene }) {
        const geometry = createMorphBox();
        const material = new THREE.MeshStandardMaterial({
          color: '#3d73d9',
          roughness: 0.4,
          flatShading: true
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 1.15;
        // Mesh 在首次使用 morph 几何时建立 influences 数组。
        mesh.morphTargetInfluences[0] = 0;
        scene.add(mesh);

        const baseSample = [
          geometry.attributes.position.getX(0),
          geometry.attributes.position.getY(0),
          geometry.attributes.position.getZ(0)
        ];

        return { mesh, baseSample };
      },
      animate({ mesh }, delta) {
        mesh.rotation.y += delta * 0.4;
      },
      readSnapshot({ mesh, baseSample }) {
        return {
          influence: mesh.morphTargetInfluences[0],
          baseSample,
          liveSample: [
            mesh.geometry.attributes.position.getX(0),
            mesh.geometry.attributes.position.getY(0),
            mesh.geometry.attributes.position.getZ(0)
          ],
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
    frame.mesh.morphTargetInfluences[0] = args.influence;
    frame.render();
  },

  readout({ influence, baseSample, liveSample, mesh, renderer }) {
    const baseUnchanged =
      baseSample[0] === liveSample[0] &&
      baseSample[1] === liveSample[1] &&
      baseSample[2] === liveSample[2];
    const morphCount = mesh.geometry.morphAttributes.position?.length ?? 0;

    return [
      ['influence[0]', influence.toFixed(2)],
      ['基座 attribute 未改写', baseUnchanged ? '是' : '否'],
      ['morphAttributes.position 目标数', morphCount],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
