/*
演示 Line：把一组顶点按数组顺序连成连续路径（N 个顶点 → N-1 段）。

输入是顶点数量和振幅；操作后路径形状和读数中的段数一起变化。
- Line 把顶点按 position attribute 的顺序连成 V0-V1-V2-…-VN-1，所以 N 个点对应 N-1 段。
- 改 vertexCount 时路径会随之变密或变稀，但段数公式始终是 N-1。
读文件先看 buildPoints() 怎样构造顶点序列，再看 apply() 中如何用 setFromPoints 写入 geometry。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const point = new THREE.Vector3();

// 沿 X 轴均匀采样，Y / Z 用正余弦构造一条空间曲线（类螺旋）。
function buildPoints(count, amplitude) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const angle = t * Math.PI * 4;
    const x = -3.2 + t * 6.4;
    point.set(x, Math.sin(angle) * amplitude + 0.4, Math.cos(angle) * amplitude * 0.5);
    points.push(point.clone());
  }
  return points;
}

export const lineExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
    camera.position.set(0, 2.8, 8.4);
    camera.lookAt(0, 0.4, 0);

    // 共享材质只建一次；geometry 在 apply() 中按顶点数重建。
    const material = new THREE.LineBasicMaterial({ color: '#3d73d9' });
    const line = new THREE.Line(new THREE.BufferGeometry(), material);
    scene.add(line);

    // 顶点标记：橙色小球点缀每个顶点，让读者数清顶点、看出端点位置。
    const markerGeo = new THREE.SphereGeometry(0.08, 12, 8);
    const markerMat = new THREE.MeshBasicMaterial({ color: '#d17832' });
    const markers = new THREE.Group();
    scene.add(markers);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(2));

    function frame() {
      renderer.render(scene, camera);
      emitSnapshot({ line });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { line, markers, markerGeo, markerMat, loop };
  },

  apply(instance, args) {
    const { line, markers, markerGeo, markerMat, loop } = instance;

    // 释放旧 geometry，再用 setFromPoints 一次性写入新顶点。
    line.geometry.dispose();
    const points = buildPoints(args.vertexCount, args.amplitude);
    line.geometry = new THREE.BufferGeometry().setFromPoints(points);

    // 顶点标记同步重建：markerGeo / markerMat 共享，Mesh 本身很轻。
    while (markers.children.length) {
      markers.remove(markers.children[0]);
    }
    points.forEach((p) => {
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(p);
      markers.add(marker);
    });

    loop.renderOnce();
  },

  readout({ line }) {
    const position = line.geometry.getAttribute('position');
    const vertexCount = position ? position.count : 0;
    return [
      ['顶点数 N', vertexCount],
      ['Line 段数', Math.max(0, vertexCount - 1)],
      ['连接规则', 'V0-V1-V2-…-VN-1（连续路径）']
    ];
  }
};
