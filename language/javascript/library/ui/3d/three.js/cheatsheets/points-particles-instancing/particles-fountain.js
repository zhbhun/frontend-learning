/*
演示大规模粒子的 CPU 模拟 + GPU 批渲染闭环。

关键点：
- BufferGeometry 携带 position、color 和自定义 attribute aSeed 三块 attribute；
  velocity / age 是 CPU 模拟用的普通 typed array，不进 attributes。
- 每帧 CPU 端按速度积分 + 重力更新位置与颜色；超出生命或落地的粒子在对象池里复活。
- position / color 两块 attribute 每帧 needsUpdate；构造时改 setUsage(DynamicDrawUsage)。
- 深色背景 + AdditiveBlending + depthWrite=false 才能呈现发光颗粒叠加效果。

输入：count（粒子数）、gravity、blending、animate。
读文件先看 createParticles() 怎样布置 attributes，再看 step() 怎样按对象池更新并同步 GPU。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const MAX_LIFE = 2.4;   // 单颗粒子最大存活秒数
const LAUNCH_SPEED = 5.4;

// 初始化一份粒子数据：position / color / aSeed 是 attribute，velocity / age 只在 CPU 用
function createParticles(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const velocities = new Float32Array(count * 3);
  const ages = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    seeds[i] = Math.random();
    // 让初始 age 随机，避免第一帧所有粒子同步发射、画面集体跳变。
    ages[i] = Math.random() * MAX_LIFE;
    // 初始位置：原点附近的小扰动，模拟"喷口"
    positions[i * 3]     = (Math.random() - 0.5) * 0.08;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
    // 由种子决定水平方向 + 随机垂直速度
    const angle = seeds[i] * Math.PI * 2;
    const spread = 0.6 + Math.random() * 0.6;
    velocities[i * 3]     = Math.cos(angle) * spread;
    velocities[i * 3 + 1] = LAUNCH_SPEED * (0.7 + Math.random() * 0.6);
    velocities[i * 3 + 2] = Math.sin(angle) * spread;
    colors[i * 3] = 0.6;
    colors[i * 3 + 1] = 0.8;
    colors[i * 3 + 2] = 1.0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1));
  // 这两块每帧都会被重写，标记为动态上传策略；aSeed 一次性写入不再变，保留默认 Static。
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  geometry.attributes.color.setUsage(THREE.DynamicDrawUsage);
  geometry.computeBoundingSphere();

  return { geometry, velocities, ages, seeds };
}

// 对象池里的粒子超期或落地，重新发射——不删除、不分配，原地复活
function respawn(i, positions, velocities, ages, seeds) {
  positions[i * 3]     = (Math.random() - 0.5) * 0.08;
  positions[i * 3 + 1] = 0;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
  const angle = seeds[i] * Math.PI * 2 + Math.random() * 0.3;
  const spread = 0.6 + Math.random() * 0.8;
  velocities[i * 3]     = Math.cos(angle) * spread;
  velocities[i * 3 + 1] = LAUNCH_SPEED * (0.7 + Math.random() * 0.6);
  velocities[i * 3 + 2] = Math.sin(angle) * spread;
  ages[i] = 0;
}

const tmpColor = new THREE.Color();

// 单步模拟：半隐式欧拉积分 + 重力 + 生命周期回收 + 颜色随生命衰减
function step(state, delta, gravity) {
  const { positions, colors, velocities, ages, seeds, count } = state;
  for (let i = 0; i < count; i++) {
    ages[i] += delta;
    velocities[i * 3 + 1] += gravity * delta;
    positions[i * 3]     += velocities[i * 3]     * delta;
    positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
    positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;

    if (positions[i * 3 + 1] < -0.2 || ages[i] > MAX_LIFE) {
      respawn(i, positions, velocities, ages, seeds);
      continue;
    }

    // 颜色按生命阶段从青蓝 → 暖橙 → 暗，让加性混合叠加的"白热"区域自然出现
    const t = ages[i] / MAX_LIFE;
    tmpColor.setHSL(0.55 - t * 0.45, 0.7, 0.5 * (1 - t * 0.5));
    colors[i * 3]     = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
}

// 程序化生成"软圆 + 渐隐边缘"纹理：加性混合下重叠处会自然累加成亮白
function makeGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  // map 表示颜色数据，按 sRGB 解释才能让加性混合的色阶与读数对得上。
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const particlesFountainExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    // 深色背景：加性混合在亮背景下几乎看不见，必须深色才能呈现"发光累加"
    scene.background = new THREE.Color('#0b0f1a');

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 3.4, 8.5);
    camera.lookAt(0, 1.6, 0);

    const grid = new THREE.GridHelper(24, 24, '#243150', '#161e30');
    grid.position.y = -0.05;
    scene.add(grid);

    const glowTexture = makeGlowTexture();
    const material = new THREE.PointsMaterial({
      size: 0.14,
      sizeAttenuation: true,
      vertexColors: true,          // 启用顶点色，配合 color attribute
      map: glowTexture,
      transparent: true,
      depthWrite: false,           // 半透明发光颗粒：不写深度，避免按绘制顺序错误遮挡
      blending: THREE.AdditiveBlending
    });

    const state = {
      count: 8000,
      gravity: -9.8,
      blending: 'additive',
      animate: true,
      positions: null,
      colors: null,
      velocities: null,
      ages: null,
      seeds: null,
      geometry: null,
      points: null,
      material,
      needsUpdateCount: 0
    };

    function rebuild(count) {
      if (state.points) {
        scene.remove(state.points);
        state.geometry.dispose();
      }
      const built = createParticles(count);
      const points = new THREE.Points(built.geometry, material);
      scene.add(points);
      state.geometry = built.geometry;
      state.points = points;
      state.positions = built.geometry.attributes.position.array;
      state.colors = built.geometry.attributes.color.array;
      state.velocities = built.velocities;
      state.ages = built.ages;
      state.seeds = built.seeds;
      state.count = count;
    }
    rebuild(state.count);

    function frame(delta) {
      // delta 在暂停恢复时可能很大，钳到 1/30 避免大步长让粒子穿透地面
      const dt = state.animate ? Math.min(delta, 1 / 30) : 0;
      if (dt > 0) {
        step(state, dt, state.gravity);
        // 两块每帧都变化的 attribute 都要单独标记 needsUpdate。
        state.geometry.attributes.position.needsUpdate = true;
        state.geometry.attributes.color.needsUpdate = true;
        state.needsUpdateCount += 2;
      }
      renderer.render(scene, camera);
      emitSnapshot({ renderer, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { scene, state, material, glowTexture, rebuild, loop };
  },

  apply(instance, args) {
    const { state, material, rebuild, loop } = instance;
    // count 变化要重建几何（typed array 长度变了）；其余参数实时改即可。
    if (state.count !== args.count) {
      rebuild(args.count);
    }
    state.gravity = args.gravity;
    state.blending = args.blending;
    material.blending =
      args.blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;
    state.animate = args.animate;
    loop.renderOnce();
  },

  readout({ renderer, state }) {
    const info = renderer.info;
    return [
      ['position 顶点数', state.count],
      ['attributes 数', `${Object.keys(state.geometry.attributes).length}（position / color / aSeed）`],
      ['position.setUsage', state.geometry.attributes.position.usage === THREE.DynamicDrawUsage ? 'DynamicDrawUsage' : 'StaticDrawUsage'],
      ['needsUpdate 累计', state.needsUpdateCount],
      ['blending', state.blending === 'additive' ? 'AdditiveBlending' : 'NormalBlending'],
      ['本帧 draw calls', info.render.calls],
      ['本帧 triangles', info.render.triangles]
    ];
  }
};
