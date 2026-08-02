/*
演示 LineLoop：在 Line 基础上自动闭合首尾（N 个顶点 → N 段）。

输入是边数和半径；操作后多边形外形和段数读数一起变化。
- LineLoop 只比 Line 多一段“从最后一个顶点回到第一个”，所以段数等于顶点数。
- 适合画规则多边形、闭环轮廓、闭合区域边界。
画面左右分屏：左侧 Line（不闭合，N-1 段），右侧 LineLoop（自动闭合，N 段），共用同一组顶点。
读文件先看 buildPolygon() 构造的顶点序列，再看 create() 中 Line 与 LineLoop 的对照。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const point = new THREE.Vector3();

// 在 X-Y 平面上构造正 N 边形顶点（按角度均匀分布），不显式重复首点。
function buildPolygon(sides, radius) {
  const points = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2;
    point.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    points.push(point.clone());
  }
  return points;
}

export const lineLoopExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
    camera.position.set(0, 0, 7.6);
    camera.lookAt(0, 0, 0);

    // 左：Line（不闭合）；右：LineLoop（自动闭合）。两者共用同一组顶点。
    const openMat = new THREE.LineBasicMaterial({ color: '#3d73d9' });
    const closedMat = new THREE.LineBasicMaterial({ color: '#d17832' });

    const openLine = new THREE.Line(new THREE.BufferGeometry(), openMat);
    openLine.position.x = -2.6;
    scene.add(openLine);

    const closedLine = new THREE.LineLoop(new THREE.BufferGeometry(), closedMat);
    closedLine.position.x = 2.6;
    scene.add(closedLine);

    // 顶点标记：两侧共用 markerGeo / markerMat，让读者数清顶点、看清闭合段从哪里补上。
    const markerGeo = new THREE.SphereGeometry(0.07, 12, 8);
    const markerMat = new THREE.MeshBasicMaterial({ color: '#486156' });
    const openMarkers = new THREE.Group();
    const closedMarkers = new THREE.Group();
    openMarkers.position.x = openLine.position.x;
    closedMarkers.position.x = closedLine.position.x;
    scene.add(openMarkers, closedMarkers);

    scene.add(new THREE.GridHelper(12, 12, '#8ba096', '#d3ded7'));

    function frame() {
      renderer.render(scene, camera);
      emitSnapshot({ openLine, closedLine });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { openLine, closedLine, openMarkers, closedMarkers, markerGeo, markerMat, loop };
  },

  apply(instance, args) {
    const { openLine, closedLine, openMarkers, closedMarkers, markerGeo, markerMat, loop } = instance;

    // 同一组多边形顶点同时交给 Line 和 LineLoop，差异只来自对象类型。
    const points = buildPolygon(args.sides, args.radius);

    openLine.geometry.dispose();
    closedLine.geometry.dispose();
    openLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
    closedLine.geometry = new THREE.BufferGeometry().setFromPoints(points);

    [openMarkers, closedMarkers].forEach((group) => {
      while (group.children.length) {
        group.remove(group.children[0]);
      }
      points.forEach((p) => {
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(p);
        group.add(marker);
      });
    });

    loop.renderOnce();
  },

  readout({ openLine, closedLine }) {
    const openCount = openLine.geometry.getAttribute('position')?.count ?? 0;
    const closedCount = closedLine.geometry.getAttribute('position')?.count ?? 0;
    return [
      ['顶点数 N', openCount],
      ['Line 段数（左）', Math.max(0, openCount - 1)],
      ['LineLoop 段数（右）', closedCount],
      ['右侧连接规则', 'V0-V1-…-VN-1-V0（自动闭合）']
    ];
  },

  captions: ['Line（N-1 段，不闭合）', 'LineLoop（N 段，自动闭合）']
};
