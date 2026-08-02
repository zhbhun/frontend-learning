/*
本范例演示 CSS 显示尺寸、drawing buffer、pixel ratio 与相机投影的同步关系。
输入是 resizeMode、displayAspect 与 pixelRatio；主要操作是改变舞台 CSS 宽高比，再按所选策略更新 renderer 和 camera。
预期结果：correct 时三组比例一致；css-only 时 drawing buffer 保持旧尺寸；skip-projection-update 时
camera.aspect 属性已经变化，但 projectionMatrix 仍保留旧宽高比，圆环会被拉成椭圆。
读代码先看 resize() 的三个分支，再用 publishSnapshot() 对照属性值与真正生效的矩阵值。
*/

import * as THREE from 'three';

const modeLabels = {
  correct: '完整同步',
  'css-only': '只改 CSS',
  'skip-projection-update': '漏更新投影矩阵'
};

export const resizePipelineExample = {
  create(canvas, emitSnapshot) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true
    });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
    camera.position.z = 4;

    const ringGeometry = new THREE.TorusGeometry(0.85, 0.2, 24, 72);
    const ringMaterial = new THREE.MeshNormalMaterial();
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.set(0.25, 0.35, 0);
    scene.add(ring);

    const state = {
      mode: 'correct',
      displayAspect: 16 / 9,
      pixelRatio: 1
    };
    const logicalSize = new THREE.Vector2();
    const bufferSize = new THREE.Vector2();

    function publishSnapshot(width, height) {
      renderer.getSize(logicalSize);
      renderer.getDrawingBufferSize(bufferSize);

      // 透视投影矩阵中 m[5] / m[0] 是真正写入矩阵的宽高比。
      const matrixAspect =
        camera.projectionMatrix.elements[5] /
        camera.projectionMatrix.elements[0];

      emitSnapshot({
        mode: modeLabels[state.mode],
        cssSize: `${width} × ${height}`,
        logicalSize: `${Math.round(logicalSize.x)} × ${Math.round(logicalSize.y)}`,
        bufferSize: `${Math.round(bufferSize.x)} × ${Math.round(bufferSize.y)}`,
        pixelRatio: renderer.getPixelRatio(),
        cssAspect: width / height,
        propertyAspect: camera.aspect,
        matrixAspect
      });
    }

    function resize() {
      const parent = canvas.parentElement;
      const width = Math.max(1, Math.floor(parent.clientWidth));
      const height = Math.max(1, Math.floor(parent.clientHeight));
      const nextAspect = width / height;

      if (state.mode === 'correct') {
        renderer.setSize(width, height, false);
        camera.aspect = nextAspect;
        camera.updateProjectionMatrix();
      } else if (state.mode === 'skip-projection-update') {
        renderer.setSize(width, height, false);
        camera.aspect = nextAspect;
        // 故意遗漏 camera.updateProjectionMatrix()，用于观察“属性新、矩阵旧”。
      }

      // css-only 分支故意只让父元素布局变化，不同步 renderer 和 camera。
      renderer.render(scene, camera);
      publishSnapshot(width, height);
    }

    renderer.setPixelRatio(state.pixelRatio);
    renderer.setSize(640, 360, false);
    camera.updateProjectionMatrix();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement);
    resize();

    return {
      state,
      resize,
      setDisplayAspect(aspect) {
        state.displayAspect = aspect;
        canvas.parentElement.style.aspectRatio = String(aspect);
        resize();
      },
      setPixelRatio(pixelRatio) {
        state.pixelRatio = pixelRatio;
        renderer.setPixelRatio(pixelRatio);
        resize();
      },
      dispose() {
        observer.disconnect();
        ringGeometry.dispose();
        ringMaterial.dispose();
        renderer.dispose();
      }
    };
  },

  apply(instance, args) {
    instance.state.mode = args.resizeMode;
    instance.setPixelRatio(args.pixelRatio);
    instance.setDisplayAspect(args.displayAspect);
  },

  readout(snapshot) {
    return [
      ['尺寸策略', snapshot.mode],
      ['CSS 尺寸', snapshot.cssSize],
      ['renderer 逻辑尺寸', snapshot.logicalSize],
      ['drawing buffer', snapshot.bufferSize],
      ['pixel ratio', snapshot.pixelRatio.toFixed(2)],
      ['CSS 宽高比', snapshot.cssAspect.toFixed(3)],
      ['camera.aspect 属性', snapshot.propertyAspect.toFixed(3)],
      ['投影矩阵宽高比', snapshot.matrixAspect.toFixed(3)]
    ];
  }
};
