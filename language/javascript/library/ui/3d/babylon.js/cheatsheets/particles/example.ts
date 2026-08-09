/**
 * 范例：ParticleSystem 发射 CPU 广告牌粒子（喷泉 / 火花风视觉）。
 * 输入：
 *   - emitRate：每秒发射粒子数（写入 ps.emitRate）。
 *   - lifeTime：粒子寿命上限（秒）；ps.minLifeTime 取其 0.6 倍制造参差。
 *   - size：粒子尺寸上限（世界单位）；ps.minSize 取其 0.5 倍。
 *   - blendMode：混合模式枚举（ONEONE / STANDARD / ADD / MULTIPLY），映射到 ParticleSystem.BLENDMODE_*。
 *   - emitterType：发射器类型（box / cone / sphere / hemisphere）。
 *   - autoRotate：相机是否自动绕 target 公转，便于从各角度观察广告牌。
 * 主要操作：
 *   - makeParticleTexture 用 DynamicTexture 程序化画一张白心径向渐变软圆（带 alpha），
 *     避免依赖远程贴图（headless / 离线 / CI 会失败）；染色交给 color1/color2。
 *   - new ParticleSystem(name, capacity, scene)：构造 CPU 粒子系统，配 emitter、
 *     particleEmitterType、颜色、方向、重力、blendMode、particleTexture，再 start()。
 *   - update 时按 args 重设 emitRate / minLifeTime / maxLifeTime / minSize / maxSize / blendMode；
 *     emitterType 变化时换一个新 emitter 实例赋给 ps.particleEmitterType（注意全名）。
 *   - onBeforeRenderObservable 每帧 emit 活跃粒子数（ps.particles.length）、emitRate、FPS。
 * 预期结果：粒子持续从发射点涌出；切 blendMode 看到加性发光叠加 ↔ 普通半透明的差异；
 *   切 emitterType 看到发射形状从盒体变锥体 / 球体 / 半球；调 emitRate 顶到容量上限后不再增长。
 * 阅读主线：makeParticleTexture → createParticlesExample 内的 ParticleSystem 配置 → update / 帧回调。
 */
import {
  ArcRotateCamera,
  BoxParticleEmitter,
  Color3,
  Color4,
  ConeParticleEmitter,
  DynamicTexture,
  HemisphericLight,
  HemisphericParticleEmitter,
  MeshBuilder,
  ParticleSystem,
  Scene,
  SphereParticleEmitter,
  StandardMaterial,
  Texture,
  Vector3,
} from '@babylonjs/core';
import { createBabylonRuntime } from '../../assets/babylon-canvas.js';

// 粒子系统容量上限；活跃粒子数 ≈ emitRate × 平均寿命，但永远被 capacity 钳制。
const CAPACITY = 4000;

export type BlendModeKey = 'ONEONE' | 'STANDARD' | 'ADD' | 'MULTIPLY';
export type EmitterTypeKey = 'box' | 'cone' | 'sphere' | 'hemisphere';

export interface ParticlesExampleOptions {
  emitRate: number;
  lifeTime: number;
  size: number;
  blendMode: BlendModeKey;
  emitterType: EmitterTypeKey;
  autoRotate: boolean;
}

export interface ParticlesExampleSnapshot {
  activeParticles: number;
  emitRate: number;
  blendMode: BlendModeKey;
  emitterType: EmitterTypeKey;
  capacity: number;
  fps: number;
}

export interface ParticlesExampleInstance {
  update(options: ParticlesExampleOptions): void;
  dispose(): void;
}

// 字符串枚举 → ParticleSystem 上的静态 BLENDMODE 常量（值已核对自 baseParticleSystem 源码）。
const BLEND_MODE_MAP: Record<BlendModeKey, number> = {
  ONEONE: ParticleSystem.BLENDMODE_ONEONE, // = 0，加性混合，默认
  STANDARD: ParticleSystem.BLENDMODE_STANDARD, // = 1，普通 alpha
  ADD: ParticleSystem.BLENDMODE_ADD, // = 2，带 alpha 的加性
  MULTIPLY: ParticleSystem.BLENDMODE_MULTIPLY, // = 3，正片叠底
};

// 程序化粒子贴图：白心向边衰减的径向渐变软圆，带 alpha。
// 用 DynamicTexture 而非远程 PNG，让范例在 headless / 离线也能跑；贴图保持白色，染色交给 color1/color2。
function makeParticleTexture(scene: Scene): DynamicTexture {
  const size = 128;
  const tex = new DynamicTexture(
    'particleSoftCircle',
    { width: size, height: size },
    scene,
    false,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  tex.hasAlpha = true;
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, size, size);
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)'); // 圆外完全透明，圆角不挡后面粒子
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.update(); // 上传到 GPU；改了 canvas 内容后必须再调
  return tex;
}

// 按 key 建一个发射器实例；切 emitterType 时调用。构造签名均核对自 @babylonjs/core 源码。
function createEmitter(key: EmitterTypeKey) {
  switch (key) {
    case 'cone':
      // ConeParticleEmitter(radius=1, angle=Math.PI, directionRandomizer=0)。
      // 这里给小半径 + 约 36° 半角，制造聚焦向上的喷流。
      return new ConeParticleEmitter(0.15, Math.PI / 5);
    case 'sphere':
      return new SphereParticleEmitter(0.6);
    case 'hemisphere':
      return new HemisphericParticleEmitter(0.6);
    case 'box':
    default:
      // BoxParticleEmitter() 无参；默认 direction1/direction2 = (0,1,0)，向上发射。
      return new BoxParticleEmitter();
  }
}

