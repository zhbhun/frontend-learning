/*
GLTFLoader 课范例共用的最小舞台与示例模型。

输入是 canvas 和读取状态的函数；resize 时同步 renderer，再把当前状态写入读数。
范例本身没有持续动画，只在加载、参数或尺寸变化时重绘。

示例模型由 GLTFExporter 在内存里导出成 GLB blob URL，给 GLTFLoader 一个不依赖
外部网络的可靠加载源；导出后再删除原始 three.js 对象，避免内存里留两份资源。
*/

import * as THREE from 'three';

export function createGLTFStage(canvas, readSnapshot) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#e9efe9', 1);

  const scene = new THREE.Scene();

  // glTF 资源用 PBR 材质（MeshStandardMaterial）。没有环境光时会偏暗，
  // 这里先用 HemisphereLight + DirectionalLight 抬底；环境贴图留给 PBR 课程。
  const hemi = new THREE.HemisphereLight('#ffffff', '#7c8a82', 1.0);
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(3, 5, 4);
  scene.add(hemi, key);

  const grid = new THREE.GridHelper(8, 8, '#8ba096', '#c7d3ca');
  scene.add(grid);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(3.6, 2.4, 4.6);
  camera.lookAt(0, 0.9, 0);

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

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    render();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);
  resize();

  return {
    scene,
    camera,
    renderer,
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

/*
构造一个简单的多节点示例模型：根 Group 下挂 Body、Head 和 Accents 子 Group，
Accents 里再挂两个 Eye。结构故意做出层级，方便演示 gltf.scene.traverse。
*/
export function buildSampleGroup() {
  const group = new THREE.Group();
  group.name = 'SampleModel';

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 1.3, 1.3),
    new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.42,
      metalness: 0.12
    })
  );
  body.name = 'Body';
  body.position.y = 0.85;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 28, 20),
    new THREE.MeshStandardMaterial({
      color: '#d17832',
      roughness: 0.48,
      metalness: 0.05
    })
  );
  head.name = 'Head';
  head.position.y = 1.95;
  group.add(head);

  const accents = new THREE.Group();
  accents.name = 'Accents';
  group.add(accents);

  const eyeGeo = new THREE.SphereGeometry(0.08, 14, 10);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: '#1c1c1c',
    roughness: 0.3
  });

  [-0.18, 0.18].forEach((x, index) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.name = `Eye${index + 1}`;
    eye.position.set(x, 2.05, 0.42);
    accents.add(eye);
  });

  return group;
}

/*
把 object 平移，让包围盒中心落在原点正上方（Y 不抬升，底面贴 y=0）。
glTF 模型不一定以原点为枢轴，加载后先做这步才好放进可观察范围。
*/
export function placeOnGround(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());

  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
}

/*
遍历子树收集 geometry / material / texture，去重后返回三类 Set。
scene.remove 不会释放这些 GPU 资源，需要按收集结果分别 dispose。
*/
export function collectResources(object) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  object.traverse((child) => {
    if (child.geometry) {
      geometries.add(child.geometry);
    }

    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => materials.add(entry));
    } else if (material) {
      materials.add(material);
    }
  });

  materials.forEach((material) => {
    for (const value of Object.values(material)) {
      if (value && value.isTexture) {
        textures.add(value);
      }
    }
  });

  return { geometries, materials, textures };
}

export function disposeCollected({ geometries, materials, textures }) {
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}
