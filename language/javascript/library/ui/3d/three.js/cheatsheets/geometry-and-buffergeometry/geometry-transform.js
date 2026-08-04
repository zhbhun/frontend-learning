/*
演示几何烘焙变换 vs Object3D 变换。

输入：mode（object3d / baked）、angleDeg。
预期：object3d 只改 mesh.rotation，顶点局部坐标不变；baked 把旋转写入顶点后
mesh.rotation 归零，局部包围盒方向已转。
读文件先看 apply() 的两条路径对照。
*/

import * as THREE from 'three';

import {
  createGeometryExampleFrame,
  geometryStats,
  replaceMeshGeometry
} from './geometry-example-frame.js';

function createBaseGeometry() {
  const geometry = new THREE.BoxGeometry(1.6, 0.5, 0.8);
  geometry.computeBoundingBox();
  return geometry;
}

export const geometryTransformExample = {
  create(canvas, emitSnapshot) {
    const frame = createGeometryExampleFrame({
      canvas,
      emitSnapshot,
      build({ scene }) {
        const material = new THREE.MeshStandardMaterial({
          color: '#d17832',
          roughness: 0.42
        });
        const mesh = new THREE.Mesh(createBaseGeometry(), material);
        mesh.position.y = 1.0;
        scene.add(mesh);

        const axes = new THREE.AxesHelper(1.4);
        mesh.add(axes);

        return { mesh, mode: 'object3d', angleDeg: 0 };
      },
      readSnapshot({ mesh, mode, angleDeg }) {
        const box = mesh.geometry.boundingBox;
        return {
          mode,
          angleDeg,
          meshRotationY: mesh.rotation.y,
          localBoxMax: box
            ? `${box.max.x.toFixed(2)}, ${box.max.y.toFixed(2)}, ${box.max.z.toFixed(2)}`
            : 'null',
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
    const { mesh } = frame;
    const angle = THREE.MathUtils.degToRad(args.angleDeg);

    // 每次从干净几何出发，避免烘焙路径累加。
    replaceMeshGeometry(mesh, createBaseGeometry());
    mesh.rotation.set(0, 0, 0);

    if (args.mode === 'object3d') {
      mesh.rotation.y = angle;
    } else {
      mesh.geometry.rotateY(angle);
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
    }

    frame.mode = args.mode;
    frame.angleDeg = args.angleDeg;
    frame.render();
  },

  readout({ mode, angleDeg, meshRotationY, localBoxMax, renderer }) {
    return [
      ['模式', mode === 'object3d' ? 'Object3D.rotation' : 'geometry.rotateY'],
      ['输入角度', `${angleDeg}°`],
      ['mesh.rotation.y', `${THREE.MathUtils.radToDeg(meshRotationY).toFixed(1)}°`],
      ['局部 boundingBox.max', localBoxMax],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
