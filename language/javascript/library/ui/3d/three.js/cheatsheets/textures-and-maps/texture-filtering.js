/*
演示过滤器怎样处理“纹素与屏幕像素数量不一致”。

输入是采样预设、观察距离与各向异性；主要操作是设置 magFilter、minFilter 和
anisotropy。倾斜平面让远端纹理被强烈缩小，可以直接观察锯齿、模糊与 mipmap 差异。
*/

import * as THREE from 'three';

import {
  createTextureStage,
  createUvGrid,
  mountMapPreviews
} from './texture-example-utils.js';

const FILTERS = {
  nearest: {
    mag: THREE.NearestFilter,
    min: THREE.NearestFilter,
    label: 'NearestFilter'
  },
  linear: {
    mag: THREE.LinearFilter,
    min: THREE.LinearFilter,
    label: 'LinearFilter（无 mipmap）'
  },
  mipmap: {
    mag: THREE.LinearFilter,
    min: THREE.LinearMipmapLinearFilter,
    label: 'LinearMipmapLinearFilter'
  }
};

export const textureFilteringExample = {
  create(canvas, emitSnapshot) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(0, 3.2, 6);
    camera.lookAt(0, -0.2, -2.5);

    const texture = new THREE.CanvasTexture(createUvGrid(64));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 16);

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 14),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    plane.rotation.x = -Math.PI / 2.35;
    plane.position.z = -3.2;
    scene.add(plane);

    const state = { label: '' };
    const stage = createTextureStage(canvas, scene, camera, () => ({
      filter: state.label,
      distance: camera.position.z.toFixed(1),
      anisotropy: texture.anisotropy,
      mipmaps: texture.generateMipmaps ? '自动生成' : '关闭'
    }));
    stage.setSnapshotEmitter(emitSnapshot);

    mountMapPreviews(canvas.parentElement, [
      { id: 'map', label: 'map 源图', texture, active: true }
    ]);

    return { camera, stage, state, texture };
  },

  apply(instance, args) {
    const preset = FILTERS[args.filter];

    instance.texture.magFilter = preset.mag;
    instance.texture.minFilter = preset.min;
    instance.texture.anisotropy = args.anisotropy;
    instance.texture.generateMipmaps = true;
    instance.texture.needsUpdate = true;

    instance.camera.position.z = args.distance;
    instance.camera.lookAt(0, -0.2, -2.5);
    instance.state.label = preset.label;
    instance.stage.render();
  },

  readout(snapshot) {
    return [
      ['采样预设', snapshot.filter],
      ['相机 z', snapshot.distance],
      ['anisotropy', snapshot.anisotropy],
      ['mipmap', snapshot.mipmaps]
    ];
  }
};

