/*
纹理课范例共用的最小舞台与贴图预览条。

输入是 canvas、scene、camera 和快照读取函数；resize 时同步 renderer，随后把真实
Texture 状态写入读数。范例本身没有持续动画，只在参数或尺寸变化时重绘。

贴图预览条挂在 .cs-stage 右上角，展示当前材质槽用到的源图，便于和 3D 画面对照。
*/

import * as THREE from 'three';

export function createTextureStage(canvas, scene, camera, readSnapshot) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#edf3ef', 1);

  let emitSnapshot = () => {};

  function render() {
    renderer.render(scene, camera);
    emitSnapshot(readSnapshot());
  }

  function resize() {
    const root = canvas.parentElement;
    const width = Math.max(1, Math.floor(root.clientWidth));
    const height = Math.max(1, Math.floor(root.clientHeight));

    renderer.setSize(width, height, false);

    if (camera.isPerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    render();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);
  resize();

  return {
    setSnapshotEmitter(nextEmitter) {
      emitSnapshot = nextEmitter;
    },
    render,
    dispose() {
      observer.disconnect();
      renderer.dispose();
    }
  };
}

export function createUvGrid(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const cell = size / 4;

  context.fillStyle = '#f7f1df';
  context.fillRect(0, 0, size, size);

  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? '#2f6f61' : '#d99143';
      context.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  context.lineWidth = Math.max(2, size / 64);
  context.strokeStyle = '#152b25';
  context.strokeRect(1, 1, size - 2, size - 2);

  context.fillStyle = '#ffffff';
  context.font = `700 ${Math.round(size / 8)}px system-ui`;
  context.textBaseline = 'top';
  context.fillText('UV', size / 24, size / 32);

  context.fillStyle = '#b4382f';
  context.beginPath();
  context.moveTo(size * 0.84, size * 0.08);
  context.lineTo(size * 0.95, size * 0.16);
  context.lineTo(size * 0.84, size * 0.24);
  context.closePath();
  context.fill();

  return canvas;
}

/**
 * 在舞台右上角挂贴图预览条。
 * slots: [{ id, label, texture?, source?, active? }]
 * - texture：THREE.Texture，从其 image / data 生成缩略图
 * - source：HTMLCanvasElement / HTMLImageElement / ImageBitmap，直接展示
 * - active：false 时变灰，表示槽位未挂上
 */
export function mountMapPreviews(stageRoot, slots) {
  let root = stageRoot.querySelector('.cs-map-previews');

  if (!root) {
    root = document.createElement('div');
    root.className = 'cs-map-previews';
    stageRoot.append(root);
  }

  root.replaceChildren();

  for (const slot of slots) {
    const card = document.createElement('div');
    card.className = 'cs-map-preview';
    if (slot.active === false) {
      card.classList.add('is-off');
    }

    const label = document.createElement('p');
    label.className = 'cs-map-preview__label';
    label.textContent = slot.label;
    card.append(label);

    const visual = resolvePreviewVisual(slot);
    if (visual) {
      visual.className = 'cs-map-preview__frame';
      visual.alt = slot.label;
      card.append(visual);
    } else {
      const empty = document.createElement('div');
      empty.className = 'cs-map-preview__empty';
      empty.textContent = slot.placeholder || '未挂上';
      card.append(empty);
    }

    root.append(card);
  }

  return {
    update(nextSlots) {
      mountMapPreviews(stageRoot, nextSlots);
    }
  };
}

function resolvePreviewVisual(slot) {
  if (slot.source) {
    return clonePreviewSource(slot.source);
  }

  if (!slot.texture) {
    return null;
  }

  return textureToPreviewElement(slot.texture);
}

function clonePreviewSource(source) {
  // 一律画到 canvas，避免 blob:/临时 URL 被 revoke 后 <img src> 破图。
  if (
    source instanceof HTMLCanvasElement ||
    source instanceof HTMLImageElement ||
    source instanceof SVGImageElement ||
    (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap)
  ) {
    const width =
      source.naturalWidth ||
      source.videoWidth ||
      source.width ||
      0;
    const height =
      source.naturalHeight ||
      source.videoHeight ||
      source.height ||
      0;

    if (!width || !height) {
      return null;
    }

    const copy = document.createElement('canvas');
    copy.width = width;
    copy.height = height;

    try {
      copy.getContext('2d').drawImage(source, 0, 0);
      return copy;
    } catch {
      return null;
    }
  }

  return null;
}

function textureToPreviewElement(texture) {
  const image = texture.image;
  if (!image) {
    return null;
  }

  if (
    image instanceof HTMLCanvasElement ||
    image instanceof HTMLImageElement ||
    image instanceof SVGImageElement ||
    (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap)
  ) {
    return clonePreviewSource(image);
  }

  // DataTexture：TypedArray + width/height
  if (image.data && image.width && image.height) {
    return dataImageToCanvas(image, texture.format);
  }

  return null;
}

function dataImageToCanvas(image, format) {
  const { width, height, data } = image;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(width, height);
  const out = pixels.data;
  const channels =
    format === THREE.RedFormat || format === THREE.RedIntegerFormat
      ? 1
      : format === THREE.RGFormat || format === THREE.RGIntegerFormat
        ? 2
        : format === THREE.RGBAFormat || format === THREE.RGBAIntegerFormat
          ? 4
          : 3;

  for (let i = 0, p = 0; i < width * height; i += 1, p += channels) {
    const o = i * 4;
    if (channels === 1) {
      const v = data[p];
      out[o] = v;
      out[o + 1] = v;
      out[o + 2] = v;
      out[o + 3] = 255;
    } else if (channels === 2) {
      out[o] = data[p];
      out[o + 1] = data[p + 1];
      out[o + 2] = 0;
      out[o + 3] = 255;
    } else if (channels === 3) {
      out[o] = data[p];
      out[o + 1] = data[p + 1];
      out[o + 2] = data[p + 2];
      out[o + 3] = 255;
    } else {
      out[o] = data[p];
      out[o + 1] = data[p + 1];
      out[o + 2] = data[p + 2];
      out[o + 3] = data[p + 3];
    }
  }

  context.putImageData(pixels, 0, 0);
  return canvas;
}
