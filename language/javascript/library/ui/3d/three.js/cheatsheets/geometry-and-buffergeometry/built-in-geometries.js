/*
参数化内置几何体的成员范例工厂。

每个导出对应一种几何：只暴露该构造相关的分段 / 尺寸控件。
读文件先看 createParametricGeometryExample，再看各成员的 createGeometry。
*/

import * as THREE from 'three';

import {
  createGeometryExampleFrame,
  geometryStats,
  replaceMeshGeometry
} from './geometry-example-frame.js';

function createParametricGeometryExample({
  label,
  createGeometry,
  meshY = 1.1,
  cameraPosition,
  lookAt
}) {
  return {
    create(canvas, emitSnapshot) {
      const frame = createGeometryExampleFrame({
        canvas,
        emitSnapshot,
        cameraPosition,
        lookAt,
        build({ scene }) {
        const material = new THREE.MeshStandardMaterial({
          color: '#3d73d9',
          roughness: 0.42,
          flatShading: false,
          side: THREE.DoubleSide
        });
          const mesh = new THREE.Mesh(createGeometry({}), material);
          mesh.position.y = meshY;
          scene.add(mesh);
          return { mesh, material, label };
        },
        animate({ mesh }, delta) {
          mesh.rotation.y += delta * 0.35;
        },
        readSnapshot({ mesh, label: geometryLabel }) {
          return {
            label: geometryLabel,
            stats: geometryStats(mesh.geometry),
            kind: mesh.userData.kind
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
      const { mesh, material } = frame;
      replaceMeshGeometry(mesh, createGeometry(args));
      mesh.userData.kind = args.kind;
      material.wireframe = Boolean(args.wireframe);
      material.flatShading = Boolean(args.flatShading);
      material.needsUpdate = true;
      frame.render();
    },

    readout({ label: geometryLabel, stats, renderer, kind }) {
      const rows = [
        ['geometry', geometryLabel],
        ['position 顶点', stats.positionCount],
        ['index', stats.indexCount ?? 'null'],
        ['normal / uv', `${stats.hasNormal} / ${stats.hasUv}`],
        ['本帧三角形', renderer.info.render.triangles]
      ];
      if (kind) {
        rows.splice(1, 0, ['类型', kind]);
      }
      return rows;
    }
  };
}

export const boxGeometryExample = createParametricGeometryExample({
  label: 'BoxGeometry',
  createGeometry: (args) =>
    new THREE.BoxGeometry(
      args.width ?? 1.6,
      args.height ?? 1.6,
      args.depth ?? 1.6,
      args.widthSegments ?? 1,
      args.heightSegments ?? 1,
      args.depthSegments ?? 1
    )
});

export const sphereGeometryExample = createParametricGeometryExample({
  label: 'SphereGeometry',
  createGeometry: (args) =>
    new THREE.SphereGeometry(
      args.radius ?? 1.1,
      args.widthSegments ?? 24,
      args.heightSegments ?? 16,
      0,
      args.phiLength ?? Math.PI * 2,
      0,
      args.thetaLength ?? Math.PI
    )
});

export const planeGeometryExample = createParametricGeometryExample({
  label: 'PlaneGeometry',
  meshY: 1.2,
  cameraPosition: [3.2, 3.4, 4.2],
  lookAt: [0, 0.6, 0],
  createGeometry: (args) => {
    const geometry = new THREE.PlaneGeometry(
      args.width ?? 2.4,
      args.height ?? 2.4,
      args.widthSegments ?? 1,
      args.heightSegments ?? 1
    );
    // 竖起来更易观察分段；地面场景通常再 rotateX(-π/2)。
    return geometry;
  }
});

export const cylinderGeometryExample = createParametricGeometryExample({
  label: 'CylinderGeometry',
  createGeometry: (args) =>
    new THREE.CylinderGeometry(
      args.radiusTop ?? 0.85,
      args.radiusBottom ?? 0.85,
      args.height ?? 1.8,
      args.radialSegments ?? 16,
      args.heightSegments ?? 1,
      Boolean(args.openEnded)
    )
});

export const coneGeometryExample = createParametricGeometryExample({
  label: 'ConeGeometry',
  createGeometry: (args) =>
    new THREE.ConeGeometry(
      args.radius ?? 1.0,
      args.height ?? 1.8,
      args.radialSegments ?? 16,
      args.heightSegments ?? 1,
      Boolean(args.openEnded)
    )
});

export const torusGeometryExample = createParametricGeometryExample({
  label: 'TorusGeometry',
  meshY: 1.2,
  createGeometry: (args) =>
    new THREE.TorusGeometry(
      args.radius ?? 0.95,
      args.tube ?? 0.32,
      args.radialSegments ?? 12,
      args.tubularSegments ?? 48
    )
});

export const capsuleGeometryExample = createParametricGeometryExample({
  label: 'CapsuleGeometry',
  createGeometry: (args) =>
    new THREE.CapsuleGeometry(
      args.radius ?? 0.55,
      args.length ?? 0.9,
      args.capSegments ?? 4,
      args.radialSegments ?? 12
    )
});

export const circleGeometryExample = createParametricGeometryExample({
  label: 'CircleGeometry',
  meshY: 1.1,
  cameraPosition: [2.8, 2.6, 3.6],
  lookAt: [0, 0.5, 0],
  createGeometry: (args) =>
    new THREE.CircleGeometry(
      args.radius ?? 1.2,
      args.segments ?? 32,
      0,
      args.thetaLength ?? Math.PI * 2
    )
});

export const ringGeometryExample = createParametricGeometryExample({
  label: 'RingGeometry',
  meshY: 1.1,
  cameraPosition: [2.8, 2.6, 3.6],
  lookAt: [0, 0.5, 0],
  createGeometry: (args) =>
    new THREE.RingGeometry(
      args.innerRadius ?? 0.45,
      args.outerRadius ?? 1.2,
      args.thetaSegments ?? 32,
      args.phiSegments ?? 1,
      0,
      args.thetaLength ?? Math.PI * 2
    )
});

export const torusKnotGeometryExample = createParametricGeometryExample({
  label: 'TorusKnotGeometry',
  meshY: 1.15,
  createGeometry: (args) =>
    new THREE.TorusKnotGeometry(
      args.radius ?? 0.85,
      args.tube ?? 0.28,
      args.tubularSegments ?? 96,
      args.radialSegments ?? 16,
      args.p ?? 2,
      args.q ?? 3
    )
});

export const polyhedronGeometryExample = createParametricGeometryExample({
  label: 'IcosahedronGeometry',
  createGeometry: (args) => {
    const radius = args.radius ?? 1.15;
    const detail = args.detail ?? 0;
    switch (args.kind ?? 'icosahedron') {
      case 'tetrahedron':
        return new THREE.TetrahedronGeometry(radius, detail);
      case 'octahedron':
        return new THREE.OctahedronGeometry(radius, detail);
      case 'dodecahedron':
        return new THREE.DodecahedronGeometry(radius, detail);
      default:
        return new THREE.IcosahedronGeometry(radius, detail);
    }
  }
});
