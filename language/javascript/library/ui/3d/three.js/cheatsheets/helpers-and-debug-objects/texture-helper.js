/*
演示 TextureHelper：把纹理显示成平面/盒体以便预览。

输入：宽高与深度。
预期：Helper 显示程序生成的棋盘纹理，不依赖正式材质。
*/

import * as THREE from 'three';
import { TextureHelper } from 'three/addons/helpers/TextureHelper.js';

import { createHelpersExampleFrame } from './helpers-example-frame.js';

function makeCheckerTexture() {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const light = ((x >> 3) + (y >> 3)) % 2 === 0;
      const v = light ? 230 : 60;
      data[i] = v;
      data[i + 1] = light ? 210 : 90;
      data[i + 2] = light ? 160 : 120;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const textureHelperExample = {
  create(canvas, emitSnapshot) {
    const frame = createHelpersExampleFrame({
      canvas,
      emitSnapshot,
      withGroundGrid: true,
      build({ scene }) {
        const texture = makeCheckerTexture();
        let helper = new TextureHelper(texture, 2, 2, 0.2);
        helper.position.y = 1.2;
        scene.add(helper);

        return {
          texture,
          get helper() {
            return helper;
          },
          replaceHelper(next) {
            scene.remove(helper);
            helper.dispose();
            helper = next;
            helper.position.y = 1.2;
            scene.add(helper);
          },
          width: 2,
          height: 2,
          depth: 0.2
        };
      },
      readSnapshot({ width, height, depth }) {
        return { width, height, depth };
      }
    });

    return {
      frame,
      dispose() {
        frame.dispose();
      }
    };
  },

  apply(instance, args) {
    const { frame } = instance;
    if (
      args.width !== frame.width ||
      args.height !== frame.height ||
      args.depth !== frame.depth
    ) {
      frame.width = args.width;
      frame.height = args.height;
      frame.depth = args.depth;
      frame.replaceHelper(
        new TextureHelper(frame.texture, args.width, args.height, args.depth)
      );
    }
    frame.render();
  },

  readout({ width, height, depth, renderer }) {
    return [
      ['width / height / depth', `${width} / ${height} / ${depth}`],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
