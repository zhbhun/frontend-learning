/*
演示 UV 变换与包裹方式怎样共同决定采样位置。

输入是 repeat、offset、rotation 和 wrapping；主要操作是把它们写入 Texture。
预期结果是 Repeat 会平铺，Mirrored repeat 会交替镜像，Clamp 会把边缘像素拉伸。
读文件时先看 applyUvAndWrapping() 里“变换”和“边界”两组设置。
*/

import * as THREE from 'three';

import {
  createTextureStage,
  createUvGrid,
  mountMapPreviews
} from './texture-example-utils.js';

const WRAPPING = {
  ClampToEdgeWrapping: THREE.ClampToEdgeWrapping,
  RepeatWrapping: THREE.RepeatWrapping,
  MirroredRepeatWrapping: THREE.MirroredRepeatWrapping
};

export const uvAndWrappingExample = {
  create(canvas, emitSnapshot) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
    camera.position.set(0, 0, 8);

    const texture = new THREE.CanvasTexture(createUvGrid());
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.center.set(0.5, 0.5);

    const material = new THREE.MeshBasicMaterial({ map: texture });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.2), material);
    scene.add(plane);

    const state = { wrapping: 'RepeatWrapping' };
    const stage = createTextureStage(canvas, scene, camera, () => ({
      geometry: 'PlaneGeometry（含 uv）',
      repeat: `${texture.repeat.x.toFixed(1)} × ${texture.repeat.y.toFixed(1)}`,
      offset: `${texture.offset.x.toFixed(2)}, ${texture.offset.y.toFixed(2)}`,
      rotation: `${THREE.MathUtils.radToDeg(texture.rotation).toFixed(0)}°`,
      wrapping: state.wrapping,
      version: texture.version
    }));
    stage.setSnapshotEmitter(emitSnapshot);

    mountMapPreviews(canvas.parentElement, [
      { id: 'map', label: 'map 源图', texture, active: true }
    ]);

    return { stage, texture, state };
  },

  apply(instance, args) {
    const wrapping = WRAPPING[args.wrapping];

    // repeat / offset / rotation 会由 matrixAutoUpdate 组成 UV 变换矩阵。
    instance.texture.repeat.set(args.repeatX, args.repeatY);
    instance.texture.offset.set(args.offsetX, args.offsetY);
    instance.texture.rotation = THREE.MathUtils.degToRad(args.rotation);

    // 包裹方式是 GPU 采样状态。初次上传后修改时必须标记 needsUpdate。
    if (
      instance.texture.wrapS !== wrapping ||
      instance.texture.wrapT !== wrapping
    ) {
      instance.texture.wrapS = wrapping;
      instance.texture.wrapT = wrapping;
      instance.texture.needsUpdate = true;
    }

    instance.state.wrapping = args.wrapping;
    instance.stage.render();
  },

  readout(snapshot) {
    return [
      ['几何', snapshot.geometry],
      ['repeat', snapshot.repeat],
      ['offset', snapshot.offset],
      ['rotation', snapshot.rotation],
      ['wrapS / wrapT', snapshot.wrapping],
      ['上传版本', snapshot.version]
    ];
  }
};

