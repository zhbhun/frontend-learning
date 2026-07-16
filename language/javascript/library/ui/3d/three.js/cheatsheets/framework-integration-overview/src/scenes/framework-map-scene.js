/*
本示例演示 vanilla adapter、React Three Fiber 和 TresJS 的概念映射，不引入真实框架依赖。
读代码先看 profiles：每个 profile 都把创建、更新、每帧、事件、资源所有权映射到一种框架层心智模型。
页面控件对应状态：选择 vanilla / R3F / TresJS 会更新右侧映射面板，并改变画面里 renderer、tree、frame 三个节点的强调对象。
预期观察：vanilla 强调 adapter 拥有全部命令式资源；R3F/TresJS 强调声明式树和框架 renderer 管理对象生命周期。
*/

import * as THREE from 'three';
import {
  addStudioLights,
  createCamera,
  createRenderer,
  createScene,
  syncRendererSize
} from '../shared-stage.js';

const profiles = {
  vanilla: {
    key: 'vanilla',
    position: 'adapter 边界',
    create: 'mount 中显式 new three.js 对象',
    update: 'update(props) 修改稳定对象',
    loop: 'adapter 保存 requestAnimationFrame id',
    events: 'canvas listener 自己转成业务事件',
    resource: 'unmount 中 dispose 拥有的资源',
    fit: '小面积嵌入、已有 vanilla 场景、跨框架复用',
    color: '#28747c',
    emphasis: 'renderer'
  },
  r3f: {
    key: 'r3f',
    position: 'React reconciler for three.js',
    create: 'JSX 节点映射 three.js 对象，args 是构造参数',
    update: 'props 进入 reconciler；ref 处理命令式逃生口',
    loop: 'useFrame 进入共享 render loop',
    events: '指针事件声明在可 raycast 的对象上',
    resource: 'Canvas / reconciler 负责卸载，loader 缓存要按边界管理',
    fit: 'React 应用、复杂组件树、状态与 Suspense 边界',
    color: '#6d5bd0',
    emphasis: 'tree'
  },
  tres: {
    key: 'tres',
    position: 'Vue 风格声明式 three.js 组件层',
    create: 'TresCanvas 建立环境，Vue 组件映射对象',
    update: '响应式 props 推动对象属性更新',
    loop: 'Vue composable / 渲染上下文接入帧循环',
    events: 'Vue 事件语法连接 pointer / object 事件',
    resource: '组件卸载时释放框架拥有的对象和上下文',
    fit: 'Vue / Nuxt 应用、模板式场景和响应式 UI',
    color: '#4f8f45',
    emphasis: 'tree'
  }
};

export function createFrameworkMapController({ host, onSnapshot }) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', '框架概念映射 three.js 画布');
  host.replaceChildren(canvas);

  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createScene();
  addStudioLights(scene);

  const nodes = {
    renderer: createNode({ label: 'renderer', x: -1.9, color: '#28747c' }),
    tree: createNode({ label: 'tree', x: 0, color: '#6d5bd0' }),
    frame: createNode({ label: 'frame', x: 1.9, color: '#c96332' })
  };

  scene.add(nodes.renderer.group, nodes.tree.group, nodes.frame.group);

  const state = {
    profile: profiles.vanilla,
    time: 0
  };

  function setProfile(name) {
    state.profile = profiles[name] ?? profiles.vanilla;
    applyProfile();
    renderOnce(state.time);
    onSnapshot?.(state.profile);
  }

  function applyProfile() {
    Object.entries(nodes).forEach(([key, node]) => {
      const active = key === state.profile.emphasis || key === 'frame' && state.profile.key !== 'vanilla';
      node.material.color.set(active ? state.profile.color : '#8fa0a3');
      node.mesh.scale.y = active ? 1.5 : 0.82;
      node.mesh.position.y = active ? 0.25 : -0.05;
    });
  }

  function renderOnce(time = state.time) {
    state.time = time;
    syncRendererSize({ renderer, camera, element: host });

    Object.values(nodes).forEach((node, index) => {
      node.group.rotation.y = time * 0.0005 + index * 0.42;
    });

    renderer.render(scene, camera);
  }

  function renderFrame(time) {
    renderOnce(time);
    requestAnimationFrame(renderFrame);
  }

  setProfile('vanilla');
  requestAnimationFrame(renderFrame);

  return {
    setProfile
  };
}

function createNode({ label, x, color }) {
  const group = new THREE.Group();
  group.position.x = x;

  const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9, 2, 2, 2);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.12
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.1;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.035, 12, 48),
    new THREE.MeshBasicMaterial({ color: '#ffffff' })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.56;

  const labelSprite = createLabelSprite(label);
  labelSprite.position.set(0, -1.05, 0);

  group.add(mesh, ring, labelSprite);
  return { group, mesh, material };
}

function createLabelSprite(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;

  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(31, 42, 46, 0.82)';
  context.fillRect(0, 16, canvas.width, 64);
  context.fillStyle = '#ffffff';
  context.font = 'bold 34px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.45, 0.54, 1);
  return sprite;
}
