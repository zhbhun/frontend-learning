/*
演示同一材质里的 map、roughnessMap 与 normalMap 分别改变什么。

三个开关直接写入 MeshStandardMaterial 对应槽位；右上角预览条显示三张源图，
关闭槽位时对应预览变灰。添加或移除贴图会改变 shader 分支，因此必须设置
material.needsUpdate。
*/

import * as THREE from 'three';

import {
  createTextureStage,
  createUvGrid,
  mountMapPreviews
} from './texture-example-utils.js';

function createRoughnessMap(size = 128) {
  const data = new Uint8Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      data[y * size + x] = Math.round((x / (size - 1)) * 255);
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RedFormat,
    THREE.UnsignedByteType
  );
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createNormalMap(size = 128) {
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const waveX = Math.sin((x / size) * Math.PI * 12) * 0.28;
      const waveY = Math.cos((y / size) * Math.PI * 12) * 0.28;
      const normal = new THREE.Vector3(waveX, waveY, 1).normalize();

      data[index] = Math.round((normal.x * 0.5 + 0.5) * 255);
      data[index + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      data[index + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.needsUpdate = true;
  return texture;
}

function previewSlots(colorMap, roughnessMap, normalMap, args) {
  return [
    {
      id: 'map',
      label: 'map',
      texture: colorMap,
      active: Boolean(args?.colorMap ?? true)
    },
    {
      id: 'roughnessMap',
      label: 'roughnessMap',
      texture: roughnessMap,
      active: Boolean(args?.roughnessMap ?? true)
    },
    {
      id: 'normalMap',
      label: 'normalMap',
      texture: normalMap,
      active: Boolean(args?.normalMap ?? true)
    }
  ];
}

export const materialMapSlotsExample = {
  create(canvas, emitSnapshot) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
    camera.position.set(0, 0.5, 7);
    camera.lookAt(0, 0, 0);

    const colorMap = new THREE.CanvasTexture(createUvGrid());
    colorMap.colorSpace = THREE.SRGBColorSpace;
    const roughnessMap = createRoughnessMap();
    const normalMap = createNormalMap();

    const material = new THREE.MeshStandardMaterial({
      color: '#d8d1bd',
      metalness: 0.15,
      roughness: 0.55,
      normalScale: new THREE.Vector2(0.8, 0.8)
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(2.05, 96, 64), material);
    mesh.rotation.y = -0.45;
    scene.add(mesh);

    const key = new THREE.DirectionalLight('#ffffff', 4.2);
    key.position.set(3, 4, 5);
    const fill = new THREE.HemisphereLight('#dce9ff', '#705c48', 1.2);
    scene.add(key, fill);

    const stage = createTextureStage(canvas, scene, camera, () => ({
      map: material.map ? '颜色（sRGB）' : '未使用',
      roughnessMap: material.roughnessMap ? '粗糙度（数据）' : '未使用',
      normalMap: material.normalMap ? '切线空间法线（数据）' : '未使用'
    }));
    stage.setSnapshotEmitter(emitSnapshot);

    const previews = mountMapPreviews(
      canvas.parentElement,
      previewSlots(colorMap, roughnessMap, normalMap)
    );

    return {
      colorMap,
      material,
      normalMap,
      roughnessMap,
      stage,
      previews
    };
  },

  apply(instance, args) {
    instance.material.map = args.colorMap ? instance.colorMap : null;
    instance.material.roughnessMap = args.roughnessMap
      ? instance.roughnessMap
      : null;
    instance.material.normalMap = args.normalMap ? instance.normalMap : null;
    instance.material.needsUpdate = true;

    instance.previews.update(
      previewSlots(
        instance.colorMap,
        instance.roughnessMap,
        instance.normalMap,
        args
      )
    );
    instance.stage.render();
  },

  readout(snapshot) {
    return [
      ['map', snapshot.map],
      ['roughnessMap', snapshot.roughnessMap],
      ['normalMap', snapshot.normalMap]
    ];
  }
};
