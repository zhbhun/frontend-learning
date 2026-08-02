/*
演示 TextureLoader 的真实异步加载闭环。

输入是一张由本文件生成的 SVG URL；loadAsync() 成功后把 Texture 放进 material.map，
设置颜色空间并重绘。读数显示等待、加载成功或失败，避免把空白画面当作加载状态。
*/

import * as THREE from 'three';

import { createTextureStage } from './texture-example-utils.js';

function createTextureUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="320">
      <rect width="512" height="320" fill="#e9dfc5"/>
      <path d="M0 80h512M0 160h512M0 240h512M128 0v320M256 0v320M384 0v320"
            stroke="#5e7e73" stroke-width="8"/>
      <circle cx="256" cy="160" r="86" fill="#d47a3b"/>
      <text x="256" y="178" text-anchor="middle" font-family="system-ui"
            font-size="54" font-weight="700" fill="white">Texture</text>
    </svg>
  `;

  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}

export const textureLoadingExample = {
  create(canvas, emitSnapshot) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
    camera.position.z = 7;

    const material = new THREE.MeshBasicMaterial({ color: '#d4ddd8' });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.5), material);
    scene.add(plane);

    const state = { status: '等待加载', size: '—', error: '—' };
    const stage = createTextureStage(canvas, scene, camera, () => state);
    stage.setSnapshotEmitter(emitSnapshot);
    stage.render();

    const url = createTextureUrl();
    const loader = new THREE.TextureLoader();

    loader.loadAsync(url).then(
      (texture) => {
        // map / emissiveMap 是颜色数据；加载器不会替应用猜测颜色空间。
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
        state.status = '加载成功';
        state.size = `${texture.image.width} × ${texture.image.height}`;
        URL.revokeObjectURL(url);
        stage.render();
      },
      (error) => {
        state.status = '加载失败';
        state.error = error.message;
        URL.revokeObjectURL(url);
        stage.render();
      }
    );

    return { stage };
  },

  apply(instance) {
    instance.stage.render();
  },

  readout(snapshot) {
    return [
      ['状态', snapshot.status],
      ['图片尺寸', snapshot.size],
      ['错误', snapshot.error]
    ];
  }
};

