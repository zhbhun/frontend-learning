/*
演示 LineSegments：把相邻顶点两两配对成独立线段（V0-V1、V2-V3……）。

输入是原几何类型和线段来源；操作后画面线框密度和段数读数一起变化。
- EdgesGeometry 只保留面之间夹角超过阈值的边，适合做简洁轮廓 / 边框。
- WireframeGeometry 把每个三角形的所有边都展开成线段，密度大、像 wireframe。
两种 geometry 都已按 LineSegments 的“两两配对”格式排好顶点（每两个一段），不必再手工凑 2N。
读文件先看 makeLineSegments() 中两种来源的差异，再看段数 = 顶点数 / 2。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const geometries = {
  box: () => new THREE.BoxGeometry(2, 2, 2),
  sphere: () => new THREE.SphereGeometry(1.3, 18, 12),
  torusKnot: () => new THREE.TorusKnotGeometry(1, 0.32, 64, 12)
};

// 把指定原几何展开成 LineSegments 可用的几何：EdgesGeometry 或 WireframeGeometry。
function makeLineSegments(geometryType, sourceType) {
  const source = geometries[geometryType]();
  const segments =
    sourceType === 'edges'
      ? new THREE.EdgesGeometry(source, 18)
      : new THREE.WireframeGeometry(source);
  source.dispose();
  return segments;
}

export const lineSegmentsExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
    camera.position.set(3.6, 2.8, 5);
    camera.lookAt(0, 0, 0);

    const material = new THREE.LineBasicMaterial({ color: '#3d73d9' });
    const segments = new THREE.LineSegments(new THREE.BufferGeometry(), material);
    scene.add(segments);

    // 半透明实心参照体：让读者看清线框是包在哪个面上，而不是悬空线条。
    const reference = new THREE.Mesh(
      geometries.box(),
      new THREE.MeshStandardMaterial({
        color: '#2f8b72',
        transparent: true,
        opacity: 0.18,
        roughness: 0.5
      })
    );
    scene.add(reference);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(2));

    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(4, 7, 5);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.9), key);

    const state = { geometryType: 'box', sourceType: 'edges' };

    function frame(delta) {
      // 同步旋转线框和参照体，两者始终对齐。
      segments.rotation.y += delta * 0.3;
      reference.rotation.y = segments.rotation.y;
      renderer.render(scene, camera);
      emitSnapshot({ segments, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { segments, reference, state, loop };
  },

  apply(instance, args) {
    const { segments, reference, state, loop } = instance;

    // LineSegments 的 geometry 来自 EdgesGeometry / WireframeGeometry，本身已是 2N 顶点。
    segments.geometry.dispose();
    reference.geometry.dispose();
    segments.geometry = makeLineSegments(args.geometryType, args.sourceType);
    reference.geometry = geometries[args.geometryType]();

    state.geometryType = args.geometryType;
    state.sourceType = args.sourceType;
    loop.renderOnce();
  },

  readout({ segments, state }) {
    const position = segments.geometry.getAttribute('position');
    const vertexCount = position ? position.count : 0;
    return [
      ['来源', state.sourceType === 'edges' ? 'EdgesGeometry' : 'WireframeGeometry'],
      ['原几何', state.geometryType],
      ['顶点数', vertexCount],
      ['LineSegments 段数', Math.floor(vertexCount / 2)],
      ['连接规则', 'V0-V1、V2-V3、…（两两配对）']
    ];
  }
};
