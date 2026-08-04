/*
演示 Geometry + Material + Texture 怎样组合出带贴图的 Mesh。

几何用内置 BoxGeometry（自带 uv）；材质先只有纯色，TextureLoader 异步成功后把图
挂到 material.map。右上角预览条显示 map 源图；读数标出几何、材质与槽位状态。
*/

import * as THREE from 'three';

import {
  createTextureStage,
  mountMapPreviews
} from './texture-example-utils.js';

function createTextureUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <rect width="512" height="512" fill="#e9dfc5"/>
      <path d="M0 128h512M0 256h512M0 384h512M128 0v512M256 0v512M384 0v512"
            stroke="#5e7e73" stroke-width="10"/>
      <circle cx="256" cy="256" r="96" fill="#d47a3b"/>
      <text x="256" y="276" text-anchor="middle" font-family="system-ui"
            font-size="56" font-weight="700" fill="white">map</text>
    </svg>
  `;

  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}

export const textureLoadingExample = {
  create(canvas, emitSnapshot) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
    camera.position.set(3.2, 2.4, 5.2);
    camera.lookAt(0, 0, 0);

    const geometry = new THREE.BoxGeometry(2.2, 2.2, 2.2);
    const material = new THREE.MeshStandardMaterial({
      color: '#d4ddd8',
      roughness: 0.55,
      metalness: 0.08
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const key = new THREE.DirectionalLight('#ffffff', 2.8);
    key.position.set(4, 6, 5);
    scene.add(key, new THREE.AmbientLight('#ffffff', 0.55));

    const state = {
      status: '等待加载',
      size: '—',
      error: '—',
      map: '未挂上'
    };

    const stage = createTextureStage(canvas, scene, camera, () => ({
      ...state,
      geometry: 'BoxGeometry（含 uv）',
      material: 'MeshStandardMaterial'
    }));
    stage.setSnapshotEmitter(emitSnapshot);

    const previews = mountMapPreviews(canvas.parentElement, [
      {
        id: 'map',
        label: 'map',
        active: false,
        placeholder: '加载中'
      }
    ]);

    stage.render();

    const url = createTextureUrl();
    const loader = new THREE.TextureLoader();

    loader.loadAsync(url).then(
      (texture) => {
        // map 是颜色数据；加载器不会替应用猜测颜色空间。
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;

        state.status = '加载成功';
        state.size = `${texture.image.width} × ${texture.image.height}`;
        state.map = '已挂上';

        // 先把已解码的 image 栅格进预览，再 revoke blob URL，避免缩略图破图。
        previews.update([
          {
            id: 'map',
            label: 'map',
            texture,
            active: true
          }
        ]);
        URL.revokeObjectURL(url);
        stage.render();
      },
      (error) => {
        state.status = '加载失败';
        state.error = error.message;
        URL.revokeObjectURL(url);
        previews.update([
          {
            id: 'map',
            label: 'map',
            active: false,
            placeholder: '失败'
          }
        ]);
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
      ['几何', snapshot.geometry],
      ['材质', snapshot.material],
      ['map', snapshot.map],
      ['状态', snapshot.status],
      ['图片尺寸', snapshot.size],
      ['错误', snapshot.error]
    ];
  }
};
