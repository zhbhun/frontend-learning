/*
用同一份颜色像素比较 SRGBColorSpace 与 NoColorSpace 的解释差异。

两张纹理共享同一 Canvas 图像，唯一差异是 colorSpace。左侧把颜色值先解码到线性空间，
右侧把相同数值当线性数据；因此右侧中间调会明显偏亮。
*/

import * as THREE from 'three';

import { createTextureStage } from './texture-example-utils.js';

function createColorRamp() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#121820');
  gradient.addColorStop(0.5, '#7aa2d6');
  gradient.addColorStop(1, '#f4cf65');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#808080';
  context.fillRect(0, canvas.height * 0.72, canvas.width, canvas.height * 0.28);
  return canvas;
}

export const colorSpaceExample = {
  create(canvas, emitSnapshot) {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-5, 5, 2.8, -2.8, 0.1, 20);
    camera.position.z = 8;

    const image = createColorRamp();
    const srgbTexture = new THREE.CanvasTexture(image);
    srgbTexture.colorSpace = THREE.SRGBColorSpace;

    const dataTexture = new THREE.CanvasTexture(image);
    dataTexture.colorSpace = THREE.NoColorSpace;

    const geometry = new THREE.PlaneGeometry(4.25, 3.25);
    const srgbPlane = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ map: srgbTexture })
    );
    srgbPlane.position.x = -2.3;

    const dataPlane = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ map: dataTexture })
    );
    dataPlane.position.x = 2.3;
    scene.add(srgbPlane, dataPlane);

    const stage = createTextureStage(canvas, scene, camera, () => ({
      left: srgbTexture.colorSpace,
      right: dataTexture.colorSpace,
      output: THREE.SRGBColorSpace
    }));
    stage.setSnapshotEmitter(emitSnapshot);
    stage.render();

    return { stage };
  },

  apply(instance) {
    instance.stage.render();
  },

  readout(snapshot) {
    return [
      ['左侧颜色纹理', snapshot.left],
      ['右侧数据纹理', snapshot.right],
      ['renderer 输出', snapshot.output]
    ];
  },

  captions: ['颜色数据：SRGBColorSpace', '错误对照：NoColorSpace']
};

