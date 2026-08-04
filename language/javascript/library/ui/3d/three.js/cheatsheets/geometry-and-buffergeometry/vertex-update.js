/*
演示顶点更新：改 typed array 后必须 needsUpdate；包围体过期会导致误剔除。

输入：amplitude、syncNeedsUpdate、recomputeBounds。
预期：关闭 syncNeedsUpdate 时画面可能停在旧形状；关闭 recomputeBounds 且位移很大时
可能被视锥误剔（读数仍显示已写入的 CPU 值）。
读文件先看 displace()，再看 apply() 里两条同步开关。
*/

import * as THREE from 'three';

import {
  createGeometryExampleFrame,
  geometryStats
} from './geometry-example-frame.js';

function displace(geometry, amplitude) {
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = Math.sin(x * 2.2 + z * 1.6) * amplitude;
    position.setY(i, y);
  }
}

export const vertexUpdateExample = {
  create(canvas, emitSnapshot) {
    const frame = createGeometryExampleFrame({
      canvas,
      emitSnapshot,
      cameraPosition: [3.8, 3.4, 4.8],
      lookAt: [0, 0.2, 0],
      build({ scene }) {
        const geometry = new THREE.PlaneGeometry(3.2, 3.2, 32, 32);
        geometry.rotateX(-Math.PI / 2);
        const material = new THREE.MeshStandardMaterial({
          color: '#3d73d9',
          roughness: 0.45,
          flatShading: true,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.05;
        scene.add(mesh);

        // 保存一份平坦高度，便于每次从基线重算位移。
        const baseY = new Float32Array(geometry.attributes.position.count);
        for (let i = 0; i < baseY.length; i += 1) {
          baseY[i] = geometry.attributes.position.getY(i);
        }

        return {
          mesh,
          baseY,
          syncNeedsUpdate: true,
          recomputeBounds: true,
          amplitude: 0.35
        };
      },
      readSnapshot({
        mesh,
        syncNeedsUpdate,
        recomputeBounds,
        amplitude
      }) {
        return {
          syncNeedsUpdate,
          recomputeBounds,
          amplitude,
          stats: geometryStats(mesh.geometry),
          boundingRadius: mesh.geometry.boundingSphere?.radius ?? null
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
    const { mesh, baseY } = frame;
    const position = mesh.geometry.attributes.position;

    // 先恢复平坦基线，再按 amplitude 写入，避免累加漂移。
    for (let i = 0; i < position.count; i += 1) {
      position.setY(i, baseY[i]);
    }
    displace(mesh.geometry, args.amplitude);

    if (args.syncNeedsUpdate) {
      position.needsUpdate = true;
    }

    if (args.recomputeBounds) {
      mesh.geometry.computeBoundingSphere();
      mesh.geometry.computeBoundingBox();
    }

    frame.syncNeedsUpdate = args.syncNeedsUpdate;
    frame.recomputeBounds = args.recomputeBounds;
    frame.amplitude = args.amplitude;
    frame.render();
  },

  readout({
    syncNeedsUpdate,
    recomputeBounds,
    amplitude,
    stats,
    boundingRadius,
    renderer
  }) {
    return [
      ['amplitude', amplitude.toFixed(2)],
      ['needsUpdate 已同步', syncNeedsUpdate ? '是' : '否（可对照画面）'],
      ['包围体已重算', recomputeBounds ? '是' : '否'],
      ['boundingSphere.radius', boundingRadius?.toFixed(2) ?? 'null'],
      ['position 顶点', stats.positionCount],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