export function createParticlesExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ParticlesExampleSnapshot) => void,
): ParticlesExampleInstance {
  let current: ParticlesExampleOptions = {
    emitRate: 700,
    lifeTime: 1.6,
    size: 0.4,
    blendMode: 'ONEONE',
    emitterType: 'cone',
    autoRotate: true,
  };

  // 把需要在 update / 帧回调里共享的对象收进一个可变 holder，避免闭包失效。
  const holder: {
    ps: ParticleSystem | null;
    camera: ArcRotateCamera | null;
    azimuth: number;
    wasAuto: boolean;
    lastEmitter: EmitterTypeKey;
  } = { ps: null, camera: null, azimuth: -Math.PI / 2, wasAuto: false, lastEmitter: 'cone' };

  const runtime = createBabylonRuntime(canvas, (engine) => {
    const scene = new Scene(engine);
    // 深色背景：BLENDMODE_ONEONE / ADD 是加性混合，只在深色背景上看得到叠加发光。
    scene.clearColor = new Color4(0.05, 0.06, 0.09, 1);

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2.3,
      9,
      new Vector3(0, 1, 0),
      scene,
    );
    camera.minZ = 0.1;
    camera.attachControl(canvas, true);
    holder.camera = camera;

    // 半球光：广告牌粒子不参与光照，但地面 StandardMaterial 需要光才可见。
    new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);

    // 地面：深色，作为喷泉落点的透视参考。
    const ground = MeshBuilder.CreateGround('ground', { width: 16, height: 16, subdivisions: 1 }, scene);
    const gMat = new StandardMaterial('groundMat', scene);
    gMat.diffuseColor = new Color3(0.12, 0.13, 0.16);
    gMat.specularColor = new Color3(0.04, 0.04, 0.04);
    ground.material = gMat;

    // 发射点标记：一个小立方体标示 emitter 位置（emitter = Vector3 时粒子从这里发出）。
    const emitterMark = MeshBuilder.CreateBox('emitterMark', { size: 0.22 }, scene);
    emitterMark.position.set(0, 0.6, 0);
    const markMat = new StandardMaterial('markMat', scene);
    markMat.emissiveColor = new Color3(0.22, 0.22, 0.28);
    markMat.disableLighting = true;
    emitterMark.material = markMat;

    // CPU ParticleSystem：构造参数顺序 name → capacity → scene。
    const ps = new ParticleSystem('particles', CAPACITY, scene);
    ps.particleTexture = makeParticleTexture(scene);
    ps.emitter = new Vector3(0, 0.6, 0); // 也可传 AbstractMesh，粒子跟随其 position
    ps.particleEmitterType = createEmitter(current.emitterType);
    holder.lastEmitter = current.emitterType;

    // 颜色：暖色（橙 → 黄偏红），colorDead 偏暗红，配合加性混合做火花感。
    ps.color1 = new Color4(1.0, 0.7, 0.25, 1);
    ps.color2 = new Color4(1.0, 0.45, 0.15, 1);
    ps.colorDead = new Color4(0.35, 0.08, 0.02, 1);

    // 尺寸 / 寿命 / 发射率（min 略小于 max 制造参差）。
    ps.minSize = current.size * 0.5;
    ps.maxSize = current.size;
    ps.minLifeTime = current.lifeTime * 0.6;
    ps.maxLifeTime = current.lifeTime;
    ps.emitRate = current.emitRate;

    // 方向 / 重力：默认 emitter 朝 +Y 发射；向下重力让粒子回落形成喷泉。
    ps.gravity = new Vector3(0, -3.0, 0);
    ps.minEmitPower = 1.5;
    ps.maxEmitPower = 3.0;

    ps.blendMode = BLEND_MODE_MAP[current.blendMode];

    ps.start();
    holder.ps = ps;

    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;

      // autoRotate：每帧推进 alpha，相机绕 target 公转；切换开关时从当前 alpha 续上。
      if (current.autoRotate) {
        if (!holder.wasAuto) {
          holder.azimuth = camera.alpha;
          holder.wasAuto = true;
        }
        holder.azimuth += dt * 0.3;
        camera.alpha = holder.azimuth;
      } else {
        holder.wasAuto = false;
      }

      emit({
        activeParticles: ps.particles.length, // CPU 粒子系统可读活跃粒子数组；GPU 不可读
        emitRate: ps.emitRate,
        blendMode: current.blendMode,
        emitterType: current.emitterType,
        capacity: CAPACITY,
        fps: Math.round(1000 / Math.max(engine.getDeltaTime(), 1)),
      });
    });

    return scene;
  });

  return {
    update(options) {
      current = options;
      const ps = holder.ps;
      if (!ps) {
        return;
      }

      ps.emitRate = options.emitRate;
      ps.minLifeTime = options.lifeTime * 0.6;
      ps.maxLifeTime = options.lifeTime;
      ps.minSize = options.size * 0.5;
      ps.maxSize = options.size;
      ps.blendMode = BLEND_MODE_MAP[options.blendMode];

      // 切换 emitterType：构造一个新实例赋给 particleEmitterType。
      // 注意属性全名是 particleEmitterType（不是 emitterType）。
      if (options.emitterType !== holder.lastEmitter) {
        ps.particleEmitterType = createEmitter(options.emitterType);
        holder.lastEmitter = options.emitterType;
      }
    },
    dispose() {
      runtime.dispose();
    },
  };
}
