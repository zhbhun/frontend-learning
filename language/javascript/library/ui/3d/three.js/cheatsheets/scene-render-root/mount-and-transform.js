/*
演示 Scene 作为渲染根的挂载，以及 Scene 继承 Object3D 后的变换语义。

输入：变换写到 scene 还是内容 Group、平移 X、旋转 Y、是否额外挂一个标记。
预期：children 读数随挂载变化；同样增量写到 scene 与写到内容 Group，世界坐标语义不同。
读文件时先看 apply()：相机始终不入树，变换目标在 scene / content 间切换。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

const worldPosition = new THREE.Vector3();

export const mountAndTransformExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
    camera.position.set(7, 6, 9);
    camera.lookAt(0, 1, 0);

    const content = new THREE.Group();
    content.name = 'content';
    scene.add(content);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.45 })
    );
    mesh.position.set(2.2, 0.7, 0);
    content.add(mesh);
    content.add(new THREE.AxesHelper(1.6));

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 20, 14),
      new THREE.MeshStandardMaterial({ color: '#d17832', roughness: 0.5 })
    );
    marker.position.set(-2.4, 0.7, 0);
    marker.visible = false;

    scene.add(new THREE.GridHelper(12, 12, '#8ba096', '#d3ded7'));
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(4, 7, 5);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.8), key);

    const state = {
      transformTarget: '内容 Group',
      showMarker: false
    };

    function frame() {
      mesh.getWorldPosition(worldPosition);
      renderer.render(scene, camera);
      emitSnapshot({ scene, content, camera, mesh, state, worldPosition });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { scene, content, camera, mesh, marker, state, loop };
  },

  apply(instance, args) {
    const { scene, content, marker, state, loop } = instance;

    // 先清零两侧，避免上一次写到 scene / content 的增量叠在一起。
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);
    content.position.set(0, 0, 0);
    content.rotation.set(0, 0, 0);

    const target = args.transformTarget === 'scene' ? scene : content;
    target.position.x = args.offsetX;
    target.rotation.y = THREE.MathUtils.degToRad(args.rotationY);

    state.transformTarget = args.transformTarget === 'scene' ? 'scene' : '内容 Group';
    state.showMarker = args.showMarker;

    if (args.showMarker) {
      if (marker.parent !== scene) {
        scene.add(marker);
      }
      marker.visible = true;
    } else if (marker.parent === scene) {
      scene.remove(marker);
      marker.visible = false;
    }

    loop.renderOnce();
  },

  readout({ scene, content, camera, state, worldPosition }) {
    return [
      ['scene.children', scene.children.length],
      ['camera.parent', camera.parent ? camera.parent.type : 'null（未入树）'],
      ['变换目标', state.transformTarget],
      ['scene.position', formatVector(scene.position)],
      ['content.position', formatVector(content.position)],
      ['网格世界 position', formatVector(worldPosition)]
    ];
  }
};
