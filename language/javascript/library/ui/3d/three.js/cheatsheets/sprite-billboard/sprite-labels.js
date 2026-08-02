/*
演示 Sprite 作为始终面向相机的对象的 billboard 行为，以及 SpriteMaterial 关键属性的效果。

输入是相机自动旋转、sizeAttenuation（远小近大）、SpriteMaterial.rotation（绕屏幕中心的额外
旋转）。Sprite 的朝向由 renderer 每帧依据相机计算，因此不论相机怎么转，四个 Sprite 标签始终
正对观察者；中心的 Mesh 平面使用同一张 CanvasTexture，却没有 billboard 行为，相机绕到背面时
会显示镜像（DoubleSide）或被剔除（默认 FrontSide）。读文件时先看 makeLabelTexture() 与
create() 中 Sprite 的构造，再看 frame() 中相机方位与 SpriteMaterial 的更新。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

const LABELS = [
  { text: '北侧', color: '#3d73d9', position: new THREE.Vector3(0, 1.3, -2.6) },
  { text: '东侧', color: '#d17832', position: new THREE.Vector3(2.6, 1.3, 0) },
  { text: '南侧', color: '#2f8b72', position: new THREE.Vector3(0, 1.3, 2.6) },
  { text: '西侧', color: '#8f5ac7', position: new THREE.Vector3(-2.6, 1.3, 0) }
];

const CANVAS_W = 256;
const CANVAS_H = 96;

// 用 <canvas> 画一张圆角标签图，作为 Sprite / Mesh 共用的 map。
// 同样的纹理给 Sprite 用是 billboard，给 Mesh 平面用则会随对象 rotation 改变朝向。
function makeLabelTexture(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');

  // 圆角底色 + 白色描边，让标签在任何背景上都可读。
  const inset = 4;
  const radius = 18;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 6;
  roundRect(ctx, inset, inset, CANVAS_W - inset * 2, CANVAS_H - inset * 2, radius);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const spriteLabelsExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
    const cameraRadius = 6.4;
    const cameraHeight = 3.4;
    // 相机初始在 +Z 方向，让中心的对照 Mesh（默认面向 +Z）一开始就正对相机。
    camera.position.set(0, cameraHeight, cameraRadius);
    camera.lookAt(0, 1.1, 0);

    scene.add(new THREE.GridHelper(12, 12, '#8ba096', '#d3ded7'));
    const light = new THREE.DirectionalLight('#ffffff', 2.2);
    light.position.set(4, 7, 5);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.85), light);

    // 每个 Sprite 下方放一根细柱，标记它在场景里的真实位置；柱子是普通 Mesh，
    // 相机绕一圈时它会正常参与透视，能看出 Sprite 的"挂点"和"朝向"是两件事。
    LABELS.forEach((label) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.3, 14),
        new THREE.MeshStandardMaterial({ color: '#6b7872', roughness: 0.6 })
      );
      pole.position.set(label.position.x, 0.65, label.position.z);
      scene.add(pole);
    });

    // 四个 Sprite 标签。Sprite 没有 geometry 参数，构造只接收 SpriteMaterial。
    const sprites = LABELS.map((label) => {
      const texture = makeLabelTexture(label.text, label.color);
      const material = new THREE.SpriteMaterial({
        map: texture,
        // transparent 默认就是 true；显式写出来便于读代码时一眼看到这是半透明对象。
        transparent: true,
        // 标签类用法常关深度测试，让 Sprite 不被前景物体遮挡。
        depthTest: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(label.position);
      // x、y 决定屏幕尺寸；z 仍给 1，便于把 scale 当作整体缩放看待。
      sprite.scale.set(1.6, 0.6, 1);
      // Sprite 在标签之上：覆盖前景。
      sprite.renderOrder = 10;
      scene.add(sprite);
      return { sprite, label };
    });

    // 中心放一个 Mesh 平面做对照：它使用同一张 CanvasTexture，但不会自动转向相机。
    // 相机绕到背面时会显示镜像（DoubleSide）或被剔除（默认 FrontSide）。
    const contrastTexture = makeLabelTexture('Mesh 平面', '#9aa0a3');
    const contrastMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.6),
      new THREE.MeshBasicMaterial({
        map: contrastTexture,
        transparent: true,
        side: THREE.DoubleSide
      })
    );
    contrastMesh.position.set(0, 1.3, 0);
    scene.add(contrastMesh);

    const state = {
      autoRotate: true,
      sizeAttenuation: true,
      spriteRotationDeg: 0
    };
    let azimuth = 0;

    function frame(delta) {
      if (state.autoRotate) {
        azimuth += delta * 0.35;
      }
      camera.position.x = Math.sin(azimuth) * cameraRadius;
      camera.position.z = Math.cos(azimuth) * cameraRadius;
      camera.position.y = cameraHeight;
      camera.lookAt(0, 1.1, 0);

      // sizeAttenuation 与 rotation 都是 SpriteMaterial 的属性；运行时切换会立刻生效。
      const spriteRotation = THREE.MathUtils.degToRad(state.spriteRotationDeg);
      sprites.forEach(({ sprite }) => {
        sprite.material.sizeAttenuation = state.sizeAttenuation;
        sprite.material.rotation = spriteRotation;
      });

      renderer.render(scene, camera);

      const sample = sprites[0].sprite;
      emitSnapshot({ renderer, sample, state, azimuth });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { sprites, contrastMesh, state, loop };
  },

  apply(instance, args) {
    const { state, loop } = instance;
    state.autoRotate = args.autoRotate;
    state.sizeAttenuation = args.sizeAttenuation;
    state.spriteRotationDeg = args.spriteRotation;
    loop.renderOnce();
  },

  readout({ renderer, sample, state, azimuth }) {
    return [
      ['相机方位角', `${THREE.MathUtils.radToDeg(azimuth).toFixed(0)}°`],
      ['SpriteMaterial.rotation', `${state.spriteRotationDeg.toFixed(0)}°`],
      [
        'sizeAttenuation',
        state.sizeAttenuation ? '开启（远小近大）' : '关闭（屏幕恒定大小）'
      ],
      ['采样 Sprite 世界 position', formatVector(sample.position)],
      ['本帧三角形', renderer.info.render.triangles]
    ];
  }
};
