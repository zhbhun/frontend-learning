/*
本范例演示 OutlinePass 如何给"被选中对象"加描边，并衔接拾取课的"选中"语义。

输入：
- selectedName：当前选中的对象名（用控件切换；真实项目里通常由 Raycaster 命中后写入）。
- edgeStrength：描边强度，控制边缘叠加的明显程度。
- edgeThickness：描边厚度，控制模糊核半径。

主要对象：
- composer：EffectComposer(renderer)。
- renderPass：RenderPass(scene, camera)，链路第一步。
- outlinePass：OutlinePass(resolution, scene, camera, selectedObjects)。它每帧把
  selectedObjects 单独画一遍蒙版，再做高斯模糊、与原图叠加形成描边。
  切换选中对象只需替换 outlinePass.selectedObjects 数组。
- outputPass：OutputPass()，链尾统一颜色空间。

预期结果：选中的对象边缘出现高对比描边；未选中的对象保持原样。
切换 selectedName 时，描边会从旧对象移到新对象；改变 edgeStrength / edgeThickness 立即生效。
读代码先看 applySelection()，再看 frame() 怎么把描边 pass 接到渲染循环里。
*/

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const outlineSelectionExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1b1f26');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(4.2, 2.6, 5.6);
    camera.lookAt(0, 0.5, 0);

    // 几个可命名的对象：选中哪个就给谁加描边。
    const pickables = [
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.6, 0),
        new THREE.MeshStandardMaterial({ color: '#e8d8b5', roughness: 0.35, metalness: 0.15 })
      ),
      new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.45 })
      ),
      new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.4, 0.14, 100, 16),
        new THREE.MeshStandardMaterial({ color: '#d17832', roughness: 0.4 })
      ),
      new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 28, 18),
        new THREE.MeshStandardMaterial({ color: '#2f8b72', roughness: 0.5 })
      )
    ];
    pickables[0].name = '雕塑';
    pickables[1].name = '方块';
    pickables[2].name = '扭结';
    pickables[3].name = '球体';
    pickables[0].position.set(-2.1, 0.65, 0.4);
    pickables[1].position.set(-0.7, 0.55, -0.6);
    pickables[2].position.set(0.8, 0.55, 0.4);
    pickables[3].position.set(2.2, 0.65, -0.3);
    pickables.forEach((mesh) => scene.add(mesh));

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({ color: '#2a2f37', roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const key = new THREE.DirectionalLight('#fff3d6', 2.4);
    key.position.set(3, 5, 4);
    scene.add(key, key.target);
    scene.add(new THREE.HemisphereLight('#9aa4b8', '#1a1d22', 0.45));

    // —— 后处理链路 ——
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const outlinePass = new OutlinePass(
      new THREE.Vector2(1024, 1024),
      scene,
      camera,
      []
    );
    // visibleEdgeColor 是描边的可见边缘颜色；hiddenEdgeColor 是被遮挡部分的暗示色。
    outlinePass.visibleEdgeColor.set('#ffd66e');
    outlinePass.hiddenEdgeColor.set('#7a4a12');
    const outputPass = new OutputPass();

    composer.addPass(renderPass);
    composer.addPass(outlinePass);
    composer.addPass(outputPass);

    const state = {
      selectedName: '雕塑',
      edgeStrength: 4.0,
      edgeThickness: 1.5
    };

    function applySelection() {
      const target = pickables.find((mesh) => mesh.name === state.selectedName);
      // OutlinePass 通过 selectedObjects 数组决定给谁加描边；赋新数组即可切换。
      outlinePass.selectedObjects = target ? [target] : [];
      outlinePass.edgeStrength = state.edgeStrength;
      outlinePass.edgeThickness = state.edgeThickness;
    }

    applySelection();

    function frame(delta) {
      pickables.forEach((mesh, index) => {
        mesh.rotation.y += delta * (0.2 + index * 0.05);
      });
      // OutlinePass 需要 scene 和 camera 每帧的最新状态；composer.render 会把它的内部
      // 蒙版相机同步到主相机，所以这里不需要单独更新。
      composer.render(delta);
      emitSnapshot({ state, pickables });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { state, loop, applySelection, pickables };
  },

  apply(instance, args) {
    const { state, loop, applySelection } = instance;
    state.selectedName = args.selectedName;
    state.edgeStrength = args.edgeStrength;
    state.edgeThickness = args.edgeThickness;
    applySelection();
    loop.renderOnce();
  },

  readout({ state, pickables }) {
    const found = pickables.some((mesh) => mesh.name === state.selectedName);
    return [
      ['选中对象', found ? state.selectedName : '（无）'],
      ['selectedObjects', found ? `[${state.selectedName}]` : '[]'],
      ['edgeStrength', state.edgeStrength.toFixed(2)],
      ['edgeThickness', state.edgeThickness.toFixed(2)]
    ];
  }
};
